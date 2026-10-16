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
	"attendease/internal/auth"
	"attendease/internal/domain"
	"attendease/internal/http/middleware"
	"attendease/internal/http/responses"
	"github.com/google/uuid"
)

type EmployeeHandler struct {
	db       *sql.DB
	hasher   *auth.PasswordHasher
	recorder *audit.Recorder
}

func NewEmployeeHandler(db *sql.DB, recorder *audit.Recorder) *EmployeeHandler {
	return &EmployeeHandler{
		db:       db,
		hasher:   auth.NewPasswordHasher(),
		recorder: recorder,
	}
}

func (h *EmployeeHandler) List(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgIDFromContext(r.Context())
	if orgID == "" {
		orgID = r.Header.Get("X-Organization-Id")
	}

	q := r.URL.Query()
	search := strings.TrimSpace(q.Get("search"))
	deptID := strings.TrimSpace(q.Get("departmentId"))
	facID := strings.TrimSpace(q.Get("facilityId"))
	role := strings.TrimSpace(q.Get("role"))
	status := strings.TrimSpace(q.Get("status"))

	query := `
	SELECT u.id, u.organization_id, COALESCE(o.display_name, ''), u.employee_id, u.name, u.email,
	       u.role, COALESCE(u.department_id, ''), COALESCE(d.name, 'General Staff'),
	       COALESCE(u.assigned_facility_id, ''), COALESCE(f.name, 'Default Facility'),
	       COALESCE(u.avatar_url, ''), COALESCE(u.phone, ''), u.is_active,
	       u.biometric_status, u.enrolled_at, u.joined_date
	FROM users u
	LEFT JOIN organizations o ON u.organization_id = o.id
	LEFT JOIN departments d ON u.department_id = d.id
	LEFT JOIN facilities f ON u.assigned_facility_id = f.id
	WHERE 1=1`

	var args []interface{}
	if orgID != "" {
		query += " AND u.organization_id = ?"
		args = append(args, orgID)
	}

	if search != "" {
		query += " AND (LOWER(u.name) LIKE ? OR LOWER(u.email) LIKE ? OR LOWER(u.employee_id) LIKE ?)"
		pattern := "%" + strings.ToLower(search) + "%"
		args = append(args, pattern, pattern, pattern)
	}
	if deptID != "" && deptID != "all" {
		query += " AND u.department_id = ?"
		args = append(args, deptID)
	}
	if facID != "" && facID != "all" {
		query += " AND u.assigned_facility_id = ?"
		args = append(args, facID)
	}
	if role != "" && role != "all" {
		query += " AND u.role = ?"
		args = append(args, role)
	}
	if status == "active" {
		query += " AND u.is_active = true"
	} else if status == "inactive" {
		query += " AND u.is_active = false"
	}

	query += " ORDER BY u.employee_id ASC"

	rows, err := h.db.QueryContext(r.Context(), query, args...)
	if err != nil {
		log.Printf("[EMPLOYEE ERROR] List query failed: %v", err)
		responses.InternalServerError(w, "Failed to retrieve employee directory")
		return
	}
	defer rows.Close()

	users := make([]domain.User, 0)
	for rows.Next() {
		var u domain.User
		var enrolledAt sql.NullTime
		var joinedDate time.Time

		err := rows.Scan(
			&u.ID, &u.OrganizationID, &u.OrganizationName, &u.EmployeeID, &u.Name, &u.Email,
			&u.Role, &u.DepartmentID, &u.DepartmentName,
			&u.AssignedFacilityID, &u.AssignedFacilityName,
			&u.AvatarURL, &u.Phone, &u.IsActive,
			&u.BiometricStatus, &enrolledAt, &joinedDate,
		)
		if err == nil {
			if enrolledAt.Valid {
				formatted := enrolledAt.Time.Format(time.RFC3339)
				u.EnrolledAt = &formatted
			}
			u.JoinedDate = joinedDate.Format("2006-01-02")
			users = append(users, u)
		}
	}

	responses.JSON(w, http.StatusOK, users)
}

func (h *EmployeeHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		responses.BadRequest(w, "Employee ID required", nil)
		return
	}

	query := `
	SELECT u.id, u.organization_id, COALESCE(o.display_name, ''), u.employee_id, u.name, u.email,
	       u.role, COALESCE(u.department_id, ''), COALESCE(d.name, 'General Staff'),
	       COALESCE(u.assigned_facility_id, ''), COALESCE(f.name, 'Default Facility'),
	       COALESCE(u.avatar_url, ''), COALESCE(u.phone, ''), u.is_active,
	       u.biometric_status, u.enrolled_at, u.joined_date
	FROM users u
	LEFT JOIN organizations o ON u.organization_id = o.id
	LEFT JOIN departments d ON u.department_id = d.id
	LEFT JOIN facilities f ON u.assigned_facility_id = f.id
	WHERE u.id = ? OR u.employee_id = ?
	LIMIT 1`

	var u domain.User
	var enrolledAt sql.NullTime
	var joinedDate time.Time

	err := h.db.QueryRowContext(r.Context(), query, id, id).Scan(
		&u.ID, &u.OrganizationID, &u.OrganizationName, &u.EmployeeID, &u.Name, &u.Email,
		&u.Role, &u.DepartmentID, &u.DepartmentName,
		&u.AssignedFacilityID, &u.AssignedFacilityName,
		&u.AvatarURL, &u.Phone, &u.IsActive,
		&u.BiometricStatus, &enrolledAt, &joinedDate,
	)
	if err != nil {
		responses.NotFound(w, "Employee not found")
		return
	}

	if enrolledAt.Valid {
		formatted := enrolledAt.Time.Format(time.RFC3339)
		u.EnrolledAt = &formatted
	}
	u.JoinedDate = joinedDate.Format("2006-01-02")

	responses.JSON(w, http.StatusOK, u)
}

