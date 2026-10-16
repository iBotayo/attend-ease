package domain

// User Roles matching frontend UserRole
type UserRole string

const (
	RoleEmployee      UserRole = "employee"
	RoleSupervisor    UserRole = "supervisor"
	RoleFacilityAdmin UserRole = "facility_admin"
	RoleSystemAdmin   UserRole = "system_admin"
	RoleOrgAdmin      UserRole = "org_admin"
)

type BiometricEnrollmentStatus string

const (
	BiometricEnrolled    BiometricEnrollmentStatus = "enrolled"
	BiometricPending     BiometricEnrollmentStatus = "pending"
	BiometricFailed      BiometricEnrollmentStatus = "failed"
	BiometricNotEnrolled BiometricEnrollmentStatus = "not_enrolled"
)

type OrganizationStatus string

const (
	OrgStatusPendingVerification OrganizationStatus = "pending_verification"
	OrgStatusActive              OrganizationStatus = "active"
	OrgStatusSuspended           OrganizationStatus = "suspended"
	OrgStatusRejected            OrganizationStatus = "rejected"
)

type OrganizationTier string

const (
	OrgTierStarter      OrganizationTier = "starter"
	OrgTierProfessional OrganizationTier = "professional"
	OrgTierEnterprise   OrganizationTier = "enterprise"
)

type OrganizationSettings struct {
	Timezone                   string `json:"timezone"`
	DateFormat                 string `json:"dateFormat"`
	RequireBiometricLiveness   bool   `json:"requireBiometricLiveness"`
	RequireGeofence            bool   `json:"requireGeofence"`
	AllowOfflineAttendance     bool   `json:"allowOfflineAttendance"`
	MaxOfflineHours            int    `json:"maxOfflineHours"`
	AutoSyncIntervalMinutes    int    `json:"autoSyncIntervalMinutes"`
	DefaultGracePeriodMinutes  int    `json:"defaultGracePeriodMinutes,omitempty"`
	AutoCheckoutHours          int    `json:"autoCheckoutHours,omitempty"`
	AllowEarlyCheckInMinutes   int    `json:"allowEarlyCheckInMinutes,omitempty"`
	StrictShiftEnforcement     bool   `json:"strictShiftEnforcement,omitempty"`
	RequireGpsVerification     bool   `json:"requireGpsVerification,omitempty"`
	RequireWifiSubnetMatch     bool   `json:"requireWifiSubnetMatch,omitempty"`
	DefaultGeofenceRadiusMeters int   `json:"defaultGeofenceRadiusMeters,omitempty"`
	AllowMockLocation          bool   `json:"allowMockLocation,omitempty"`
	SessionTimeoutMinutes      int    `json:"sessionTimeoutMinutes,omitempty"`
	MfaEnforcedForAdmins       bool   `json:"mfaEnforcedForAdmins,omitempty"`
	BiometricRetentionDays     int    `json:"biometricRetentionPolicyDays,omitempty"`
	PreventFormulaInjection    bool   `json:"preventClientFormulaInjection,omitempty"`
	NotifyLateArrivals         bool   `json:"notifyLateArrivals,omitempty"`
	NotifyPendingOfflineQueue  bool   `json:"notifyPendingOfflineQueue,omitempty"`
	NotifyUnusualLocationAttempts bool `json:"notifyUnusualLocationAttempts,omitempty"`
	DailyDigestEmail           bool   `json:"dailyDigestEmail,omitempty"`
}

type Organization struct {
	ID                 string               `json:"id"`
	Name               string               `json:"name"`
	DisplayName        string               `json:"displayName"`
	Slug               string               `json:"slug"`
	Email              string               `json:"email"`
	Phone              string               `json:"phone"`
	Address            string               `json:"address,omitempty"`
	Status             OrganizationStatus   `json:"status"`
	Tier               OrganizationTier     `json:"tier"`
	InitialAdminEmail  string               `json:"initialAdminEmail"`
	InitialAdminName   string               `json:"initialAdminName"`
	IsEmailVerified    bool                 `json:"isEmailVerified"`
	SetupCompleted     bool                 `json:"setupCompleted"`
	SetupStep          int                  `json:"setupStep"`
	CreatedAt          string               `json:"createdAt"`
	UpdatedAt          string               `json:"updatedAt"`
	Settings           OrganizationSettings `json:"settings"`
}

