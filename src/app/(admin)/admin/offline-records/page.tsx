'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { LoadingState } from '@/components/EmptyState';
import { useOffline } from '@/context/OfflineContext';
import { useAuth } from '@/context/AuthContext';
import { syncService } from '@/services/sync.service';
import { offlineDB } from '@/lib/offline/db';
import { mockStore } from '@/mocks';
import { OfflineEvent } from '@/types/offline';
import { AttendanceRecord } from '@/types/attendance';
import { formatDateTime } from '@/lib/utils/formatters';
import {
  WifiOff,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Database,
  ShieldAlert,
  Sparkles,
  Info,
  Check,
  X,
  Search,
} from 'lucide-react';

export default function AdminOfflineRecordsPage() {
  const { isEffectiveOffline, isSyncing, triggerSync, refreshPendingCount } = useOffline();
  const { user, isMockMode } = useAuth();
  const [events, setEvents] = useState<OfflineEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'review_required' | 'rejected' | 'synced'>('all');
  const [search, setSearch] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<OfflineEvent | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const allEvents = await syncService.getQueue();
      setEvents(allEvents);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSyncNow = async () => {
    try {
      const res = await triggerSync();
      setFeedback(
        `${isMockMode ? '[Simulated Sync] ' : ''}Processed ${res.totalProcessed} records: ${res.successful} synced, ${res.reviewRequired} review-required, ${res.failed} rejected.`
      );
      await loadData();
    } catch (err: unknown) {
      setFeedback(err instanceof Error ? err.message : 'Sync failed');
    }
  };

  const handleSeedDemo = async () => {
    await syncService.seedDemoOfflineEvents();
    await refreshPendingCount();
    await loadData();
    setFeedback('Seeded demo offline queue events into local IndexedDB.');
  };

  const handleClearSynced = async () => {
    await offlineDB.clearSyncedEvents();
    await loadData();
    setFeedback('Cleared completed synced records from local buffer.');
  };

  const handleApproveReview = async (event: OfflineEvent) => {
    await offlineDB.updateEventStatus(event.id, 'synced', {
      syncedAt: new Date().toISOString(),
      requiresReviewReason: undefined,
    });

    // Add to verified attendance store
    const date = event.capturedAt.split('T')[0];
    const newRecord: AttendanceRecord = {
      id: `att-manual-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
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
      verificationMode: 'manual_override',
      syncStatus: 'synced',
      isOfflineCapture: true,
      verificationDetails: event.verificationResult,
      notes: `Supervisor sign-off: Override applied for geofence tolerance. Prior note: ${event.requiresReviewReason}`,
      createdAt: event.capturedAt,
    };
    mockStore.addAttendance(newRecord);

    mockStore.addAuditLog({
      actorId: user?.employeeId ?? 'unknown',
      actorName: user?.name ?? 'Unknown',
      actorRole: user?.role ?? 'admin',
      action: 'attendance_correction',
      affectedResource: `Offline Event #${event.id} (${event.employeeName})`,
      details: 'Supervisor accepted flagged offline record after perimeter verification review.',
      outcome: 'success',
    });

    await refreshPendingCount();
    await loadData();
    setSelectedEvent(null);
    setFeedback(`Offline attendance for "${event.employeeName}" was approved and written to official register.`);
  };

  const handleRejectReview = async (event: OfflineEvent) => {
    await offlineDB.updateEventStatus(event.id, 'rejected', {
      errorMessage: 'Supervisor rejected offline attendance due to unverified presence.',
    });

    mockStore.addAuditLog({
      actorId: user?.employeeId ?? 'unknown',
      actorName: user?.name ?? 'Unknown',
      actorRole: user?.role ?? 'admin',
      action: 'attendance_correction',
      affectedResource: `Offline Event #${event.id} (${event.employeeName})`,
      details: 'Supervisor rejected flagged offline attendance event.',
      outcome: 'warning',
    });

    await refreshPendingCount();
    await loadData();
    setSelectedEvent(null);
    setFeedback(`Offline attendance for "${event.employeeName}" was formally rejected.`);
  };

  const filteredEvents = events.filter((e) => {
    const matchesFilter = filterStatus === 'all' || e.status === filterStatus;
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      e.employeeName.toLowerCase().includes(q) ||
      e.employeeId.toLowerCase().includes(q) ||
      e.facilityName.toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  const pendingCount = events.filter((e) => e.status === 'pending').length;
  const reviewCount = events.filter((e) => e.status === 'review_required').length;
  const rejectedCount = events.filter((e) => e.status === 'rejected').length;
  const syncedCount = events.filter((e) => e.status === 'synced').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Offline Attendance Records & Review"
        subtitle="Inspect and reconcile offline-captured attendance batches stored in IndexedDB before accepting into permanent register"
        actions={
          <div className="flex items-center gap-2">
            {isMockMode && (
            <button
              onClick={handleSeedDemo}
              className="px-3 py-2 bg-brand-ivory hover:bg-brand-border-subtle text-brand-charcoal rounded-xl text-xs font-semibold transition border border-brand-border flex items-center gap-1.5"
              title="Seed demo events for testing"
            >
              <Sparkles className="w-3.5 h-3.5 text-brand-secondary" />
              <span>Seed Test Records</span>
            </button>
            )}

            <button
              onClick={handleSyncNow}
              disabled={isSyncing || isEffectiveOffline || pendingCount === 0}
              className="px-4 py-2 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-xs font-bold transition shadow-card flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''} text-brand-mint`} />
              <span>{isSyncing ? 'Synchronizing...' : isMockMode ? 'Sync Pending (Demo)' : 'Sync Pending'}</span>
            </button>
          </div>
        }
      />

      {feedback && (
        <div className="p-3 bg-brand-mint text-brand-mint-dark rounded-xl border border-brand-mint-dark/20 text-xs font-medium flex items-center justify-between animate-fade-in">
          <span>{feedback}</span>
          <button onClick={() => setFeedback(null)} className="p-1 hover:opacity-75">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Security notice regarding offline reconciliation */}
      <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold">Offline Integrity Policy:</strong> Offline records remain in a verified pending state until the central service reconciles cryptographic timestamps, geofence boundary coordinates, and replay tokens. Records flagged for anomalies require administrator sign-off before entering the official attendance ledger.
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Pending Queue"
          value={pendingCount}
          icon={WifiOff}
          subtitle="Locally buffered in browser"
          variant="warning"
        />
        <StatCard
          title="Review Required"
          value={reviewCount}
          icon={AlertTriangle}
          subtitle="Border perimeter / anomaly"
          variant={reviewCount > 0 ? 'danger' : 'default'}
        />
        <StatCard
          title="Server Synced"
          value={syncedCount}
          icon={CheckCircle2}
          subtitle="Reconciled to store"
          variant="success"
        />
        <StatCard
          title="Rejected Events"
          value={rejectedCount}
          icon={XCircle}
          subtitle="Failed policy thresholds"
          variant={rejectedCount > 0 ? 'danger' : 'default'}
        />
      </div>

      {/* Filter and Tab Navigation */}
      <div className="bg-white rounded-2xl p-4 border border-brand-border-subtle shadow-card flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition ${
              filterStatus === 'all'
                ? 'bg-brand-primary text-white shadow-subtle'
                : 'text-brand-muted hover:bg-brand-ivory'
            }`}
          >
            All Events ({events.length})
          </button>
          <button
            onClick={() => setFilterStatus('pending')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition ${
              filterStatus === 'pending'
                ? 'bg-amber-600 text-white shadow-subtle'
                : 'text-brand-muted hover:bg-brand-ivory'
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => setFilterStatus('review_required')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition ${
              filterStatus === 'review_required'
                ? 'bg-indigo-700 text-white shadow-subtle'
                : 'text-brand-muted hover:bg-brand-ivory'
            }`}
          >
            Needs Review ({reviewCount})
          </button>
          <button
            onClick={() => setFilterStatus('rejected')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition ${
              filterStatus === 'rejected'
                ? 'bg-rose-700 text-white shadow-subtle'
                : 'text-brand-muted hover:bg-brand-ivory'
            }`}
          >
            Rejected ({rejectedCount})
          </button>
          <button
            onClick={() => setFilterStatus('synced')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition ${
              filterStatus === 'synced'
                ? 'bg-emerald-700 text-white shadow-subtle'
                : 'text-brand-muted hover:bg-brand-ivory'
            }`}
          >
            Synced ({syncedCount})
          </button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-brand-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search employee or facility..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-brand-border bg-white text-brand-charcoal text-xs outline-none"
            />
          </div>

          {syncedCount > 0 && (
            <button
              onClick={handleClearSynced}
              className="text-xs text-brand-muted hover:text-brand-primary underline whitespace-nowrap"
            >
              Clear Synced
            </button>
          )}
        </div>
      </div>

      {/* Main Records List */}
      {isLoading ? (
        <LoadingState message="Loading offline IndexedDB queue..." />
      ) : filteredEvents.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-brand-border-subtle shadow-card space-y-3">
          <Database className="w-12 h-12 text-brand-muted mx-auto opacity-40" />
          <h3 className="font-bold text-sm text-brand-primary">No Matching Offline Records</h3>
          <p className="text-xs text-brand-muted max-w-sm mx-auto">
            {events.length === 0
              ? isMockMode
                ? 'The offline queue is currently empty. You can simulate offline arrivals using the Seed button or employee attendance portal.'
                : 'No offline check-ins are queued on this device.'
              : 'No records match the current filter criteria.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEvents.map((evt) => {
            const isReview = evt.status === 'review_required';
            const isRejected = evt.status === 'rejected';
            const isSynced = evt.status === 'synced';

            return (
              <div
                key={evt.id}
                className={`bg-white rounded-2xl p-5 border shadow-card transition-all ${
                  isReview
                    ? 'border-indigo-300 ring-1 ring-indigo-200'
                    : isRejected
                    ? 'border-rose-200 bg-rose-50/20'
                    : 'border-brand-border-subtle hover:border-brand-border'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-extrabold text-sm text-brand-primary">
                        {evt.employeeName}
                      </span>
                      <span className="text-xs font-mono text-brand-muted">
                        ({evt.employeeId})
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono bg-brand-ivory border border-brand-border-subtle text-brand-charcoal">
                        {evt.eventType.replace('_', ' ')}
                      </span>
                      {isReview && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-indigo-600" />
                          Supervisor Review Required
                        </span>
                      )}
                      {isRejected && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                          <XCircle className="w-3 h-3 text-rose-600" />
                          Server Rejected
                        </span>
                      )}
                      {isSynced && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Reconciled & Accepted
                        </span>
                      )}
                      {evt.status === 'pending' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-1">
                          <RefreshCw className="w-3 h-3 text-amber-700 animate-spin" />
                          Pending Synchronization
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-brand-muted">
                      Facility: <span className="font-semibold text-brand-charcoal">{evt.facilityName}</span> • Captured: {formatDateTime(evt.capturedAt)}
                    </p>

                    {evt.requiresReviewReason && (
                      <div className="mt-2 p-2.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs flex items-start gap-2">
                        <Info className="w-4 h-4 text-indigo-700 shrink-0 mt-0.5" />
                        <div>
                          <strong className="font-semibold">Audit Exception Flag:</strong> {evt.requiresReviewReason}
                        </div>
                      </div>
                    )}

                    {evt.errorMessage && (
                      <div className="mt-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-2">
                        <XCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                        <div>
                          <strong className="font-semibold">Rejection Reason:</strong> {evt.errorMessage}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions for supervisors */}
                  <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                    <button
                      onClick={() => setSelectedEvent(evt)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-ivory hover:bg-brand-border-subtle text-brand-charcoal border border-brand-border-subtle transition"
                    >
                      Parameters
                    </button>

                    {isReview && !isMockMode && (
                      <span className="text-[11px] text-brand-muted max-w-[220px]">
                        Saved on the server for review. Adjust it from the Attendance Register.
                      </span>
                    )}

                    {isReview && isMockMode && (
                      <>
                        <button
                          onClick={() => handleApproveReview(evt)}
                          className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-brand-success hover:bg-emerald-700 text-white shadow-subtle flex items-center gap-1 transition"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve & Accept</span>
                        </button>

                        <button
                          onClick={() => handleRejectReview(evt)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1 transition"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Inspection Modal for Record Parameters */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-primary/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-modal border border-brand-border max-w-lg w-full overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-brand-border-subtle bg-brand-ivory flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-brand-primary">Offline Event Cryptographic Audit</h3>
                <p className="text-xs text-brand-muted">Event ID: {selectedEvent.id}</p>
              </div>
              <button onClick={() => setSelectedEvent(null)} className="p-1 hover:bg-black/5 rounded-lg">
                <X className="w-4 h-4 text-brand-muted" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-brand-ivory rounded-xl border border-brand-border-subtle">
                <div>
                  <span className="text-brand-muted text-[11px] block">Confidence Score</span>
                  <span className="font-mono font-bold text-brand-primary">
                    {selectedEvent.verificationResult?.score ?? 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-brand-muted text-[11px] block">GPS Perimeter Distance</span>
                  <span className="font-mono font-bold text-brand-primary">
                    {selectedEvent.verificationResult?.gpsDistanceMeters !== undefined
                      ? `${selectedEvent.verificationResult.gpsDistanceMeters}m from center`
                      : 'Unavailable'}
                  </span>
                </div>
                <div>
                  <span className="text-brand-muted text-[11px] block">Local Device Verification</span>
                  <span className="font-semibold text-emerald-800">Verified On-Device</span>
                </div>
                <div>
                  <span className="text-brand-muted text-[11px] block">Retry Attempts</span>
                  <span className="font-mono">{selectedEvent.retryCount}</span>
                </div>
              </div>

              {isMockMode && (
              <div>
                <span className="text-brand-muted font-bold text-[11px] block uppercase tracking-wider mb-1">
                  Offline Integrity Proof
                </span>
                <p className="p-3 bg-zinc-900 text-zinc-200 font-mono text-[10px] rounded-xl overflow-x-auto leading-relaxed">
                  Payload Hash: sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
                  <br />
                  Timestamp Signature: valid_offline_cert
                  <br />
                  Replay Protection Nonce: {selectedEvent.id}
                </p>
              </div>
              )}

              {selectedEvent.status === 'review_required' && isMockMode && (
                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    onClick={() => handleRejectReview(selectedEvent)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100"
                  >
                    Reject Record
                  </button>
                  <button
                    onClick={() => handleApproveReview(selectedEvent)}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-brand-primary text-white hover:bg-brand-primary-hover shadow-subtle"
                  >
                    Authorize Sign-off
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
