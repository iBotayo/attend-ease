import { User } from '@/types/user';
import { Facility } from '@/types/facility';
import { AttendanceRecord } from '@/types/attendance';
import { RegisteredDevice } from '@/types/device';
import { Shift } from '@/types/shift';
import { AuditLog } from '@/types/audit';
import { SystemSettings, MOCK_SYSTEM_SETTINGS } from './settings';
import { Organization } from '@/types/organization';
import { MOCK_ORGANIZATIONS } from './organizations';
import { MOCK_USERS } from './users';
import { MOCK_FACILITIES } from './facilities';
import { MOCK_ATTENDANCE_RECORDS } from './attendance';
import { MOCK_DEVICES } from './devices';
import { MOCK_SHIFTS } from './shifts';
import { MOCK_AUDIT_LOGS } from './audit-logs';

export * from './organizations';
export * from './users';
export * from './facilities';
export * from './departments';
export * from './attendance';
export * from './devices';
export * from './shifts';
export * from './audit-logs';
export * from './settings';

class MockDataStore {
  private organizations: Organization[] = [...MOCK_ORGANIZATIONS];
  private verificationTokens: Map<string, { email: string; orgId: string; expiresAt: number }> = new Map();
  private users: User[] = [...MOCK_USERS];
  private facilities: Facility[] = [...MOCK_FACILITIES];
  private attendance: AttendanceRecord[] = [...MOCK_ATTENDANCE_RECORDS];
  private devices: RegisteredDevice[] = [...MOCK_DEVICES];
  private shifts: Shift[] = [...MOCK_SHIFTS];
  private auditLogs: AuditLog[] = [...MOCK_AUDIT_LOGS];
  private settings: SystemSettings = { ...MOCK_SYSTEM_SETTINGS };

  // Users
  getUsers(): User[] {
    return [...this.users];
  }

  getUserById(id: string): User | undefined {
    return this.users.find((u) => u.id === id || u.employeeId === id);
  }

  addUser(user: User): User {
    this.users.unshift(user);
    this.addAuditLog({
      actorId: 'EMP-1004',
      actorName: 'Marcus Vance',
      actorRole: 'System Administrator',
      action: 'employee_created',
      affectedResource: `Employee ${user.name} (${user.employeeId})`,
      resourceId: user.id,
      details: `Created new employee record assigned to ${user.departmentName}.`,
      outcome: 'success',
    });
    return user;
  }

  updateUser(id: string, updates: Partial<User>): User | undefined {
    const idx = this.users.findIndex((u) => u.id === id || u.employeeId === id);
    if (idx === -1) return undefined;
    this.users[idx] = { ...this.users[idx], ...updates };
    this.addAuditLog({
      actorId: 'EMP-1004',
      actorName: 'Marcus Vance',
      actorRole: 'System Administrator',
      action: 'employee_updated',
      affectedResource: `Employee ${this.users[idx].name}`,
      resourceId: this.users[idx].id,
      details: `Updated employee profile details.`,
      outcome: 'success',
    });
    return this.users[idx];
  }

  toggleUserStatus(id: string): User | undefined {
    const idx = this.users.findIndex((u) => u.id === id || u.employeeId === id);
    if (idx === -1) return undefined;
    const newStatus = !this.users[idx].isActive;
    this.users[idx].isActive = newStatus;
    this.addAuditLog({
      actorId: 'EMP-1004',
      actorName: 'Marcus Vance',
      actorRole: 'System Administrator',
      action: 'employee_status_changed',
      affectedResource: `Employee ${this.users[idx].name}`,
      resourceId: this.users[idx].id,
      details: `Changed account active status to ${newStatus ? 'Active' : 'Inactive'}.`,
      outcome: 'success',
    });
    return this.users[idx];
  }

  // Facilities
  getFacilities(): Facility[] {
    return [...this.facilities];
  }

  getFacilityById(id: string): Facility | undefined {
    return this.facilities.find((f) => f.id === id || f.code === id);
  }

