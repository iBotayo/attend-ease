'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { LoadingState } from '@/components/EmptyState';
import { AttendanceStatusBadge } from '@/components/AttendanceStatusBadge';
import { SyncStatusBadge } from '@/components/SyncStatusBadge';
import { reportService, ReportFilterParams, ReportSummaryStats } from '@/services/report.service';
import { facilityService } from '@/services/facility.service';
import { employeeService } from '@/services/employee.service';
import { AttendanceRecord } from '@/types/attendance';
import { Facility } from '@/types/facility';
import { Department } from '@/types/user';
import { formatDate, formatTime } from '@/lib/utils/formatters';
import {
  BarChart3,
  Download,
  Filter,
  CheckCircle2,
  TrendingUp,
  Clock,
  Search,
  CheckCircle,
} from 'lucide-react';

export default function AdminReportsPage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<ReportSummaryStats>({
    totalRecords: 0,
    presentCount: 0,
    lateCount: 0,
    absentCount: 0,
    reviewRequiredCount: 0,
    attendanceRatePercent: 0,
    onTimeRatePercent: 0,
  });
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter params
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [facilityId, setFacilityId] = useState('all');
  const [departmentId, setDepartmentId] = useState('all');
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const filters: ReportFilterParams = {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        facilityId: facilityId !== 'all' ? facilityId : undefined,
        departmentId: departmentId !== 'all' ? departmentId : undefined,
        status: status !== 'all' ? status : undefined,
      };

      const [reportResult, facList, deptList] = await Promise.all([
        reportService.getReportData(filters),
        facilityService.getFacilities(),
        employeeService.getDepartments(),
      ]);

      setRecords(reportResult.records);
      setSummary(reportResult.summary);
      setFacilities(facList);
      setDepartments(deptList);
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, facilityId, departmentId, status]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleExport = () => {
    reportService.exportToCsv(records, 'attendance_executive_report');
    setToastMessage(`Exported ${records.length} records to spreadsheet.`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleReset = () => {
    setStartDate('');
    setEndDate('');
    setFacilityId('all');
    setDepartmentId('all');
    setStatus('all');
    setSearch('');
  };

  const filteredRecords = records.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.employeeName.toLowerCase().includes(q) ||
      r.employeeCode.toLowerCase().includes(q) ||
      r.departmentName.toLowerCase().includes(q) ||
      r.facilityName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Attendance Analytics"
        subtitle="Generate executive compliance summaries, filter operational trends, and export CSV attendance ledgers"
        actions={
          <button
            onClick={handleExport}
            disabled={records.length === 0}
            className="px-4 py-2 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-xs font-bold transition shadow-card flex items-center gap-1.5 disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-brand-mint" />
            <span>Download CSV Report</span>
          </button>
        }
      />

      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Attendance Rate"
          value={`${summary.attendanceRatePercent}%`}
          icon={TrendingUp}
          subtitle={`${summary.presentCount + summary.lateCount} of ${summary.totalRecords} active`}
          variant="success"
        />
        <StatCard
          title="Punctuality Rate"
          value={`${summary.onTimeRatePercent}%`}
          icon={CheckCircle}
          subtitle="Arrived within grace window"
          variant="default"
        />
        <StatCard
          title="Late Arrivals"
          value={summary.lateCount}
          icon={Clock}
          subtitle="Exceeded shift grace window"
          variant="warning"
        />
        <StatCard
          title="Flagged Exceptions"
          value={summary.reviewRequiredCount}
          icon={BarChart3}
          subtitle="Offline/boundary exceptions"
          variant={summary.reviewRequiredCount > 0 ? 'danger' : 'default'}
        />
      </div>

      {/* Multi-Dimensional Filter Card */}
      <div className="bg-white rounded-2xl p-5 border border-brand-border-subtle shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-xs uppercase tracking-wider text-brand-charcoal flex items-center gap-2">
            <Filter className="w-4 h-4 text-brand-secondary" />
            <span>Query Filters & Parameters</span>
          </h3>
          <button
            onClick={handleReset}
            className="text-xs text-brand-secondary hover:underline font-semibold"
          >
            Reset All
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-brand-muted mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-brand-border bg-white text-brand-charcoal outline-none font-mono text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-brand-muted mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-brand-border bg-white text-brand-charcoal outline-none font-mono text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-brand-muted mb-1">
              Facility Site
            </label>
            <select
              value={facilityId}
              onChange={(e) => setFacilityId(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-brand-border bg-white text-brand-charcoal outline-none font-medium text-xs"
            >
              <option value="all">All Facilities</option>
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name.split(' - ')[0]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-brand-muted mb-1">
              Department
            </label>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-brand-border bg-white text-brand-charcoal outline-none font-medium text-xs"
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-brand-muted mb-1">
              Attendance Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-brand-border bg-white text-brand-charcoal outline-none font-medium text-xs capitalize"
            >
              <option value="all">All Statuses</option>
              <option value="present">Present</option>
              <option value="late">Late</option>
              <option value="absent">Absent</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Compliance Visual Breakdown Progress Bar */}
      <div className="bg-white rounded-3xl p-6 border border-brand-border-subtle shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-brand-primary">Attendance Distribution Breakdown</h3>
            <p className="text-xs text-brand-muted">Proportional breakdown of filtered logs</p>
          </div>
          <span className="text-xs font-semibold text-brand-charcoal">
            {summary.totalRecords} Total Logged Events
          </span>
        </div>

        {summary.totalRecords > 0 ? (
          <div className="space-y-3">
            <div className="w-full h-4 rounded-full bg-brand-ivory overflow-hidden flex shadow-inner">
              <div
                style={{ width: `${(summary.presentCount / summary.totalRecords) * 100}%` }}
                className="bg-brand-secondary h-full transition-all duration-500"
                title={`Present: ${summary.presentCount}`}
              />
              <div
                style={{ width: `${(summary.lateCount / summary.totalRecords) * 100}%` }}
                className="bg-brand-warning h-full transition-all duration-500"
                title={`Late: ${summary.lateCount}`}
              />
              <div
                style={{ width: `${(summary.absentCount / summary.totalRecords) * 100}%` }}
                className="bg-brand-danger h-full transition-all duration-500"
                title={`Absent: ${summary.absentCount}`}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between text-xs pt-1">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-brand-secondary" />
                  <span className="font-semibold text-brand-charcoal">
                    On-Time ({summary.presentCount})
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-brand-warning" />
                  <span className="font-semibold text-brand-charcoal">
                    Late ({summary.lateCount})
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-brand-danger" />
                  <span className="font-semibold text-brand-charcoal">
                    Absent ({summary.absentCount})
                  </span>
                </div>
              </div>

              <div className="text-brand-muted text-[11px]">
                Safe CSV formula sanitation applied on export
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-brand-muted py-2">No data available for the chosen parameters.</p>
        )}
      </div>

      {/* Report Records Table */}
      {isLoading ? (
        <LoadingState message="Generating attendance report..." />
      ) : (
        <div className="bg-white rounded-3xl border border-brand-border-subtle shadow-card overflow-hidden">
          <div className="p-5 border-b border-brand-border-subtle bg-brand-ivory/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm text-brand-primary">Report Data Records</h3>
              <p className="text-xs text-brand-muted">
                Showing {filteredRecords.length} records matching current criteria
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-brand-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search report table..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-brand-border bg-white text-brand-charcoal outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-brand-border-subtle bg-brand-ivory text-brand-muted font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Facility Campus</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Check-In</th>
                  <th className="py-3 px-4">Check-Out</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Verification</th>
                  <th className="py-3 px-4">Sync</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border-subtle/70">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-brand-muted">
                      No records match the report criteria.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((r) => (
                    <tr key={r.id} className="hover:bg-brand-ivory/50">
                      <td className="py-3 px-4">
                        <div className="font-bold text-brand-primary">{r.employeeName}</div>
                        <div className="text-[10px] text-brand-muted font-mono">{r.employeeCode}</div>
                      </td>
                      <td className="py-3 px-4 text-brand-charcoal">{r.departmentName}</td>
                      <td className="py-3 px-4 text-brand-muted">{r.facilityName.split(' - ')[0]}</td>
                      <td className="py-3 px-4 text-brand-charcoal font-medium">{formatDate(r.date)}</td>
                      <td className="py-3 px-4 font-semibold text-brand-primary font-mono">{formatTime(r.checkInTime)}</td>
                      <td className="py-3 px-4 text-brand-muted font-mono">{formatTime(r.checkOutTime)}</td>
                      <td className="py-3 px-4">
                        <AttendanceStatusBadge status={r.status} size="sm" />
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] font-mono uppercase bg-brand-ivory px-2 py-0.5 rounded border border-brand-border-subtle text-brand-muted">
                          {r.verificationMode}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <SyncStatusBadge status={r.syncStatus} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
