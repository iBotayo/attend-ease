export type AuditAction = 
  | 'user_login'
  | 'user_logout'
  | 'attendance_checkin'
  | 'attendance_checkout'
  | 'attendance_correction'
  | 'offline_records_synced'
  | 'employee_created'
  | 'employee_updated'
  | 'employee_status_changed'
  | 'facility_created'
  | 'facility_updated'
  | 'device_revoked'
  | 'shift_modified'
  | 'policy_updated'
  | 'organization_registered'
  | 'organization_setup_completed'
  | 'email_verified';

export type AuditOutcome = 'success' | 'failure' | 'warning';

export interface AuditLog {
  id: string;
  organizationId?: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: AuditAction;
  affectedResource: string;
  resourceId?: string;
  details: string;
  timestamp: string;
  outcome: AuditOutcome;
  ipAddress?: string;
  userAgent?: string;
}
