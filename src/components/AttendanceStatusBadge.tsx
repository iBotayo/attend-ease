'use client';

import React from 'react';
import { AttendanceStatus } from '@/types/attendance';
import { CheckCircle2, Clock, XCircle, AlertCircle, HelpCircle } from 'lucide-react';

interface AttendanceStatusBadgeProps {
  status: AttendanceStatus;
  showIcon?: boolean;
  size?: 'sm' | 'md';
}

export function AttendanceStatusBadge({ status, showIcon = true, size = 'md' }: AttendanceStatusBadgeProps) {
  const configs: Record<
    AttendanceStatus,
    { label: string; bg: string; text: string; border: string; icon: React.ReactNode }
  > = {
    present: {
      label: 'Present',
      bg: 'bg-brand-success-light',
      text: 'text-brand-success',
      border: 'border-brand-success/20',
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    },
    late: {
      label: 'Late Arrival',
      bg: 'bg-brand-warning-light',
      text: 'text-brand-warning',
      border: 'border-brand-warning/30',
      icon: <Clock className="w-3.5 h-3.5" />,
    },
    absent: {
      label: 'Absent',
      bg: 'bg-brand-danger-light',
      text: 'text-brand-danger',
      border: 'border-brand-danger/20',
      icon: <XCircle className="w-3.5 h-3.5" />,
    },
    pending: {
      label: 'Pending Review',
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200',
      icon: <AlertCircle className="w-3.5 h-3.5" />,
    },
    rejected: {
      label: 'Rejected',
      bg: 'bg-rose-50',
      text: 'text-rose-700',
      border: 'border-rose-200',
      icon: <XCircle className="w-3.5 h-3.5" />,
    },
    early_departure: {
      label: 'Early Departure',
      bg: 'bg-orange-50',
      text: 'text-orange-700',
      border: 'border-orange-200',
      icon: <HelpCircle className="w-3.5 h-3.5" />,
    },
  };

  const cfg = configs[status] || configs.pending;
  const padding = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border} ${padding}`}
    >
      {showIcon && cfg.icon}
      <span>{cfg.label}</span>
    </span>
  );
}
