package handlers

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"time"

	"attendease/internal/audit"
	"attendease/internal/domain"
	"attendease/internal/http/middleware"
	"attendease/internal/http/responses"
)

type DeviceHandler struct {
	db       *sql.DB
	recorder *audit.Recorder
}

func NewDeviceHandler(db *sql.DB, recorder *audit.Recorder) *DeviceHandler {
	return &DeviceHandler{db: db, recorder: recorder}
}

func (h *DeviceHandler) List(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgIDFromContext(r.Context())
	if orgID == "" {
		orgID = r.Header.Get("X-Organization-Id")
	}

	query := `
	SELECT d.id, d.organization_id, d.name, d.model, d.device_type,
	       COALESCE(d.assigned_user_id, ''), COALESCE(u.name, ''),
	       COALESCE(d.assigned_facility_id, ''), COALESCE(f.name, ''),
	       d.fingerprint_hash, d.registered_at, d.last_sync_at, d.status, d.app_version, d.is_simulated
	FROM registered_devices d
	LEFT JOIN users u ON d.assigned_user_id = u.id
	LEFT JOIN facilities f ON d.assigned_facility_id = f.id
	WHERE d.organization_id = ? OR ? = ''
	ORDER BY d.registered_at DESC`

	rows, err := h.db.QueryContext(r.Context(), query, orgID, orgID)
	if err != nil {
		log.Printf("[DEVICE ERROR] List query failed: %v", err)
		responses.InternalServerError(w, "Failed to retrieve registered devices")
		return
	}
	defer rows.Close()

	devices := make([]domain.RegisteredDevice, 0)
	for rows.Next() {
		var d domain.RegisteredDevice
		var regAt, syncAt time.Time

		err := rows.Scan(
			&d.ID, &d.OrganizationID, &d.Name, &d.Model, &d.DeviceType,
			&d.AssignedUserID, &d.AssignedUserName,
			&d.AssignedFacilityID, &d.AssignedFacilityName,
			&d.FingerprintHash, &regAt, &syncAt, &d.Status, &d.AppVersion, &d.IsSimulated,
		)
		if err == nil {
			d.RegisteredAt = regAt.Format(time.RFC3339)
			d.LastSyncAt = syncAt.Format(time.RFC3339)
			devices = append(devices, d)
		}
	}

	responses.JSON(w, http.StatusOK, devices)
}

func (h *DeviceHandler) Revoke(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		responses.BadRequest(w, "Device ID is required in URL path", nil)
		return
	}

	res, err := h.db.ExecContext(r.Context(), "UPDATE registered_devices SET status = 'revoked' WHERE id = ?", id)
	if err != nil {
		responses.InternalServerError(w, "Failed to update device status")
		return
	}
	if rows, _ := res.RowsAffected(); rows == 0 {
		responses.NotFound(w, "Device not found")
		return
	}

	var d domain.RegisteredDevice
	var regAt, syncAt time.Time
	err = h.db.QueryRowContext(r.Context(), `
		SELECT id, organization_id, name, model, device_type, fingerprint_hash, registered_at, last_sync_at, status, app_version
		FROM registered_devices WHERE id = ?`, id).Scan(
		&d.ID, &d.OrganizationID, &d.Name, &d.Model, &d.DeviceType, &d.FingerprintHash, &regAt, &syncAt, &d.Status, &d.AppVersion,
	)
	if err == nil {
		d.RegisteredAt = regAt.Format(time.RFC3339)
		d.LastSyncAt = syncAt.Format(time.RFC3339)
	}

	h.recorder.Record(r.Context(), domain.AuditLog{
		OrganizationID:   d.OrganizationID,
		ActorID:          "ADMIN",
		ActorName:        "Administrator",
		ActorRole:        "org_admin",
		Action:           "device_revoked",
		AffectedResource: fmt.Sprintf("Registered Device #%s (%s)", d.ID, d.Name),
		ResourceID:       d.ID,
		Details:          fmt.Sprintf("Device authorization revoked for %s (%s).", d.Name, d.Model),
		Outcome:          "success",
		IPAddress:        r.RemoteAddr,
		UserAgent:        r.UserAgent(),
	})

	responses.JSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"device":  d,
		"message": fmt.Sprintf("Device %s has been revoked successfully.", d.Name),
	})
}
