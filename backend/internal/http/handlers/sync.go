package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"attendease/internal/audit"
	"attendease/internal/domain"
	"attendease/internal/http/middleware"
	"attendease/internal/http/responses"
	"github.com/google/uuid"
)

type SyncHandler struct {
	db       *sql.DB
	recorder *audit.Recorder
}

func NewSyncHandler(db *sql.DB, recorder *audit.Recorder) *SyncHandler {
	return &SyncHandler{db: db, recorder: recorder}
}

type SyncBatchRequest struct {
	Events []domain.OfflineEvent `json:"events"`
}

func (h *SyncHandler) OfflineBatch(w http.ResponseWriter, r *http.Request) {
	var req SyncBatchRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		responses.BadRequest(w, "Invalid JSON payload for offline batch synchronization", nil)
		return
	}

	result := domain.SyncBatchResult{
		TotalProcessed: len(req.Events),
		Successful:     0,
		Failed:         0,
		ReviewRequired: 0,
		Records:        make([]domain.OfflineEvent, 0),
	}

	if len(req.Events) == 0 {
		responses.JSON(w, http.StatusOK, result)
		return
	}

	orgID := middleware.GetOrgIDFromContext(r.Context())
	if orgID == "" {
		orgID = r.Header.Get("X-Organization-Id")
	}

	serverReceiptTime := time.Now().UTC()
	nowIso := serverReceiptTime.Format(time.RFC3339)

	for _, event := range req.Events {
		processedEvent := event
		processedEvent.SyncAttemptedAt = &nowIso

		// 1. Idempotency check: see if event ID has already been processed
		var existingStatus string
		checkErr := h.db.QueryRowContext(r.Context(), "SELECT status FROM offline_events WHERE id = ?", event.ID).Scan(&existingStatus)
		if checkErr == nil {
			// Already recorded! Return recorded status
			processedEvent.Status = existingStatus
			if existingStatus == string(domain.SyncSynced) {
				result.Successful++
			} else if existingStatus == string(domain.SyncReviewRequired) {
				result.ReviewRequired++
			} else {
				result.Failed++
			}
			result.Records = append(result.Records, processedEvent)
			continue
		}

		// 2. Resolve employee in database
		var empInternalID, empOrgID, empName, empCode string
		var isActive bool
		empErr := h.db.QueryRowContext(r.Context(), `
			SELECT id, organization_id, name, employee_id, is_active
			FROM users WHERE id = ? OR employee_id = ? LIMIT 1`, event.EmployeeID, event.EmployeeID).Scan(&empInternalID, &empOrgID, &empName, &empCode, &isActive)

		if empErr != nil || !isActive {
			processedEvent.Status = string(domain.SyncRejected)
			processedEvent.ErrorMessage = "Employee record not found or account is inactive."
			result.Failed++
			h.saveOfflineAuditRecord(r.Context(), processedEvent, serverReceiptTime)
			result.Records = append(result.Records, processedEvent)
			continue
		}

		targetOrgID := orgID
		if targetOrgID == "" {
			targetOrgID = empOrgID
		}

		// 3. Clock-skew and offline queue duration verification
		capturedTime, parseErr := time.Parse(time.RFC3339, event.CapturedAt)
		if parseErr != nil {
			// Try date format
			capturedTime, parseErr = time.Parse("2006-01-02T15:04:05.000Z", event.CapturedAt)
		}

		var requiresReview bool
		var reviewReason string

		if parseErr != nil {
			requiresReview = true
			reviewReason = "Unparseable client timestamp format. Flagged for review."
			capturedTime = serverReceiptTime
		} else {
			// Check if client clock is in the future (> 5 minutes ahead of server)
			if capturedTime.Sub(serverReceiptTime) > 5*time.Minute {
				requiresReview = true
				reviewReason = fmt.Sprintf("Client clock skew: claimed time %s is ahead of server receipt time %s.", event.CapturedAt, nowIso)
			}
			// Check if event is stale (> 48 hours old)
			if serverReceiptTime.Sub(capturedTime) > 48*time.Hour {
				requiresReview = true
				reviewReason = fmt.Sprintf("Stale submission: offline event was captured %d hours ago (exceeds policy limit).", int(serverReceiptTime.Sub(capturedTime).Hours()))
			}
		}

		// 4. Verification result replay & perimeter check
		score := event.VerificationResult.Score
		dist := 0
		if event.VerificationResult.GpsDistanceMeters != nil {
			dist = *event.VerificationResult.GpsDistanceMeters
		}

		if score < 0.70 && !event.VerificationResult.FaceMatch {
			processedEvent.Status = string(domain.SyncRejected)
			processedEvent.ErrorMessage = fmt.Sprintf("Biometric match score %.2f is below acceptable threshold during reconciliation.", score)
			result.Failed++
			h.saveOfflineAuditRecord(r.Context(), processedEvent, serverReceiptTime)
			result.Records = append(result.Records, processedEvent)
			continue
		}

		if dist > 200 {
			requiresReview = true
			reviewReason = fmt.Sprintf("Captured at distance %dm exceeding standard geofence boundary. Flagged for supervisor audit.", dist)
		}

		// 5. Final status determination
		finalStatus := domain.SyncSynced
		if requiresReview {
			finalStatus = domain.SyncReviewRequired
			processedEvent.RequiresReviewReason = reviewReason
			result.ReviewRequired++
		} else {
			result.Successful++
		}
		processedEvent.Status = string(finalStatus)
		processedEvent.SyncedAt = &nowIso

		// 6. Persist offline event
		h.saveOfflineAuditRecord(r.Context(), processedEvent, serverReceiptTime)

		// 7. Reconcile with attendance_records table
		dateStr := capturedTime.Format("2006-01-02")
		h.reconcileAttendanceRecord(r.Context(), processedEvent, empInternalID, targetOrgID, dateStr, capturedTime, finalStatus)

		result.Records = append(result.Records, processedEvent)
	}

	h.recorder.Record(r.Context(), domain.AuditLog{
		OrganizationID:   orgID,
		ActorID:          "SYNC_ENGINE",
		ActorName:        "Offline Synchronization Agent",
		ActorRole:        "system",
		Action:           "offline_records_synced",
		AffectedResource: "Batch Sync Pipeline",
		Details:          fmt.Sprintf("Processed %d events (%d synced, %d review required, %d rejected).", result.TotalProcessed, result.Successful, result.ReviewRequired, result.Failed),
		Outcome:          "success",
		IPAddress:        r.RemoteAddr,
		UserAgent:        r.UserAgent(),
	})

	responses.JSON(w, http.StatusOK, result)
}

