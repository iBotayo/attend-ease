package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"attendease/internal/audit"
	"attendease/internal/domain"
	"attendease/internal/http/middleware"
	"attendease/internal/http/responses"
	"attendease/internal/verification"
	"github.com/google/uuid"
)

type AttendanceHandler struct {
	db        *sql.DB
	recorder  *audit.Recorder
	biometrics verification.BiometricVerifier
}

func NewAttendanceHandler(db *sql.DB, recorder *audit.Recorder, bio verification.BiometricVerifier) *AttendanceHandler {
	return &AttendanceHandler{
		db:        db,
		recorder:  recorder,
		biometrics: bio,
	}
}

func (h *AttendanceHandler) GetToday(w http.ResponseWriter, r *http.Request) {
	employeeID := r.URL.Query().Get("employeeId")
	user := middleware.GetUserFromContext(r.Context())
	if employeeID == "" && user != nil {
		employeeID = user.ID
	}
	if employeeID == "" {
		responses.BadRequest(w, "employeeId query parameter is required", nil)
		return
	}

	today := time.Now().UTC().Format("2006-01-02")

	query := `
	SELECT a.id, a.check_in_time, a.check_out_time, a.status, a.sync_status, COALESCE(f.name, '')
	FROM attendance_records a
	LEFT JOIN facilities f ON a.facility_id = f.id
	WHERE (a.employee_id = ? OR a.employee_id = (SELECT id FROM users WHERE employee_id = ? LIMIT 1))
	  AND a.date = ?
	LIMIT 1`

	var id string
	var checkIn, checkOut sql.NullTime
	var status domain.AttendanceStatus
	var syncStatus domain.SyncStatus
	var facName string

	err := h.db.QueryRowContext(r.Context(), query, employeeID, employeeID, today).Scan(
		&id, &checkIn, &checkOut, &status, &syncStatus, &facName,
	)

	summary := domain.TodayAttendanceSummary{
		HasCheckedIn:  false,
		HasCheckedOut: false,
		Status:        domain.AttendanceAbsent,
		SyncStatus:    domain.SyncSynced,
		FacilityName:  facName,
	}

	if err == nil {
		summary.HasCheckedIn = checkIn.Valid
		summary.HasCheckedOut = checkOut.Valid
		summary.Status = status
		summary.SyncStatus = syncStatus
		if checkIn.Valid {
			inStr := checkIn.Time.Format(time.RFC3339)
			summary.CheckInTime = &inStr
		}
		if checkOut.Valid {
			outStr := checkOut.Time.Format(time.RFC3339)
			summary.CheckOutTime = &outStr
		}
	}

	responses.JSON(w, http.StatusOK, summary)
}

func (h *AttendanceHandler) GetHistory(w http.ResponseWriter, r *http.Request) {
	employeeID := r.URL.Query().Get("employeeId")
	user := middleware.GetUserFromContext(r.Context())
	if employeeID == "" && user != nil {
		employeeID = user.ID
	}
	if employeeID == "" {
		responses.BadRequest(w, "employeeId query parameter is required", nil)
		return
	}

	q := r.URL.Query()
	statusFilter := q.Get("status")
	startDate := q.Get("startDate")
	endDate := q.Get("endDate")

	query := `
	SELECT a.id, a.organization_id, a.employee_id, u.name, u.employee_id,
	       COALESCE(u.department_id, ''), COALESCE(d.name, 'General Staff'),
	       a.facility_id, COALESCE(f.name, 'Default Facility'),
	       a.date, a.check_in_time, a.check_out_time, a.status, a.verification_mode,
	       a.sync_status, a.is_offline_capture, a.verification_details, COALESCE(a.notes, ''), a.created_at
	FROM attendance_records a
	JOIN users u ON a.employee_id = u.id
	LEFT JOIN departments d ON a.department_id = d.id
	LEFT JOIN facilities f ON a.facility_id = f.id
	WHERE (a.employee_id = ? OR u.employee_id = ?)`

	var args []interface{}
	args = append(args, employeeID, employeeID)

	if statusFilter != "" && statusFilter != "all" {
		query += " AND a.status = ?"
		args = append(args, statusFilter)
	}
	if startDate != "" {
		query += " AND a.date >= ?"
		args = append(args, startDate)
	}
	if endDate != "" {
		query += " AND a.date <= ?"
		args = append(args, endDate)
	}

	query += " ORDER BY a.date DESC, a.created_at DESC"

	records, err := h.scanAttendanceRows(r.Context(), query, args...)
	if err != nil {
		log.Printf("[ATTENDANCE ERROR] History query failed: %v", err)
		responses.InternalServerError(w, "Failed to retrieve attendance history")
		return
	}

	responses.JSON(w, http.StatusOK, records)
}

