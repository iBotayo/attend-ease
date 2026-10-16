package tests

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"attendease/internal/auth"
	"attendease/internal/config"
	"attendease/internal/database"
	appHttp "attendease/internal/http"

	"github.com/google/uuid"
)

// TestAdminResetPassword_EndToEnd checks the admin reset flow against the MySQL test
// database, including tenant isolation and role restrictions.
func TestAdminResetPassword_EndToEnd(t *testing.T) {
	cfg, err := config.Load()
	if err != nil {
		t.Fatalf("Failed to load config: %v", err)
	}
	cfg.DBName = "attend_ease_test"

	db, err := database.Connect(cfg)
	if err != nil {
		t.Skipf("MySQL test database unavailable (%v). Run 'sudo mysql < backend/scripts/setup_db.sql' to enable.", err)
	}
	defer db.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()
	if err := database.RunMigrations(ctx, db.DB, "../migrations"); err != nil {
		t.Fatalf("Migrations failed: %v", err)
	}

	hasher := auth.NewPasswordHasher()
	knownPassword := "Sunrise2026"
	knownHash, err := hasher.HashPassword(knownPassword)
	if err != nil {
		t.Fatalf("Hashing failed: %v", err)
	}

	suffix := uuid.New().String()[:8]
	makeOrg := func(tag string) string {
		orgID := "org-rst" + tag + "-" + suffix
		if _, err := db.ExecContext(ctx, `
			INSERT INTO organizations (id, name, display_name, slug, email, phone, status, tier, initial_admin_email, initial_admin_name,
				is_email_verified, setup_completed, setup_step, created_at, updated_at)
			VALUES (?, ?, 'Reset Test', ?, ?, '0000000000', 'active', 'starter', ?, 'Admin', true, true, 6, NOW(), NOW())`,
			orgID, "Reset Org "+tag+suffix, "rst-"+tag+"-"+suffix, tag+"-"+suffix+"@org.example.com", tag+"-"+suffix+"@org.example.com"); err != nil {
			t.Fatalf("Failed to insert organization: %v", err)
		}
		t.Cleanup(func() {
			_, _ = db.ExecContext(context.Background(), "DELETE FROM organizations WHERE id = ?", orgID)
		})
		return orgID
	}
	makeUser := func(orgID, tag, role string) (id, email string) {
		id = "user-rst-" + tag + "-" + suffix
		email = "rst-" + tag + "-" + suffix + "@example.com"
		if _, err := db.ExecContext(ctx, `
			INSERT INTO users (id, organization_id, employee_id, name, email, password_hash, must_change_password, role,
				is_active, biometric_status, joined_date, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, false, ?, true, 'not_enrolled', CURDATE(), NOW(), NOW())`,
			id, orgID, "EMP-"+tag, "Reset "+tag, email, knownHash, role); err != nil {
			t.Fatalf("Failed to insert user %s: %v", tag, err)
		}
		return id, email
	}

	orgA := makeOrg("a")
	orgB := makeOrg("b")
	adminID, adminEmail := makeUser(orgA, "admin", "org_admin")
	staffID, staffEmail := makeUser(orgA, "staff", "employee")
	outsiderID, _ := makeUser(orgB, "outsider", "employee")

	router := appHttp.NewRouter(cfg, db.DB, nil)
	do := func(method, path, token string, payload interface{}) *httptest.ResponseRecorder {
		var buf bytes.Buffer
		if payload != nil {
			_ = json.NewEncoder(&buf).Encode(payload)
		}
		req := httptest.NewRequest(method, path, &buf)
		req.Header.Set("Content-Type", "application/json")
		if token != "" {
			req.Header.Set("Authorization", "Bearer "+token)
		}
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)
		return rec
	}
	login := func(email, password string) (int, loginResponse) {
		rec := do(http.MethodPost, "/api/v1/auth/login", "", map[string]string{"identifier": email, "password": password})
		var lr loginResponse
		_ = json.NewDecoder(rec.Body).Decode(&lr)
		return rec.Code, lr
	}
	resetPath := func(id string) string { return "/api/v1/employees/" + id + "/reset-password" }

	_, admin := login(adminEmail, knownPassword)
	_, staff := login(staffEmail, knownPassword)

	// Employees cannot reset anyone.
	if rec := do(http.MethodPost, resetPath(adminID), staff.Token, nil); rec.Code != http.StatusForbidden {
		t.Errorf("Employee resetting admin: expected 403, got %d", rec.Code)
	}
	// Admins cannot reach another organization's users.
	if rec := do(http.MethodPost, resetPath(outsiderID), admin.Token, nil); rec.Code != http.StatusNotFound {
		t.Errorf("Cross-organization reset: expected 404, got %d", rec.Code)
	}
	// Admins must use change-password for themselves.
	if rec := do(http.MethodPost, resetPath(adminID), admin.Token, nil); rec.Code != http.StatusBadRequest {
		t.Errorf("Self reset: expected 400, got %d", rec.Code)
	}

	// Valid reset.
	rec := do(http.MethodPost, resetPath(staffID), admin.Token, nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("Reset staff password: expected 200, got %d (%s)", rec.Code, rec.Body.String())
	}
	var reset struct {
		TemporaryPassword string `json:"temporaryPassword"`
	}
	_ = json.NewDecoder(rec.Body).Decode(&reset)
	if err := auth.ValidatePasswordStrength(reset.TemporaryPassword); err != nil {
		t.Fatalf("Temporary password %q fails policy: %v", reset.TemporaryPassword, err)
	}

	// The employee's existing session is revoked, the old password is gone,
	// and the temporary password logs in flagged for change.
	if rec := do(http.MethodGet, "/api/v1/auth/me", staff.Token, nil); rec.Code != http.StatusUnauthorized {
		t.Errorf("Staff session after reset: expected 401, got %d", rec.Code)
	}
	if code, _ := login(staffEmail, knownPassword); code != http.StatusUnauthorized {
		t.Errorf("Login with old password after reset: expected 401, got %d", code)
	}
	code, after := login(staffEmail, reset.TemporaryPassword)
	if code != http.StatusOK || !after.User.MustChangePassword {
		t.Errorf("Login with temporary password: expected 200 and flagged, got %d flagged=%v", code, after.User.MustChangePassword)
	}
}
