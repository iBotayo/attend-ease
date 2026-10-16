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

type ShiftHandler struct {
	db       *sql.DB
	recorder *audit.Recorder
}

func NewShiftHandler(db *sql.DB, recorder *audit.Recorder) *ShiftHandler {
	return &ShiftHandler{db: db, recorder: recorder}
}

func (h *ShiftHandler) List(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgIDFromContext(r.Context())
	if orgID == "" {
		orgID = r.Header.Get("X-Organization-Id")
	}

	query := `
	SELECT s.id, s.organization_id, s.name, s.code, s.start_time, s.end_time,
	       s.grace_period_minutes, COALESCE(s.assigned_facility_id, ''),
	       COALESCE(f.name, ''), s.assigned_days, s.is_active,
	       COUNT(u.id) as emp_count
	FROM shifts s
	LEFT JOIN facilities f ON s.assigned_facility_id = f.id
	LEFT JOIN users u ON s.assigned_facility_id = u.assigned_facility_id AND u.is_active = true
	WHERE s.organization_id = ? OR ? = ''
	GROUP BY s.id, s.organization_id, s.name, s.code, s.start_time, s.end_time,
	         s.grace_period_minutes, s.assigned_facility_id, f.name, s.assigned_days, s.is_active
	ORDER BY s.start_time ASC`

	rows, err := h.db.QueryContext(r.Context(), query, orgID, orgID)
	if err != nil {
		log.Printf("[SHIFT ERROR] List query failed: %v", err)
		responses.InternalServerError(w, "Failed to retrieve shifts")
		return
	}
	defer rows.Close()

	shifts := make([]domain.Shift, 0)
	for rows.Next() {
		var s domain.Shift
		var daysJSON string

		err := rows.Scan(
			&s.ID, &s.OrganizationID, &s.Name, &s.Code, &s.StartTime, &s.EndTime,
			&s.GracePeriodMinutes, &s.AssignedFacilityID, &s.AssignedFacilityName,
			&daysJSON, &s.IsActive, &s.EmployeeCount,
		)
		if err == nil {
			_ = json.Unmarshal([]byte(daysJSON), &s.AssignedDays)
			shifts = append(shifts, s)
		}
	}

	responses.JSON(w, http.StatusOK, shifts)
}

func (h *ShiftHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		responses.BadRequest(w, "Shift ID is required", nil)
		return
	}

	shift, err := h.fetchShiftByID(r.Context(), id)
	if err != nil {
		responses.NotFound(w, "Shift not found")
		return
	}

	responses.JSON(w, http.StatusOK, shift)
}

type CreateShiftRequest struct {
	Name                 string `json:"name"`
	Code                 string `json:"code"`
	StartTime            string `json:"startTime"`
	EndTime              string `json:"endTime"`
	GracePeriodMinutes   int    `json:"gracePeriodMinutes"`
	AssignedFacilityID   string `json:"assignedFacilityId,omitempty"`
	AssignedDays         []int  `json:"assignedDays"`
	IsActive             bool   `json:"isActive"`
}

