export type OrganizationStatus = 'pending_verification' | 'active' | 'suspended' | 'rejected';

export type OrganizationTier = 'starter' | 'professional' | 'enterprise';

export interface OrganizationSettings {
  timezone: string;
  dateFormat: string;
  requireBiometricLiveness: boolean;
  requireGeofence: boolean;
  allowOfflineAttendance: boolean;
  maxOfflineHours: number;
  autoSyncIntervalMinutes: number;
}

export interface Organization {
  id: string;
  name: string; // Registered legal name
  displayName: string;
  slug: string;
  email: string; // Official contact email
  phone: string;
  address?: string;
  status: OrganizationStatus;
  tier: OrganizationTier;
  initialAdminEmail: string;
  initialAdminName: string;
  isEmailVerified: boolean;
  setupCompleted: boolean;
  setupStep: number;
  createdAt: string;
  updatedAt: string;
  settings: OrganizationSettings;
}

export interface RegisterOrganizationDto {
  legalName: string;
  displayName?: string;
  email: string;
  contactPersonName: string;
  contactPhone: string;
  password: string;
  confirmPassword: string;
  termsAccepted: boolean;
}

export interface RegistrationResult {
  organizationId: string;
  organizationName: string;
  adminEmail: string;
  verificationTokenIssued: boolean;
  status: OrganizationStatus;
  message: string;
}

export interface VerifyEmailDto {
  token: string;
  email?: string;
}

export interface SetupOrganizationDto {
  organizationId: string;
  // Step 1: Profile
  displayName?: string;
  timezone?: string;
  industry?: string;
  // Step 2 & 3: First Facility & Geofence
  facilityName: string;
  facilityAddress: string;
  latitude: number;
  longitude: number;
  geofenceRadiusMeters: number;
  // Step 4: Attendance Rules
  requireBiometrics: boolean;
  allowOffline: boolean;
  gracePeriodMinutes: number;
  // Step 5: Initial Shift
  shiftName: string;
  shiftStartTime: string;
  shiftEndTime: string;
  shiftDays: number[];
  // Step 6: Initial Employees (Optional)
  initialEmployees?: {
    name: string;
    email: string;
    role: 'employee' | 'supervisor' | 'facility_admin';
    departmentName: string;
  }[];
}