func (h *AttendanceHandler) GetRegister(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgIDFromContext(r.Context())
	if orgID == "" {
		orgID = r.Header.Get("X-Organization-Id")
	}

	q := r.URL.Query()
	search := strings.TrimSpace(q.Get("search"))
	facID := strings.TrimSpace(q.Get("facilityId"))
	deptID := strings.TrimSpace(q.Get("departmentId"))
	status := strings.TrimSpace(q.Get("status"))
	date := strings.TrimSpace(q.Get("date"))
	startDate := strings.TrimSpace(q.Get("startDate"))
	endDate := strings.TrimSpace(q.Get("endDate"))

	query := `
	SELECT a.id, a.organization_id, a.employee_id, u.name, u.employee_id,
	       COALESCE(u.department_id, ''), COALESCE(d.name, 'General Staff'),
	       a.facility_id, COALESCE(f.name, 'Default Facility'),
	       a.date, a.check_in_time, a.check_out_time, a.status, a.verification_mode,
	       a.sync_status, a.is_offline_capture, a.verification_details, COALESCE(a.notes, ''), a.created_at
	FROM attendance_records a
	JOIN users u ON a.employee_id = u.id
	LEFT JOIN departments d ON a.department_id = d.id
	LEFT JOIN facilities f ON a.facility_id = f.id
	WHERE (a.organization_id = ? OR ? = '')`

	var args []interface{}
	args = append(args, orgID, orgID)

	if search != "" {
		query += " AND (LOWER(u.name) LIKE ? OR LOWER(u.employee_id) LIKE ? OR LOWER(a.notes) LIKE ?)"
		pattern := "%" + strings.ToLower(search) + "%"
		args = append(args, pattern, pattern, pattern)
	}
	if facID != "" && facID != "all" {
		query += " AND a.facility_id = ?"
		args = append(args, facID)
	}
	if deptID != "" && deptID != "all" {
		query += " AND a.department_id = ?"
		args = append(args, deptID)
	}
	if status != "" && status != "all" {
		query += " AND a.status = ?"
		args = append(args, status)
	}
	if date != "" {
		query += " AND a.date = ?"
		args = append(args, date)
	}
	if startDate != "" {
		query += " AND a.date >= ?"
		args = append(args, startDate)
	}
	if endDate != "" {
		query += " AND a.date <= ?"
		args = append(args, endDate)
	}

	query += " ORDER BY a.date DESC, a.created_at DESC"

	records, err := h.scanAttendanceRows(r.Context(), query, args...)
	if err != nil {
		log.Printf("[ATTENDANCE ERROR] Register query failed: %v", err)
		responses.InternalServerError(w, "Failed to retrieve attendance register")
		return
	}

	responses.JSON(w, http.StatusOK, records)
}

type SubmitAttendanceRequest struct {
	EmployeeID          string                      `json:"employeeId"`
	EmployeeName        string                      `json:"employeeName"`
	EmployeeCode        string                      `json:"employeeCode"`
	DepartmentID        string                      `json:"departmentId"`
	DepartmentName      string                      `json:"departmentName"`
	FacilityID          string                      `json:"facilityId"`
	FacilityName        string                      `json:"facilityName"`
	Type                string                      `json:"type"` // "check_in" or "check_out"
	IsOffline           bool                        `json:"isOffline"`
	VerificationMode    domain.VerificationMode     `json:"verificationMode"`
	VerificationDetails domain.VerificationResult   `json:"verificationDetails"`
	ClientLatitude      float64                     `json:"clientLatitude,omitempty"`
	ClientLongitude     float64                     `json:"clientLongitude,omitempty"`
}

