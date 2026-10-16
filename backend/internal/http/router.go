package http

import (
	"database/sql"
	"net/http"

	"attendease/internal/audit"
	"attendease/internal/config"
	"attendease/internal/domain"
	"attendease/internal/http/handlers"
	"attendease/internal/http/middleware"
	"attendease/internal/verification"
)

func NewRouter(cfg *config.Config, db *sql.DB, bio verification.BiometricVerifier) http.Handler {
	mux := http.NewServeMux()

	recorder := audit.NewRecorder(db)
	limiter := middleware.NewRateLimiter(5.0, 10.0) // 5 requests/sec with burst of 10

	healthH := handlers.NewHealthHandler(db)
	authH := handlers.NewAuthHandler(db, recorder)
	orgH := handlers.NewOrganizationHandler(db, recorder)
	empH := handlers.NewEmployeeHandler(db, recorder)
	facH := handlers.NewFacilityHandler(db, recorder)
	shiftH := handlers.NewShiftHandler(db, recorder)
	attH := handlers.NewAttendanceHandler(db, recorder, bio)
	syncH := handlers.NewSyncHandler(db, recorder)
	reportH := handlers.NewReportHandler(db)
	devH := handlers.NewDeviceHandler(db, recorder)
	auditH := handlers.NewAuditHandler(db, recorder)
	settingsH := handlers.NewSettingsHandler(db)

	// Liveness & Readiness probes
	mux.HandleFunc("GET /healthz", healthH.Healthz)
	mux.HandleFunc("GET /readyz", healthH.Readyz)

	// Public Auth Endpoints (with Rate Limiting)
	mux.Handle("POST /api/v1/auth/login", limiter.Limit(http.HandlerFunc(authH.Login)))
	mux.Handle("POST /api/v1/auth/forgot-password", limiter.Limit(http.HandlerFunc(authH.ForgotPassword)))
	mux.Handle("POST /api/v1/organizations/register", limiter.Limit(http.HandlerFunc(orgH.Register)))
	mux.Handle("POST /api/v1/organizations/verify-email", limiter.Limit(http.HandlerFunc(orgH.VerifyEmail)))
	mux.Handle("POST /api/v1/organizations/resend-verification", limiter.Limit(http.HandlerFunc(orgH.ResendVerification)))

	// Authenticated Auth Endpoints
	mux.Handle("POST /api/v1/auth/logout", middleware.RequireAuth(http.HandlerFunc(authH.Logout)))
	mux.Handle("GET /api/v1/auth/me", middleware.RequireAuth(http.HandlerFunc(authH.Me)))

	// Organizations
	mux.HandleFunc("GET /api/v1/organizations/current", orgH.GetCurrent)
	mux.Handle("GET /api/v1/organizations", middleware.RequireAuth(middleware.RequireRole(domain.RoleSystemAdmin, domain.RoleOrgAdmin)(http.HandlerFunc(orgH.ListOrganizations))))
	mux.HandleFunc("POST /api/v1/organizations/setup", orgH.Setup)
	mux.Handle("PUT /api/v1/organizations/{id}", middleware.RequireAuth(middleware.RequireRole(domain.RoleSystemAdmin, domain.RoleOrgAdmin)(http.HandlerFunc(orgH.Update))))

	// Employees & Departments
	mux.Handle("GET /api/v1/employees", middleware.RequireAuth(http.HandlerFunc(empH.List)))
	mux.Handle("GET /api/v1/employees/{id}", middleware.RequireAuth(http.HandlerFunc(empH.GetByID)))
	mux.Handle("POST /api/v1/employees", middleware.RequireAuth(middleware.RequireRole(domain.RoleSystemAdmin, domain.RoleOrgAdmin, domain.RoleFacilityAdmin)(http.HandlerFunc(empH.Create))))
	mux.Handle("PUT /api/v1/employees/{id}", middleware.RequireAuth(middleware.RequireRole(domain.RoleSystemAdmin, domain.RoleOrgAdmin, domain.RoleFacilityAdmin)(http.HandlerFunc(empH.Update))))
	mux.Handle("POST /api/v1/employees/{id}/status", middleware.RequireAuth(middleware.RequireRole(domain.RoleSystemAdmin, domain.RoleOrgAdmin, domain.RoleFacilityAdmin)(http.HandlerFunc(empH.ToggleStatus))))
	mux.HandleFunc("GET /api/v1/departments", empH.GetDepartments)

	// Facilities
	mux.HandleFunc("GET /api/v1/facilities", facH.List)
	mux.HandleFunc("GET /api/v1/facilities/{id}", facH.GetByID)
	mux.Handle("POST /api/v1/facilities", middleware.RequireAuth(middleware.RequireRole(domain.RoleSystemAdmin, domain.RoleOrgAdmin)(http.HandlerFunc(facH.Create))))
	mux.Handle("PUT /api/v1/facilities/{id}", middleware.RequireAuth(middleware.RequireRole(domain.RoleSystemAdmin, domain.RoleOrgAdmin, domain.RoleFacilityAdmin)(http.HandlerFunc(facH.Update))))

	// Shifts
	mux.HandleFunc("GET /api/v1/shifts", shiftH.List)
	mux.HandleFunc("GET /api/v1/shifts/{id}", shiftH.GetByID)
	mux.Handle("POST /api/v1/shifts", middleware.RequireAuth(middleware.RequireRole(domain.RoleSystemAdmin, domain.RoleOrgAdmin, domain.RoleFacilityAdmin)(http.HandlerFunc(shiftH.Create))))
	mux.Handle("PUT /api/v1/shifts/{id}", middleware.RequireAuth(middleware.RequireRole(domain.RoleSystemAdmin, domain.RoleOrgAdmin, domain.RoleFacilityAdmin)(http.HandlerFunc(shiftH.Update))))

	// Attendance & Presence Verification
	mux.HandleFunc("GET /api/v1/attendance/today", attH.GetToday)
	mux.HandleFunc("GET /api/v1/attendance/history", attH.GetHistory)
	mux.HandleFunc("GET /api/v1/attendance/register", attH.GetRegister)
	mux.HandleFunc("GET /api/v1/attendance/{id}", attH.GetByID)
	mux.HandleFunc("POST /api/v1/attendance/check-in", attH.CheckIn)
	mux.HandleFunc("POST /api/v1/attendance/check-out", attH.CheckOut)
	mux.HandleFunc("POST /api/v1/attendance/{id}/correct", attH.Correct)
	mux.HandleFunc("POST /api/v1/attendance/verify/facility", attH.VerifyFacility)
	mux.HandleFunc("POST /api/v1/attendance/verify/biometric", attH.VerifyBiometric)

	// Offline Synchronization
	mux.HandleFunc("POST /api/v1/sync/offline-batch", syncH.OfflineBatch)
	mux.HandleFunc("GET /api/v1/sync/status", syncH.Status)

	// Reports
	mux.HandleFunc("GET /api/v1/reports/summary", reportH.Summary)
	mux.HandleFunc("GET /api/v1/reports/attendance", reportH.Summary)
	mux.HandleFunc("GET /api/v1/reports/export/csv", reportH.ExportCSV)

	// Devices
	mux.HandleFunc("GET /api/v1/devices", devH.List)
	mux.Handle("POST /api/v1/devices/{id}/revoke", middleware.RequireAuth(middleware.RequireRole(domain.RoleSystemAdmin, domain.RoleOrgAdmin)(http.HandlerFunc(devH.Revoke))))

	// Audit Logs
	mux.HandleFunc("GET /api/v1/audit-logs", auditH.List)
	mux.HandleFunc("POST /api/v1/audit-logs", auditH.Create)

	// Settings
	mux.HandleFunc("GET /api/v1/settings", settingsH.Get)
	mux.Handle("PUT /api/v1/settings", middleware.RequireAuth(middleware.RequireRole(domain.RoleSystemAdmin, domain.RoleOrgAdmin)(http.HandlerFunc(settingsH.Update))))

	// Apply global middleware pipeline: Recovery -> Logger -> CORS -> Authenticate -> EnforceTenant -> Router
	var handler http.Handler = mux
	handler = middleware.EnforceTenant(handler)
	handler = middleware.Authenticate(db)(handler)
	handler = middleware.CORS(cfg.FrontendURLs)(handler)
	handler = middleware.Logger(handler)
	handler = middleware.Recovery(handler)

	return handler
}
