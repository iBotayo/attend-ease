import { AttendanceRecord, AttendanceStatus, VerificationMode, VerificationResult, TodayAttendanceSummary } from '@/types/attendance';
import { OfflineEvent } from '@/types/offline';
import { mockStore } from '@/mocks';
import { offlineDB } from '@/lib/offline/db';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';

const IS_MOCK_ENABLED = process.env.NEXT_PUBLIC_ENABLE_MOCK_API !== 'false';

export interface VerifyFacilityParams {
  latitude: number;
  longitude: number;
  facilityId: string;
  simulateFailure?: boolean;
}

export interface VerifyBiometricParams {
  employeeId: string;
  simulateFailure?: boolean;
  simulateScore?: number;
}

export interface SubmitAttendanceParams {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  departmentId: string;
  departmentName: string;
  facilityId: string;
  facilityName: string;
  type: 'check_in' | 'check_out';
  isOffline: boolean;
  verificationMode: VerificationMode;
  verificationDetails: VerificationResult;
}

class AttendanceService {
  async getTodaySummary(employeeId: string): Promise<TodayAttendanceSummary> {
    const today = new Date().toISOString().split('T')[0];

    // Also check pending offline queue in IndexedDB
    const pendingEvents = await offlineDB.getPendingEvents();
    const employeePending = pendingEvents.find(
      (e) => e.employeeId === employeeId && e.capturedAt.startsWith(today)
    );

    if (employeePending) {
      return {
        hasCheckedIn: employeePending.eventType === 'check_in',
        hasCheckedOut: employeePending.eventType === 'check_out',
        checkInTime: employeePending.capturedAt,
        status: 'pending',
        facilityName: employeePending.facilityName,
        syncStatus: 'pending',
      };
    }

    if (!IS_MOCK_ENABLED) {
      return apiClient.get<TodayAttendanceSummary>(API_ENDPOINTS.ATTENDANCE.TODAY, { employeeId });
    }

    const records = mockStore.getAttendanceByEmployee(employeeId);
    const todayRecord = records.find((r) => r.date === today);

    if (!todayRecord) {
      return {
        hasCheckedIn: false,
        hasCheckedOut: false,
        status: 'absent',
        syncStatus: 'synced',
      };
    }

    return {
      hasCheckedIn: !!todayRecord.checkInTime,
      hasCheckedOut: !!todayRecord.checkOutTime,
      checkInTime: todayRecord.checkInTime || undefined,
      checkOutTime: todayRecord.checkOutTime || undefined,
      status: todayRecord.status,
      facilityName: todayRecord.facilityName,
      syncStatus: todayRecord.syncStatus,
    };
  }

