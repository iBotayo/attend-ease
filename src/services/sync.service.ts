import { OfflineEvent, SyncBatchResult } from '@/types/offline';
import { AttendanceRecord } from '@/types/attendance';
import { offlineDB } from '@/lib/offline/db';
import { mockStore } from '@/mocks';

import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';

const IS_MOCK_ENABLED = process.env.NEXT_PUBLIC_ENABLE_MOCK_API !== 'false';

class SyncService {
  async getQueue(): Promise<OfflineEvent[]> {
    return offlineDB.getAllEvents();
  }

  async getPendingCount(): Promise<number> {
    const pending = await offlineDB.getPendingEvents();
    return pending.length;
  }

  /**
   * Synchronizes locally buffered offline attendance events with server backend or simulation engine.
   * Handles state transitions: pending -> syncing -> synced | review_required | rejected.
   * Reverts to pending with retryCount on network failure to ensure zero data loss.
   */
  async syncNow(): Promise<SyncBatchResult> {
    const all = await offlineDB.getAllEvents();
    const pending = all.filter((e) => e.status === 'pending');

    const result: SyncBatchResult = {
      totalProcessed: pending.length,
      successful: 0,
      failed: 0,
      reviewRequired: 0,
      records: [],
    };

    if (pending.length === 0) {
      return result;
    }

    const nowIso = new Date().toISOString();

    // 1. Mark all pending events as 'syncing' to guard against duplicate concurrent sync runs
    for (const event of pending) {
      event.status = 'syncing';
      event.syncAttemptedAt = nowIso;
      await offlineDB.saveEvent(event);
    }

    // 2. Real API Mode: Submit batch to Go backend sync endpoint
    if (!IS_MOCK_ENABLED) {
      try {
        const batchResponse = await apiClient.post<SyncBatchResult>(
          API_ENDPOINTS.SYNC.OFFLINE_BATCH,
          { events: pending }
        );

        // Update IndexedDB with definitive server results
        for (const record of batchResponse.records) {
          await offlineDB.saveEvent(record);
        }

        return batchResponse;
      } catch (err: unknown) {
        // Network or server error: revert to pending and increment retry count without losing records
        const errorMsg =
          err instanceof Error ? err.message : 'Batch synchronization network request failed.';

        for (const event of pending) {
          event.status = 'pending';
          event.retryCount = (event.retryCount || 0) + 1;
          event.errorMessage = errorMsg;
          await offlineDB.saveEvent(event);
          result.records.push(event);
        }

        result.failed = pending.length;
        return result;
      }
    }

    // 3. Mock Simulation Mode
    for (const event of pending) {
      // Simulate network roundtrip latency
      await new Promise((r) => setTimeout(r, 250));

      const score = event.verificationResult?.score ?? 0.9;
      const distance = event.verificationResult?.gpsDistanceMeters ?? 50;

      if (score < 0.8) {
        event.status = 'rejected';
        event.errorMessage = 'Biometric match score below threshold during server-side replay.';
        result.failed++;
      } else if (distance > 180) {
        event.status = 'review_required';
        event.requiresReviewReason =
          'Captured near geofence perimeter boundary. Flagged for supervisor audit.';
        result.reviewRequired++;
      } else {
        event.status = 'synced';
        event.syncedAt = new Date().toISOString();
        result.successful++;

        // Add corresponding synced record to main attendance store
        const date = event.capturedAt.split('T')[0];
        const newRecord: AttendanceRecord = {
          id: `att-synced-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          employeeId: event.employeeId,
          employeeName: event.employeeName,
          employeeCode: event.employeeId,
          departmentId: 'dept-1',
          departmentName: 'General Department',
          facilityId: event.facilityId,
          facilityName: event.facilityName,
          date,
          checkInTime: event.eventType === 'check_in' ? event.capturedAt : null,
          checkOutTime: event.eventType === 'check_out' ? event.capturedAt : null,
          status: 'present',
          verificationMode: 'offline_sync',
          syncStatus: 'synced',
          isOfflineCapture: true,
          verificationDetails: event.verificationResult,
          createdAt: event.capturedAt,
        };
        mockStore.addAttendance(newRecord);
      }

      await offlineDB.saveEvent(event);
      result.records.push(event);
    }

    mockStore.addAuditLog({
      actorId: 'CLIENT_OFFLINE_SYNC',
      actorName: 'Offline Sync Engine',
      actorRole: 'System Service',
      action: 'offline_records_synced',
      affectedResource: `Offline Batch (${result.totalProcessed} events)`,
      details: `[Simulated] Synchronized ${result.successful} records, ${result.reviewRequired} review-required, ${result.failed} rejected.`,
      outcome: result.failed > 0 ? 'warning' : 'success',
    });

    return result;
  }

  async seedDemoOfflineEvents(): Promise<void> {
    const existing = await offlineDB.getAllEvents();
    if (existing.length > 0) return;

    const sampleEvents: OfflineEvent[] = [
      {
        id: 'offline-seed-1',
        eventType: 'check_in',
        employeeId: 'EMP-1008',
        employeeName: 'James Thornton',
        facilityId: 'fac-2',
        facilityName: 'Northgate Outpatient & Research Center',
        capturedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        verificationMode: 'offline_sync',
        verificationResult: {
          isVerified: true,
          score: 0.94,
          mode: 'offline_sync',
          faceMatch: true,
          facilityMatch: true,
          gpsDistanceMeters: 45,
          message: 'Local face capture verified against cached device template.',
          timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        },
        status: 'pending',
        retryCount: 0,
      },
      {
        id: 'offline-seed-2',
        eventType: 'check_in',
        employeeId: 'EMP-1013',
        employeeName: 'Nadia Chen',
        facilityId: 'fac-2',
        facilityName: 'Northgate Outpatient & Research Center',
        capturedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
        verificationMode: 'offline_sync',
        verificationResult: {
          isVerified: true,
          score: 0.91,
          mode: 'offline_sync',
          faceMatch: true,
          facilityMatch: true,
          gpsDistanceMeters: 195,
          message: 'Local face capture verified.',
          timestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
        },
        status: 'review_required',
        retryCount: 1,
        requiresReviewReason: 'Captured near geofence boundary (195m vs 200m limit).',
      },
      {
        id: 'offline-seed-3',
        eventType: 'check_in',
        employeeId: 'EMP-1012',
        employeeName: 'Tariq O’Connor',
        facilityId: 'fac-3',
        facilityName: 'Westside Logistics & Diagnostics Facility',
        capturedAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
        verificationMode: 'offline_sync',
        verificationResult: {
          isVerified: false,
          score: 0.62,
          mode: 'offline_sync',
          faceMatch: false,
          facilityMatch: true,
          message: 'Biometric score failed.',
          timestamp: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
        },
        status: 'rejected',
        retryCount: 2,
        errorMessage: 'Face match confidence (0.62) did not meet minimum acceptance threshold.',
      },
    ];

    for (const evt of sampleEvents) {
      await offlineDB.saveEvent(evt);
    }
  }
}

export const syncService = new SyncService();