func (h *ShiftHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req CreateShiftRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		responses.BadRequest(w, "Invalid JSON payload", nil)
		return
	}

	cleanName := strings.TrimSpace(req.Name)
	cleanCode := strings.ToUpper(strings.TrimSpace(req.Code))
	if cleanName == "" || cleanCode == "" || req.StartTime == "" || req.EndTime == "" {
		responses.BadRequest(w, "Shift name, code, start time, and end time are required.", nil)
		return
	}

	orgID := middleware.GetOrgIDFromContext(r.Context())
	if orgID == "" {
		orgID = r.Header.Get("X-Organization-Id")
	}

	shiftID := "shift-" + uuid.New().String()
	daysJSON, _ := json.Marshal(req.AssignedDays)
	if len(req.AssignedDays) == 0 {
		daysJSON = []byte("[1,2,3,4,5]")
	}

	grace := req.GracePeriodMinutes
	if grace <= 0 {
		grace = 15
	}

	now := time.Now().UTC()
	var facID interface{}
	if req.AssignedFacilityID != "" {
		facID = req.AssignedFacilityID
	}

	insertQuery := `
	INSERT INTO shifts (
		id, organization_id, assigned_facility_id, name, code, start_time, end_time,
		grace_period_minutes, assigned_days, is_active, created_at, updated_at
	) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

	_, err := h.db.ExecContext(r.Context(), insertQuery,
		shiftID, orgID, facID, cleanName, cleanCode, req.StartTime, req.EndTime,
		grace, daysJSON, req.IsActive, now, now)

	if err != nil {
		log.Printf("[SHIFT ERROR] Creation failed: %v", err)
		responses.InternalServerError(w, "Failed to create shift schedule")
		return
	}

	shift, err := h.fetchShiftByID(r.Context(), shiftID)
	if err != nil {
		responses.InternalServerError(w, "Failed to load created shift")
		return
	}

	responses.JSON(w, http.StatusCreated, shift)
}

func (h *ShiftHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		responses.BadRequest(w, "Shift ID is required", nil)
		return
	}

	var updates map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&updates); err != nil {
		responses.BadRequest(w, "Invalid JSON payload", nil)
		return
	}

	if name, ok := updates["name"].(string); ok && name != "" {
		_, _ = h.db.ExecContext(r.Context(), "UPDATE shifts SET name = ?, updated_at = ? WHERE id = ?", name, time.Now().UTC(), id)
	}
	if code, ok := updates["code"].(string); ok && code != "" {
		_, _ = h.db.ExecContext(r.Context(), "UPDATE shifts SET code = ?, updated_at = ? WHERE id = ?", strings.ToUpper(code), time.Now().UTC(), id)
	}
	if start, ok := updates["startTime"].(string); ok && start != "" {
		_, _ = h.db.ExecContext(r.Context(), "UPDATE shifts SET start_time = ?, updated_at = ? WHERE id = ?", start, time.Now().UTC(), id)
	}
	if end, ok := updates["endTime"].(string); ok && end != "" {
		_, _ = h.db.ExecContext(r.Context(), "UPDATE shifts SET end_time = ?, updated_at = ? WHERE id = ?", end, time.Now().UTC(), id)
	}
	if grace, ok := updates["gracePeriodMinutes"].(float64); ok && grace >= 0 {
		_, _ = h.db.ExecContext(r.Context(), "UPDATE shifts SET grace_period_minutes = ?, updated_at = ? WHERE id = ?", int(grace), time.Now().UTC(), id)
	}
	if isActive, ok := updates["isActive"].(bool); ok {
		_, _ = h.db.ExecContext(r.Context(), "UPDATE shifts SET is_active = ?, updated_at = ? WHERE id = ?", isActive, time.Now().UTC(), id)
	}
	if facID, ok := updates["assignedFacilityId"].(string); ok {
		_, _ = h.db.ExecContext(r.Context(), "UPDATE shifts SET assigned_facility_id = ?, updated_at = ? WHERE id = ?", facID, time.Now().UTC(), id)
	}
	if days, ok := updates["assignedDays"].([]interface{}); ok {
		daysJSON, _ := json.Marshal(days)
		_, _ = h.db.ExecContext(r.Context(), "UPDATE shifts SET assigned_days = ?, updated_at = ? WHERE id = ?", daysJSON, time.Now().UTC(), id)
	}

	shift, err := h.fetchShiftByID(r.Context(), id)
	if err != nil {
		responses.NotFound(w, "Shift not found")
		return
	}

	responses.JSON(w, http.StatusOK, shift)
}

func (h *ShiftHandler) fetchShiftByID(ctx context.Context, id string) (*domain.Shift, error) {
	query := `
	SELECT s.id, s.organization_id, s.name, s.code, s.start_time, s.end_time,
	       s.grace_period_minutes, COALESCE(s.assigned_facility_id, ''),
	       COALESCE(f.name, ''), s.assigned_days, s.is_active,
	       COUNT(u.id) as emp_count
	FROM shifts s
	LEFT JOIN facilities f ON s.assigned_facility_id = f.id
	LEFT JOIN users u ON s.assigned_facility_id = u.assigned_facility_id AND u.is_active = true
	WHERE s.id = ?
	GROUP BY s.id, s.organization_id, s.name, s.code, s.start_time, s.end_time,
	         s.grace_period_minutes, s.assigned_facility_id, f.name, s.assigned_days, s.is_active
	LIMIT 1`

	var s domain.Shift
	var daysJSON string

	err := h.db.QueryRowContext(ctx, query, id).Scan(
		&s.ID, &s.OrganizationID, &s.Name, &s.Code, &s.StartTime, &s.EndTime,
		&s.GracePeriodMinutes, &s.AssignedFacilityID, &s.AssignedFacilityName,
		&daysJSON, &s.IsActive, &s.EmployeeCount,
	)
	if err != nil {
		return nil, err
	}

	_ = json.Unmarshal([]byte(daysJSON), &s.AssignedDays)
	return &s, nil
}
