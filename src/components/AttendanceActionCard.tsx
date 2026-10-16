'use client';

import React from 'react';
import Link from 'next/link';
import { TodayAttendanceSummary } from '@/types/attendance';
import { AttendanceStatusBadge } from './AttendanceStatusBadge';
import { SyncStatusBadge } from './SyncStatusBadge';
import { formatTime } from '@/lib/utils/formatters';
import {
  CalendarCheck,
  CheckCircle,
  ArrowRight,
  LogOut,
  Building,
} from 'lucide-react';

interface AttendanceActionCardProps {
  summary: TodayAttendanceSummary;
  facilityName: string;
  isOffline: boolean;
}

export function AttendanceActionCard({ summary, facilityName, isOffline }: AttendanceActionCardProps) {
  const isCheckedIn = summary.hasCheckedIn;
  const isCheckedOut = summary.hasCheckedOut;

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-brand-border-subtle shadow-card relative overflow-hidden">
      {/* Decorative background accent */}
      <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 rounded-full bg-brand-mint/40 blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        {/* Status info */}
        <div className="space-y-3 max-w-xl">
          <div className="flex flex-wrap items-center gap-2.5">
            <AttendanceStatusBadge status={summary.status} />
            {summary.syncStatus && summary.syncStatus !== 'synced' && (
              <SyncStatusBadge status={summary.syncStatus} />
            )}
            <span className="inline-flex items-center gap-1.5 text-xs text-brand-muted font-medium bg-brand-ivory px-2.5 py-1 rounded-full border border-brand-border-subtle">
              <Building className="w-3.5 h-3.5 text-brand-secondary" />
              <span>{facilityName}</span>
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-brand-primary tracking-tight">
            {!isCheckedIn
              ? 'Ready to check in for your shift'
              : !isCheckedOut
              ? 'Shift in progress'
              : 'Shift completed for today'}
          </h2>

          <p className="text-xs sm:text-sm text-brand-muted leading-relaxed">
            {!isCheckedIn
              ? 'Complete facial verification on-site to record your check-in timestamp.'
              : !isCheckedOut
              ? `Checked in at ${formatTime(summary.checkInTime)}. Record your departure when ready to conclude work.`
              : `Checked in at ${formatTime(summary.checkInTime)} and checked out at ${formatTime(summary.checkOutTime)}.`}
          </p>

          {/* Timestamps Pill Grid */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3 rounded-2xl bg-brand-ivory border border-brand-border-subtle">
              <span className="text-[11px] font-semibold text-brand-muted uppercase tracking-wider block">
                Check In
              </span>
              <span className="text-sm font-bold text-brand-primary">
                {summary.checkInTime ? formatTime(summary.checkInTime) : '—'}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-brand-ivory border border-brand-border-subtle">
              <span className="text-[11px] font-semibold text-brand-muted uppercase tracking-wider block">
                Check Out
              </span>
              <span className="text-sm font-bold text-brand-primary">
                {summary.checkOutTime ? formatTime(summary.checkOutTime) : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="w-full md:w-auto shrink-0 flex flex-col gap-2">
          {!isCheckedOut ? (
            <Link
              href="/employee/attendance"
              className={`w-full md:w-auto px-8 py-4 rounded-2xl font-extrabold text-sm sm:text-base shadow-card transition-all flex items-center justify-center gap-3 text-white ${
                !isCheckedIn
                  ? 'bg-brand-primary hover:bg-brand-primary-hover hover:shadow-dropdown'
                  : 'bg-brand-secondary hover:bg-brand-secondary-hover'
              }`}
            >
              {!isCheckedIn ? (
                <>
                  <CalendarCheck className="w-5 h-5 text-brand-mint" />
                  <span>Mark Check-In</span>
                  <ArrowRight className="w-4 h-4 text-brand-mint ml-1" />
                </>
              ) : (
                <>
                  <LogOut className="w-5 h-5 text-brand-mint" />
                  <span>Mark Check-Out</span>
                  <ArrowRight className="w-4 h-4 text-brand-mint ml-1" />
                </>
              )}
            </Link>
          ) : (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>Attendance recorded for today</span>
            </div>
          )}

          {isOffline && (
            <span className="text-[11px] text-amber-800 font-medium text-center">
              Offline mode: Attendance will be queued in IndexedDB
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
