package tests

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"attendease/internal/config"
	"attendease/internal/database"
	appHttp "attendease/internal/http"

	"github.com/google/uuid"
)

// TestOfflineSync_FaceScoreOnlyRejectsWhenBiometricEnabled covers the demo-face mode:
// with no face service (BIOMETRIC_ENABLED=false) an offline check-in carrying no face match
// must sync, while the same event is rejected once biometrics are switched on.
func TestOfflineSync_FaceScoreOnlyRejectsWhenBiometricEnabled(t *testing.T) {
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
	orgID := "org-sync-" + suffix
	facID := "fac-sync-" + suffix
	userID := "user-sync-" + suffix

	mustExec := func(query string, args ...interface{}) {
		if _, err := db.ExecContext(ctx, query, args...); err != nil {
			t.Fatalf("Setup failed: %v\n%s", err, query)
		}
	}
	mustExec(`INSERT INTO organizations (id, name, display_name, slug, email, phone, status, tier, initial_admin_email, initial_admin_name,
			is_email_verified, setup_completed, setup_step, created_at, updated_at)
		VALUES (?, ?, 'Sync Test', ?, ?, '0000000000', 'active', 'starter', ?, 'Admin', true, true, 6, NOW(), NOW())`,
		orgID, "Sync Org "+suffix, "sync-"+suffix, "sync-"+suffix+"@org.example.com", "sync-"+suffix+"@org.example.com")
	t.Cleanup(func() {
		_, _ = db.ExecContext(context.Background(), "DELETE FROM organizations WHERE id = ?", orgID)
	})
	mustExec(`INSERT INTO facilities (id, organization_id, name, code, address, latitude, longitude, geofence_radius_meters)
		VALUES (?, ?, 'Sync HQ', ?, '1 Test Road', 6.5, 3.37, 150)`, facID, orgID, "SYNC-"+suffix)
	mustExec(`INSERT INTO users (id, organization_id, employee_id, name, email, password_hash, role,
			is_active, biometric_status, joined_date, created_at, updated_at)
		VALUES (?, ?, 'EMP-SYNC', 'Sync Tester', ?, 'x', 'employee', true, 'not_enrolled', CURDATE(), NOW(), NOW())`,
		userID, orgID, "sync-"+suffix+"@example.com")

	// What the live frontend sends while face matching is not connected: no match, score 0,
	// captured well inside the geofence.
	event := func(id string) map[string]interface{} {
		return map[string]interface{}{
			"id":           id,
			"eventType":    "check_in",
			"employeeId":   userID,
			"employeeName": "Sync Tester",
			"facilityId":   facID,
			"facilityName": "Sync HQ",
			"capturedAt":   time.Now().UTC().Add(-10 * time.Minute).Format(time.RFC3339),
			"status":       "pending",
			"retryCount":   0,
			"verificationResult": map[string]interface{}{
				"isVerified":        true,
				"score":             0,
				"mode":              "offline_sync",
				"faceMatch":         false,
				"facilityMatch":     true,
				"gpsDistanceMeters": 40,
				"message":           "Face captured (demo).",
				"timestamp":         time.Now().UTC().Format(time.RFC3339),
			},
		}
	}

	syncStatus := func(biometricEnabled bool, eventID string) string {
		c := *cfg
		c.BiometricEnabled = biometricEnabled
		router := appHttp.NewRouter(&c, db.DB, nil)

		body, _ := json.Marshal(map[string]interface{}{"events": []interface{}{event(eventID)}})
		req := httptest.NewRequest(http.MethodPost, "/api/v1/sync/offline-batch", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-Organization-Id", orgID)
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Fatalf("Sync request failed: %d %s", rec.Code, rec.Body.String())
		}

		var res struct {
			Records []struct {
				Status string `json:"status"`
			} `json:"records"`
		}
		_ = json.NewDecoder(rec.Body).Decode(&res)
		if len(res.Records) != 1 {
			t.Fatalf("Expected 1 processed record, got %d", len(res.Records))
		}
		return res.Records[0].Status
	}

	if got := syncStatus(false, "offline-demo-"+suffix); got != "synced" {
		t.Errorf("BIOMETRIC_ENABLED=false: expected event to sync, got status %q", got)
	}
	if got := syncStatus(true, "offline-real-"+suffix); got != "rejected" {
		t.Errorf("BIOMETRIC_ENABLED=true: expected no-match event to be rejected, got status %q", got)
	}
}