func (h *AttendanceHandler) CheckIn(w http.ResponseWriter, r *http.Request) {
	var req SubmitAttendanceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		responses.BadRequest(w, "Invalid JSON payload", nil)
		return
	}

	user := middleware.GetUserFromContext(r.Context())
	empID := req.EmployeeID
	if empID == "" && user != nil {
		empID = user.ID
	}
	if empID == "" {
		responses.BadRequest(w, "employeeId is required", nil)
		return
	}

	// Resolve internal user record
	var internalUser domain.User
	userQuery := `SELECT id, organization_id, employee_id, name, is_active, department_id, assigned_facility_id FROM users WHERE id = ? OR employee_id = ? LIMIT 1`
	err := h.db.QueryRowContext(r.Context(), userQuery, empID, empID).Scan(
		&internalUser.ID, &internalUser.OrganizationID, &internalUser.EmployeeID,
		&internalUser.Name, &internalUser.IsActive, &internalUser.DepartmentID, &internalUser.AssignedFacilityID,
	)
	if err != nil {
		responses.NotFound(w, "Employee not found in organization")
		return
	}

	if !internalUser.IsActive {
		responses.Forbidden(w, "Employee account is deactivated.")
		return
	}

	now := time.Now().UTC()
	today := now.Format("2006-01-02")

	// Check if already checked in today
	var existingID string
	var existingIn sql.NullTime
	err = h.db.QueryRowContext(r.Context(), "SELECT id, check_in_time FROM attendance_records WHERE employee_id = ? AND date = ?", internalUser.ID, today).Scan(&existingID, &existingIn)
	if err == nil && existingIn.Valid {
		responses.Conflict(w, fmt.Sprintf("Employee is already checked in for today (%s at %s).", today, existingIn.Time.Format("15:04")))
		return
	}

	// Geofence server-side validation if facility provided
	facID := req.FacilityID
	if facID == "" {
		facID = internalUser.AssignedFacilityID
	}

	var facLat, facLon float64
	var facRadius int
	var facName string
	facErr := h.db.QueryRowContext(r.Context(), "SELECT name, latitude, longitude, geofence_radius_meters FROM facilities WHERE id = ?", facID).Scan(&facName, &facLat, &facLon, &facRadius)
	if facErr == nil && req.ClientLatitude != 0 && req.ClientLongitude != 0 {
		dist := verification.HaversineDistance(req.ClientLatitude, req.ClientLongitude, facLat, facLon)
		if dist >= 0 && int(dist) > facRadius {
			req.VerificationDetails.FacilityMatch = false
			req.VerificationDetails.Message = fmt.Sprintf("Server verification: GPS coordinate is %dm outside permitted %dm facility boundary.", int(dist)-facRadius, facRadius)
		}
	}

	// Determine status (check shift for on-time vs late arrival)
	status := domain.AttendancePresent
	var shiftStart string
	var gracePeriod int
	shiftErr := h.db.QueryRowContext(r.Context(), "SELECT start_time, grace_period_minutes FROM shifts WHERE (assigned_facility_id = ? OR organization_id = ?) AND is_active = true LIMIT 1", facID, internalUser.OrganizationID).Scan(&shiftStart, &gracePeriod)
	if shiftErr == nil && shiftStart != "" {
		parts := strings.Split(shiftStart, ":")
		if len(parts) == 2 {
			var hour, min int
			_, _ = fmt.Sscanf(parts[0], "%d", &hour)
			_, _ = fmt.Sscanf(parts[1], "%d", &min)
			expectedTime := time.Date(now.Year(), now.Month(), now.Day(), hour, min+gracePeriod, 0, 0, time.UTC)
			if now.After(expectedTime) {
				status = domain.AttendanceLate
			}
		}
	}

	recID := "att-" + uuid.New().String()
	detailsJSON, _ := json.Marshal(req.VerificationDetails)

	insertQuery := `
	INSERT INTO attendance_records (
		id, organization_id, employee_id, facility_id, department_id, date,
		check_in_time, status, verification_mode, sync_status, is_offline_capture,
		verification_details, created_at, updated_at
	) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', false, ?, ?, ?)
	ON DUPLICATE KEY UPDATE
		check_in_time = VALUES(check_in_time),
		status = VALUES(status),
		verification_details = VALUES(verification_details),
		updated_at = VALUES(updated_at)`

	var deptID interface{}
	if internalUser.DepartmentID != "" {
		deptID = internalUser.DepartmentID
	}

	_, err = h.db.ExecContext(r.Context(), insertQuery,
		recID, internalUser.OrganizationID, internalUser.ID, facID, deptID, today,
		now, status, req.VerificationMode, detailsJSON, now, now)

	if err != nil {
		log.Printf("[ATTENDANCE ERROR] Check-in insertion failed: %v", err)
		responses.InternalServerError(w, "Failed to record check-in")
		return
	}

	h.recorder.Record(r.Context(), domain.AuditLog{
		OrganizationID:   internalUser.OrganizationID,
		ActorID:          internalUser.EmployeeID,
		ActorName:        internalUser.Name,
		ActorRole:        "employee",
		Action:           "attendance_checkin",
		AffectedResource: fmt.Sprintf("Attendance Record #%s", recID),
		ResourceID:       recID,
		Details:          fmt.Sprintf("Checked in at %s (Status: %s, Mode: %s).", facName, status, req.VerificationMode),
		Outcome:          "success",
		IPAddress:        r.RemoteAddr,
		UserAgent:        r.UserAgent(),
	})

	record, err := h.fetchAttendanceByID(r.Context(), recID)
	if err != nil {
		responses.InternalServerError(w, "Failed to retrieve recorded attendance")
		return
	}

	responses.JSON(w, http.StatusOK, map[string]interface{}{
		"record": record,
	})
}

