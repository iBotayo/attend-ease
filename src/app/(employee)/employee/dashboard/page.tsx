'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useOffline } from '@/context/OfflineContext';
import { attendanceService } from '@/services/attendance.service';
import { TodayAttendanceSummary, AttendanceRecord } from '@/types/attendance';
import { AttendanceActionCard } from '@/components/AttendanceActionCard';
import { AttendanceStatusBadge } from '@/components/AttendanceStatusBadge';
import { LoadingState } from '@/components/EmptyState';
import { formatDate, formatTime } from '@/lib/utils/formatters';
import {
  Calendar,
  Clock,
  ArrowRight,
  ShieldCheck,
  Building,
  Wifi,
} from 'lucide-react';

export default function EmployeeDashboardPage() {
  const { user } = useAuth();
  const { isEffectiveOffline, pendingCount } = useOffline();

  const [summary, setSummary] = useState<TodayAttendanceSummary>({
    hasCheckedIn: false,
    hasCheckedOut: false,
    status: 'absent',
    syncStatus: 'synced',
  });
  const [recentRecords, setRecentRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      try {
        const sum = await attendanceService.getTodaySummary(user.employeeId);
        const history = await attendanceService.getHistory(user.employeeId);
        setSummary(sum);
        setRecentRecords(history.slice(0, 5));
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [user]);

  const currentDateFormatted = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date());

  if (isLoading) {
    return <LoadingState message="Loading your attendance dashboard..." />;
  }

  return (
    <div className="space-y-6">
      {/* Greeting Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-brand-secondary uppercase tracking-wider">
            <Calendar className="w-3.5 h-3.5" />
            <span>{currentDateFormatted}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-primary tracking-tight mt-1">
            Welcome back, {user?.name.split(' ')[0] || 'Employee'}
          </h1>
          <p className="text-xs sm:text-sm text-brand-muted mt-0.5">
            {user?.departmentName} • {user?.assignedFacilityName}
          </p>
        </div>

        {/* Biometric Status Pill */}
        <div className="flex items-center gap-2 self-start sm:self-auto bg-white px-3 py-1.5 rounded-2xl border border-brand-border-subtle shadow-subtle text-xs">
          <ShieldCheck
            className={`w-4 h-4 ${user?.biometricStatus === 'enrolled' ? 'text-emerald-600' : 'text-brand-muted'}`}
          />
          <span className="font-semibold text-brand-primary">
            {user?.biometricStatus === 'enrolled' ? 'Face Enrolled' : 'Face Not Enrolled'}
          </span>
          <span className="text-[10px] text-brand-muted">ID: {user?.employeeId}</span>
        </div>
      </div>

      {/* Primary Attendance Action Card - Immediately visible */}
      <AttendanceActionCard
        summary={summary}
        facilityName={user?.assignedFacilityName || 'your assigned facility'}
        isOffline={isEffectiveOffline}
      />

      {/* Verification & System Health Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Facility verification state */}
        <div className="bg-white rounded-2xl p-4 border border-brand-border-subtle shadow-card flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-brand-primary/10 text-brand-primary shrink-0">
            <Building className="w-5 h-5" />
          </div>
          <div className="text-xs">
            <span className="text-brand-muted uppercase font-bold text-[10px] tracking-wider block">
              Assigned Facility
            </span>
            <div className="font-bold text-brand-charcoal text-sm truncate max-w-[190px]">
              {user?.assignedFacilityName ? user.assignedFacilityName.split(' - ')[0] : 'Not assigned'}
            </div>
            <p className="text-brand-muted text-[11px] mt-0.5">
              Location is checked at each check-in
            </p>
          </div>
        </div>

        {/* Connection status */}
        <div className="bg-white rounded-2xl p-4 border border-brand-border-subtle shadow-card flex items-start gap-3">
          <div className={`p-2.5 rounded-xl shrink-0 ${isEffectiveOffline ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
            <Wifi className="w-5 h-5" />
          </div>
          <div className="text-xs">
            <span className="text-brand-muted uppercase font-bold text-[10px] tracking-wider block">
              Network Verification
            </span>
            <div className="font-bold text-brand-charcoal text-sm">
              {isEffectiveOffline ? 'Offline Mode Active' : 'Facility Connected'}
            </div>
            <p className="text-brand-muted text-[11px] mt-0.5">
              {isEffectiveOffline ? 'Queued in IndexedDB' : 'Direct API Link Active'}
            </p>
          </div>
        </div>

        {/* Pending Sync Queue */}
        <div className="bg-white rounded-2xl p-4 border border-brand-border-subtle shadow-card flex items-start gap-3">
          <div className={`p-2.5 rounded-xl shrink-0 ${pendingCount > 0 ? 'bg-amber-100 text-amber-800' : 'bg-brand-mint text-brand-mint-dark'}`}>
            <Clock className="w-5 h-5" />
          </div>
          <div className="text-xs">
            <span className="text-brand-muted uppercase font-bold text-[10px] tracking-wider block">
              Sync Queue
            </span>
            <div className="font-bold text-brand-charcoal text-sm">
              {pendingCount === 0 ? 'All Records Synced' : `${pendingCount} Pending Sync`}
            </div>
            <p className="text-brand-muted text-[11px] mt-0.5">
              {pendingCount === 0 ? 'Database in sync' : 'Will sync on connect'}
            </p>
          </div>
        </div>
      </div>

      {/* Recent Attendance History Table Snippet */}
      <div className="bg-white rounded-2xl border border-brand-border-subtle shadow-card overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-brand-border-subtle flex items-center justify-between bg-brand-ivory/50">
          <div>
            <h3 className="font-bold text-sm text-brand-primary">Recent Attendance Logs</h3>
            <p className="text-xs text-brand-muted">Your recorded arrivals and departures</p>
          </div>
          <Link
            href="/employee/history"
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-secondary hover:underline"
          >
            <span>View Full History</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-brand-border-subtle bg-brand-ivory text-brand-muted font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Check In</th>
                <th className="py-3 px-4">Check Out</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Facility</th>
                <th className="py-3 px-4">Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border-subtle/70">
              {recentRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-brand-muted">
                    No recent attendance records.
                  </td>
                </tr>
              ) : (
                recentRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-brand-ivory/50">
                    <td className="py-3 px-4 font-semibold text-brand-charcoal">{formatDate(r.date)}</td>
                    <td className="py-3 px-4 font-medium text-brand-primary">{formatTime(r.checkInTime)}</td>
                    <td className="py-3 px-4 text-brand-muted">{formatTime(r.checkOutTime)}</td>
                    <td className="py-3 px-4">
                      <AttendanceStatusBadge status={r.status} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-brand-muted">{r.facilityName.split(' - ')[0]}</td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] font-mono uppercase bg-brand-ivory px-2 py-0.5 rounded border border-brand-border-subtle text-brand-muted">
                        {r.verificationMode}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
