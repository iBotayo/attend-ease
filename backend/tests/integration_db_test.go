package tests

import (
	"context"
	"testing"
	"time"

	"attendease/internal/config"
	"attendease/internal/database"
	_ "github.com/go-sql-driver/mysql"
)

func TestMySQLIntegration_MigrationsAndFlow(t *testing.T) {
	cfg, err := config.Load()
	if err != nil {
		t.Fatalf("Failed to load config: %v", err)
	}

	// Use test database
	cfg.DBName = "attend_ease_test"

	db, err := database.Connect(cfg)
	if err != nil {
		t.Skipf("MySQL test database connection unavailable (%v). Skipping DB integration tests. (Run 'sudo mysql < backend/scripts/setup_db.sql' to enable).", err)
		return
	}
	defer db.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// 1. Run migrations
	err = database.RunMigrations(ctx, db.DB, "../migrations")
	if err != nil {
		t.Fatalf("Database migrations failed: %v", err)
	}

	// 2. Verify schema_migrations table
	var count int
	err = db.QueryRowContext(ctx, "SELECT COUNT(*) FROM schema_migrations").Scan(&count)
	if err != nil {
		t.Fatalf("Failed to query schema_migrations: %v", err)
	}
	if count == 0 {
		t.Errorf("Expected at least 1 applied migration, got %d", count)
	}

	// 3. Test insert & query of an organization in transaction
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		t.Fatalf("Failed to begin transaction: %v", err)
	}
	defer tx.Rollback()

	testOrgID := "org-test-integration"
	_, err = tx.ExecContext(ctx, `
		INSERT INTO organizations (
			id, name, display_name, slug, email, phone, status, tier,
			initial_admin_email, initial_admin_name, is_email_verified, setup_completed, setup_step, created_at, updated_at
		) VALUES (?, 'Test Legal Org', 'Test Org', 'test-org-slug', 'test@org.internal', '08012345678', 'active', 'starter', 'admin@org.internal', 'Admin User', true, true, 6, NOW(), NOW())`, testOrgID)
	if err != nil {
		t.Fatalf("Failed to insert test organization: %v", err)
	}

	var fetchedName string
	err = tx.QueryRowContext(ctx, "SELECT display_name FROM organizations WHERE id = ?", testOrgID).Scan(&fetchedName)
	if err != nil || fetchedName != "Test Org" {
		t.Errorf("Expected organization name 'Test Org', got '%s' (err: %v)", fetchedName, err)
	}
}