func (h *SyncHandler) Status(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgIDFromContext(r.Context())
	if orgID == "" {
		orgID = r.Header.Get("X-Organization-Id")
	}

	var pendingCount int
	var lastSync sql.NullTime

	_ = h.db.QueryRowContext(r.Context(), `
		SELECT COUNT(*), MAX(synced_at)
		FROM offline_events
		WHERE (organization_id = ? OR ? = '') AND status = 'pending'`, orgID, orgID).Scan(&pendingCount, &lastSync)

	lastSyncStr := time.Now().UTC().Format(time.RFC3339)
	if lastSync.Valid {
		lastSyncStr = lastSync.Time.Format(time.RFC3339)
	}

	responses.JSON(w, http.StatusOK, map[string]interface{}{
		"pendingCount": pendingCount,
		"lastSyncTime": lastSyncStr,
		"isHealthy":    true,
	})
}

func (h *SyncHandler) saveOfflineAuditRecord(ctx context.Context, e domain.OfflineEvent, now time.Time) {
	vResultJSON, _ := json.Marshal(e.VerificationResult)

	query := `
	INSERT INTO offline_events (
		id, organization_id, event_type, employee_id, facility_id, device_identifier,
		time_source, captured_at, verification_mode, verification_result, status,
		retry_count, error_message, requires_review_reason, sync_attempted_at, synced_at, created_at
	) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	ON DUPLICATE KEY UPDATE
		status = VALUES(status),
		retry_count = VALUES(retry_count),
		error_message = VALUES(error_message),
		requires_review_reason = VALUES(requires_review_reason),
		sync_attempted_at = VALUES(sync_attempted_at),
		synced_at = VALUES(synced_at)`

	var synAt interface{}
	if e.SyncedAt != nil {
		synAt = *e.SyncedAt
	}

	_, _ = h.db.ExecContext(ctx, query,
		e.ID, e.OrganizationID, e.EventType, e.EmployeeID, e.FacilityID, e.DeviceIdentifier,
		e.TimeSource, e.CapturedAt, e.VerificationMode, vResultJSON, e.Status,
		e.RetryCount, e.ErrorMessage, e.RequiresReviewReason, now, synAt, now)
}

func (h *SyncHandler) reconcileAttendanceRecord(ctx context.Context, e domain.OfflineEvent, employeeID, orgID, dateStr string, capturedTime time.Time, syncStatus domain.SyncStatus) {
	attID := "att-sync-" + uuid.New().String()
	vResultJSON, _ := json.Marshal(e.VerificationResult)
	now := time.Now().UTC()

	if e.EventType == "check_in" {
		query := `
		INSERT INTO attendance_records (
			id, organization_id, employee_id, facility_id, date, check_in_time,
			status, verification_mode, sync_status, is_offline_capture, verification_details, created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, 'present', 'offline_sync', ?, true, ?, ?, ?)
		ON DUPLICATE KEY UPDATE
			check_in_time = COALESCE(check_in_time, VALUES(check_in_time)),
			sync_status = VALUES(sync_status),
			updated_at = VALUES(updated_at)`

		_, _ = h.db.ExecContext(ctx, query, attID, orgID, employeeID, e.FacilityID, dateStr, capturedTime, syncStatus, vResultJSON, now, now)
	} else if e.EventType == "check_out" {
		query := `
		UPDATE attendance_records
		SET check_out_time = ?, sync_status = ?, updated_at = ?
		WHERE employee_id = ? AND date = ?`

		res, _ := h.db.ExecContext(ctx, query, capturedTime, syncStatus, now, employeeID, dateStr)
		if rows, _ := res.RowsAffected(); rows == 0 {
			// No existing check-in row, insert new check-out record
			ins := `
			INSERT INTO attendance_records (
				id, organization_id, employee_id, facility_id, date, check_out_time,
				status, verification_mode, sync_status, is_offline_capture, verification_details, created_at, updated_at
			) VALUES (?, ?, ?, ?, ?, ?, 'present', 'offline_sync', ?, true, ?, ?, ?)`
			_, _ = h.db.ExecContext(ctx, ins, attID, orgID, employeeID, e.FacilityID, dateStr, capturedTime, syncStatus, vResultJSON, now, now)
		}
	}
}
