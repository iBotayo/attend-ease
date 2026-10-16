'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { AttendanceStatusBadge } from '@/components/AttendanceStatusBadge';
import { SyncStatusBadge } from '@/components/SyncStatusBadge';
import { attendanceService, employeeService, facilityService } from '@/services';
import { AttendanceRecord } from '@/types/attendance';
import { User } from '@/types/user';
import { useOffline } from '@/context/OfflineContext';
import { formatDate, formatTime } from '@/lib/utils/formatters';
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  WifiOff,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  ShieldAlert,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const { pendingCount } = useOffline();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [facilityCount, setFacilityCount] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    // Services route to the Go API or the mock store depending on NEXT_PUBLIC_ENABLE_MOCK_API.
    Promise.all([
      attendanceService.getAllAttendance(),
      employeeService.getEmployees(),
      facilityService.getFacilities(),
    ])
      .then(([attendance, staff, facilities]) => {
        setRecords(attendance);
        setEmployees(staff);
        setFacilityCount(facilities.length);
      })
      .catch((err: unknown) => {
        setLoadError(err instanceof Error ? err.message : 'Failed to load dashboard data.');
      });
  }, []);

  const totalEmployees = employees.length;

  // Today stats
  const today = new Date().toISOString().split('T')[0];
  const todayRecords = records.filter((r) => r.date === today);

  const presentToday = todayRecords.filter((r) => r.status === 'present').length;
  const lateToday = todayRecords.filter((r) => r.status === 'late').length;
  const absentToday = todayRecords.filter((r) => r.status === 'absent').length;
  const exceptions = records.filter((r) => r.syncStatus === 'review_required' || r.status === 'rejected');
  const exceptionsCount = exceptions.length;
  const activeRate = totalEmployees > 0 ? Math.round(((presentToday + lateToday) / totalEmployees) * 100) : 0;

  // Today's on-site rate by department, derived from the employee directory and today's records
  const onSiteToday = new Set(
    todayRecords.filter((r) => r.status === 'present' || r.status === 'late').map((r) => r.employeeId)
  );
  const deptMap = new Map<string, { name: string; count: number; present: number }>();
  for (const emp of employees) {
    const name = emp.departmentName || 'Unassigned';
    const entry = deptMap.get(name) ?? { name, count: 0, present: 0 };
    entry.count += 1;
    if (onSiteToday.has(emp.id)) entry.present += 1;
    deptMap.set(name, entry);
  }
  const deptStats = Array.from(deptMap.values())
    .map((d) => ({ ...d, rate: d.count > 0 ? Math.round((d.present / d.count) * 100) : 0 }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Operations & Attendance Overview"
        subtitle="Real-time multi-facility attendance tracking, biometric exceptions, and offline queue status"
        actions={
          <Link
            href="/admin/attendance"
            className="px-4 py-2 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-xs font-bold transition shadow-card flex items-center gap-1.5"
          >
            <span>Attendance Register</span>
            <ArrowRight className="w-3.5 h-3.5 text-brand-mint" />
          </Link>
        }
      />

      {loadError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl px-4 py-3 text-xs font-semibold">
          Could not load dashboard data: {loadError}
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
        <StatCard
          title="Total Staff"
          value={totalEmployees}
          icon={Users}
          subtitle={`Across ${facilityCount} ${facilityCount === 1 ? 'facility' : 'facilities'}`}
          variant="default"
        />

        <StatCard
          title="Present Today"
          value={presentToday}
          icon={UserCheck}
          subtitle={`${activeRate}% active rate`}
          variant="success"
        />

        <StatCard
          title="Late Arrivals"
          value={lateToday}
          icon={Clock}
          subtitle="Past grace period"
          variant="warning"
        />

        <StatCard
          title="Absent"
          value={absentToday}
          icon={UserX}
          subtitle="Unlogged / Leave"
          variant="danger"
        />

        <StatCard
          title="Offline Queue"
          value={pendingCount}
          icon={WifiOff}
          subtitle="Awaiting sync"
          variant="warning"
        />

        <StatCard
          title="Exceptions"
          value={exceptionsCount}
          icon={AlertTriangle}
          subtitle="Requires attention"
          variant="danger"
        />
      </div>

      {/* Two Column Layout: Attendance Trends & Verification Exceptions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Trends by Department (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-brand-border-subtle shadow-card space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-brand-primary">Attendance Distribution</h3>
              <p className="text-xs text-brand-muted">On-site attendance rate by department</p>
            </div>
            <span className="text-xs font-semibold text-brand-secondary flex items-center gap-1">
              <TrendingUp className="w-4 h-4" />
              <span>Today’s Cohort</span>
            </span>
          </div>

          <div className="space-y-4 pt-1">
            {deptStats.length === 0 && (
              <p className="text-xs text-brand-muted">No employees yet. Add staff to see department attendance.</p>
            )}
            {deptStats.map((dept) => (
              <div key={dept.name} className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-brand-charcoal">{dept.name}</span>
                  <span className="text-brand-muted font-medium">
                    {dept.present} of {dept.count} on-site ({dept.rate}%)
                  </span>
                </div>
                <div className="w-full h-3 rounded-full bg-brand-ivory border border-brand-border-subtle overflow-hidden flex">
                  <div
                    className="h-full bg-brand-secondary rounded-full transition-all duration-500"
                    style={{ width: `${dept.rate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-brand-border-subtle flex flex-wrap items-center justify-between gap-3 text-xs text-brand-muted">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-brand-secondary" />
                <span>Verified Present</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-brand-ivory border border-brand-border-subtle" />
                <span>Absent / Unlogged</span>
              </div>
            </div>

            <Link href="/admin/reports" className="text-brand-secondary font-semibold hover:underline">
              View Detailed Analytics &rarr;
            </Link>
          </div>
        </div>

        {/* Verification Exceptions Requiring Attention (1 col) */}
        <div className="bg-white rounded-3xl p-6 border border-brand-border-subtle shadow-card flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-brand-primary flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-brand-danger" />
                <span>Verification Exceptions</span>
              </h3>
              <span className="text-xs bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-full">
                {exceptionsCount}
              </span>
            </div>

            <p className="text-xs text-brand-muted">
              Attendance events flagged for biometric or perimeter irregularities
            </p>

            <div className="divide-y divide-brand-border-subtle/70 pt-2">
              {exceptions.length === 0 && (
                <p className="py-2.5 text-[11px] text-brand-muted">No flagged attendance events.</p>
              )}
              {exceptions.slice(0, 3).map((r) => (
                <div key={r.id} className="py-2.5 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-brand-primary">{r.employeeName}</span>
                    {r.status === 'rejected' ? (
                      <span className="text-[10px] text-brand-danger font-bold uppercase">Rejected</span>
                    ) : (
                      <span className="text-[10px] text-indigo-700 font-bold uppercase">Review Needed</span>
                    )}
                  </div>
                  <p className="text-[11px] text-brand-muted">
                    {r.verificationDetails?.message || r.notes || `${r.facilityName} on ${formatDate(r.date)}`}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-brand-border-subtle">
            <Link
              href="/admin/offline-records"
              className="w-full py-2 bg-brand-ivory hover:bg-brand-border-subtle text-brand-charcoal rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition border border-brand-border"
            >
              <span>Review Exception Queue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Attendance Activity Feed Table */}
      <div className="bg-white rounded-3xl border border-brand-border-subtle shadow-card overflow-hidden">
        <div className="p-5 border-b border-brand-border-subtle flex items-center justify-between bg-brand-ivory/50">
          <div>
            <h3 className="font-bold text-sm text-brand-primary">Live Attendance Activity Feed</h3>
            <p className="text-xs text-brand-muted">Recent check-in and departure events recorded across all facilities</p>
          </div>
          <Link
            href="/admin/attendance"
            className="text-xs font-semibold text-brand-secondary hover:underline flex items-center gap-1"
          >
            <span>Open Register</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-brand-border-subtle bg-brand-ivory text-brand-muted font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Facility</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Check In</th>
                <th className="py-3 px-4">Check Out</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Sync</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border-subtle/70">
              {records.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 px-4 text-center text-brand-muted">
                    No attendance recorded yet.
                  </td>
                </tr>
              )}
              {records.slice(0, 6).map((r) => (
                <tr key={r.id} className="hover:bg-brand-ivory/50">
                  <td className="py-3 px-4 font-bold text-brand-primary">{r.employeeName}</td>
                  <td className="py-3 px-4 text-brand-muted">{r.facilityName.split(' - ')[0]}</td>
                  <td className="py-3 px-4 text-brand-charcoal">{formatDate(r.date)}</td>
                  <td className="py-3 px-4 font-semibold text-brand-primary">{formatTime(r.checkInTime)}</td>
                  <td className="py-3 px-4 text-brand-muted">{formatTime(r.checkOutTime)}</td>
                  <td className="py-3 px-4">
                    <AttendanceStatusBadge status={r.status} size="sm" />
                  </td>
                  <td className="py-3 px-4">
                    <SyncStatusBadge status={r.syncStatus} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
