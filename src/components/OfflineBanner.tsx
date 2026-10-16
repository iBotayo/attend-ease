'use client';

import React from 'react';
import { useOffline } from '@/context/OfflineContext';
import { WifiOff, RefreshCw, AlertTriangle } from 'lucide-react';

interface OfflineBannerProps {
  onOpenSyncModal?: () => void;
}

export function OfflineBanner({ onOpenSyncModal }: OfflineBannerProps) {
  const { isEffectiveOffline, isSimulatedOffline, pendingCount, triggerSync, isSyncing } = useOffline();

  if (!isEffectiveOffline && pendingCount === 0) {
    return null;
  }

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/30 text-amber-950 px-4 py-2.5 text-xs sm:text-sm font-medium">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {isEffectiveOffline ? (
            <WifiOff className="w-4 h-4 text-amber-700 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
          )}
          <span>
            {isEffectiveOffline ? (
              <>
                <strong className="font-semibold">Offline Mode active</strong>
                {isSimulatedOffline ? ' (Simulated in development)' : ' (Network connection unavailable)'}
                . Attendance events are captured locally in IndexedDB and will queue for synchronization.
              </>
            ) : (
              <>
                <strong className="font-semibold">Pending sync queue</strong>: You have {pendingCount} offline attendance {pendingCount === 1 ? 'record' : 'records'} waiting to synchronize.
              </>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          {!isEffectiveOffline && pendingCount > 0 && (
            <button
              onClick={() => triggerSync()}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-700 text-white rounded-md text-xs font-semibold hover:bg-amber-800 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>
          )}

          {onOpenSyncModal && (
            <button
              onClick={onOpenSyncModal}
              className="text-xs text-amber-900 underline hover:text-amber-950 font-medium ml-1"
            >
              View Queue
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
