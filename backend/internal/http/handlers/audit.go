package handlers

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"time"

	"attendease/internal/audit"
	"attendease/internal/domain"
	"attendease/internal/http/middleware"
	"attendease/internal/http/responses"
	"github.com/google/uuid"
)

type AuditHandler struct {
	db       *sql.DB
	recorder *audit.Recorder
}

func NewAuditHandler(db *sql.DB, recorder *audit.Recorder) *AuditHandler {
	return &AuditHandler{db: db, recorder: recorder}
}

func (h *AuditHandler) List(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgIDFromContext(r.Context())
	if orgID == "" {
		orgID = r.Header.Get("X-Organization-Id")
	}

	q := r.URL.Query()
	action := strings.TrimSpace(q.Get("action"))
	outcome := strings.TrimSpace(q.Get("outcome"))
	search := strings.TrimSpace(q.Get("search"))
	startDate := strings.TrimSpace(q.Get("startDate"))
	endDate := strings.TrimSpace(q.Get("endDate"))

	query := `
	SELECT id, COALESCE(organization_id, ''), actor_id, actor_name, actor_role,
	       action, affected_resource, COALESCE(resource_id, ''), details,
	       outcome, COALESCE(ip_address, ''), COALESCE(user_agent, ''), timestamp
	FROM audit_logs
	WHERE (organization_id = ? OR ? = '')`

	var args []interface{}
	args = append(args, orgID, orgID)

	if action != "" && action != "all" {
		query += " AND action = ?"
		args = append(args, action)
	}
	if outcome != "" && outcome != "all" {
		query += " AND outcome = ?"
		args = append(args, outcome)
	}
	if search != "" {
		query += " AND (LOWER(actor_name) LIKE ? OR LOWER(actor_role) LIKE ? OR LOWER(affected_resource) LIKE ? OR LOWER(details) LIKE ?)"
		pattern := "%" + strings.ToLower(search) + "%"
		args = append(args, pattern, pattern, pattern, pattern)
	}
	if startDate != "" {
		query += " AND timestamp >= ?"
		args = append(args, startDate)
	}
	if endDate != "" {
		query += " AND timestamp <= ?"
		args = append(args, endDate)
	}

	query += " ORDER BY timestamp DESC LIMIT 200"

	rows, err := h.db.QueryContext(r.Context(), query, args...)
	if err != nil {
		log.Printf("[AUDIT ERROR] List query failed: %v", err)
		responses.InternalServerError(w, "Failed to retrieve audit trail")
		return
	}
	defer rows.Close()

	logs := make([]domain.AuditLog, 0)
	for rows.Next() {
		var a domain.AuditLog
		var ts time.Time

		err := rows.Scan(
			&a.ID, &a.OrganizationID, &a.ActorID, &a.ActorName, &a.ActorRole,
			&a.Action, &a.AffectedResource, &a.ResourceID, &a.Details,
			&a.Outcome, &a.IPAddress, &a.UserAgent, &ts,
		)
		if err == nil {
			a.Timestamp = ts.Format(time.RFC3339)
			logs = append(logs, a)
		}
	}

	responses.JSON(w, http.StatusOK, logs)
}

func (h *AuditHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req domain.AuditLog
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		responses.BadRequest(w, "Invalid JSON payload", nil)
		return
	}

	orgID := middleware.GetOrgIDFromContext(r.Context())
	if orgID != "" {
		req.OrganizationID = orgID
	}
	req.ID = "audit-" + uuid.New().String()
	req.Timestamp = time.Now().UTC().Format(time.RFC3339)
	req.IPAddress = r.RemoteAddr
	req.UserAgent = r.UserAgent()

	h.recorder.Record(r.Context(), req)

	responses.JSON(w, http.StatusCreated, req)
}