type User struct {
	ID                   string                    `json:"id"`
	OrganizationID       string                    `json:"organizationId,omitempty"`
	OrganizationName     string                    `json:"organizationName,omitempty"`
	EmployeeID           string                    `json:"employeeId"`
	Name                 string                    `json:"name"`
	Email                string                    `json:"email"`
	PasswordHash         string                    `json:"-"`
	Role                 UserRole                  `json:"role"`
	DepartmentID         string                    `json:"departmentId"`
	DepartmentName       string                    `json:"departmentName"`
	AssignedFacilityID   string                    `json:"assignedFacilityId"`
	AssignedFacilityName string                    `json:"assignedFacilityName"`
	AvatarURL            string                    `json:"avatarUrl,omitempty"`
	Phone                string                    `json:"phone,omitempty"`
	IsActive             bool                      `json:"isActive"`
	BiometricStatus      BiometricEnrollmentStatus `json:"biometricStatus"`
	EnrolledAt           *string                   `json:"enrolledAt,omitempty"`
	JoinedDate           string                    `json:"joinedDate"`
	MustChangePassword   bool                      `json:"mustChangePassword"`
}

type Department struct {
	ID             string `json:"id"`
	OrganizationID string `json:"organizationId,omitempty"`
	Name           string `json:"name"`
	Code           string `json:"code"`
	EmployeeCount  int    `json:"employeeCount"`
}

type Coordinates struct {
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
}

type NetworkVerificationPolicy struct {
	RequireNetworkMatch bool     `json:"requireNetworkMatch"`
	AllowedSsidPrefixes []string `json:"allowedSsidPrefixes"`
	AllowedIpRanges     []string `json:"allowedIpRanges"`
	Description         string   `json:"description"`
}

type OfflineVerificationPolicy struct {
	AllowOfflineAttendance      bool   `json:"allowOfflineAttendance"`
	MaxOfflineHours             int    `json:"maxOfflineHours"`
	RequireReviewThresholdHours int    `json:"requireReviewThresholdHours"`
	Description                 string `json:"description"`
}

type Facility struct {
	ID                  string                    `json:"id"`
	OrganizationID      string                    `json:"organizationId,omitempty"`
	Name                string                    `json:"name"`
	Code                string                    `json:"code"`
	Address             string                    `json:"address"`
	Coordinates         Coordinates               `json:"coordinates"`
	GeofenceRadiusMeters int                      `json:"geofenceRadiusMeters"`
	NetworkPolicy       NetworkVerificationPolicy `json:"networkPolicy"`
	OfflinePolicy       OfflineVerificationPolicy `json:"offlinePolicy"`
	Status              string                    `json:"status"` // "active", "maintenance", "inactive"
	ActiveEmployeeCount int                       `json:"activeEmployeeCount"`
	CreatedAt           string                    `json:"createdAt"`
}

type Shift struct {
	ID                   string `json:"id"`
	OrganizationID       string `json:"organizationId,omitempty"`
	Name                 string `json:"name"`
	Code                 string `json:"code"`
	StartTime            string `json:"startTime"` // "09:00"
	EndTime              string `json:"endTime"`   // "17:00"
	GracePeriodMinutes   int    `json:"gracePeriodMinutes"`
	AssignedFacilityID   string `json:"assignedFacilityId,omitempty"`
	AssignedFacilityName string `json:"assignedFacilityName,omitempty"`
	AssignedDays         []int  `json:"assignedDays"` // 0=Sun ... 6=Sat
	IsActive             bool   `json:"isActive"`
	EmployeeCount        int    `json:"employeeCount"`
}

type AttendanceStatus string

