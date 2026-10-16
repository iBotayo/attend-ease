'use client';

import React from 'react';
import { useOffline } from '@/context/OfflineContext';
import { WifiOff, RefreshCw } from 'lucide-react';

interface ConnectionStatusProps {
  showPendingCount?: boolean;
  onOpenSyncModal?: () => void;
}

export function ConnectionStatus({ showPendingCount = true, onOpenSyncModal }: ConnectionStatusProps) {
  const { isEffectiveOffline, isSimulatedOffline, pendingCount, isSyncing } = useOffline();

  return (
    <div className="flex items-center gap-2">
      {isEffectiveOffline ? (
        <button
          onClick={onOpenSyncModal}
          type="button"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 transition-colors cursor-pointer"
          title={isSimulatedOffline ? 'Simulated Offline Mode' : 'Network Disconnected'}
        >
          <WifiOff className="w-3.5 h-3.5 text-amber-800" />
          <span>Offline</span>
          {showPendingCount && pendingCount > 0 && (
            <span className="bg-amber-800 text-amber-100 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
              {pendingCount}
            </span>
          )}
        </button>
      ) : (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
          </span>
          <span className="hidden sm:inline">Online</span>
        </div>
      )}

      {pendingCount > 0 && !isEffectiveOffline && (
        <button
          onClick={onOpenSyncModal}
          type="button"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 text-amber-700 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{pendingCount} pending</span>
        </button>
      )}
    </div>
  );
}
