package handlers

import (
	"database/sql"
	"net/http"
	"time"

	"attendease/internal/http/responses"
)

type HealthHandler struct {
	db *sql.DB
}

func NewHealthHandler(db *sql.DB) *HealthHandler {
	return &HealthHandler{db: db}
}

func (h *HealthHandler) Healthz(w http.ResponseWriter, r *http.Request) {
	responses.JSON(w, http.StatusOK, map[string]interface{}{
		"status":    "healthy",
		"timestamp": time.Now().UTC().Format(time.RFC3339),
		"service":   "attend-ease-api",
		"version":   "1.0.0",
	})
}

func (h *HealthHandler) Readyz(w http.ResponseWriter, r *http.Request) {
	if h.db != nil {
		if err := h.db.PingContext(r.Context()); err != nil {
			responses.Error(w, http.StatusServiceUnavailable, "DB_UNAVAILABLE", "Database connection ping failed", nil)
			return
		}
	}

	responses.JSON(w, http.StatusOK, map[string]interface{}{
		"status":    "ready",
		"database":  "connected",
		"timestamp": time.Now().UTC().Format(time.RFC3339),
	})
}