func (h *AttendanceHandler) CheckOut(w http.ResponseWriter, r *http.Request) {
	var req SubmitAttendanceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		responses.BadRequest(w, "Invalid JSON payload", nil)
		return
	}

	user := middleware.GetUserFromContext(r.Context())
	empID := req.EmployeeID
	if empID == "" && user != nil {
		empID = user.ID
	}
	if empID == "" {
		responses.BadRequest(w, "employeeId is required", nil)
		return
	}

	// Resolve internal user
	var internalUser domain.User
	userQuery := `SELECT id, organization_id, employee_id, name, is_active FROM users WHERE id = ? OR employee_id = ? LIMIT 1`
	err := h.db.QueryRowContext(r.Context(), userQuery, empID, empID).Scan(
		&internalUser.ID, &internalUser.OrganizationID, &internalUser.EmployeeID, &internalUser.Name, &internalUser.IsActive,
	)
	if err != nil {
		responses.NotFound(w, "Employee not found in organization")
		return
	}

	today := time.Now().UTC().Format("2006-01-02")
	var recID string
	var checkIn sql.NullTime
	var checkOut sql.NullTime

	err = h.db.QueryRowContext(r.Context(), `
		SELECT id, check_in_time, check_out_time FROM attendance_records
		WHERE employee_id = ? AND date = ? LIMIT 1`, internalUser.ID, today).Scan(&recID, &checkIn, &checkOut)

	if err != nil || !checkIn.Valid {
		responses.BadRequest(w, "Cannot check out without an active check-in record for today.", nil)
		return
	}

	if checkOut.Valid {
		responses.Conflict(w, fmt.Sprintf("Employee already checked out at %s.", checkOut.Time.Format("15:04")))
		return
	}

	now := time.Now().UTC()
	_, err = h.db.ExecContext(r.Context(), "UPDATE attendance_records SET check_out_time = ?, updated_at = ? WHERE id = ?", now, now, recID)
	if err != nil {
		responses.InternalServerError(w, "Failed to record check-out")
		return
	}

	h.recorder.Record(r.Context(), domain.AuditLog{
		OrganizationID:   internalUser.OrganizationID,
		ActorID:          internalUser.EmployeeID,
		ActorName:        internalUser.Name,
		ActorRole:        "employee",
		Action:           "attendance_checkout",
		AffectedResource: fmt.Sprintf("Attendance Record #%s", recID),
		ResourceID:       recID,
		Details:          "Checked out successfully.",
		Outcome:          "success",
		IPAddress:        r.RemoteAddr,
		UserAgent:        r.UserAgent(),
	})

	record, err := h.fetchAttendanceByID(r.Context(), recID)
	if err != nil {
		responses.InternalServerError(w, "Failed to retrieve updated attendance record")
		return
	}

	responses.JSON(w, http.StatusOK, map[string]interface{}{
		"record": record,
	})
}

