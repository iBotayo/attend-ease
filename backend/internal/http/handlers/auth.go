package handlers

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"time"

	"attendease/internal/audit"
	"attendease/internal/auth"
	"attendease/internal/domain"
	"attendease/internal/http/middleware"
	"attendease/internal/http/responses"
	"github.com/google/uuid"
)

type AuthHandler struct {
	db       *sql.DB
	hasher   *auth.PasswordHasher
	recorder *audit.Recorder
}

func NewAuthHandler(db *sql.DB, recorder *audit.Recorder) *AuthHandler {
	return &AuthHandler{
		db:       db,
		hasher:   auth.NewPasswordHasher(),
		recorder: recorder,
	}
}

type LoginRequest struct {
	Identifier string `json:"identifier"`
	Password   string `json:"password"`
	RememberMe bool   `json:"rememberMe"`
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		responses.BadRequest(w, "Invalid JSON request payload", nil)
		return
	}

	cleanID := strings.TrimSpace(req.Identifier)
	if cleanID == "" || len(req.Password) < 6 {
		responses.BadRequest(w, "Please provide valid credentials (identifier and password min 6 chars).", nil)
		return
	}

	query := `
	SELECT u.id, u.organization_id, COALESCE(o.display_name, ''), u.employee_id, u.name, u.email,
	       u.password_hash, u.role, COALESCE(u.department_id, ''), COALESCE(d.name, 'General Staff'),
	       COALESCE(u.assigned_facility_id, ''), COALESCE(f.name, 'Default Facility'),
	       COALESCE(u.avatar_url, ''), COALESCE(u.phone, ''), u.is_active,
	       u.biometric_status, u.enrolled_at, u.joined_date, u.must_change_password
	FROM users u
	LEFT JOIN organizations o ON u.organization_id = o.id
	LEFT JOIN departments d ON u.department_id = d.id
	LEFT JOIN facilities f ON u.assigned_facility_id = f.id
	WHERE (LOWER(u.email) = LOWER(?) OR LOWER(u.employee_id) = LOWER(?))
	LIMIT 1`

	var u domain.User
	var passwordHash string
	var enrolledAt sql.NullTime
	var joinedDate time.Time

	err := h.db.QueryRowContext(r.Context(), query, cleanID, cleanID).Scan(
		&u.ID, &u.OrganizationID, &u.OrganizationName, &u.EmployeeID, &u.Name, &u.Email,
		&passwordHash, &u.Role, &u.DepartmentID, &u.DepartmentName,
		&u.AssignedFacilityID, &u.AssignedFacilityName,
		&u.AvatarURL, &u.Phone, &u.IsActive,
		&u.BiometricStatus, &enrolledAt, &joinedDate, &u.MustChangePassword,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			responses.Unauthorized(w, "Invalid credentials. Check your employee ID or email.")
			return
		}
		log.Printf("[AUTH ERROR] Login query failed: %v", err)
		responses.InternalServerError(w, "Authentication query error")
		return
	}

	if enrolledAt.Valid {
		formatted := enrolledAt.Time.Format(time.RFC3339)
		u.EnrolledAt = &formatted
	}
	u.JoinedDate = joinedDate.Format("2006-01-02")

	// Verify Argon2id password hash
	matched, err := h.hasher.VerifyPassword(req.Password, passwordHash)
	if err != nil || !matched {
		h.recorder.Record(r.Context(), domain.AuditLog{
			OrganizationID:   u.OrganizationID,
			ActorID:          cleanID,
			ActorName:        "Unknown",
			ActorRole:        "Anonymous",
			Action:           "user_login",
			AffectedResource: "Authentication Session",
			Details:          "Failed login attempt: invalid password.",
			Outcome:          "failure",
			IPAddress:        r.RemoteAddr,
			UserAgent:        r.UserAgent(),
		})
		responses.Unauthorized(w, "Invalid credentials. Check your employee ID or email.")
		return
	}

	if !u.IsActive {
		responses.Forbidden(w, "This account has been deactivated. Please contact your organization administrator.")
		return
	}

	// Create session token
	rawToken, err := auth.GenerateSecureToken(32)
	if err != nil {
		responses.InternalServerError(w, "Failed to generate session token")
		return
	}

	tokenHash := auth.HashToken(rawToken)
	sessionID := "sess-" + uuid.New().String()

	duration := 24 * time.Hour
	if req.RememberMe {
		duration = 7 * 24 * time.Hour
	}
	expiresAt := time.Now().UTC().Add(duration)

	insertSession := `
	INSERT INTO user_sessions (id, user_id, organization_id, token_hash, expires_at, created_at)
	VALUES (?, ?, ?, ?, ?, ?)`

	_, err = h.db.ExecContext(r.Context(), insertSession, sessionID, u.ID, u.OrganizationID, tokenHash, expiresAt, time.Now().UTC())
	if err != nil {
		log.Printf("[AUTH ERROR] Session insertion failed: %v", err)
		responses.InternalServerError(w, "Failed to persist authentication session")
		return
	}

	h.recorder.Record(r.Context(), domain.AuditLog{
		OrganizationID:   u.OrganizationID,
		ActorID:          u.EmployeeID,
		ActorName:        u.Name,
		ActorRole:        string(u.Role),
		Action:           "user_login",
		AffectedResource: "Authentication Session",
		ResourceID:       sessionID,
		Details:          "User authenticated successfully via credentials.",
		Outcome:          "success",
		IPAddress:        r.RemoteAddr,
		UserAgent:        r.UserAgent(),
	})

	session := domain.AuthSession{
		User:      u,
		Token:     rawToken,
		ExpiresAt: expiresAt.Format(time.RFC3339),
	}

	responses.JSON(w, http.StatusOK, session)
}

