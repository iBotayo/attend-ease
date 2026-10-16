package handlers

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"regexp"
	"strings"
	"time"

	"attendease/internal/audit"
	"attendease/internal/auth"
	"attendease/internal/domain"
	"attendease/internal/http/middleware"
	"attendease/internal/http/responses"
	"github.com/google/uuid"
)

type OrganizationHandler struct {
	db       *sql.DB
	hasher   *auth.PasswordHasher
	recorder *audit.Recorder
}

func NewOrganizationHandler(db *sql.DB, recorder *audit.Recorder) *OrganizationHandler {
	return &OrganizationHandler{
		db:       db,
		hasher:   auth.NewPasswordHasher(),
		recorder: recorder,
	}
}

type RegisterOrganizationRequest struct {
	LegalName         string `json:"legalName"`
	DisplayName       string `json:"displayName"`
	Email             string `json:"email"`
	ContactPersonName string `json:"contactPersonName"`
	ContactPhone      string `json:"contactPhone"`
	Password          string `json:"password"`
	ConfirmPassword   string `json:"confirmPassword"`
	TermsAccepted     bool   `json:"termsAccepted"`
}

var emailRegex = regexp.MustCompile(`^[^\s@]+@[^\s@]+\.[^\s@]+$`)

func (h *OrganizationHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req RegisterOrganizationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		responses.BadRequest(w, "Invalid JSON payload", nil)
		return
	}

	cleanEmail := strings.ToLower(strings.TrimSpace(req.Email))
	cleanLegalName := strings.TrimSpace(req.LegalName)
	cleanContactName := strings.TrimSpace(req.ContactPersonName)

	if !emailRegex.MatchString(cleanEmail) {
		responses.BadRequest(w, "Please enter a valid official email address.", nil)
		return
	}
	if len(req.Password) < 8 {
		responses.BadRequest(w, "Password must be at least 8 characters long.", nil)
		return
	}
	if req.Password != req.ConfirmPassword {
		responses.BadRequest(w, "Passwords do not match.", nil)
		return
	}
	if !req.TermsAccepted {
		responses.BadRequest(w, "You must accept the terms of service and privacy notice to continue.", nil)
		return
	}
	if cleanLegalName == "" || cleanContactName == "" {
		responses.BadRequest(w, "Legal organization name and contact person name are required.", nil)
		return
	}

	// Check duplicates
	var existingCount int
	err := h.db.QueryRowContext(r.Context(), "SELECT COUNT(*) FROM organizations WHERE email = ? OR name = ?", cleanEmail, cleanLegalName).Scan(&existingCount)
	if err == nil && existingCount > 0 {
		responses.Conflict(w, "An organization with this email address or legal name is already registered.")
		return
	}

	orgID := "org-" + uuid.New().String()
	displayName := req.DisplayName
	if displayName == "" {
		displayName = cleanLegalName
	}

	slug := strings.ToLower(regexp.MustCompile(`[^a-zA-Z0-9]+`).ReplaceAllString(displayName, "-"))
	slug = strings.Trim(slug, "-")
	if slug == "" {
		slug = "org-" + orgID[:8]
	}

	passwordHash, err := h.hasher.HashPassword(req.Password)
	if err != nil {
		responses.InternalServerError(w, "Password hashing failed")
		return
	}

	tx, err := h.db.BeginTx(r.Context(), nil)
	if err != nil {
		responses.InternalServerError(w, "Database transaction failed")
		return
	}
	defer tx.Rollback()

	now := time.Now().UTC()

	// 1. Insert organization
	insertOrg := `
	INSERT INTO organizations (
		id, name, display_name, slug, email, phone, status, tier,
		initial_admin_email, initial_admin_name, is_email_verified, setup_completed, setup_step, created_at, updated_at
	) VALUES (?, ?, ?, ?, ?, ?, 'pending_verification', 'starter', ?, ?, false, false, 1, ?, ?)`

	_, err = tx.ExecContext(r.Context(), insertOrg, orgID, cleanLegalName, displayName, slug, cleanEmail, req.ContactPhone, cleanEmail, cleanContactName, now, now)
	if err != nil {
		log.Printf("[ORG ERROR] Organization insert failed: %v", err)
		responses.InternalServerError(w, "Failed to create organization record")
		return
	}

	// 2. Insert default settings
	insertSettings := `
	INSERT INTO organization_settings (
		organization_id, timezone, date_format, require_biometric_liveness, require_geofence,
		allow_offline_attendance, max_offline_hours, auto_sync_interval_minutes, created_at, updated_at
	) VALUES (?, 'UTC', 'YYYY-MM-DD', true, true, true, 48, 5, ?, ?)`

	_, err = tx.ExecContext(r.Context(), insertSettings, orgID, now, now)
	if err != nil {
		log.Printf("[ORG ERROR] Settings insert failed: %v", err)
		responses.InternalServerError(w, "Failed to create organization settings")
		return
	}

	// 3. Create initial Admin user
	adminID := "user-admin-" + uuid.New().String()
	insertAdmin := `
	INSERT INTO users (
		id, organization_id, employee_id, name, email, password_hash, role,
		phone, is_active, biometric_status, joined_date, created_at, updated_at
	) VALUES (?, ?, 'ADM-001', ?, ?, ?, 'org_admin', ?, true, 'pending', ?, ?, ?)`

	_, err = tx.ExecContext(r.Context(), insertAdmin, adminID, orgID, cleanContactName, cleanEmail, passwordHash, req.ContactPhone, now.Format("2006-01-02"), now, now)
	if err != nil {
		log.Printf("[ORG ERROR] Admin user insert failed: %v", err)
		responses.InternalServerError(w, "Failed to create administrator account")
		return
	}

	// 4. Create verification token (valid for 24h)
	tokenStr, _ := auth.GenerateVerificationToken()
	insertToken := `
	INSERT INTO verification_tokens (token, email, organization_id, expires_at, created_at)
	VALUES (?, ?, ?, ?, ?)`

	_, err = tx.ExecContext(r.Context(), insertToken, tokenStr, cleanEmail, orgID, now.Add(24*time.Hour), now)
	if err != nil {
		log.Printf("[ORG ERROR] Token insert failed: %v", err)
		responses.InternalServerError(w, "Failed to issue email verification token")
		return
	}

	if err := tx.Commit(); err != nil {
		responses.InternalServerError(w, "Failed to commit registration transaction")
		return
	}

	// Log verification link for local development
	log.Printf("[DEV MAIL] Organization registered: %s <%s>", displayName, cleanEmail)
	log.Printf("[DEV MAIL] Verification Link: http://localhost:3000/verify-email?token=%s&email=%s", tokenStr, cleanEmail)

	h.recorder.Record(r.Context(), domain.AuditLog{
		OrganizationID:   orgID,
		ActorID:          "ADM-001",
		ActorName:        cleanContactName,
		ActorRole:        "org_admin",
		Action:           "organization_registered",
		AffectedResource: fmt.Sprintf("Organization #%s", orgID),
		ResourceID:       orgID,
		Details:          fmt.Sprintf("Organization %s registered. Initial administrator provisioned.", cleanLegalName),
		Outcome:          "success",
		IPAddress:        r.RemoteAddr,
		UserAgent:        r.UserAgent(),
	})

	responses.JSON(w, http.StatusOK, map[string]interface{}{
		"organizationId":          orgID,
		"organizationName":        displayName,
		"adminEmail":              cleanEmail,
		"verificationTokenIssued": true,
		"status":                  "pending_verification",
		"message":                 fmt.Sprintf("Registration initiated. A verification token has been issued to %s.", cleanEmail),
	})
}

