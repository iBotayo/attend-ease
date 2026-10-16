package responses

import (
	"encoding/json"
	"net/http"
	"time"
)

type ErrorResponse struct {
	Code      string              `json:"code"`
	Message   string              `json:"message"`
	Details   map[string][]string `json:"details,omitempty"`
	Timestamp string              `json:"timestamp"`
}

func JSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if data != nil {
		_ = json.NewEncoder(w).Encode(data)
	}
}

func Error(w http.ResponseWriter, status int, code, message string, details map[string][]string) {
	resp := ErrorResponse{
		Code:      code,
		Message:   message,
		Details:   details,
		Timestamp: time.Now().UTC().Format(time.RFC3339),
	}
	JSON(w, status, resp)
}

func BadRequest(w http.ResponseWriter, message string, details map[string][]string) {
	Error(w, http.StatusBadRequest, "BAD_REQUEST", message, details)
}

func Unauthorized(w http.ResponseWriter, message string) {
	if message == "" {
		message = "Authentication required. Please provide a valid Bearer token."
	}
	Error(w, http.StatusUnauthorized, "UNAUTHORIZED", message, nil)
}

func Forbidden(w http.ResponseWriter, message string) {
	if message == "" {
		message = "Access forbidden. Insufficient permissions or organization mismatch."
	}
	Error(w, http.StatusForbidden, "FORBIDDEN", message, nil)
}

func NotFound(w http.ResponseWriter, message string) {
	if message == "" {
		message = "Requested resource was not found."
	}
	Error(w, http.StatusNotFound, "NOT_FOUND", message, nil)
}

func Conflict(w http.ResponseWriter, message string) {
	Error(w, http.StatusConflict, "CONFLICT", message, nil)
}

func InternalServerError(w http.ResponseWriter, message string) {
	if message == "" {
		message = "An unexpected server error occurred. Please try again later."
	}
	Error(w, http.StatusInternalServerError, "INTERNAL_SERVER_ERROR", message, nil)
}