func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r.Context())
	if user != nil {
		authHeader := r.Header.Get("Authorization")
		if strings.HasPrefix(authHeader, "Bearer ") {
			rawToken := strings.TrimSpace(strings.TrimPrefix(authHeader, "Bearer "))
			tokenHash := auth.HashToken(rawToken)
			_, _ = h.db.ExecContext(r.Context(), "UPDATE user_sessions SET revoked_at = ? WHERE token_hash = ?", time.Now().UTC(), tokenHash)
		}

		h.recorder.Record(r.Context(), domain.AuditLog{
			OrganizationID:   user.OrganizationID,
			ActorID:          user.EmployeeID,
			ActorName:        user.Name,
			ActorRole:        string(user.Role),
			Action:           "user_logout",
			AffectedResource: "Authentication Session",
			Details:          "User session terminated.",
			Outcome:          "success",
			IPAddress:        r.RemoteAddr,
			UserAgent:        r.UserAgent(),
		})
	}

	responses.JSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Logged out successfully",
	})
}

func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r.Context())
	if user == nil {
		responses.Unauthorized(w, "Unauthenticated")
		return
	}
	responses.JSON(w, http.StatusOK, user)
}

type ForgotPasswordRequest struct {
	Identifier string `json:"identifier"`
}

func (h *AuthHandler) ForgotPassword(w http.ResponseWriter, r *http.Request) {
	var req ForgotPasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		responses.BadRequest(w, "Invalid JSON payload", nil)
		return
	}

	cleanID := strings.TrimSpace(req.Identifier)
	if cleanID == "" {
		responses.BadRequest(w, "Please provide an email or Employee ID.", nil)
		return
	}

	// Safe generic response to protect against user enumeration
	responses.JSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "If an account exists with this identifier, password recovery instructions have been dispatched.",
	})
}

type ChangePasswordRequest struct {
	CurrentPassword string `json:"currentPassword"`
	NewPassword     string `json:"newPassword"`
}

