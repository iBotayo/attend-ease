package handlers

import (
	"context"
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
	"github.com/google/uuid"
)

type FacilityHandler struct {
	db       *sql.DB
	recorder *audit.Recorder
}

func NewFacilityHandler(db *sql.DB, recorder *audit.Recorder) *FacilityHandler {
	return &FacilityHandler{db: db, recorder: recorder}
}

func (h *FacilityHandler) List(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgIDFromContext(r.Context())
	if orgID == "" {
		orgID = r.Header.Get("X-Organization-Id")
	}

	query := `
	SELECT f.id, f.organization_id, f.name, f.code, f.address, f.latitude, f.longitude,
	       f.geofence_radius_meters, f.require_network_match, COALESCE(f.allowed_ssid_prefixes, '[]'),
	       COALESCE(f.allowed_ip_ranges, '[]'), COALESCE(f.network_policy_description, ''),
	       f.allow_offline_attendance, f.max_offline_hours, f.require_review_threshold_hours,
	       COALESCE(f.offline_policy_description, ''), f.status, f.created_at,
	       COUNT(u.id) as emp_count
	FROM facilities f
	LEFT JOIN users u ON f.id = u.assigned_facility_id AND u.is_active = true
	WHERE f.organization_id = ? OR ? = ''
	GROUP BY f.id, f.organization_id, f.name, f.code, f.address, f.latitude, f.longitude,
	         f.geofence_radius_meters, f.require_network_match, f.allowed_ssid_prefixes,
	         f.allowed_ip_ranges, f.network_policy_description, f.allow_offline_attendance,
	         f.max_offline_hours, f.require_review_threshold_hours, f.offline_policy_description,
	         f.status, f.created_at
	ORDER BY f.created_at ASC`

	rows, err := h.db.QueryContext(r.Context(), query, orgID, orgID)
	if err != nil {
		log.Printf("[FACILITY ERROR] List query failed: %v", err)
		responses.InternalServerError(w, "Failed to retrieve facilities")
		return
	}
	defer rows.Close()

	facilities := make([]domain.Facility, 0)
	for rows.Next() {
		var f domain.Facility
		var ssidsJSON, ipsJSON string
		var netDesc, offDesc string
		var createdAt time.Time

		err := rows.Scan(
			&f.ID, &f.OrganizationID, &f.Name, &f.Code, &f.Address, &f.Coordinates.Latitude, &f.Coordinates.Longitude,
			&f.GeofenceRadiusMeters, &f.NetworkPolicy.RequireNetworkMatch, &ssidsJSON,
			&ipsJSON, &netDesc, &f.OfflinePolicy.AllowOfflineAttendance,
			&f.OfflinePolicy.MaxOfflineHours, &f.OfflinePolicy.RequireReviewThresholdHours,
			&offDesc, &f.Status, &createdAt, &f.ActiveEmployeeCount,
		)
		if err == nil {
			f.CreatedAt = createdAt.Format(time.RFC3339)
			_ = json.Unmarshal([]byte(ssidsJSON), &f.NetworkPolicy.AllowedSsidPrefixes)
			_ = json.Unmarshal([]byte(ipsJSON), &f.NetworkPolicy.AllowedIpRanges)
			f.NetworkPolicy.Description = netDesc
			f.OfflinePolicy.Description = offDesc
			facilities = append(facilities, f)
		}
	}

	responses.JSON(w, http.StatusOK, facilities)
}

func (h *FacilityHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		responses.BadRequest(w, "Facility ID is required", nil)
		return
	}

	facility, err := h.fetchFacilityByID(r.Context(), id)
	if err != nil {
		responses.NotFound(w, "Facility not found")
		return
	}

	responses.JSON(w, http.StatusOK, facility)
}