type CreateEmployeeRequest struct {
	Name               string          `json:"name"`
	Email              string          `json:"email"`
	Phone              string          `json:"phone,omitempty"`
	Role               domain.UserRole `json:"role"`
	DepartmentID       string          `json:"departmentId"`
	AssignedFacilityID string          `json:"assignedFacilityId"`
}

func (h *EmployeeHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req CreateEmployeeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		responses.BadRequest(w, "Invalid JSON payload", nil)
		return
	}

	cleanEmail := strings.ToLower(strings.TrimSpace(req.Email))
	cleanName := strings.TrimSpace(req.Name)
	if cleanName == "" || !emailRegex.MatchString(cleanEmail) {
		responses.BadRequest(w, "Valid name and email address are required.", nil)
		return
	}

	orgID := middleware.GetOrgIDFromContext(r.Context())
	if orgID == "" {
		orgID = r.Header.Get("X-Organization-Id")
	}

	// Calculate next Employee ID
	var count int
	_ = h.db.QueryRowContext(r.Context(), "SELECT COUNT(*) FROM users WHERE organization_id = ?", orgID).Scan(&count)
	nextCode := fmt.Sprintf("EMP-%d", 1000+count+1)

	newID := "user-emp-" + uuid.New().String()
	defaultPassword := "AttendEase2026!"
	passwordHash, _ := h.hasher.HashPassword(defaultPassword)

	now := time.Now().UTC()

	insertQuery := `
	INSERT INTO users (
		id, organization_id, employee_id, name, email, password_hash, role,
		department_id, assigned_facility_id, phone, is_active, biometric_status,
		joined_date, created_at, updated_at
	) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, true, 'not_enrolled', ?, ?, ?)`

	var deptID, facID interface{}
	if req.DepartmentID != "" {
		deptID = req.DepartmentID
	}
	if req.AssignedFacilityID != "" {
		facID = req.AssignedFacilityID
	}

	_, err := h.db.ExecContext(r.Context(), insertQuery,
		newID, orgID, nextCode, cleanName, cleanEmail, passwordHash, req.Role,
		deptID, facID, req.Phone, now.Format("2006-01-02"), now, now)

	if err != nil {
		log.Printf("[EMPLOYEE ERROR] Creation failed: %v", err)
		responses.InternalServerError(w, "Failed to create employee record")
		return
	}

	actor := middleware.GetUserFromContext(r.Context())
	actorName := "System Admin"
	actorID := "SYSTEM"
	actorRole := "admin"
	if actor != nil {
		actorName = actor.Name
		actorID = actor.EmployeeID
		actorRole = string(actor.Role)
	}

	h.recorder.Record(r.Context(), domain.AuditLog{
		OrganizationID:   orgID,
		ActorID:          actorID,
		ActorName:        actorName,
		ActorRole:        actorRole,
		Action:           "employee_created",
		AffectedResource: fmt.Sprintf("Employee %s (%s)", cleanName, nextCode),
		ResourceID:       newID,
		Details:          fmt.Sprintf("Created employee %s with role %s.", cleanName, req.Role),
		Outcome:          "success",
		IPAddress:        r.RemoteAddr,
		UserAgent:        r.UserAgent(),
	})

	// Fetch created user
	r = r.WithContext(r.Context())
	h.fetchAndRespondUser(w, r, newID, http.StatusCreated)
}