  addFacility(facility: Facility): Facility {
    this.facilities.unshift(facility);
    this.addAuditLog({
      actorId: 'EMP-1004',
      actorName: 'Marcus Vance',
      actorRole: 'System Administrator',
      action: 'facility_created',
      affectedResource: `Facility ${facility.name}`,
      resourceId: facility.id,
      details: `Configured new facility geofence (${facility.geofenceRadiusMeters}m radius).`,
      outcome: 'success',
    });
    return facility;
  }

  updateFacility(id: string, updates: Partial<Facility>): Facility | undefined {
    const idx = this.facilities.findIndex((f) => f.id === id);
    if (idx === -1) return undefined;
    this.facilities[idx] = { ...this.facilities[idx], ...updates };
    this.addAuditLog({
      actorId: 'EMP-1004',
      actorName: 'Marcus Vance',
      actorRole: 'System Administrator',
      action: 'facility_updated',
      affectedResource: `Facility ${this.facilities[idx].name}`,
      resourceId: this.facilities[idx].id,
      details: `Updated facility parameters and verification policies.`,
      outcome: 'success',
    });
    return this.facilities[idx];
  }

  // Attendance
  getAttendance(): AttendanceRecord[] {
    return [...this.attendance];
  }

  getAttendanceByEmployee(employeeId: string): AttendanceRecord[] {
    return this.attendance.filter(
      (a) => a.employeeId === employeeId || a.employeeCode === employeeId
    );
  }

  getTodayAttendanceForEmployee(employeeId: string): AttendanceRecord | undefined {
    const today = new Date().toISOString().split('T')[0];
    return this.attendance.find(
      (a) => (a.employeeId === employeeId || a.employeeCode === employeeId) && a.date === today
    );
  }

  addAttendance(record: AttendanceRecord): AttendanceRecord {
    this.attendance.unshift(record);
    return record;
  }

  updateAttendance(id: string, updates: Partial<AttendanceRecord>): AttendanceRecord | undefined {
    const idx = this.attendance.findIndex((a) => a.id === id);
    if (idx === -1) return undefined;
    this.attendance[idx] = { ...this.attendance[idx], ...updates };
    return this.attendance[idx];
  }

  correctAttendance(id: string, correction: {
    correctedTime: string;
    reason: string;
    approvedBy: string;
    approvedByName: string;
    notes?: string;
  }): AttendanceRecord | undefined {
    const record = this.attendance.find((a) => a.id === id);
    if (!record) return undefined;

    const originalTime = record.checkInTime || record.createdAt;
    const historyEntry = {
      originalTime,
      correctedTime: correction.correctedTime,
      reason: correction.reason,
      approvedBy: correction.approvedBy,
      approvedByName: correction.approvedByName,
      appliedAt: new Date().toISOString(),
      notes: correction.notes,
    };

    record.checkInTime = correction.correctedTime;
    record.status = 'present';
    record.verificationMode = 'manual_override';
    record.correctionHistory = [...(record.correctionHistory || []), historyEntry];

    this.addAuditLog({
      actorId: correction.approvedBy,
      actorName: correction.approvedByName,
      actorRole: 'System Administrator',
      action: 'attendance_correction',
      affectedResource: `Attendance Record #${id} (${record.employeeName})`,
      resourceId: id,
      details: `Adjusted check-in timestamp to ${correction.correctedTime}. Reason: ${correction.reason}`,
      outcome: 'success',
    });

    return record;
  }

  // Devices
  getDevices(): RegisteredDevice[] {
    return [...this.devices];
  }

  revokeDevice(id: string): RegisteredDevice | undefined {
    const dev = this.devices.find((d) => d.id === id);
    if (!dev) return undefined;
    dev.status = 'revoked';
    this.addAuditLog({
      actorId: 'EMP-1004',
      actorName: 'Marcus Vance',
      actorRole: 'System Administrator',
      action: 'device_revoked',
      affectedResource: `Device ${dev.name} (${dev.model})`,
      resourceId: dev.id,
      details: `Simulated revocation of device certificate.`,
      outcome: 'success',
    });
    return dev;
  }

