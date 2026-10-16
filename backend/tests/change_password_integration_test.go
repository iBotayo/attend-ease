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

func TestChangePasswordRoute_RequiresAuth(t *testing.T) {
	cfg, err := config.Load()
	if err != nil {
		t.Fatalf("Failed to load config: %v", err)
	}
	router := appHttp.NewRouter(cfg, nil, nil)

	body := bytes.NewBufferString(`{"currentPassword":"x","newPassword":"y"}`)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/change-password", body)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("Expected 401 for unauthenticated change-password, got %d", rec.Code)
	}
}

type loginResponse struct {
	Token string `json:"token"`
	User  struct {
		MustChangePassword bool `json:"mustChangePassword"`
	} `json:"user"`
}

// TestChangePassword_EndToEnd runs the full flow against the MySQL test database:
// a provisioned user logs in with the shared default, is flagged, changes password,
// and every other session is revoked.
func TestChangePassword_EndToEnd(t *testing.T) {
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

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := database.RunMigrations(ctx, db.DB, "../migrations"); err != nil {
		t.Fatalf("Migrations failed: %v", err)
	}

	suffix := uuid.New().String()[:8]
	orgID := "org-pwtest-" + suffix
	userID := "user-pwtest-" + suffix
	email := "pwtest-" + suffix + "@example.com"

	if _, err := db.ExecContext(ctx, `
		INSERT INTO organizations (id, name, display_name, slug, email, phone, status, tier, initial_admin_email, initial_admin_name,
			is_email_verified, setup_completed, setup_step, created_at, updated_at)
		VALUES (?, ?, 'PW Test', ?, ?, '0000000000', 'active', 'starter', ?, 'Admin', true, true, 6, NOW(), NOW())`,
		orgID, "PW Test Org "+suffix, "pw-test-"+suffix, "org-"+email, "org-"+email); err != nil {
		t.Fatalf("Failed to insert organization: %v", err)
	}
	t.Cleanup(func() {
		_, _ = db.ExecContext(context.Background(), "DELETE FROM organizations WHERE id = ?", orgID)
	})

	hash, err := auth.NewPasswordHasher().HashPassword(auth.DefaultNewEmployeePassword)
	if err != nil {
		t.Fatalf("Hashing failed: %v", err)
	}
	if _, err := db.ExecContext(ctx, `
		INSERT INTO users (id, organization_id, employee_id, name, email, password_hash, must_change_password, role,
			is_active, biometric_status, joined_date, created_at, updated_at)
		VALUES (?, ?, 'EMP-9001', 'PW Tester', ?, ?, true, 'employee', true, 'not_enrolled', CURDATE(), NOW(), NOW())`,
		userID, orgID, email, hash); err != nil {
		t.Fatalf("Failed to insert user: %v", err)
	}

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

	login := func(password string) (*httptest.ResponseRecorder, loginResponse) {
		rec := do(http.MethodPost, "/api/v1/auth/login", "", map[string]string{"identifier": email, "password": password})
		var lr loginResponse
		_ = json.NewDecoder(bytes.NewReader(rec.Body.Bytes())).Decode(&lr)
		return rec, lr
	}

	// 1. Provisioned user logs in with the default and is flagged.
	rec, session := login(auth.DefaultNewEmployeePassword)
	if rec.Code != http.StatusOK {
		t.Fatalf("Login with default password: expected 200, got %d (%s)", rec.Code, rec.Body.String())
	}
	if !session.User.MustChangePassword {
		t.Fatal("Expected mustChangePassword=true for provisioned user")
	}
	_, otherSession := login(auth.DefaultNewEmployeePassword)

	if rec := do(http.MethodGet, "/api/v1/employees", session.Token, nil); rec.Code != http.StatusForbidden {
		t.Errorf("Flagged user calling /employees: expected 403, got %d", rec.Code)
	}

	changePath := "/api/v1/auth/change-password"

	// 2. Rejections.
	rejects := []struct {
		name    string
		current string
		next    string
	}{
		{"wrong current password", "WrongPass123", "Sunrise2026"},
		{"weak new password", auth.DefaultNewEmployeePassword, "short"},
		{"temporary password reused", auth.DefaultNewEmployeePassword, auth.DefaultSetupInvitePassword},
		{"unchanged password", auth.DefaultNewEmployeePassword, auth.DefaultNewEmployeePassword},
	}
	for _, rc := range rejects {
		rec := do(http.MethodPost, changePath, session.Token, map[string]string{"currentPassword": rc.current, "newPassword": rc.next})
		if rec.Code != http.StatusBadRequest {
			t.Errorf("%s: expected 400, got %d (%s)", rc.name, rec.Code, rec.Body.String())
		}
	}

	// 3. Valid change.
	newPassword := "Sunrise2026"
	rec = do(http.MethodPost, changePath, session.Token, map[string]string{"currentPassword": auth.DefaultNewEmployeePassword, "newPassword": newPassword})
	if rec.Code != http.StatusOK {
		t.Fatalf("Valid change: expected 200, got %d (%s)", rec.Code, rec.Body.String())
	}

	// 4. Caller's session survives and is no longer flagged; the other session is revoked.
	rec = do(http.MethodGet, "/api/v1/auth/me", session.Token, nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("/auth/me with current session: expected 200, got %d", rec.Code)
	}
	var me struct {
		MustChangePassword bool `json:"mustChangePassword"`
	}
	_ = json.NewDecoder(rec.Body).Decode(&me)
	if me.MustChangePassword {
		t.Error("Expected mustChangePassword=false after change")
	}

	if rec := do(http.MethodGet, "/api/v1/auth/me", otherSession.Token, nil); rec.Code != http.StatusUnauthorized {
		t.Errorf("Other session after password change: expected 401, got %d", rec.Code)
	}

	if rec := do(http.MethodGet, "/api/v1/employees", session.Token, nil); rec.Code != http.StatusOK {
		t.Errorf("Unflagged user calling /employees: expected 200, got %d", rec.Code)
	}

	// 5. Old password no longer works, new one does.
	if rec, _ := login(auth.DefaultNewEmployeePassword); rec.Code != http.StatusUnauthorized {
		t.Errorf("Login with old password: expected 401, got %d", rec.Code)
	}
	if rec, lr := login(newPassword); rec.Code != http.StatusOK || lr.User.MustChangePassword {
		t.Errorf("Login with new password: expected 200 and unflagged, got %d flagged=%v", rec.Code, lr.User.MustChangePassword)
	}
}
