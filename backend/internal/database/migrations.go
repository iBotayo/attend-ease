package database

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"
)

type Migration struct {
	Version int64
	Name    string
	UpPath  string
	DownPath string
}

func EnsureMigrationTable(ctx context.Context, db *sql.DB) error {
	query := `
	CREATE TABLE IF NOT EXISTS schema_migrations (
		version BIGINT NOT NULL PRIMARY KEY,
		name VARCHAR(255) NOT NULL,
		applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
	) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`

	_, err := db.ExecContext(ctx, query)
	return err
}

func GetAppliedMigrations(ctx context.Context, db *sql.DB) (map[int64]bool, error) {
	applied := make(map[int64]bool)
	rows, err := db.QueryContext(ctx, "SELECT version FROM schema_migrations")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var v int64
		if err := rows.Scan(&v); err != nil {
			return nil, err
		}
		applied[v] = true
	}
	return applied, rows.Err()
}

func RunMigrations(ctx context.Context, db *sql.DB, migrationsDir string) error {
	if err := EnsureMigrationTable(ctx, db); err != nil {
		return fmt.Errorf("failed to initialize schema_migrations table: %w", err)
	}

	applied, err := GetAppliedMigrations(ctx, db)
	if err != nil {
		return fmt.Errorf("failed to fetch applied migrations: %w", err)
	}

	files, err := os.ReadDir(migrationsDir)
	if err != nil {
		return fmt.Errorf("failed to read migrations directory %s: %w", migrationsDir, err)
	}

	migrationMap := make(map[int64]*Migration)
	for _, f := range files {
		if f.IsDir() {
			continue
		}
		name := f.Name()
		if !strings.HasSuffix(name, ".sql") {
			continue
		}

		parts := strings.SplitN(name, "_", 2)
		if len(parts) < 2 {
			continue
		}
		v, err := strconv.ParseInt(parts[0], 10, 64)
		if err != nil {
			continue
		}

		if migrationMap[v] == nil {
			migrationMap[v] = &Migration{Version: v, Name: name}
		}

		fullPath := filepath.Join(migrationsDir, name)
		if strings.HasSuffix(name, ".up.sql") {
			migrationMap[v].UpPath = fullPath
		} else if strings.HasSuffix(name, ".down.sql") {
			migrationMap[v].DownPath = fullPath
		}
	}

	var versions []int64
	for v := range migrationMap {
		versions = append(versions, v)
	}
	sort.Slice(versions, func(i, j int) bool { return versions[i] < versions[j] })

	for _, v := range versions {
		m := migrationMap[v]
		if applied[v] {
			continue
		}

		if m.UpPath == "" {
			return fmt.Errorf("missing .up.sql file for version %d", v)
		}

		content, err := os.ReadFile(m.UpPath)
		if err != nil {
			return fmt.Errorf("failed to read migration file %s: %w", m.UpPath, err)
		}

		log.Printf("[MIGRATE] Applying migration %d: %s", v, m.Name)
		if err := executeSQLStatements(ctx, db, string(content)); err != nil {
			return fmt.Errorf("failed to apply migration %d: %w", v, err)
		}

		_, err = db.ExecContext(ctx, "INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)",
			v, filepath.Base(m.UpPath), time.Now().UTC())
		if err != nil {
			return fmt.Errorf("failed to record migration %d in schema_migrations: %w", v, err)
		}
		log.Printf("[MIGRATE] Successfully applied migration %d", v)
	}

	return nil
}

func executeSQLStatements(ctx context.Context, db *sql.DB, sqlContent string) error {
	rawStatements := strings.Split(sqlContent, ";")
	for _, raw := range rawStatements {
		stmt := strings.TrimSpace(raw)
		if stmt == "" {
			continue
		}
		// Strip full-line comments
		var cleanLines []string
		for _, line := range strings.Split(stmt, "\n") {
			t := strings.TrimSpace(line)
			if strings.HasPrefix(t, "--") || strings.HasPrefix(t, "/*") {
				continue
			}
			cleanLines = append(cleanLines, line)
		}
		cleanStmt := strings.TrimSpace(strings.Join(cleanLines, "\n"))
		if cleanStmt == "" {
			continue
		}

		if _, err := db.ExecContext(ctx, cleanStmt); err != nil {
			return fmt.Errorf("executing SQL failed: %w\nStatement: %s", err, cleanStmt)
		}
	}
	return nil
}