func (h *EmployeeHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		responses.BadRequest(w, "Employee ID required", nil)
		return
	}

	var updates map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&updates); err != nil {
		responses.BadRequest(w, "Invalid JSON payload", nil)
		return
	}

	if name, ok := updates["name"].(string); ok && name != "" {
		_, _ = h.db.ExecContext(r.Context(), "UPDATE users SET name = ?, updated_at = ? WHERE id = ?", name, time.Now().UTC(), id)
	}
	if email, ok := updates["email"].(string); ok && emailRegex.MatchString(email) {
		_, _ = h.db.ExecContext(r.Context(), "UPDATE users SET email = ?, updated_at = ? WHERE id = ?", strings.ToLower(email), time.Now().UTC(), id)
	}
	if phone, ok := updates["phone"].(string); ok {
		_, _ = h.db.ExecContext(r.Context(), "UPDATE users SET phone = ?, updated_at = ? WHERE id = ?", phone, time.Now().UTC(), id)
	}
	if role, ok := updates["role"].(string); ok && role != "" {
		_, _ = h.db.ExecContext(r.Context(), "UPDATE users SET role = ?, updated_at = ? WHERE id = ?", role, time.Now().UTC(), id)
	}
	if deptID, ok := updates["departmentId"].(string); ok {
		_, _ = h.db.ExecContext(r.Context(), "UPDATE users SET department_id = ?, updated_at = ? WHERE id = ?", deptID, time.Now().UTC(), id)
	}
	if facID, ok := updates["assignedFacilityId"].(string); ok {
		_, _ = h.db.ExecContext(r.Context(), "UPDATE users SET assigned_facility_id = ?, updated_at = ? WHERE id = ?", facID, time.Now().UTC(), id)
	}
	if bioStatus, ok := updates["biometricStatus"].(string); ok {
		_, _ = h.db.ExecContext(r.Context(), "UPDATE users SET biometric_status = ?, updated_at = ? WHERE id = ?", bioStatus, time.Now().UTC(), id)
	}
	if isActive, ok := updates["isActive"].(bool); ok {
		_, _ = h.db.ExecContext(r.Context(), "UPDATE users SET is_active = ?, updated_at = ? WHERE id = ?", isActive, time.Now().UTC(), id)
	}

	h.fetchAndRespondUser(w, r, id, http.StatusOK)
}

func (h *EmployeeHandler) ToggleStatus(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		responses.BadRequest(w, "Employee ID required", nil)
		return
	}

	_, err := h.db.ExecContext(r.Context(), "UPDATE users SET is_active = NOT is_active, updated_at = ? WHERE id = ?", time.Now().UTC(), id)
	if err != nil {
		responses.InternalServerError(w, "Failed to toggle employee status")
		return
	}

	h.fetchAndRespondUser(w, r, id, http.StatusOK)
}

func (h *EmployeeHandler) GetDepartments(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgIDFromContext(r.Context())
	if orgID == "" {
		orgID = r.Header.Get("X-Organization-Id")
	}

	query := `
	SELECT d.id, d.organization_id, d.name, d.code, COUNT(u.id) as emp_count
	FROM departments d
	LEFT JOIN users u ON d.id = u.department_id AND u.is_active = true
	WHERE d.organization_id = ? OR ? = ''
	GROUP BY d.id, d.organization_id, d.name, d.code
	ORDER BY d.name ASC`

	rows, err := h.db.QueryContext(r.Context(), query, orgID, orgID)
	if err != nil {
		responses.InternalServerError(w, "Failed to query departments")
		return
	}
	defer rows.Close()

	depts := make([]domain.Department, 0)
	for rows.Next() {
		var d domain.Department
		if err := rows.Scan(&d.ID, &d.OrganizationID, &d.Name, &d.Code, &d.EmployeeCount); err == nil {
			depts = append(depts, d)
		}
	}

	responses.JSON(w, http.StatusOK, depts)
}

func (h *EmployeeHandler) fetchAndRespondUser(w http.ResponseWriter, r *http.Request, id string, statusCode int) {
	query := `
	SELECT u.id, u.organization_id, COALESCE(o.display_name, ''), u.employee_id, u.name, u.email,
	       u.role, COALESCE(u.department_id, ''), COALESCE(d.name, 'General Staff'),
	       COALESCE(u.assigned_facility_id, ''), COALESCE(f.name, 'Default Facility'),
	       COALESCE(u.avatar_url, ''), COALESCE(u.phone, ''), u.is_active,
	       u.biometric_status, u.enrolled_at, u.joined_date
	FROM users u
	LEFT JOIN organizations o ON u.organization_id = o.id
	LEFT JOIN departments d ON u.department_id = d.id
	LEFT JOIN facilities f ON u.assigned_facility_id = f.id
	WHERE u.id = ?
	LIMIT 1`

	var u domain.User
	var enrolledAt sql.NullTime
	var joinedDate time.Time

	err := h.db.QueryRowContext(r.Context(), query, id).Scan(
		&u.ID, &u.OrganizationID, &u.OrganizationName, &u.EmployeeID, &u.Name, &u.Email,
		&u.Role, &u.DepartmentID, &u.DepartmentName,
		&u.AssignedFacilityID, &u.AssignedFacilityName,
		&u.AvatarURL, &u.Phone, &u.IsActive,
		&u.BiometricStatus, &enrolledAt, &joinedDate,
	)
	if err != nil {
		responses.NotFound(w, "Employee not found")
		return
	}

	if enrolledAt.Valid {
		formatted := enrolledAt.Time.Format(time.RFC3339)
		u.EnrolledAt = &formatted
	}
	u.JoinedDate = joinedDate.Format("2006-01-02")

	responses.JSON(w, statusCode, u)
}
