package main

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"

	"attendease/internal/config"
	"attendease/internal/database"
	appHttp "attendease/internal/http"
	"attendease/internal/verification"
)

func main() {
	log.Println("[INIT] Starting Attend Ease Go REST API Server...")

	// 1. Load and validate configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("[FATAL] Configuration error: %v", err)
	}

	// 2. Connect to MySQL database
	db, err := database.Connect(cfg)
	if err != nil {
		log.Printf("[WARN] MySQL connection failed (%v).", err)
		log.Printf("[INFO] If MySQL database is not yet provisioned, please execute:")
		log.Printf("       sudo mysql < backend/scripts/setup_db.sql")
	} else {
		defer db.Close()

		// 3. Run database migrations
		migrationsDir := findMigrationsDir()
		log.Printf("[INIT] Running database migrations from '%s'...", migrationsDir)
		if err := database.RunMigrations(context.Background(), db.DB, migrationsDir); err != nil {
			log.Printf("[WARN] Migration execution warning: %v", err)
		} else {
			log.Println("[INIT] Database schema is up to date.")
		}
	}

	// 4. Initialize Biometric Verifier client
	var bio verification.BiometricVerifier = verification.NewHTTPBiometricClient(
		cfg.BiometricServiceURL,
		cfg.BiometricTimeout,
		cfg.FaceScoreThreshold,
		false,
	)

	// 5. Build HTTP Router & Middleware Pipeline
	var sqlDB *database.DB
	if db != nil {
		sqlDB = db
	}

	var rawDB *sql.DB
	if sqlDB != nil {
		rawDB = sqlDB.DB
	}

	router := appHttp.NewRouter(cfg, rawDB, bio)

	// 6. Setup HTTP server with connection limits and timeouts
	addr := fmt.Sprintf("0.0.0.0:%d", cfg.Port)
	server := &http.Server{
		Addr:              addr,
		Handler:           router,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
		MaxHeaderBytes:    1 << 20, // 1 MB
	}

	// 7. Start server in goroutine
	go func() {
		log.Printf("[READY] Attend Ease API listening on http://%s (Env: %s)", addr, cfg.Env)
		log.Printf("[INFO] CORS allowed origins: %v", cfg.FrontendURLs)
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("[FATAL] Server failed: %v", err)
		}
	}()

	// 8. Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
	<-quit

	log.Println("[SHUTDOWN] Signal received. Shutting down gracefully...")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Fatalf("[SHUTDOWN ERROR] Forced shutdown: %v", err)
	}

	log.Println("[SHUTDOWN] Server exited cleanly.")
}

func findMigrationsDir() string {
	candidates := []string{
		"migrations",
		"backend/migrations",
		"../migrations",
		"../../migrations",
	}
	for _, c := range candidates {
		if fi, err := os.Stat(c); err == nil && fi.IsDir() {
			abs, _ := filepath.Abs(c)
			return abs
		}
	}
	return "migrations"
}
