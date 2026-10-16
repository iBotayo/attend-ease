'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { AttendanceTable } from '@/components/AttendanceTable';
import { LoadingState } from '@/components/EmptyState';
import { attendanceService } from '@/services/attendance.service';
import { facilityService } from '@/services/facility.service';
import { employeeService } from '@/services/employee.service';
import { reportService } from '@/services/report.service';
import { AttendanceRecord } from '@/types/attendance';
import { Facility } from '@/types/facility';
import { Department } from '@/types/user';
import {
  Download,
  UserCheck,
  Clock,
  AlertTriangle,
  Users,
  CheckCircle2,
  Filter,
} from 'lucide-react';

export default function AdminAttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [selectedFacility, setSelectedFacility] = useState('all');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedDate, setSelectedDate] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [allRecords, facList, deptList] = await Promise.all([
        attendanceService.getAllAttendance(),
        facilityService.getFacilities(),
        employeeService.getDepartments(),
      ]);
      setRecords(allRecords);
      setFacilities(facList);
      setDepartments(deptList);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRecordUpdated = (updated: AttendanceRecord) => {
    setRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    setToastMessage(`Attendance record #${updated.id} successfully updated with administrative override.`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const filteredRecords = records.filter((r) => {
    if (selectedFacility !== 'all' && r.facilityId !== selectedFacility) return false;
    if (selectedDepartment !== 'all' && r.departmentId !== selectedDepartment) return false;
    if (selectedStatus !== 'all' && r.status !== selectedStatus) return false;
    if (selectedDate && r.date !== selectedDate) return false;
    return true;
  });

  const handleExportCsv = () => {
    reportService.exportToCsv(filteredRecords, 'attendance_register');
    setToastMessage(`Exported ${filteredRecords.length} attendance records to CSV.`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Quick stats computed on filteredRecords
  const totalCount = filteredRecords.length;
  const presentCount = filteredRecords.filter((r) => r.status === 'present').length;
  const lateCount = filteredRecords.filter((r) => r.status === 'late').length;
  const reviewCount = filteredRecords.filter(
    (r) => r.syncStatus === 'review_required' || r.status === 'rejected'
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance Register"
        subtitle="Facility-wide arrival and departure logs, biometric verification data, and supervisor correction ledger"
        actions={
          <button
            onClick={handleExportCsv}
            disabled={filteredRecords.length === 0}
            className="px-4 py-2 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-xs font-bold transition shadow-card flex items-center gap-1.5 disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-brand-mint" />
            <span>Export CSV</span>
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
          title="Total In Filter"
          value={totalCount}
          icon={Users}
          subtitle="Matching attendance logs"
          variant="default"
        />
        <StatCard
          title="Verified Present"
          value={presentCount}
          icon={UserCheck}
          subtitle={`${totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0}% compliance rate`}
          variant="success"
        />
        <StatCard
          title="Late Arrivals"
          value={lateCount}
          icon={Clock}
          subtitle="Past shift grace limit"
          variant="warning"
        />
        <StatCard
          title="Review Required"
          value={reviewCount}
          icon={AlertTriangle}
          subtitle="Flagged verification events"
          variant={reviewCount > 0 ? 'danger' : 'default'}
        />
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-2xl p-4 border border-brand-border-subtle shadow-card flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-brand-secondary" />
          <span className="font-bold text-brand-primary">Filter Register:</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Facility Filter */}
          <div>
            <select
              value={selectedFacility}
              onChange={(e) => setSelectedFacility(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-brand-border bg-white text-brand-charcoal outline-none font-medium text-xs"
            >
              <option value="all">All Facilities</option>
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name.split(' - ')[0]}
                </option>
              ))}
            </select>
          </div>

          {/* Department Filter */}
          <div>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-brand-border bg-white text-brand-charcoal outline-none font-medium text-xs"
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-brand-border bg-white text-brand-charcoal outline-none font-medium text-xs capitalize"
            >
              <option value="all">All Statuses</option>
              <option value="present">Present</option>
              <option value="late">Late</option>
              <option value="absent">Absent</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Date Picker */}
          <div>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-brand-border bg-white text-brand-charcoal outline-none font-mono text-xs"
              placeholder="Filter by date"
            />
          </div>

          {(selectedFacility !== 'all' ||
            selectedDepartment !== 'all' ||
            selectedStatus !== 'all' ||
            selectedDate) && (
            <button
              onClick={() => {
                setSelectedFacility('all');
                setSelectedDepartment('all');
                setSelectedStatus('all');
                setSelectedDate('');
              }}
              className="text-xs font-semibold text-brand-secondary hover:underline px-2"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Attendance Table with built-in search, pagination, and modal for corrections */}
      {isLoading ? (
        <LoadingState message="Loading attendance register logs..." />
      ) : (
        <AttendanceTable
          records={filteredRecords}
          canEdit={true}
          onRecordUpdated={handleRecordUpdated}
        />
      )}
    </div>
  );
}