type CreateFacilityRequest struct {
	Name                        string   `json:"name"`
	Code                        string   `json:"code"`
	Address                     string   `json:"address"`
	Latitude                    float64  `json:"latitude"`
	Longitude                   float64  `json:"longitude"`
	GeofenceRadiusMeters        int      `json:"geofenceRadiusMeters"`
	RequireNetworkMatch         bool     `json:"requireNetworkMatch"`
	AllowedSsidPrefixes         []string `json:"allowedSsidPrefixes"`
	AllowOfflineAttendance      bool     `json:"allowOfflineAttendance"`
	MaxOfflineHours             int      `json:"maxOfflineHours"`
	RequireReviewThresholdHours int      `json:"requireReviewThresholdHours"`
	Status                      string   `json:"status"`
}

func (h *FacilityHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req CreateFacilityRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		responses.BadRequest(w, "Invalid JSON payload", nil)
		return
	}

	cleanName := strings.TrimSpace(req.Name)
	cleanCode := strings.ToUpper(strings.TrimSpace(req.Code))
	if cleanName == "" || cleanCode == "" {
		responses.BadRequest(w, "Facility name and unique code are required.", nil)
		return
	}

	orgID := middleware.GetOrgIDFromContext(r.Context())
	if orgID == "" {
		orgID = r.Header.Get("X-Organization-Id")
	}

	radius := req.GeofenceRadiusMeters
	if radius <= 0 {
		radius = 150
	}

	ssidsJSON, _ := json.Marshal(req.AllowedSsidPrefixes)
	ipsJSON, _ := json.Marshal([]string{"10.0.0.0/8", "192.168.1.0/24"})
	now := time.Now().UTC()
	facID := "fac-" + uuid.New().String()

	status := req.Status
	if status == "" {
		status = "active"
	}

	insertQuery := `
	INSERT INTO facilities (
		id, organization_id, name, code, address, latitude, longitude,
		geofence_radius_meters, require_network_match, allowed_ssid_prefixes,
		allowed_ip_ranges, network_policy_description, allow_offline_attendance,
		max_offline_hours, require_review_threshold_hours, offline_policy_description,
		status, created_at, updated_at
	) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

	netDesc := "Geofence-only presence validation."
	if req.RequireNetworkMatch {
		netDesc = fmt.Sprintf("Strict Wi-Fi subnet match required (%s)", strings.Join(req.AllowedSsidPrefixes, ", "))
	}
	offDesc := fmt.Sprintf("Max %dh offline buffer with review after %dh.", req.MaxOfflineHours, req.RequireReviewThresholdHours)

	_, err := h.db.ExecContext(r.Context(), insertQuery,
		facID, orgID, cleanName, cleanCode, req.Address, req.Latitude, req.Longitude,
		radius, req.RequireNetworkMatch, ssidsJSON, ipsJSON, netDesc,
		req.AllowOfflineAttendance, req.MaxOfflineHours, req.RequireReviewThresholdHours, offDesc,
		status, now, now)

	if err != nil {
		log.Printf("[FACILITY ERROR] Insert failed: %v", err)
		responses.InternalServerError(w, "Failed to create facility")
		return
	}

	facility, err := h.fetchFacilityByID(r.Context(), facID)
	if err != nil {
		responses.InternalServerError(w, "Failed to load created facility")
		return
	}

	responses.JSON(w, http.StatusCreated, facility)
}

func (h *FacilityHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		responses.BadRequest(w, "Facility ID is required", nil)
		return
	}

	var updates map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&updates); err != nil {
		responses.BadRequest(w, "Invalid JSON payload", nil)
		return
	}

	if name, ok := updates["name"].(string); ok && name != "" {
		_, _ = h.db.ExecContext(r.Context(), "UPDATE facilities SET name = ?, updated_at = ? WHERE id = ?", name, time.Now().UTC(), id)
	}
	if code, ok := updates["code"].(string); ok && code != "" {
		_, _ = h.db.ExecContext(r.Context(), "UPDATE facilities SET code = ?, updated_at = ? WHERE id = ?", strings.ToUpper(code), time.Now().UTC(), id)
	}
	if address, ok := updates["address"].(string); ok {
		_, _ = h.db.ExecContext(r.Context(), "UPDATE facilities SET address = ?, updated_at = ? WHERE id = ?", address, time.Now().UTC(), id)
	}
	if lat, ok := updates["latitude"].(float64); ok {
		_, _ = h.db.ExecContext(r.Context(), "UPDATE facilities SET latitude = ?, updated_at = ? WHERE id = ?", lat, time.Now().UTC(), id)
	}
	if lon, ok := updates["longitude"].(float64); ok {
		_, _ = h.db.ExecContext(r.Context(), "UPDATE facilities SET longitude = ?, updated_at = ? WHERE id = ?", lon, time.Now().UTC(), id)
	}
	if radius, ok := updates["geofenceRadiusMeters"].(float64); ok && radius > 0 {
		_, _ = h.db.ExecContext(r.Context(), "UPDATE facilities SET geofence_radius_meters = ?, updated_at = ? WHERE id = ?", int(radius), time.Now().UTC(), id)
	}
	if status, ok := updates["status"].(string); ok && status != "" {
		_, _ = h.db.ExecContext(r.Context(), "UPDATE facilities SET status = ?, updated_at = ? WHERE id = ?", status, time.Now().UTC(), id)
	}

	facility, err := h.fetchFacilityByID(r.Context(), id)
	if err != nil {
		responses.NotFound(w, "Facility not found")
		return
	}

	responses.JSON(w, http.StatusOK, facility)
}

func (h *FacilityHandler) fetchFacilityByID(ctx context.Context, id string) (*domain.Facility, error) {
	query := `
	SELECT f.id, f.organization_id, f.name, f.code, f.address, f.latitude, f.longitude,
	       f.geofence_radius_meters, f.require_network_match, COALESCE(f.allowed_ssid_prefixes, '[]'),
	       COALESCE(f.allowed_ip_ranges, '[]'), COALESCE(f.network_policy_description, ''),
	       f.allow_offline_attendance, f.max_offline_hours, f.require_review_threshold_hours,
	       COALESCE(f.offline_policy_description, ''), f.status, f.created_at,
	       COUNT(u.id) as emp_count
	FROM facilities f
	LEFT JOIN users u ON f.id = u.assigned_facility_id AND u.is_active = true
	WHERE f.id = ?
	GROUP BY f.id, f.organization_id, f.name, f.code, f.address, f.latitude, f.longitude,
	         f.geofence_radius_meters, f.require_network_match, f.allowed_ssid_prefixes,
	         f.allowed_ip_ranges, f.network_policy_description, f.allow_offline_attendance,
	         f.max_offline_hours, f.require_review_threshold_hours, f.offline_policy_description,
	         f.status, f.created_at
	LIMIT 1`

	var f domain.Facility
	var ssidsJSON, ipsJSON string
	var netDesc, offDesc string
	var createdAt time.Time

	err := h.db.QueryRowContext(ctx, query, id).Scan(
		&f.ID, &f.OrganizationID, &f.Name, &f.Code, &f.Address, &f.Coordinates.Latitude, &f.Coordinates.Longitude,
		&f.GeofenceRadiusMeters, &f.NetworkPolicy.RequireNetworkMatch, &ssidsJSON,
		&ipsJSON, &netDesc, &f.OfflinePolicy.AllowOfflineAttendance,
		&f.OfflinePolicy.MaxOfflineHours, &f.OfflinePolicy.RequireReviewThresholdHours,
		&offDesc, &f.Status, &createdAt, &f.ActiveEmployeeCount,
	)
	if err != nil {
		return nil, err
	}

	f.CreatedAt = createdAt.Format(time.RFC3339)
	_ = json.Unmarshal([]byte(ssidsJSON), &f.NetworkPolicy.AllowedSsidPrefixes)
	_ = json.Unmarshal([]byte(ipsJSON), &f.NetworkPolicy.AllowedIpRanges)
	f.NetworkPolicy.Description = netDesc
	f.OfflinePolicy.Description = offDesc

	return &f, nil
}