type CorrectAttendanceRequest struct {
	CorrectedTime  string `json:"correctedTime"`
	Reason         string `json:"reason"`
	ApprovedBy     string `json:"approvedBy"`
	ApprovedByName string `json:"approvedByName"`
	Notes          string `json:"notes,omitempty"`
}

func (h *AttendanceHandler) Correct(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		responses.BadRequest(w, "Attendance ID is required in URL", nil)
		return
	}

	var req CorrectAttendanceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		responses.BadRequest(w, "Invalid correction payload", nil)
		return
	}

	if req.CorrectedTime == "" || req.Reason == "" {
		responses.BadRequest(w, "Corrected time and justification reason are required.", nil)
		return
	}

	var orgID, empName, originalInStr string
	var origCheckIn sql.NullTime
	err := h.db.QueryRowContext(r.Context(), `
		SELECT a.organization_id, u.name, a.check_in_time
		FROM attendance_records a
		JOIN users u ON a.employee_id = u.id
		WHERE a.id = ?`, id).Scan(&orgID, &empName, &origCheckIn)

	if err != nil {
		responses.NotFound(w, "Attendance record not found")
		return
	}

	if origCheckIn.Valid {
		originalInStr = origCheckIn.Time.Format(time.RFC3339)
	}

	tx, err := h.db.BeginTx(r.Context(), nil)
	if err != nil {
		responses.InternalServerError(w, "Transaction start error")
		return
	}
	defer tx.Rollback()

	corrID := "corr-" + uuid.New().String()
	now := time.Now().UTC()

	approverID := req.ApprovedBy
	if approverID == "" {
		actor := middleware.GetUserFromContext(r.Context())
		if actor != nil {
			approverID = actor.ID
		}
	}

	insertCorr := `
	INSERT INTO attendance_corrections (
		id, organization_id, attendance_id, original_time, corrected_time,
		reason, approved_by, notes, applied_at
	) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`

	_, err = tx.ExecContext(r.Context(), insertCorr,
		corrID, orgID, id, originalInStr, req.CorrectedTime, req.Reason, approverID, req.Notes, now)

	if err != nil {
		log.Printf("[CORRECT ERROR] Insert correction audit failed: %v", err)
		responses.InternalServerError(w, "Failed to record correction entry")
		return
	}

	// Update the attendance record
	_, err = tx.ExecContext(r.Context(), "UPDATE attendance_records SET check_in_time = ?, updated_at = ? WHERE id = ?", req.CorrectedTime, now, id)
	if err != nil {
		responses.InternalServerError(w, "Failed to update attendance record timestamp")
		return
	}

	if err := tx.Commit(); err != nil {
		responses.InternalServerError(w, "Failed to commit correction transaction")
		return
	}

	h.recorder.Record(r.Context(), domain.AuditLog{
		OrganizationID:   orgID,
		ActorID:          approverID,
		ActorName:        req.ApprovedByName,
		ActorRole:        "supervisor",
		Action:           "attendance_correction",
		AffectedResource: fmt.Sprintf("Attendance Record #%s", id),
		ResourceID:       id,
		Details:          fmt.Sprintf("Administrative correction applied for %s: %s (Reason: %s)", empName, req.CorrectedTime, req.Reason),
		Outcome:          "success",
		IPAddress:        r.RemoteAddr,
		UserAgent:        r.UserAgent(),
	})

	record, err := h.fetchAttendanceByID(r.Context(), id)
	if err != nil {
		responses.InternalServerError(w, "Failed to load updated record")
		return
	}

	responses.JSON(w, http.StatusOK, record)
}

