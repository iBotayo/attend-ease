package middleware

import (
	"context"
	"database/sql"
	"net/http"
	"strings"
	"time"

	"attendease/internal/auth"
	"attendease/internal/domain"
	"attendease/internal/http/responses"
)

type contextKey string

const (
	UserContextKey   contextKey = "auth_user"
	OrgIDContextKey  contextKey = "auth_org_id"
	SessionContextKey contextKey = "auth_session_id"
)

func GetUserFromContext(ctx context.Context) *domain.User {
	if val, ok := ctx.Value(UserContextKey).(*domain.User); ok {
		return val
	}
	return nil
}

func GetOrgIDFromContext(ctx context.Context) string {
	if val, ok := ctx.Value(OrgIDContextKey).(string); ok {
		return val
	}
	return ""
}

func Authenticate(db *sql.DB) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
				next.ServeHTTP(w, r)
				return
			}

			rawToken := strings.TrimPrefix(authHeader, "Bearer ")
			rawToken = strings.TrimSpace(rawToken)
			if rawToken == "" {
				next.ServeHTTP(w, r)
				return
			}

			tokenHash := auth.HashToken(rawToken)

			query := `
			SELECT s.id, s.organization_id, s.expires_at, s.revoked_at,
			       u.id, u.organization_id, COALESCE(o.display_name, ''), u.employee_id, u.name, u.email,
			       u.role, COALESCE(u.department_id, ''), COALESCE(d.name, 'General Staff'),
			       COALESCE(u.assigned_facility_id, ''), COALESCE(f.name, 'Default Facility'),
			       COALESCE(u.avatar_url, ''), COALESCE(u.phone, ''), u.is_active,
			       u.biometric_status, u.joined_date, u.must_change_password
			FROM user_sessions s
			JOIN users u ON s.user_id = u.id
			LEFT JOIN organizations o ON u.organization_id = o.id
			LEFT JOIN departments d ON u.department_id = d.id
			LEFT JOIN facilities f ON u.assigned_facility_id = f.id
			WHERE s.token_hash = ? AND (s.revoked_at IS NULL) AND s.expires_at > ?
			LIMIT 1`

			var sessionID, sessionOrgID string
			var expiresAt time.Time
			var revokedAt sql.NullTime
			var u domain.User
			var joinedDate time.Time

			err := db.QueryRowContext(r.Context(), query, tokenHash, time.Now().UTC()).Scan(
				&sessionID, &sessionOrgID, &expiresAt, &revokedAt,
				&u.ID, &u.OrganizationID, &u.OrganizationName, &u.EmployeeID, &u.Name, &u.Email,
				&u.Role, &u.DepartmentID, &u.DepartmentName,
				&u.AssignedFacilityID, &u.AssignedFacilityName,
				&u.AvatarURL, &u.Phone, &u.IsActive,
				&u.BiometricStatus, &joinedDate, &u.MustChangePassword,
			)

			if err == nil {
				u.JoinedDate = joinedDate.Format("2006-01-02")
				ctx := context.WithValue(r.Context(), UserContextKey, &u)
				ctx = context.WithValue(ctx, OrgIDContextKey, u.OrganizationID)
				ctx = context.WithValue(ctx, SessionContextKey, sessionID)
				r = r.WithContext(ctx)
			}

			next.ServeHTTP(w, r)
		})
	}
}

func RequireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user := GetUserFromContext(r.Context())
		if user == nil {
			responses.Unauthorized(w, "Authentication required. Please log in with valid credentials.")
			return
		}

		if !user.IsActive {
			responses.Forbidden(w, "This account has been deactivated. Please contact your organization administrator.")
			return
		}

		if user.MustChangePassword && !passwordChangeAllowedPaths[r.URL.Path] {
			responses.Error(w, http.StatusForbidden, "PASSWORD_CHANGE_REQUIRED", "You must change your temporary password before continuing.", nil)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// passwordChangeAllowedPaths are the only authenticated routes a user flagged with
// must_change_password may call until they set their own password.
var passwordChangeAllowedPaths = map[string]bool{
	"/api/v1/auth/change-password": true,
	"/api/v1/auth/me":              true,
	"/api/v1/auth/logout":          true,
}

func RequireRole(allowedRoles ...domain.UserRole) func(http.Handler) http.Handler {
	allowedMap := make(map[domain.UserRole]bool)
	for _, role := range allowedRoles {
		allowedMap[role] = true
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			user := GetUserFromContext(r.Context())
			if user == nil {
				responses.Unauthorized(w, "Authentication required.")
				return
			}

			// System Admin has platform-wide privilege
			if user.Role == domain.RoleSystemAdmin {
				next.ServeHTTP(w, r)
				return
			}

			if !allowedMap[user.Role] {
				responses.Forbidden(w, "Insufficient permissions for this action.")
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