type VerifyEmailRequest struct {
	Token string `json:"token"`
	Email string `json:"email,omitempty"`
}

func (h *OrganizationHandler) VerifyEmail(w http.ResponseWriter, r *http.Request) {
	var req VerifyEmailRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		responses.BadRequest(w, "Invalid JSON payload", nil)
		return
	}

	cleanToken := strings.TrimSpace(req.Token)
	if cleanToken == "" {
		responses.BadRequest(w, "Verification token is required.", nil)
		return
	}

	var orgID, email string
	var expiresAt time.Time
	var consumedAt sql.NullTime

	query := `SELECT organization_id, email, expires_at, consumed_at FROM verification_tokens WHERE token = ? LIMIT 1`
	err := h.db.QueryRowContext(r.Context(), query, cleanToken).Scan(&orgID, &email, &expiresAt, &consumedAt)
	if err != nil {
		responses.BadRequest(w, "Invalid verification token. Please request a new verification link.", nil)
		return
	}

	if consumedAt.Valid {
		responses.BadRequest(w, "This verification token has already been consumed.", nil)
		return
	}

	if time.Now().UTC().After(expiresAt) {
		responses.BadRequest(w, "This verification token has expired. Please request a new verification email.", nil)
		return
	}

	now := time.Now().UTC()
	tx, err := h.db.BeginTx(r.Context(), nil)
	if err != nil {
		responses.InternalServerError(w, "Transaction start error")
		return
	}
	defer tx.Rollback()

	_, err = tx.ExecContext(r.Context(), "UPDATE verification_tokens SET consumed_at = ? WHERE token = ?", now, cleanToken)
	if err != nil {
		responses.InternalServerError(w, "Failed to update token state")
		return
	}

	_, err = tx.ExecContext(r.Context(), "UPDATE organizations SET is_email_verified = true, status = 'active', updated_at = ? WHERE id = ?", now, orgID)
	if err != nil {
		responses.InternalServerError(w, "Failed to update organization verification status")
		return
	}

	if err := tx.Commit(); err != nil {
		responses.InternalServerError(w, "Failed to commit verification transaction")
		return
	}

	org, err := h.fetchOrgByID(r.Context(), orgID)
	if err != nil {
		responses.InternalServerError(w, "Failed to fetch updated organization")
		return
	}

	h.recorder.Record(r.Context(), domain.AuditLog{
		OrganizationID:   orgID,
		ActorID:          email,
		ActorName:        org.InitialAdminName,
		ActorRole:        "org_admin",
		Action:           "email_verified",
		AffectedResource: fmt.Sprintf("Organization #%s", orgID),
		ResourceID:       orgID,
		Details:          "Official organization email verified via security token.",
		Outcome:          "success",
		IPAddress:        r.RemoteAddr,
		UserAgent:        r.UserAgent(),
	})

	responses.JSON(w, http.StatusOK, map[string]interface{}{
		"success":      true,
		"organization": org,
		"message":      "Official organization email verified successfully. Your tenant environment is now active.",
	})
}