func (h *AttendanceHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		responses.BadRequest(w, "Attendance ID is required", nil)
		return
	}

	record, err := h.fetchAttendanceByID(r.Context(), id)
	if err != nil {
		responses.NotFound(w, "Attendance record not found")
		return
	}

	responses.JSON(w, http.StatusOK, record)
}

type VerifyFacilityRequest struct {
	FacilityID string  `json:"facilityId"`
	Latitude   float64 `json:"latitude"`
	Longitude  float64 `json:"longitude"`
}

func (h *AttendanceHandler) VerifyFacility(w http.ResponseWriter, r *http.Request) {
	var req VerifyFacilityRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		responses.BadRequest(w, "Invalid JSON payload", nil)
		return
	}

	var name string
	var lat, lon float64
	var radius int
	var requireNet bool
	var ipsJSON string

	err := h.db.QueryRowContext(r.Context(), `
		SELECT name, latitude, longitude, geofence_radius_meters, require_network_match, COALESCE(allowed_ip_ranges, '[]')
		FROM facilities WHERE id = ?`, req.FacilityID).Scan(&name, &lat, &lon, &radius, &requireNet, &ipsJSON)

	if err != nil {
		responses.NotFound(w, "Unknown facility identifier provided.")
		return
	}

	var allowedIPs []string
	_ = json.Unmarshal([]byte(ipsJSON), &allowedIPs)

	res, err := verification.EvaluateProximity(req.Latitude, req.Longitude, lat, lon, radius, r.RemoteAddr, allowedIPs, requireNet)
	if err != nil {
		responses.BadRequest(w, err.Error(), nil)
		return
	}

	result := domain.VerificationResult{
		IsVerified:        res.WithinRadius && res.NetworkMatch,
		Score:             0.95,
		Mode:              domain.ModeFaceFacility,
		FaceMatch:         true,
		FacilityMatch:     res.WithinRadius,
		GpsDistanceMeters: &res.DistanceMeters,
		NetworkMatch:      &res.NetworkMatch,
		Message:           res.Message,
		Timestamp:         time.Now().UTC().Format(time.RFC3339),
	}

	responses.JSON(w, http.StatusOK, result)
}

type VerifyBiometricRequest struct {
	EmployeeID      string `json:"employeeId"`
	FaceImageBase64 string `json:"faceImageBase64"`
}

func (h *AttendanceHandler) VerifyBiometric(w http.ResponseWriter, r *http.Request) {
	var req VerifyBiometricRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		responses.BadRequest(w, "Invalid JSON payload", nil)
		return
	}

	if req.EmployeeID == "" {
		responses.BadRequest(w, "employeeId is required", nil)
		return
	}

	// Biometric verification through interface
	matchRes, err := h.biometrics.Verify(r.Context(), req.EmployeeID, req.FaceImageBase64)
	if err != nil {
		// Log verification failure without logging face image
		log.Printf("[BIOMETRIC VERIFICATION] Verification error for %s: %v", req.EmployeeID, err)
		responses.JSON(w, http.StatusOK, domain.VerificationResult{
			IsVerified:    false,
			Score:         0.40,
			Mode:          domain.ModeFaceFacility,
			FaceMatch:     false,
			FacilityMatch: true,
			Message:       fmt.Sprintf("Facial verification failed: %v", err),
			Timestamp:     time.Now().UTC().Format(time.RFC3339),
		})
		return
	}

	responses.JSON(w, http.StatusOK, domain.VerificationResult{
		IsVerified:    matchRes.Matched,
		Score:         matchRes.ConfidenceScore,
		Mode:          domain.ModeFaceFacility,
		FaceMatch:     matchRes.Matched,
		FacilityMatch: true,
		Message:       matchRes.Message,
		Timestamp:     time.Now().UTC().Format(time.RFC3339),
	})
}

