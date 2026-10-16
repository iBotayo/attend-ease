package middleware

import (
	"net/http"

	"attendease/internal/domain"
	"attendease/internal/http/responses"
)

func EnforceTenant(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user := GetUserFromContext(r.Context())
		headerOrgID := r.Header.Get("X-Organization-Id")

		if user != nil {
			// If user is a standard org user and supplied an X-Organization-Id header, verify it matches
			if headerOrgID != "" && user.Role != domain.RoleSystemAdmin {
				if user.OrganizationID != "" && headerOrgID != user.OrganizationID {
					responses.Forbidden(w, "Organization header mismatch: you cannot access resources belonging to another organization.")
					return
				}
			}
		}

		next.ServeHTTP(w, r)
	})
}