const (
	AttendancePresent        AttendanceStatus = "present"
	AttendanceAbsent         AttendanceStatus = "absent"
	AttendanceLate           AttendanceStatus = "late"
	AttendancePending        AttendanceStatus = "pending"
	AttendanceRejected       AttendanceStatus = "rejected"
	AttendanceEarlyDeparture AttendanceStatus = "early_departure"
)

type VerificationMode string

const (
	ModeFaceFacility   VerificationMode = "face_facility"
	ModeFaceOnly       VerificationMode = "face_only"
	ModeOfflineSync    VerificationMode = "offline_sync"
	ModeManualOverride VerificationMode = "manual_override"
	ModeSimulatedDemo  VerificationMode = "simulated_demo"
)

type SyncStatus string

const (
	SyncSynced         SyncStatus = "synced"
	SyncPending        SyncStatus = "pending"
	SyncRejected       SyncStatus = "rejected"
	SyncReviewRequired SyncStatus = "review_required"
)

type VerificationResult struct {
	IsVerified        bool             `json:"isVerified"`
	Score             float64          `json:"score"`
	Mode              VerificationMode `json:"mode"`
	FaceMatch         bool             `json:"faceMatch"`
	FacilityMatch     bool             `json:"facilityMatch"`
	GpsDistanceMeters *int             `json:"gpsDistanceMeters,omitempty"`
	NetworkMatch      *bool            `json:"networkMatch,omitempty"`
	Message           string           `json:"message"`
	Timestamp         string           `json:"timestamp"`
}

type AttendanceCorrection struct {
	OriginalTime   string `json:"originalTime"`
	CorrectedTime  string `json:"correctedTime"`
	Reason         string `json:"reason"`
	ApprovedBy     string `json:"approvedBy"`
	ApprovedByName string `json:"approvedByName"`
	AppliedAt      string `json:"appliedAt"`
	Notes          string `json:"notes,omitempty"`
}

type AttendanceRecord struct {
	ID                  string                 `json:"id"`
	OrganizationID      string                 `json:"organizationId,omitempty"`
	EmployeeID          string                 `json:"employeeId"`
	EmployeeName        string                 `json:"employeeName"`
	EmployeeCode        string                 `json:"employeeCode"`
	DepartmentID        string                 `json:"departmentId"`
	DepartmentName      string                 `json:"departmentName"`
	FacilityID          string                 `json:"facilityId"`
	FacilityName        string                 `json:"facilityName"`
	Date                string                 `json:"date"` // YYYY-MM-DD
	CheckInTime         *string                `json:"checkInTime"`
	CheckOutTime        *string                `json:"checkOutTime"`
	Status              AttendanceStatus       `json:"status"`
	VerificationMode    VerificationMode       `json:"verificationMode"`
	SyncStatus          SyncStatus             `json:"syncStatus"`
	IsOfflineCapture    bool                   `json:"isOfflineCapture"`
	VerificationDetails *VerificationResult    `json:"verificationDetails,omitempty"`
	CorrectionHistory   []AttendanceCorrection `json:"correctionHistory,omitempty"`
	Notes               string                 `json:"notes,omitempty"`
	CreatedAt           string                 `json:"createdAt"`
}

type TodayAttendanceSummary struct {
	HasCheckedIn  bool             `json:"hasCheckedIn"`
	HasCheckedOut bool             `json:"hasCheckedOut"`
	CheckInTime   *string          `json:"checkInTime,omitempty"`
	CheckOutTime  *string          `json:"checkOutTime,omitempty"`
	Status        AttendanceStatus `json:"status"`
	FacilityName  string           `json:"facilityName,omitempty"`
	SyncStatus    SyncStatus       `json:"syncStatus"`
}

