export type AttendanceStatus = 'present' | 'absent' | 'late' | 'pending' | 'rejected' | 'early_departure';

export type AttendanceRecordType = 'check_in' | 'check_out';

export type VerificationMode = 
  | 'face_facility' 
  | 'face_only' 
  | 'offline_sync' 
  | 'manual_override'
  | 'simulated_demo';

export type SyncStatus = 
  | 'synced' 
  | 'pending' 
  | 'rejected' 
  | 'review_required';

export interface VerificationResult {
  isVerified: boolean;
  score: number; // Simulated confidence score e.g. 0.94
  mode: VerificationMode;
  faceMatch: boolean;
  facilityMatch: boolean;
  gpsDistanceMeters?: number;
  networkMatch?: boolean;
  message: string;
  timestamp: string;
}

export interface AttendanceCorrection {
  originalTime: string;
  correctedTime: string;
  reason: string;
  approvedBy: string;
  approvedByName: string;
  appliedAt: string;
  notes?: string;
}

export interface AttendanceRecord {
  id: string;
  organizationId?: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  departmentId: string;
  departmentName: string;
  facilityId: string;
  facilityName: string;
  date: string; // YYYY-MM-DD
  checkInTime: string | null; // ISO string
  checkOutTime: string | null; // ISO string
  status: AttendanceStatus;
  verificationMode: VerificationMode;
  syncStatus: SyncStatus;
  isOfflineCapture: boolean;
  verificationDetails?: VerificationResult;
  correctionHistory?: AttendanceCorrection[];
  notes?: string;
  createdAt: string;
}

export interface TodayAttendanceSummary {
  hasCheckedIn: boolean;
  hasCheckedOut: boolean;
  checkInTime?: string;
  checkOutTime?: string;
  status: AttendanceStatus;
  facilityName?: string;
  syncStatus: SyncStatus;
}
