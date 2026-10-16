import { AttendanceRecordType, VerificationMode, VerificationResult } from './attendance';

export type OfflineEventStatus = 'pending' | 'syncing' | 'synced' | 'rejected' | 'review_required';

export interface OfflineEvent {
  id: string; // Unique UUID for idempotency
  schemaVersion?: number;
  organizationId?: string;
  eventType: AttendanceRecordType;
  employeeId: string;
  employeeName: string;
  facilityId: string;
  facilityName: string;
  deviceIdentifier?: string;
  timeSource?: 'device_clock' | 'network_time' | 'trusted_kiosk';
  capturedAt: string; // ISO timestamp
  verificationMode: VerificationMode;
  verificationResult: VerificationResult;
  status: OfflineEventStatus;
  retryCount: number;
  syncAttemptedAt?: string;
  syncedAt?: string;
  errorMessage?: string;
  requiresReviewReason?: string;
}

export interface SyncBatchResult {
  totalProcessed: number;
  successful: number;
  failed: number;
  reviewRequired: number;
  records: OfflineEvent[];
}