type OfflineEvent struct {
	ID                  string             `json:"id"`
	SchemaVersion       int                `json:"schemaVersion,omitempty"`
	OrganizationID      string             `json:"organizationId,omitempty"`
	EventType           string             `json:"eventType"` // "check_in", "check_out"
	EmployeeID          string             `json:"employeeId"`
	EmployeeName        string             `json:"employeeName"`
	FacilityID          string             `json:"facilityId"`
	FacilityName        string             `json:"facilityName"`
	DeviceIdentifier    string             `json:"deviceIdentifier,omitempty"`
	TimeSource          string             `json:"timeSource,omitempty"`
	CapturedAt          string             `json:"capturedAt"`
	VerificationMode    VerificationMode   `json:"verificationMode"`
	VerificationResult  VerificationResult `json:"verificationResult"`
	Status              string             `json:"status"` // "pending", "syncing", "synced", "rejected", "review_required"
	RetryCount          int                `json:"retryCount"`
	SyncAttemptedAt     *string            `json:"syncAttemptedAt,omitempty"`
	SyncedAt            *string            `json:"syncedAt,omitempty"`
	ErrorMessage        string             `json:"errorMessage,omitempty"`
	RequiresReviewReason string            `json:"requiresReviewReason,omitempty"`
}

type SyncBatchResult struct {
	TotalProcessed int            `json:"totalProcessed"`
	Successful     int            `json:"successful"`
	Failed         int            `json:"failed"`
	ReviewRequired int            `json:"reviewRequired"`
	Records        []OfflineEvent `json:"records"`
}

type RegisteredDevice struct {
	ID                   string `json:"id"`
	OrganizationID       string `json:"organizationId,omitempty"`
	Name                 string `json:"name"`
	Model                string `json:"model"`
	DeviceType           string `json:"deviceType"`
	AssignedUserID       string `json:"assignedUserId,omitempty"`
	AssignedUserName     string `json:"assignedUserName,omitempty"`
	AssignedFacilityID   string `json:"assignedFacilityId,omitempty"`
	AssignedFacilityName string `json:"assignedFacilityName,omitempty"`
	FingerprintHash      string `json:"fingerprintHash"`
	RegisteredAt         string `json:"registeredAt"`
	LastSyncAt           string `json:"lastSyncAt"`
	Status               string `json:"status"` // "active", "revoked", "pending"
	AppVersion           string `json:"appVersion"`
	IsSimulated          bool   `json:"isSimulated,omitempty"`
}

type AuditLog struct {
	ID                string `json:"id"`
	OrganizationID    string `json:"organizationId,omitempty"`
	ActorID           string `json:"actorId"`
	ActorName         string `json:"actorName"`
	ActorRole         string `json:"actorRole"`
	Action            string `json:"action"`
	AffectedResource  string `json:"affectedResource"`
	ResourceID        string `json:"resourceId,omitempty"`
	Details           string `json:"details"`
	Timestamp         string `json:"timestamp"`
	Outcome           string `json:"outcome"` // "success", "failure", "warning"
	IPAddress         string `json:"ipAddress,omitempty"`
	UserAgent         string `json:"userAgent,omitempty"`
}

type ReportSummaryStats struct {
	TotalRecords          int `json:"totalRecords"`
	PresentCount          int `json:"presentCount"`
	LateCount             int `json:"lateCount"`
	AbsentCount           int `json:"absentCount"`
	ReviewRequiredCount   int `json:"reviewRequiredCount"`
	AttendanceRatePercent int `json:"attendanceRatePercent"`
	OnTimeRatePercent     int `json:"onTimeRatePercent"`
}

type SystemSettings struct {
	Organization         map[string]interface{} `json:"organization"`
	AttendancePolicies   map[string]interface{} `json:"attendancePolicies"`
	FacilityVerification map[string]interface{} `json:"facilityVerification"`
	OfflinePolicy        map[string]interface{} `json:"offlinePolicy"`
	SecurityPrivacy      map[string]interface{} `json:"securityPrivacy"`
	Notifications        map[string]interface{} `json:"notifications"`
}

type AuthSession struct {
	User      User      `json:"user"`
	Token     string    `json:"token"`
	ExpiresAt string    `json:"expiresAt"`
}
