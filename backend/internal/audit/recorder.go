package audit

import (
	"context"
	"database/sql"
	"log"
	"time"

	"attendease/internal/domain"
	"github.com/google/uuid"
)

type Recorder struct {
	db *sql.DB
}

func NewRecorder(db *sql.DB) *Recorder {
	return &Recorder{db: db}
}

func (r *Recorder) Record(ctx context.Context, entry domain.AuditLog) {
	if entry.ID == "" {
		entry.ID = "audit-" + uuid.New().String()
	}
	if entry.Timestamp == "" {
		entry.Timestamp = time.Now().UTC().Format(time.RFC3339)
	}

	query := `
	INSERT INTO audit_logs (
		id, organization_id, actor_id, actor_name, actor_role, action,
		affected_resource, resource_id, details, outcome, ip_address, user_agent, timestamp
	) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

	go func() {
		insertCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		var orgID interface{}
		if entry.OrganizationID != "" {
			orgID = entry.OrganizationID
		}

		_, err := r.db.ExecContext(insertCtx, query,
			entry.ID,
			orgID,
			entry.ActorID,
			entry.ActorName,
			entry.ActorRole,
			entry.Action,
			entry.AffectedResource,
			entry.ResourceID,
			entry.Details,
			entry.Outcome,
			entry.IPAddress,
			entry.UserAgent,
			time.Now().UTC(),
		)
		if err != nil {
			log.Printf("[AUDIT ERROR] Failed to record audit log: %v", err)
		}
	}()
}