// ChangePassword lets an authenticated user replace their password. It clears the
// must_change_password flag and revokes every other session, keeping only the caller's.
func (h *AuthHandler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r.Context())
	if user == nil {
		responses.Unauthorized(w, "Authentication required.")
		return
	}

	var req ChangePasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		responses.BadRequest(w, "Invalid JSON payload", nil)
		return
	}
	if req.CurrentPassword == "" || req.NewPassword == "" {
		responses.BadRequest(w, "Current password and new password are required.", nil)
		return
	}

	var currentHash string
	err := h.db.QueryRowContext(r.Context(), "SELECT password_hash FROM users WHERE id = ? AND organization_id = ?", user.ID, user.OrganizationID).Scan(&currentHash)
	if err != nil {
		log.Printf("[AUTH ERROR] Change password lookup failed: %v", err)
		responses.InternalServerError(w, "Failed to load account credentials")
		return
	}

	matched, err := h.hasher.VerifyPassword(req.CurrentPassword, currentHash)
	if err != nil || !matched {
		h.recorder.Record(r.Context(), domain.AuditLog{
			OrganizationID:   user.OrganizationID,
			ActorID:          user.EmployeeID,
			ActorName:        user.Name,
			ActorRole:        string(user.Role),
			Action:           "password_change",
			AffectedResource: "User Credentials",
			ResourceID:       user.ID,
			Details:          "Failed password change: current password incorrect.",
			Outcome:          "failure",
			IPAddress:        r.RemoteAddr,
			UserAgent:        r.UserAgent(),
		})
		responses.BadRequest(w, "Current password is incorrect.", nil)
		return
	}

	if req.NewPassword == req.CurrentPassword {
		responses.BadRequest(w, "New password must be different from your current password.", nil)
		return
	}
	if err := auth.ValidatePasswordStrength(req.NewPassword); err != nil {
		responses.BadRequest(w, strings.ToUpper(err.Error()[:1])+err.Error()[1:]+".", nil)
		return
	}

	newHash, err := h.hasher.HashPassword(req.NewPassword)
	if err != nil {
		responses.InternalServerError(w, "Password hashing failed")
		return
	}

	now := time.Now().UTC()
	tx, err := h.db.BeginTx(r.Context(), nil)
	if err != nil {
		responses.InternalServerError(w, "Database transaction failed")
		return
	}
	defer tx.Rollback()

	if _, err := tx.ExecContext(r.Context(),
		"UPDATE users SET password_hash = ?, must_change_password = false, updated_at = ? WHERE id = ? AND organization_id = ?",
		newHash, now, user.ID, user.OrganizationID); err != nil {
		log.Printf("[AUTH ERROR] Password update failed: %v", err)
		responses.InternalServerError(w, "Failed to update password")
		return
	}

	sessionID, _ := r.Context().Value(middleware.SessionContextKey).(string)
	if _, err := tx.ExecContext(r.Context(),
		"UPDATE user_sessions SET revoked_at = ? WHERE user_id = ? AND id <> ? AND revoked_at IS NULL",
		now, user.ID, sessionID); err != nil {
		log.Printf("[AUTH ERROR] Session revocation failed: %v", err)
		responses.InternalServerError(w, "Failed to revoke other sessions")
		return
	}

	if err := tx.Commit(); err != nil {
		responses.InternalServerError(w, "Failed to commit password change")
		return
	}

	h.recorder.Record(r.Context(), domain.AuditLog{
		OrganizationID:   user.OrganizationID,
		ActorID:          user.EmployeeID,
		ActorName:        user.Name,
		ActorRole:        string(user.Role),
		Action:           "password_change",
		AffectedResource: "User Credentials",
		ResourceID:       user.ID,
		Details:          "Password changed. Other active sessions revoked.",
		Outcome:          "success",
		IPAddress:        r.RemoteAddr,
		UserAgent:        r.UserAgent(),
	})

	updated := *user
	updated.MustChangePassword = false
	responses.JSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Password updated successfully.",
		"user":    updated,
	})
}
