package handlers

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"time"

	"attendease/internal/domain"
	"attendease/internal/http/middleware"
	"attendease/internal/http/responses"
)

type SettingsHandler struct {
	db *sql.DB
}

func NewSettingsHandler(db *sql.DB) *SettingsHandler {
	return &SettingsHandler{db: db}
}

func (h *SettingsHandler) Get(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgIDFromContext(r.Context())
	if orgID == "" {
		orgID = r.Header.Get("X-Organization-Id")
	}

	settings := h.loadSettingsOrDefault(r.Context(), orgID)
	responses.JSON(w, http.StatusOK, settings)
}

func (h *SettingsHandler) Update(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgIDFromContext(r.Context())
	if orgID == "" {
		orgID = r.Header.Get("X-Organization-Id")
	}

	var payload map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		responses.BadRequest(w, "Invalid JSON payload", nil)
		return
	}

	// Persist changes to organization_settings
	if att, ok := payload["attendancePolicies"].(map[string]interface{}); ok {
		if grace, ok := att["defaultGracePeriodMinutes"].(float64); ok {
			_, _ = h.db.ExecContext(r.Context(), "UPDATE organization_settings SET default_grace_period_minutes = ?, updated_at = ? WHERE organization_id = ?", int(grace), time.Now().UTC(), orgID)
		}
		if autoCheckout, ok := att["autoCheckoutHours"].(float64); ok {
			_, _ = h.db.ExecContext(r.Context(), "UPDATE organization_settings SET auto_checkout_hours = ?, updated_at = ? WHERE organization_id = ?", int(autoCheckout), time.Now().UTC(), orgID)
		}
		if strict, ok := att["strictShiftEnforcement"].(bool); ok {
			_, _ = h.db.ExecContext(r.Context(), "UPDATE organization_settings SET strict_shift_enforcement = ?, updated_at = ? WHERE organization_id = ?", strict, time.Now().UTC(), orgID)
		}
	}

	if fac, ok := payload["facilityVerification"].(map[string]interface{}); ok {
		if radius, ok := fac["defaultGeofenceRadiusMeters"].(float64); ok {
			_, _ = h.db.ExecContext(r.Context(), "UPDATE organization_settings SET default_geofence_radius_meters = ?, updated_at = ? WHERE organization_id = ?", int(radius), time.Now().UTC(), orgID)
		}
		if reqGPS, ok := fac["requireGpsVerification"].(bool); ok {
			_, _ = h.db.ExecContext(r.Context(), "UPDATE organization_settings SET require_gps_verification = ?, updated_at = ? WHERE organization_id = ?", reqGPS, time.Now().UTC(), orgID)
		}
		if reqWifi, ok := fac["requireWifiSubnetMatch"].(bool); ok {
			_, _ = h.db.ExecContext(r.Context(), "UPDATE organization_settings SET require_wifi_subnet_match = ?, updated_at = ? WHERE organization_id = ?", reqWifi, time.Now().UTC(), orgID)
		}
	}

	if off, ok := payload["offlinePolicy"].(map[string]interface{}); ok {
		if allow, ok := off["allowOfflineAttendance"].(bool); ok {
			_, _ = h.db.ExecContext(r.Context(), "UPDATE organization_settings SET allow_offline_attendance = ?, updated_at = ? WHERE organization_id = ?", allow, time.Now().UTC(), orgID)
		}
		if maxHours, ok := off["maxOfflineQueueHours"].(float64); ok {
			_, _ = h.db.ExecContext(r.Context(), "UPDATE organization_settings SET max_offline_hours = ?, updated_at = ? WHERE organization_id = ?", int(maxHours), time.Now().UTC(), orgID)
		}
	}

	if sec, ok := payload["securityPrivacy"].(map[string]interface{}); ok {
		if timeout, ok := sec["sessionTimeoutMinutes"].(float64); ok {
			_, _ = h.db.ExecContext(r.Context(), "UPDATE organization_settings SET session_timeout_minutes = ?, updated_at = ? WHERE organization_id = ?", int(timeout), time.Now().UTC(), orgID)
		}
		if mfa, ok := sec["mfaEnforcedForAdmins"].(bool); ok {
			_, _ = h.db.ExecContext(r.Context(), "UPDATE organization_settings SET mfa_enforced_for_admins = ?, updated_at = ? WHERE organization_id = ?", mfa, time.Now().UTC(), orgID)
		}
		if ret, ok := sec["biometricRetentionPolicyDays"].(float64); ok {
			_, _ = h.db.ExecContext(r.Context(), "UPDATE organization_settings SET biometric_retention_days = ?, updated_at = ? WHERE organization_id = ?", int(ret), time.Now().UTC(), orgID)
		}
	}

	settings := h.loadSettingsOrDefault(r.Context(), orgID)
	responses.JSON(w, http.StatusOK, settings)
}

