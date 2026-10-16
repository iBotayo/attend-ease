package database

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"time"

	"attendease/internal/config"

	_ "github.com/go-sql-driver/mysql"
)

type DB struct {
	*sql.DB
}

func Connect(cfg *config.Config) (*DB, error) {
	dsn := cfg.DSN()
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to open database handle: %w", err)
	}

	db.SetMaxOpenConns(cfg.DBMaxOpenConns)
	db.SetMaxIdleConns(cfg.DBMaxIdleConns)
	db.SetConnMaxLifetime(cfg.DBConnMaxLifetime)
	db.SetConnMaxIdleTime(5 * time.Minute)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := db.PingContext(ctx); err != nil {
		db.Close()
		return nil, fmt.Errorf("failed to ping MySQL at %s:%d: %w", cfg.DBHost, cfg.DBPort, err)
	}

	log.Printf("[DB] Connected to MySQL database '%s' at %s:%d", cfg.DBName, cfg.DBHost, cfg.DBPort)
	return &DB{db}, nil
}
