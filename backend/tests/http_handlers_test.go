package tests

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"attendease/internal/config"
	appHttp "attendease/internal/http"
	"attendease/internal/http/responses"
	"attendease/internal/verification"
)

func TestHealthHandler_Healthz(t *testing.T) {
	cfg, err := config.Load()
	if err != nil {
		t.Fatalf("Failed to load config: %v", err)
	}

	router := appHttp.NewRouter(cfg, nil, nil)

	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", rec.Code)
	}

	var body map[string]interface{}
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
		t.Fatalf("Failed to parse response body: %v", err)
	}

	if body["status"] != "healthy" {
		t.Errorf("Expected status 'healthy', got '%v'", body["status"])
	}
}

func TestAuthMiddleware_UnauthorizedAccess(t *testing.T) {
	cfg, err := config.Load()
	if err != nil {
		t.Fatalf("Failed to load config: %v", err)
	}

	router := appHttp.NewRouter(cfg, nil, nil)

	// Call protected endpoint without Authorization header
	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/me", nil)
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("Expected status 401 Unauthorized, got %d", rec.Code)
	}

	var errResp responses.ErrorResponse
	if err := json.NewDecoder(rec.Body).Decode(&errResp); err != nil {
		t.Fatalf("Failed to parse error response: %v", err)
	}

	if errResp.Code != "UNAUTHORIZED" {
		t.Errorf("Expected error code UNAUTHORIZED, got %s", errResp.Code)
	}
}

func TestCORSMiddleware_PreflightOptions(t *testing.T) {
	cfg, err := config.Load()
	if err != nil {
		t.Fatalf("Failed to load config: %v", err)
	}

	router := appHttp.NewRouter(cfg, nil, nil)

	req := httptest.NewRequest(http.MethodOptions, "/api/v1/attendance/check-in", nil)
	req.Header.Set("Origin", "http://localhost:3000")
	req.Header.Set("Access-Control-Request-Method", "POST")
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Errorf("Expected status 204 No Content for CORS preflight, got %d", rec.Code)
	}

	allowOrigin := rec.Header().Get("Access-Control-Allow-Origin")
	if allowOrigin != "http://localhost:3000" {
		t.Errorf("Expected Access-Control-Allow-Origin: http://localhost:3000, got '%s'", allowOrigin)
	}
}

func TestBiometricClient_ServiceUnavailableHandling(t *testing.T) {
	// Client configured with unreachable port
	client := verification.NewHTTPBiometricClient("http://127.0.0.1:59999", 100*time.Millisecond, 0.85, false)

	_, err := client.Verify(context.Background(), "EMP-1001", "dummy_base64_face_image")
	if err == nil {
		t.Errorf("Expected error for unreachable biometric service, got nil")
	}
}