func (h *SettingsHandler) loadSettingsOrDefault(ctx context.Context, orgID string) domain.SystemSettings {
	settings := domain.SystemSettings{
		Organization: map[string]interface{}{
			"companyName":  "Attend Ease Organization",
			"tagline":      "Attendance made simple.",
			"supportEmail": "support@attendease.internal",
			"timezone":     "UTC",
		},
		AttendancePolicies: map[string]interface{}{
			"defaultGracePeriodMinutes": 15,
			"autoCheckoutHours":         14,
			"allowEarlyCheckInMinutes":  30,
			"strictShiftEnforcement":    true,
		},
		FacilityVerification: map[string]interface{}{
			"requireGpsVerification":      true,
			"requireWifiSubnetMatch":      false,
			"defaultGeofenceRadiusMeters": 150,
			"allowMockLocation":           false,
		},
		OfflinePolicy: map[string]interface{}{
			"allowOfflineAttendance":      true,
			"maxOfflineQueueHours":        48,
			"requireReviewThresholdHours": 4,
			"autoSyncOnReconnect":         true,
		},
		SecurityPrivacy: map[string]interface{}{
			"sessionTimeoutMinutes":          60,
			"mfaEnforcedForAdmins":           true,
			"biometricRetentionPolicyDays":   90,
			"preventClientFormulaInjection": true,
		},
		Notifications: map[string]interface{}{
			"notifyLateArrivals":             true,
			"notifyPendingOfflineQueue":       true,
			"notifyUnusualLocationAttempts":  true,
			"dailyDigestEmail":               false,
		},
	}

	if orgID != "" {
		var companyName, email, timezone string
		var grace, autoOut, radius, maxOff, timeout, retDays int
		var strict, reqGps, reqWifi, allowOff, mfa, notifyLate, notifyOff, notifyLoc bool

		query := `
		SELECT o.display_name, o.email, s.timezone,
		       s.default_grace_period_minutes, s.auto_checkout_hours, s.strict_shift_enforcement,
		       s.default_geofence_radius_meters, s.require_gps_verification, s.require_wifi_subnet_match,
		       s.allow_offline_attendance, s.max_offline_hours,
		       s.session_timeout_minutes, s.mfa_enforced_for_admins, s.biometric_retention_days,
		       s.notify_late_arrivals, s.notify_pending_offline_queue, s.notify_unusual_location_attempts
		FROM organizations o
		LEFT JOIN organization_settings s ON o.id = s.organization_id
		WHERE o.id = ? LIMIT 1`

		err := h.db.QueryRowContext(ctx, query, orgID).Scan(
			&companyName, &email, &timezone,
			&grace, &autoOut, &strict,
			&radius, &reqGps, &reqWifi,
			&allowOff, &maxOff,
			&timeout, &mfa, &retDays,
			&notifyLate, &notifyOff, &notifyLoc,
		)

		if err == nil {
			settings.Organization["companyName"] = companyName
			settings.Organization["supportEmail"] = email
			if timezone != "" {
				settings.Organization["timezone"] = timezone
			}
			settings.AttendancePolicies["defaultGracePeriodMinutes"] = grace
			settings.AttendancePolicies["autoCheckoutHours"] = autoOut
			settings.AttendancePolicies["strictShiftEnforcement"] = strict
			settings.FacilityVerification["defaultGeofenceRadiusMeters"] = radius
			settings.FacilityVerification["requireGpsVerification"] = reqGps
			settings.FacilityVerification["requireWifiSubnetMatch"] = reqWifi
			settings.OfflinePolicy["allowOfflineAttendance"] = allowOff
			settings.OfflinePolicy["maxOfflineQueueHours"] = maxOff
			settings.SecurityPrivacy["sessionTimeoutMinutes"] = timeout
			settings.SecurityPrivacy["mfaEnforcedForAdmins"] = mfa
			settings.SecurityPrivacy["biometricRetentionPolicyDays"] = retDays
			settings.Notifications["notifyLateArrivals"] = notifyLate
			settings.Notifications["notifyPendingOfflineQueue"] = notifyOff
			settings.Notifications["notifyUnusualLocationAttempts"] = notifyLoc
		}
	}

	return settings
}