func (h *OrganizationHandler) ResendVerification(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email string `json:"email"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		responses.BadRequest(w, "Invalid JSON payload", nil)
		return
	}

	cleanEmail := strings.ToLower(strings.TrimSpace(req.Email))
	var orgID string
	err := h.db.QueryRowContext(r.Context(), "SELECT id FROM organizations WHERE email = ? AND is_email_verified = false", cleanEmail).Scan(&orgID)
	if err == nil {
		newToken, _ := auth.GenerateVerificationToken()
		now := time.Now().UTC()
		_, _ = h.db.ExecContext(r.Context(), "INSERT INTO verification_tokens (token, email, organization_id, expires_at, created_at) VALUES (?, ?, ?, ?, ?)",
			newToken, cleanEmail, orgID, now.Add(24*time.Hour), now)

		log.Printf("[DEV MAIL] Resent verification token for %s: %s", cleanEmail, newToken)
		log.Printf("[DEV MAIL] Link: http://localhost:3000/verify-email?token=%s&email=%s", newToken, cleanEmail)
	}

	// Always return success to protect against email enumeration
	responses.JSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "If an unverified registration exists for this email, a new verification link has been sent.",
	})
}

func (h *OrganizationHandler) GetCurrent(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgIDFromContext(r.Context())
	if orgID == "" {
		orgID = r.Header.Get("X-Organization-Id")
	}

	if orgID == "" {
		// If only 1 organization exists in initial single-tenant deployment, retrieve it
		_ = h.db.QueryRowContext(r.Context(), "SELECT id FROM organizations ORDER BY created_at ASC LIMIT 1").Scan(&orgID)
	}

	if orgID == "" {
		responses.NotFound(w, "No active organization found.")
		return
	}

	org, err := h.fetchOrgByID(r.Context(), orgID)
	if err != nil {
		responses.NotFound(w, "Organization not found.")
		return
	}

	responses.JSON(w, http.StatusOK, org)
}

func (h *OrganizationHandler) ListOrganizations(w http.ResponseWriter, r *http.Request) {
	rows, err := h.db.QueryContext(r.Context(), "SELECT id FROM organizations ORDER BY created_at DESC")
	if err != nil {
		responses.InternalServerError(w, "Failed to query organizations")
		return
	}
	defer rows.Close()

	var orgs []domain.Organization
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err == nil {
			if org, err := h.fetchOrgByID(r.Context(), id); err == nil {
				orgs = append(orgs, *org)
			}
		}
	}

	responses.JSON(w, http.StatusOK, orgs)
}

type SetupOrganizationRequest struct {
	OrganizationID       string `json:"organizationId"`
	DisplayName          string `json:"displayName,omitempty"`
	Timezone             string `json:"timezone,omitempty"`
	Industry             string `json:"industry,omitempty"`
	FacilityName         string `json:"facilityName"`
	FacilityAddress      string `json:"facilityAddress"`
	Latitude             float64 `json:"latitude"`
	Longitude            float64 `json:"longitude"`
	GeofenceRadiusMeters int    `json:"geofenceRadiusMeters"`
	RequireBiometrics    bool   `json:"requireBiometrics"`
	AllowOffline         bool   `json:"allowOffline"`
	GracePeriodMinutes   int    `json:"gracePeriodMinutes"`
	ShiftName            string `json:"shiftName"`
	ShiftStartTime       string `json:"shiftStartTime"`
	ShiftEndTime         string `json:"shiftEndTime"`
	ShiftDays            []int  `json:"shiftDays"`
	InitialEmployees     []struct {
		Name           string          `json:"name"`
		Email          string          `json:"email"`
		Role           domain.UserRole `json:"role"`
		DepartmentName string          `json:"departmentName"`
	} `json:"initialEmployees,omitempty"`
}

func (h *OrganizationHandler) Setup(w http.ResponseWriter, r *http.Request) {
	var req SetupOrganizationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		responses.BadRequest(w, "Invalid setup payload", nil)
		return
	}

	orgID := req.OrganizationID
	if orgID == "" {
		orgID = middleware.GetOrgIDFromContext(r.Context())
	}
	if orgID == "" {
		responses.BadRequest(w, "Organization ID is required.", nil)
		return
	}

	tx, err := h.db.BeginTx(r.Context(), nil)
	if err != nil {
		responses.InternalServerError(w, "Database error starting setup transaction")
		return
	}
	defer tx.Rollback()

	now := time.Now().UTC()

	// 1. Create first facility
	facID := "fac-" + uuid.New().String()
	radius := req.GeofenceRadiusMeters
	if radius <= 0 {
		radius = 150
	}
	insertFac := `
	INSERT INTO facilities (
		id, organization_id, name, code, address, latitude, longitude,
		geofence_radius_meters, require_network_match, allow_offline_attendance,
		max_offline_hours, require_review_threshold_hours, status, created_at, updated_at
	) VALUES (?, ?, ?, 'FAC-001', ?, ?, ?, ?, false, ?, 48, 4, 'active', ?, ?)`

	_, err = tx.ExecContext(r.Context(), insertFac, facID, orgID, req.FacilityName, req.FacilityAddress, req.Latitude, req.Longitude, radius, req.AllowOffline, now, now)
	if err != nil {
		log.Printf("[SETUP ERROR] Facility insert failed: %v", err)
		responses.InternalServerError(w, "Failed to provision default facility")
		return
	}

	// 2. Create initial shift
	shiftID := "shift-" + uuid.New().String()
	daysJSON, _ := json.Marshal(req.ShiftDays)
	if len(req.ShiftDays) == 0 {
		daysJSON = []byte("[1,2,3,4,5]") // Mon-Fri
	}
	grace := req.GracePeriodMinutes
	if grace <= 0 {
		grace = 15
	}
	insertShift := `
	INSERT INTO shifts (
		id, organization_id, assigned_facility_id, name, code, start_time, end_time,
		grace_period_minutes, assigned_days, is_active, created_at, updated_at
	) VALUES (?, ?, ?, ?, 'SHF-001', ?, ?, ?, ?, true, ?, ?)`

	_, err = tx.ExecContext(r.Context(), insertShift, shiftID, orgID, facID, req.ShiftName, req.ShiftStartTime, req.ShiftEndTime, grace, daysJSON, now, now)
	if err != nil {
		log.Printf("[SETUP ERROR] Shift insert failed: %v", err)
		responses.InternalServerError(w, "Failed to provision initial shift")
		return
	}

	// 3. Update organization settings
	updateSettings := `
	UPDATE organization_settings
	SET default_grace_period_minutes = ?, default_geofence_radius_meters = ?,
	    require_biometric_liveness = ?, allow_offline_attendance = ?, updated_at = ?
	WHERE organization_id = ?`

	_, _ = tx.ExecContext(r.Context(), updateSettings, grace, radius, req.RequireBiometrics, req.AllowOffline, now, orgID)

	// 4. Update organization setup status
	updateOrg := `
	UPDATE organizations
	SET setup_completed = true, setup_step = 6, updated_at = ?
	WHERE id = ?`

	_, err = tx.ExecContext(r.Context(), updateOrg, now, orgID)
	if err != nil {
		responses.InternalServerError(w, "Failed to mark organization setup complete")
		return
	}

	// 5. Update admin user facility assignment
	_, _ = tx.ExecContext(r.Context(), "UPDATE users SET assigned_facility_id = ? WHERE organization_id = ? AND role = 'org_admin'", facID, orgID)

	// 6. Insert initial department and employees if provided
	if len(req.InitialEmployees) > 0 {
		deptID := "dept-general-" + orgID[:8]
		_, _ = tx.ExecContext(r.Context(), "INSERT IGNORE INTO departments (id, organization_id, name, code, created_at) VALUES (?, ?, 'General Staff', 'GEN', ?)", deptID, orgID, now)

		for i, emp := range req.InitialEmployees {
			empID := fmt.Sprintf("EMP-%d", 1001+i)
			hash, _ := h.hasher.HashPassword("Welcome123!")
			_, _ = tx.ExecContext(r.Context(), `
				INSERT IGNORE INTO users (id, organization_id, employee_id, name, email, password_hash, role, department_id, assigned_facility_id, is_active, biometric_status, joined_date, created_at, updated_at)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, true, 'not_enrolled', ?, ?, ?)`,
				"user-"+uuid.New().String(), orgID, empID, emp.Name, strings.ToLower(emp.Email), hash, emp.Role, deptID, facID, now.Format("2006-01-02"), now, now)
		}
	}

	if err := tx.Commit(); err != nil {
		responses.InternalServerError(w, "Failed to commit setup transaction")
		return
	}

	org, err := h.fetchOrgByID(r.Context(), orgID)
	if err != nil {
		responses.InternalServerError(w, "Failed to fetch updated organization")
		return
	}

	h.recorder.Record(r.Context(), domain.AuditLog{
		OrganizationID:   orgID,
		ActorID:          org.InitialAdminEmail,
		ActorName:        org.InitialAdminName,
		ActorRole:        "org_admin",
		Action:           "organization_setup_completed",
		AffectedResource: fmt.Sprintf("Organization #%s", orgID),
		ResourceID:       orgID,
		Details:          fmt.Sprintf("Organization setup wizard completed. Provisioned facility '%s' and shift '%s'.", req.FacilityName, req.ShiftName),
		Outcome:          "success",
		IPAddress:        r.RemoteAddr,
		UserAgent:        r.UserAgent(),
	})

	responses.JSON(w, http.StatusOK, org)
}

func (h *OrganizationHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		responses.BadRequest(w, "Organization ID is required in URL path", nil)
		return
	}

	var updates map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&updates); err != nil {
		responses.BadRequest(w, "Invalid JSON payload", nil)
		return
	}

	// Update permitted fields
	if name, ok := updates["displayName"].(string); ok && name != "" {
		_, _ = h.db.ExecContext(r.Context(), "UPDATE organizations SET display_name = ?, updated_at = ? WHERE id = ?", name, time.Now().UTC(), id)
	}
	if phone, ok := updates["phone"].(string); ok && phone != "" {
		_, _ = h.db.ExecContext(r.Context(), "UPDATE organizations SET phone = ?, updated_at = ? WHERE id = ?", phone, time.Now().UTC(), id)
	}
	if address, ok := updates["address"].(string); ok && address != "" {
		_, _ = h.db.ExecContext(r.Context(), "UPDATE organizations SET address = ?, updated_at = ? WHERE id = ?", address, time.Now().UTC(), id)
	}

	org, err := h.fetchOrgByID(r.Context(), id)
	if err != nil {
		responses.NotFound(w, "Organization not found")
		return
	}

	responses.JSON(w, http.StatusOK, org)
}

func (h *OrganizationHandler) fetchOrgByID(ctx context.Context, id string) (*domain.Organization, error) {
	query := `
	SELECT o.id, o.name, o.display_name, o.slug, o.email, o.phone, COALESCE(o.address, ''),
	       o.status, o.tier, o.initial_admin_email, o.initial_admin_name,
	       o.is_email_verified, o.setup_completed, o.setup_step, o.created_at, o.updated_at,
	       s.timezone, s.date_format, s.require_biometric_liveness, s.require_geofence,
	       s.allow_offline_attendance, s.max_offline_hours, s.auto_sync_interval_minutes
	FROM organizations o
	LEFT JOIN organization_settings s ON o.id = s.organization_id
	WHERE o.id = ?
	LIMIT 1`

	var org domain.Organization
	var createdAt, updatedAt time.Time
	var timezone, dateFormat sql.NullString
	var reqBio, reqGeo, allowOff sql.NullBool
	var maxOff, autoSync sql.NullInt32

	err := h.db.QueryRowContext(ctx, query, id).Scan(
		&org.ID, &org.Name, &org.DisplayName, &org.Slug, &org.Email, &org.Phone, &org.Address,
		&org.Status, &org.Tier, &org.InitialAdminEmail, &org.InitialAdminName,
		&org.IsEmailVerified, &org.SetupCompleted, &org.SetupStep, &createdAt, &updatedAt,
		&timezone, &dateFormat, &reqBio, &reqGeo, &allowOff, &maxOff, &autoSync,
	)
	if err != nil {
		return nil, err
	}

	org.CreatedAt = createdAt.Format(time.RFC3339)
	org.UpdatedAt = updatedAt.Format(time.RFC3339)

	org.Settings = domain.OrganizationSettings{
		Timezone:                "UTC",
		DateFormat:              "YYYY-MM-DD",
		RequireBiometricLiveness: true,
		RequireGeofence:         true,
		AllowOfflineAttendance:  true,
		MaxOfflineHours:         48,
		AutoSyncIntervalMinutes: 5,
	}

	if timezone.Valid {
		org.Settings.Timezone = timezone.String
	}
	if dateFormat.Valid {
		org.Settings.DateFormat = dateFormat.String
	}
	if reqBio.Valid {
		org.Settings.RequireBiometricLiveness = reqBio.Bool
	}
	if reqGeo.Valid {
		org.Settings.RequireGeofence = reqGeo.Bool
	}
	if allowOff.Valid {
		org.Settings.AllowOfflineAttendance = allowOff.Bool
	}
	if maxOff.Valid {
		org.Settings.MaxOfflineHours = int(maxOff.Int32)
	}
	if autoSync.Valid {
		org.Settings.AutoSyncIntervalMinutes = int(autoSync.Int32)
	}

	return &org, nil
}