func (h *AttendanceHandler) scanAttendanceRows(ctx context.Context, query string, args ...interface{}) ([]domain.AttendanceRecord, error) {
	rows, err := h.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	records := make([]domain.AttendanceRecord, 0)
	for rows.Next() {
		var a domain.AttendanceRecord
		var checkIn, checkOut sql.NullTime
		var detailsJSON sql.NullString
		var createdAt time.Time
		var date time.Time

		err := rows.Scan(
			&a.ID, &a.OrganizationID, &a.EmployeeID, &a.EmployeeName, &a.EmployeeCode,
			&a.DepartmentID, &a.DepartmentName, &a.FacilityID, &a.FacilityName,
			&date, &checkIn, &checkOut, &a.Status, &a.VerificationMode,
			&a.SyncStatus, &a.IsOfflineCapture, &detailsJSON, &a.Notes, &createdAt,
		)
		if err == nil {
			a.Date = date.Format("2006-01-02")
			a.CreatedAt = createdAt.Format(time.RFC3339)
			if checkIn.Valid {
				inStr := checkIn.Time.Format(time.RFC3339)
				a.CheckInTime = &inStr
			}
			if checkOut.Valid {
				outStr := checkOut.Time.Format(time.RFC3339)
				a.CheckOutTime = &outStr
			}
			if detailsJSON.Valid && detailsJSON.String != "" {
				var det domain.VerificationResult
				if json.Unmarshal([]byte(detailsJSON.String), &det) == nil {
					a.VerificationDetails = &det
				}
			}
			records = append(records, a)
		}
	}
	return records, nil
}

func (h *AttendanceHandler) fetchAttendanceByID(ctx context.Context, id string) (*domain.AttendanceRecord, error) {
	query := `
	SELECT a.id, a.organization_id, a.employee_id, u.name, u.employee_id,
	       COALESCE(u.department_id, ''), COALESCE(d.name, 'General Staff'),
	       a.facility_id, COALESCE(f.name, 'Default Facility'),
	       a.date, a.check_in_time, a.check_out_time, a.status, a.verification_mode,
	       a.sync_status, a.is_offline_capture, a.verification_details, COALESCE(a.notes, ''), a.created_at
	FROM attendance_records a
	JOIN users u ON a.employee_id = u.id
	LEFT JOIN departments d ON a.department_id = d.id
	LEFT JOIN facilities f ON a.facility_id = f.id
	WHERE a.id = ?
	LIMIT 1`

	records, err := h.scanAttendanceRows(ctx, query, id)
	if err != nil || len(records) == 0 {
		return nil, fmt.Errorf("record not found")
	}

	rec := records[0]

	// Fetch correction history
	corrQuery := `
	SELECT c.original_time, c.corrected_time, c.reason, c.approved_by, u.name, c.applied_at, COALESCE(c.notes, '')
	FROM attendance_corrections c
	JOIN users u ON c.approved_by = u.id
	WHERE c.attendance_id = ?
	ORDER BY c.applied_at ASC`

	rows, err := h.db.QueryContext(ctx, corrQuery, id)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var c domain.AttendanceCorrection
			var appliedAt time.Time
			if err := rows.Scan(&c.OriginalTime, &c.CorrectedTime, &c.Reason, &c.ApprovedBy, &c.ApprovedByName, &appliedAt, &c.Notes); err == nil {
				c.AppliedAt = appliedAt.Format(time.RFC3339)
				rec.CorrectionHistory = append(rec.CorrectionHistory, c)
			}
		}
	}

	return &rec, nil
}
