'use client';

import React from 'react';
import { SyncStatus } from '@/types/attendance';
import { CloudCheck, CloudOff, AlertTriangle, RefreshCw } from 'lucide-react';

interface SyncStatusBadgeProps {
  status: SyncStatus;
  showIcon?: boolean;
}

export function SyncStatusBadge({ status, showIcon = true }: SyncStatusBadgeProps) {
  const configs: Record<
    SyncStatus,
    { label: string; bg: string; text: string; border: string; icon: React.ReactNode }
  > = {
    synced: {
      label: 'Synced',
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      icon: <CloudCheck className="w-3.5 h-3.5 text-emerald-600" />,
    },
    pending: {
      label: 'Pending Sync',
      bg: 'bg-amber-50',
      text: 'text-brand-warning',
      border: 'border-amber-200',
      icon: <RefreshCw className="w-3.5 h-3.5 text-brand-warning animate-spin" />,
    },
    rejected: {
      label: 'Sync Rejected',
      bg: 'bg-rose-50',
      text: 'text-brand-danger',
      border: 'border-rose-200',
      icon: <CloudOff className="w-3.5 h-3.5 text-brand-danger" />,
    },
    review_required: {
      label: 'Review Required',
      bg: 'bg-indigo-50',
      text: 'text-indigo-700',
      border: 'border-indigo-200',
      icon: <AlertTriangle className="w-3.5 h-3.5 text-indigo-600" />,
    },
  };

  const cfg = configs[status] || configs.pending;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.text} ${cfg.border}`}
    >
      {showIcon && cfg.icon}
      <span>{cfg.label}</span>
    </span>
  );
}
