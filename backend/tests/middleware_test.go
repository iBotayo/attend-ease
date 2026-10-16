package tests

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"attendease/internal/domain"
	"attendease/internal/http/middleware"
	"attendease/internal/http/responses"
)

// okHandler is the downstream handler; reaching it means the middleware let the request through.
var okHandler = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
})

// withUser simulates what middleware.Authenticate does after a valid session lookup.
func withUser(r *http.Request, u *domain.User) *http.Request {
	ctx := context.WithValue(r.Context(), middleware.UserContextKey, u)
	ctx = context.WithValue(ctx, middleware.OrgIDContextKey, u.OrganizationID)
	return r.WithContext(ctx)
}

func newUser(role domain.UserRole, orgID string, active bool) *domain.User {
	return &domain.User{ID: "usr-test", OrganizationID: orgID, Role: role, IsActive: active}
}

func assertErrorCode(t *testing.T, rec *httptest.ResponseRecorder, wantStatus int, wantCode string) {
	t.Helper()
	if rec.Code != wantStatus {
		t.Fatalf("Expected status %d, got %d", wantStatus, rec.Code)
	}
	var errResp responses.ErrorResponse
	if err := json.NewDecoder(rec.Body).Decode(&errResp); err != nil {
		t.Fatalf("Failed to parse error response: %v", err)
	}
	if errResp.Code != wantCode {
		t.Errorf("Expected error code %s, got %s", wantCode, errResp.Code)
	}
}

func TestRequireAuth_DeactivatedUserForbidden(t *testing.T) {
	req := withUser(httptest.NewRequest(http.MethodGet, "/", nil), newUser(domain.RoleEmployee, "org-a", false))
	rec := httptest.NewRecorder()

	middleware.RequireAuth(okHandler).ServeHTTP(rec, req)

	assertErrorCode(t, rec, http.StatusForbidden, "FORBIDDEN")
}

func TestRequireAuth_ActiveUserAllowed(t *testing.T) {
	req := withUser(httptest.NewRequest(http.MethodGet, "/", nil), newUser(domain.RoleEmployee, "org-a", true))
	rec := httptest.NewRecorder()

	middleware.RequireAuth(okHandler).ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("Expected status 200 for active user, got %d", rec.Code)
	}
}

func TestRequireRole(t *testing.T) {
	guard := middleware.RequireRole(domain.RoleOrgAdmin, domain.RoleFacilityAdmin)(okHandler)

	cases := []struct {
		name       string
		user       *domain.User
		wantStatus int
	}{
		{"no user", nil, http.StatusUnauthorized},
		{"employee denied", newUser(domain.RoleEmployee, "org-a", true), http.StatusForbidden},
		{"supervisor denied", newUser(domain.RoleSupervisor, "org-a", true), http.StatusForbidden},
		{"org admin allowed", newUser(domain.RoleOrgAdmin, "org-a", true), http.StatusOK},
		{"facility admin allowed", newUser(domain.RoleFacilityAdmin, "org-a", true), http.StatusOK},
		{"system admin always allowed", newUser(domain.RoleSystemAdmin, "", true), http.StatusOK},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/", nil)
			if tc.user != nil {
				req = withUser(req, tc.user)
			}
			rec := httptest.NewRecorder()

			guard.ServeHTTP(rec, req)

			if rec.Code != tc.wantStatus {
				t.Errorf("Expected status %d, got %d", tc.wantStatus, rec.Code)
			}
		})
	}
}

func TestEnforceTenant(t *testing.T) {
	cases := []struct {
		name       string
		user       *domain.User
		headerOrg  string
		wantStatus int
	}{
		{"matching org header", newUser(domain.RoleOrgAdmin, "org-a", true), "org-a", http.StatusOK},
		{"mismatched org header", newUser(domain.RoleOrgAdmin, "org-a", true), "org-b", http.StatusForbidden},
		{"no org header", newUser(domain.RoleEmployee, "org-a", true), "", http.StatusOK},
		{"system admin may switch org", newUser(domain.RoleSystemAdmin, "org-a", true), "org-b", http.StatusOK},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			req := withUser(httptest.NewRequest(http.MethodGet, "/", nil), tc.user)
			if tc.headerOrg != "" {
				req.Header.Set("X-Organization-Id", tc.headerOrg)
			}
			rec := httptest.NewRecorder()

			middleware.EnforceTenant(okHandler).ServeHTTP(rec, req)

			if rec.Code != tc.wantStatus {
				t.Errorf("Expected status %d, got %d", tc.wantStatus, rec.Code)
			}
		})
	}
}

func TestRateLimiter_BlocksAfterBurst(t *testing.T) {
	// Zero refill rate makes the test deterministic: only the burst capacity is available.
	limiter := middleware.NewRateLimiter(0, 3)
	handler := limiter.Limit(okHandler)

	send := func(ip string) *httptest.ResponseRecorder {
		req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", nil)
		req.RemoteAddr = ip + ":12345"
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		return rec
	}

	for i := 1; i <= 3; i++ {
		if rec := send("10.0.0.1"); rec.Code != http.StatusOK {
			t.Fatalf("Request %d within burst: expected 200, got %d", i, rec.Code)
		}
	}

	rec := send("10.0.0.1")
	assertErrorCode(t, rec, http.StatusTooManyRequests, "RATE_LIMIT_EXCEEDED")
	if rec.Header().Get("Retry-After") == "" {
		t.Error("Expected Retry-After header on 429 response")
	}

	// A different client has its own bucket.
	if rec := send("10.0.0.2"); rec.Code != http.StatusOK {
		t.Errorf("Expected separate client to be allowed, got %d", rec.Code)
	}
}

func TestRecoveryMiddleware_PanicReturns500(t *testing.T) {
	panicky := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		panic("boom")
	})
	rec := httptest.NewRecorder()

	middleware.Recovery(panicky).ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/", nil))

	if rec.Code != http.StatusInternalServerError {
		t.Errorf("Expected status 500 after panic, got %d", rec.Code)
	}
}

func TestRequireAuth_MustChangePasswordBlocksOtherRoutes(t *testing.T) {
	flagged := newUser(domain.RoleEmployee, "org-a", true)
	flagged.MustChangePassword = true

	cases := []struct {
		path       string
		wantStatus int
	}{
		{"/api/v1/employees", http.StatusForbidden},
		{"/api/v1/auth/change-password", http.StatusOK},
		{"/api/v1/auth/me", http.StatusOK},
		{"/api/v1/auth/logout", http.StatusOK},
	}

	for _, tc := range cases {
		t.Run(tc.path, func(t *testing.T) {
			req := withUser(httptest.NewRequest(http.MethodGet, tc.path, nil), flagged)
			rec := httptest.NewRecorder()

			middleware.RequireAuth(okHandler).ServeHTTP(rec, req)

			if tc.wantStatus == http.StatusForbidden {
				assertErrorCode(t, rec, http.StatusForbidden, "PASSWORD_CHANGE_REQUIRED")
			} else if rec.Code != tc.wantStatus {
				t.Errorf("Expected %d, got %d", tc.wantStatus, rec.Code)
			}
		})
	}
}
