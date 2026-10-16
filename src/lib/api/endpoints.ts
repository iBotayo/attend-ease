export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    FORGOT_PASSWORD: '/auth/forgot-password',
    CURRENT_USER: '/auth/me',
  },
  ORGANIZATION: {
    REGISTER: '/organizations/register',
    VERIFY_EMAIL: '/organizations/verify-email',
    RESEND_VERIFICATION: '/organizations/resend-verification',
    SETUP: '/organizations/setup',
    CURRENT: '/organizations/current',
    UPDATE: (id: string) => `/organizations/${id}`,
  },
  ATTENDANCE: {
    VERIFY_FACILITY: '/attendance/verify/facility',
    VERIFY_BIOMETRIC: '/attendance/verify/biometric',
    CHECK_IN: '/attendance/check-in',
    CHECK_OUT: '/attendance/check-out',
    TODAY: '/attendance/today',
    HISTORY: '/attendance/history',
    REGISTER: '/attendance/register',
    CORRECT: (id: string) => `/attendance/${id}/correct`,
    DETAILS: (id: string) => `/attendance/${id}`,
  },
  EMPLOYEES: {
    LIST: '/employees',
    DETAILS: (id: string) => `/employees/${id}`,
    CREATE: '/employees',
    UPDATE: (id: string) => `/employees/${id}`,
    TOGGLE_STATUS: (id: string) => `/employees/${id}/status`,
  },
  FACILITIES: {
    LIST: '/facilities',
    DETAILS: (id: string) => `/facilities/${id}`,
    CREATE: '/facilities',
    UPDATE: (id: string) => `/facilities/${id}`,
  },
  DEVICES: {
    LIST: '/devices',
    REVOKE: (id: string) => `/devices/${id}/revoke`,
  },
  SHIFTS: {
    LIST: '/shifts',
    CREATE: '/shifts',
    UPDATE: (id: string) => `/shifts/${id}`,
  },
  REPORTS: {
    SUMMARY: '/reports/summary',
    ATTENDANCE: '/reports/attendance',
    EXPORT_CSV: '/reports/export/csv',
  },
  SYNC: {
    OFFLINE_BATCH: '/sync/offline-batch',
    STATUS: '/sync/status',
  },
  AUDIT: {
    LIST: '/audit-logs',
  },
  SETTINGS: {
    GET: '/settings',
    UPDATE: '/settings',
  },
} as const;
