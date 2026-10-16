export interface OrganizationSettings {
  companyName: string;
  tagline: string;
  supportEmail: string;
  timezone: string;
}

export interface AttendancePolicySettings {
  defaultGracePeriodMinutes: number;
  autoCheckoutHours: number;
  allowEarlyCheckInMinutes: number;
  strictShiftEnforcement: boolean;
}

export interface FacilityVerificationSettings {
  requireGpsVerification: boolean;
  requireWifiSubnetMatch: boolean;
  defaultGeofenceRadiusMeters: number;
  allowMockLocation: boolean;
}

export interface OfflinePolicySettings {
  allowOfflineAttendance: boolean;
  maxOfflineQueueHours: number;
  requireReviewThresholdHours: number;
  autoSyncOnReconnect: boolean;
}

export interface SecurityPrivacySettings {
  sessionTimeoutMinutes: number;
  mfaEnforcedForAdmins: boolean;
  biometricRetentionPolicyDays: number; // e.g. 90 days audit
  preventClientFormulaInjection: boolean;
}

export interface NotificationSettings {
  notifyLateArrivals: boolean;
  notifyPendingOfflineQueue: boolean;
  notifyUnusualLocationAttempts: boolean;
  dailyDigestEmail: boolean;
}

export interface SystemSettings {
  organization: OrganizationSettings;
  attendancePolicies: AttendancePolicySettings;
  facilityVerification: FacilityVerificationSettings;
  offlinePolicy: OfflinePolicySettings;
  securityPrivacy: SecurityPrivacySettings;
  notifications: NotificationSettings;
}

export const MOCK_SYSTEM_SETTINGS: SystemSettings = {
  organization: {
    companyName: 'Metropolitan Health Network',
    tagline: 'Attendance made simple.',
    supportEmail: 'support@attendease.internal',
    timezone: 'America/Chicago (CST)',
  },
  attendancePolicies: {
    defaultGracePeriodMinutes: 15,
    autoCheckoutHours: 14,
    allowEarlyCheckInMinutes: 30,
    strictShiftEnforcement: true,
  },
  facilityVerification: {
    requireGpsVerification: true,
    requireWifiSubnetMatch: true,
    defaultGeofenceRadiusMeters: 150,
    allowMockLocation: false,
  },
  offlinePolicy: {
    allowOfflineAttendance: true,
    maxOfflineQueueHours: 12,
    requireReviewThresholdHours: 4,
    autoSyncOnReconnect: true,
  },
  securityPrivacy: {
    sessionTimeoutMinutes: 60,
    mfaEnforcedForAdmins: true,
    biometricRetentionPolicyDays: 90,
    preventClientFormulaInjection: true,
  },
  notifications: {
    notifyLateArrivals: true,
    notifyPendingOfflineQueue: true,
    notifyUnusualLocationAttempts: true,
    dailyDigestEmail: false,
  },
};
