'use client';

import React, { useEffect, useState } from 'react';
import { useOffline } from '@/context/OfflineContext';
import { syncService } from '@/services/sync.service';
import { OfflineEvent } from '@/types/offline';
import { X, RefreshCw, CloudCheck, CloudOff, AlertTriangle, Database } from 'lucide-react';
import { formatDateTime } from '@/lib/utils/formatters';

interface SyncQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SyncQueueModal({ isOpen, onClose }: SyncQueueModalProps) {
  const { isEffectiveOffline, isSyncing, triggerSync } = useOffline();
  const [events, setEvents] = useState<OfflineEvent[]>([]);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const loadEvents = async () => {
    try {
      const all = await syncService.getQueue();
      setEvents(all);
    } catch {
      // fallback
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadEvents();
      setFeedbackMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSync = async () => {
    try {
      const res = await triggerSync();
      setFeedbackMessage(
        `Batch processed: ${res.successful} synced, ${res.reviewRequired} flagged for review, ${res.failed} rejected.`
      );
      await loadEvents();
    } catch (err: unknown) {
      setFeedbackMessage(err instanceof Error ? err.message : 'Sync failed');
    }
  };

  const getStatusBadge = (status: OfflineEvent['status']) => {
    switch (status) {
      case 'synced':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
            <CloudCheck className="w-3 h-3 text-emerald-600" /> Synced
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-semibold">
            <RefreshCw className="w-3 h-3 text-amber-700 animate-spin" /> Locally Captured (Pending)
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
            <CloudOff className="w-3 h-3 text-rose-600" /> Rejected
          </span>
        );
      case 'review_required':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
            <AlertTriangle className="w-3 h-3 text-indigo-600" /> Review Required
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-primary/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-modal border border-brand-border max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-brand-border-subtle flex items-center justify-between bg-brand-ivory">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-brand-primary/10 text-brand-primary">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-brand-primary">Offline Event Queue (IndexedDB)</h2>
              <p className="text-xs text-brand-muted">
                Locally buffered attendance events awaiting Go backend sync
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-brand-muted hover:text-brand-charcoal rounded-lg hover:bg-black/5"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedbackMessage && (
          <div className="px-6 py-2.5 bg-brand-mint text-brand-mint-dark text-xs font-medium border-b border-brand-mint-dark/20">
            {feedbackMessage}
          </div>
        )}

        {/* Content list */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3">
          {events.length === 0 ? (
            <div className="text-center py-10">
              <Database className="w-10 h-10 text-brand-muted mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium text-brand-charcoal">Queue is empty</p>
              <p className="text-xs text-brand-muted">No pending offline events stored in IndexedDB.</p>
            </div>
          ) : (
            events.map((evt) => (
              <div
                key={evt.id}
                className="p-3.5 rounded-xl border border-brand-border-subtle hover:border-brand-border bg-brand-ivory/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-brand-primary">
                        {evt.employeeName}
                      </span>
                      <span className="text-xs text-brand-muted uppercase font-mono">
                        {evt.eventType.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-brand-muted mt-0.5">
                      Facility: {evt.facilityName}
                    </p>
                  </div>
                  <div>{getStatusBadge(evt.status)}</div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-brand-border-subtle/80 flex flex-wrap items-center justify-between text-xs text-brand-muted">
                  <span>Captured: {formatDateTime(evt.capturedAt)}</span>
                  {evt.syncedAt && <span>Synced: {formatDateTime(evt.syncedAt)}</span>}
                  {evt.requiresReviewReason && (
                    <span className="text-indigo-700 font-medium w-full mt-1">
                      Reason: {evt.requiresReviewReason}
                    </span>
                  )}
                  {evt.errorMessage && (
                    <span className="text-brand-danger font-medium w-full mt-1">
                      Error: {evt.errorMessage}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-brand-border-subtle bg-brand-ivory flex items-center justify-between">
          <div className="text-xs text-brand-muted">
            {isEffectiveOffline ? (
              <span className="text-amber-800 font-medium">Network is offline. Reconnect or disable demo offline to sync.</span>
            ) : (
              <span>Ready to synchronize with backend</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-brand-charcoal hover:bg-black/5 rounded-lg transition"
            >
              Close
            </button>
            <button
              onClick={handleSync}
              disabled={isEffectiveOffline || isSyncing || events.filter((e) => e.status === 'pending').length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-brand-primary text-white rounded-lg hover:bg-brand-primary-hover disabled:opacity-50 transition shadow-subtle"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Synchronizing...' : 'Sync Now (Demo)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