  async getHistory(
    employeeId: string,
    filters?: {
      status?: AttendanceStatus | 'all';
      startDate?: string;
      endDate?: string;
    }
  ): Promise<AttendanceRecord[]> {
    if (!IS_MOCK_ENABLED) {
      return apiClient.get<AttendanceRecord[]>(API_ENDPOINTS.ATTENDANCE.HISTORY, {
        employeeId,
        ...filters,
      });
    }

    let records = mockStore.getAttendanceByEmployee(employeeId);

    if (filters?.status && filters.status !== 'all') {
      records = records.filter((r) => r.status === filters.status);
    }
    if (filters?.startDate) {
      records = records.filter((r) => r.date >= filters.startDate!);
    }
    if (filters?.endDate) {
      records = records.filter((r) => r.date <= filters.endDate!);
    }

    return records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async getAllAttendance(filters?: {
    search?: string;
    facilityId?: string;
    departmentId?: string;
    status?: string;
    date?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<AttendanceRecord[]> {
    if (!IS_MOCK_ENABLED) {
      return apiClient.get<AttendanceRecord[]>(API_ENDPOINTS.ATTENDANCE.REGISTER, filters);
    }

    let list = mockStore.getAttendance();

    if (filters?.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (r) =>
          r.employeeName.toLowerCase().includes(q) ||
          r.employeeCode.toLowerCase().includes(q) ||
          r.notes?.toLowerCase().includes(q)
      );
    }
    if (filters?.facilityId && filters.facilityId !== 'all') {
      list = list.filter((r) => r.facilityId === filters.facilityId);
    }
    if (filters?.departmentId && filters.departmentId !== 'all') {
      list = list.filter((r) => r.departmentId === filters.departmentId);
    }
    if (filters?.status && filters.status !== 'all') {
      list = list.filter((r) => r.status === filters.status);
    }
    if (filters?.date) {
      list = list.filter((r) => r.date === filters.date);
    }
    if (filters?.startDate) {
      list = list.filter((r) => r.date >= filters.startDate!);
    }
    if (filters?.endDate) {
      list = list.filter((r) => r.date <= filters.endDate!);
    }

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Simulates facility presence verification against geofence and authorized networks.
   * Note: In production this will be verified securely server-side via Go backend.
   */
  async verifyFacilityPresence(params: VerifyFacilityParams): Promise<{
    isVerified: boolean;
    distanceMeters: number;
    networkMatch: boolean;
    message: string;
  }> {
    await new Promise((r) => setTimeout(r, 600));

    const facility = mockStore.getFacilityById(params.facilityId);
    if (!facility) {
      return {
        isVerified: false,
        distanceMeters: 9999,
        networkMatch: false,
        message: 'Unknown facility identifier provided.',
      };
    }

    if (params.simulateFailure) {
      return {
        isVerified: false,
        distanceMeters: facility.geofenceRadiusMeters + 350,
        networkMatch: false,
        message: `Simulated: Location is 350m outside the permitted ${facility.geofenceRadiusMeters}m geofence radius.`,
      };
    }

    // In demo mode, simulate user being safely inside the geofence (e.g. 35m away)
    const simulatedDistance = 38;
    return {
      isVerified: true,
      distanceMeters: simulatedDistance,
      networkMatch: true,
      message: `Verified: Inside ${facility.name} (${simulatedDistance}m from center, radius ${facility.geofenceRadiusMeters}m).`,
    };
  }

  /**
   * Simulates facial recognition identity verification.
   * Note: In production this is performed by a dedicated server-side biometric service.
   */
  async verifyBiometric(params: VerifyBiometricParams): Promise<VerificationResult> {
    await new Promise((r) => setTimeout(r, 1200));

    if (params.simulateFailure) {
      return {
        isVerified: false,
        score: params.simulateScore || 0.42,
        mode: 'face_facility',
        faceMatch: false,
        facilityMatch: true,
        message: 'Facial verification threshold not met (confidence score 0.42 < 0.85). Please align your face inside the frame.',
        timestamp: new Date().toISOString(),
      };
    }

    const score = params.simulateScore || 0.96;
    return {
      isVerified: true,
      score,
      mode: 'face_facility',
      faceMatch: true,
      facilityMatch: true,
      gpsDistanceMeters: 38,
      networkMatch: true,
      message: `Identity confirmed with high confidence (${Math.round(score * 100)}% match).`,
      timestamp: new Date().toISOString(),
    };
  }

  async recordAttendance(params: SubmitAttendanceParams): Promise<{
    record?: AttendanceRecord;
    offlineEvent?: OfflineEvent;
    isOffline: boolean;
  }> {
    const nowIso = new Date().toISOString();
    const today = nowIso.split('T')[0];

    // If offline mode is active, store in IndexedDB queue
    if (params.isOffline) {
      const offlineEvent: OfflineEvent = {
        id: `offline-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        eventType: params.type,
        employeeId: params.employeeId,
        employeeName: params.employeeName,
        facilityId: params.facilityId,
        facilityName: params.facilityName,
        capturedAt: nowIso,
        verificationMode: 'offline_sync',
        verificationResult: params.verificationDetails,
        status: 'pending',
        retryCount: 0,
      };

      await offlineDB.saveEvent(offlineEvent);
      return { offlineEvent, isOffline: true };
    }

    // Online submission
    if (!IS_MOCK_ENABLED) {
      const endpoint =
        params.type === 'check_in'
          ? API_ENDPOINTS.ATTENDANCE.CHECK_IN
          : API_ENDPOINTS.ATTENDANCE.CHECK_OUT;
      const res = await apiClient.post<{ record: AttendanceRecord }>(endpoint, params);
      return { record: res.record, isOffline: false };
    }

    // Mock store simulation
    const existing = mockStore.getTodayAttendanceForEmployee(params.employeeId);

    if (existing) {
      if (params.type === 'check_out') {
        existing.checkOutTime = nowIso;
        existing.status = 'present';
        mockStore.updateAttendance(existing.id, existing);
      }
      return { record: existing, isOffline: false };
    }

    const newRecord: AttendanceRecord = {
      id: `att-${Date.now()}`,
      employeeId: params.employeeId,
      employeeName: params.employeeName,
      employeeCode: params.employeeCode,
      departmentId: params.departmentId,
      departmentName: params.departmentName,
      facilityId: params.facilityId,
      facilityName: params.facilityName,
      date: today,
      checkInTime: params.type === 'check_in' ? nowIso : null,
      checkOutTime: params.type === 'check_out' ? nowIso : null,
      status: 'present',
      verificationMode: params.verificationMode,
      syncStatus: 'synced',
      isOfflineCapture: false,
      verificationDetails: params.verificationDetails,
      createdAt: nowIso,
    };

    mockStore.addAttendance(newRecord);

    mockStore.addAuditLog({
      actorId: params.employeeCode,
      actorName: params.employeeName,
      actorRole: 'Employee',
      action: params.type === 'check_in' ? 'attendance_checkin' : 'attendance_checkout',
      affectedResource: `Attendance Record #${newRecord.id}`,
      resourceId: newRecord.id,
      details: `${params.type === 'check_in' ? 'Checked in' : 'Checked out'} via ${params.verificationMode} at ${params.facilityName}.`,
      outcome: 'success',
    });

    return { record: newRecord, isOffline: false };
  }

  async correctAttendance(
    id: string,
    params: {
      correctedTime: string;
      reason: string;
      approvedBy: string;
      approvedByName: string;
      notes?: string;
    }
  ): Promise<AttendanceRecord | undefined> {
    if (!IS_MOCK_ENABLED) {
      return apiClient.post<AttendanceRecord>(API_ENDPOINTS.ATTENDANCE.CORRECT(id), params);
    }
    return mockStore.correctAttendance(id, params);
  }
}

export const attendanceService = new AttendanceService();
