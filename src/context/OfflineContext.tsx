'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { syncService } from '@/services/sync.service';
import { SyncBatchResult } from '@/types/offline';

interface OfflineContextType {
  isOnline: boolean;
  isSimulatedOffline: boolean;
  isEffectiveOffline: boolean;
  toggleSimulatedOffline: () => void;
  pendingCount: number;
  isSyncing: boolean;
  triggerSync: () => Promise<SyncBatchResult>;
  refreshPendingCount: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isSimulatedOffline, setIsSimulatedOffline] = useState<boolean>(false);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const refreshPendingCount = useCallback(async () => {
    try {
      const count = await syncService.getPendingCount();
      setPendingCount(count);
    } catch {
      // Ignore in non-browser environments
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      refreshPendingCount();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Seed sample demo offline records if queue is empty
    syncService.seedDemoOfflineEvents().then(() => {
      refreshPendingCount();
    });

    const interval = setInterval(refreshPendingCount, 15000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [refreshPendingCount]);

  const toggleSimulatedOffline = () => {
    setIsSimulatedOffline((prev) => !prev);
  };

  const isEffectiveOffline = !isOnline || isSimulatedOffline;

  const triggerSync = async (): Promise<SyncBatchResult> => {
    setIsSyncing(true);
    try {
      const res = await syncService.syncNow();
      await refreshPendingCount();
      return res;
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <OfflineContext.Provider
      value={{
        isOnline,
        isSimulatedOffline,
        isEffectiveOffline,
        toggleSimulatedOffline,
        pendingCount,
        isSyncing,
        triggerSync,
        refreshPendingCount,
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
}