  // Shifts
  getShifts(): Shift[] {
    return [...this.shifts];
  }

  addShift(shift: Shift): Shift {
    this.shifts.unshift(shift);
    return shift;
  }

  updateShift(id: string, updates: Partial<Shift>): Shift | undefined {
    const idx = this.shifts.findIndex((s) => s.id === id);
    if (idx === -1) return undefined;
    this.shifts[idx] = { ...this.shifts[idx], ...updates };
    return this.shifts[idx];
  }

  // Audit Logs
  getAuditLogs(): AuditLog[] {
    return [...this.auditLogs];
  }

  addAuditLog(entry: Omit<AuditLog, 'id' | 'timestamp'> & { timestamp?: string }): AuditLog {
    const log: AuditLog = {
      ...entry,
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: entry.timestamp || new Date().toISOString(),
    };
    this.auditLogs.unshift(log);
    return log;
  }

  // Settings
  getSettings(): SystemSettings {
    return { ...this.settings };
  }

  updateSettings(updates: Partial<SystemSettings>): SystemSettings {
    this.settings = { ...this.settings, ...updates };
    this.addAuditLog({
      actorId: 'EMP-1004',
      actorName: 'Marcus Vance',
      actorRole: 'System Administrator',
      action: 'policy_updated',
      affectedResource: 'System Settings',
      details: 'Updated organization and attendance policy parameters.',
      outcome: 'success',
    });
    return { ...this.settings };
  }

  // Organizations
  getOrganizations(): Organization[] {
    return [...this.organizations];
  }

  getOrganizationById(id: string): Organization | undefined {
    return this.organizations.find((o) => o.id === id || o.slug === id);
  }

  getOrganizationByEmail(email: string): Organization | undefined {
    const clean = email.toLowerCase().trim();
    return this.organizations.find(
      (o) => o.email.toLowerCase() === clean || o.initialAdminEmail.toLowerCase() === clean
    );
  }

  getOrganizationByName(name: string): Organization | undefined {
    const clean = name.toLowerCase().trim();
    return this.organizations.find(
      (o) => o.name.toLowerCase() === clean || o.displayName.toLowerCase() === clean
    );
  }

  addOrganization(org: Organization): Organization {
    this.organizations.unshift(org);
    this.addAuditLog({
      actorId: 'SYSTEM',
      actorName: 'Registration Service',
      actorRole: 'System Service',
      action: 'organization_registered',
      affectedResource: `Organization ${org.name}`,
      resourceId: org.id,
      details: `New organization registered with initial admin ${org.initialAdminEmail}. Verification pending.`,
      outcome: 'success',
    });
    return org;
  }

  updateOrganization(id: string, updates: Partial<Organization>): Organization | undefined {
    const idx = this.organizations.findIndex((o) => o.id === id);
    if (idx === -1) return undefined;
    this.organizations[idx] = { ...this.organizations[idx], ...updates, updatedAt: new Date().toISOString() };
    return this.organizations[idx];
  }

  // Email verification tokens (server-issued, expiring, single-use)
  storeVerificationToken(token: string, email: string, orgId: string, expiresInMs = 15 * 60 * 1000): void {
    this.verificationTokens.set(token, {
      email: email.toLowerCase().trim(),
      orgId,
      expiresAt: Date.now() + expiresInMs,
    });
  }

  verifyToken(token: string): { email: string; orgId: string } | null {
    const record = this.verificationTokens.get(token);
    if (!record) return null;
    if (Date.now() > record.expiresAt) {
      this.verificationTokens.delete(token);
      return null;
    }
    // Single-use: remove after verification
    this.verificationTokens.delete(token);
    return { email: record.email, orgId: record.orgId };
  }

  getPendingTokenForEmail(email: string): string | null {
    const clean = email.toLowerCase().trim();
    let foundToken: string | null = null;
    this.verificationTokens.forEach((data, token) => {
      if (!foundToken && data.email === clean && data.expiresAt > Date.now()) {
        foundToken = token;
      }
    });
    return foundToken;
  }
}

export const mockStore = new MockDataStore();
