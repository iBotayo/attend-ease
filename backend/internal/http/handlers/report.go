package handlers

import (
	"bytes"
	"database/sql"
	"encoding/csv"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"attendease/internal/domain"
	"attendease/internal/http/middleware"
	"attendease/internal/http/responses"
)

type ReportHandler struct {
	db *sql.DB
}

func NewReportHandler(db *sql.DB) *ReportHandler {
	return &ReportHandler{db: db}
}

func (h *ReportHandler) Summary(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgIDFromContext(r.Context())
	if orgID == "" {
		orgID = r.Header.Get("X-Organization-Id")
	}

	q := r.URL.Query()
	startDate := strings.TrimSpace(q.Get("startDate"))
	endDate := strings.TrimSpace(q.Get("endDate"))
	facID := strings.TrimSpace(q.Get("facilityId"))
	deptID := strings.TrimSpace(q.Get("departmentId"))
	status := strings.TrimSpace(q.Get("status"))

	query := `
	SELECT a.id, a.organization_id, a.employee_id, u.name, u.employee_id,
	       COALESCE(u.department_id, ''), COALESCE(d.name, 'General Staff'),
	       a.facility_id, COALESCE(f.name, 'Default Facility'),
	       a.date, a.check_in_time, a.check_out_time, a.status, a.verification_mode,
	       a.sync_status, a.is_offline_capture, COALESCE(a.notes, ''), a.created_at
	FROM attendance_records a
	JOIN users u ON a.employee_id = u.id
	LEFT JOIN departments d ON a.department_id = d.id
	LEFT JOIN facilities f ON a.facility_id = f.id
	WHERE (a.organization_id = ? OR ? = '')`

	var args []interface{}
	args = append(args, orgID, orgID)

	if startDate != "" {
		query += " AND a.date >= ?"
		args = append(args, startDate)
	}
	if endDate != "" {
		query += " AND a.date <= ?"
		args = append(args, endDate)
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

	query += " ORDER BY a.date DESC"

	rows, err := h.db.QueryContext(r.Context(), query, args...)
	if err != nil {
		log.Printf("[REPORT ERROR] Summary query failed: %v", err)
		responses.InternalServerError(w, "Failed to compute report summary")
		return
	}
	defer rows.Close()

	records := make([]domain.AttendanceRecord, 0)
	var presentCount, lateCount, absentCount, reviewCount int

	for rows.Next() {
		var a domain.AttendanceRecord
		var checkIn, checkOut sql.NullTime
		var createdAt, date time.Time

		err := rows.Scan(
			&a.ID, &a.OrganizationID, &a.EmployeeID, &a.EmployeeName, &a.EmployeeCode,
			&a.DepartmentID, &a.DepartmentName, &a.FacilityID, &a.FacilityName,
			&date, &checkIn, &checkOut, &a.Status, &a.VerificationMode,
			&a.SyncStatus, &a.IsOfflineCapture, &a.Notes, &createdAt,
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

			switch a.Status {
			case domain.AttendancePresent:
				presentCount++
			case domain.AttendanceLate:
				lateCount++
			case domain.AttendanceAbsent:
				absentCount++
			}
			if a.SyncStatus == domain.SyncReviewRequired {
				reviewCount++
			}

			records = append(records, a)
		}
	}

	total := len(records)
	attended := presentCount + lateCount
	attRate := 0
	if total > 0 {
		attRate = int(float64(attended) / float64(total) * 100)
	}
	onTimeRate := 0
	if attended > 0 {
		onTimeRate = int(float64(presentCount) / float64(attended) * 100)
	}

	stats := domain.ReportSummaryStats{
		TotalRecords:          total,
		PresentCount:          presentCount,
		LateCount:             lateCount,
		AbsentCount:           absentCount,
		ReviewRequiredCount:   reviewCount,
		AttendanceRatePercent: attRate,
		OnTimeRatePercent:     onTimeRate,
	}

	responses.JSON(w, http.StatusOK, map[string]interface{}{
		"records": records,
		"summary": stats,
	})
}

func (h *ReportHandler) ExportCSV(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgIDFromContext(r.Context())
	if orgID == "" {
		orgID = r.Header.Get("X-Organization-Id")
	}

	query := `
	SELECT a.id, u.name, u.employee_id, COALESCE(d.name, 'General Staff'),
	       COALESCE(f.name, 'Default Facility'), a.date, a.check_in_time,
	       a.check_out_time, a.status, a.verification_mode, a.sync_status, COALESCE(a.notes, '')
	FROM attendance_records a
	JOIN users u ON a.employee_id = u.id
	LEFT JOIN departments d ON a.department_id = d.id
	LEFT JOIN facilities f ON a.facility_id = f.id
	WHERE a.organization_id = ? OR ? = ''
	ORDER BY a.date DESC`

	rows, err := h.db.QueryContext(r.Context(), query, orgID, orgID)
	if err != nil {
		responses.InternalServerError(w, "Failed to query records for CSV export")
		return
	}
	defer rows.Close()

	var buf bytes.Buffer
	writer := csv.NewWriter(&buf)

	// Write CSV Header
	_ = writer.Write([]string{
		"Employee ID", "Employee Name", "Department", "Facility", "Date",
		"Check In", "Check Out", "Status", "Verification Mode", "Sync Status", "Notes",
	})

	for rows.Next() {
		var id, empName, empCode, deptName, facName, status, mode, syncStatus, notes string
		var checkIn, checkOut sql.NullTime
		var date time.Time

		err := rows.Scan(&id, &empName, &empCode, &deptName, &facName, &date, &checkIn, &checkOut, &status, &mode, &syncStatus, &notes)
		if err == nil {
			checkInStr := "—"
			if checkIn.Valid {
				checkInStr = checkIn.Time.Format("15:04:05")
			}
			checkOutStr := "—"
			if checkOut.Valid {
				checkOutStr = checkOut.Time.Format("15:04:05")
			}

			// Apply formula injection sanitization to each cell
			row := []string{
				SanitizeCSVCell(empCode),
				SanitizeCSVCell(empName),
				SanitizeCSVCell(deptName),
				SanitizeCSVCell(facName),
				date.Format("2006-01-02"),
				checkInStr,
				checkOutStr,
				strings.ToUpper(status),
				mode,
				syncStatus,
				SanitizeCSVCell(notes),
			}
			_ = writer.Write(row)
		}
	}
	writer.Flush()

	filename := fmt.Sprintf("attend_ease_report_%s.csv", time.Now().UTC().Format("2006-01-02"))
	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(buf.Bytes())
}

// SanitizeCSVCell prevents CSV formula injection by escaping leading '=', '+', '-', '@', '\t', '\r'
func SanitizeCSVCell(value string) string {
	if value == "" {
		return ""
	}
	firstChar := value[0]
	if firstChar == '=' || firstChar == '+' || firstChar == '-' || firstChar == '@' || firstChar == '\t' || firstChar == '\r' {
		return "'" + value
	}
	return value
}
