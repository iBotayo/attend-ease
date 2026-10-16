'use client';

import React, { useState } from 'react';
import { AttendanceRecord } from '@/types/attendance';
import { AttendanceStatusBadge } from './AttendanceStatusBadge';
import { SyncStatusBadge } from './SyncStatusBadge';
import { AttendanceCorrectionModal } from './AttendanceCorrectionModal';
import { formatDate, formatTime, formatDuration } from '@/lib/utils/formatters';
import {
  Search,
  Eye,
  Edit,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface AttendanceTableProps {
  records: AttendanceRecord[];
  onRecordUpdated?: (updated: AttendanceRecord) => void;
  canEdit?: boolean;
}

export function AttendanceTable({
  records,
  onRecordUpdated,
  canEdit = true,
}: AttendanceTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [facilityFilter, setFacilityFilter] = useState('all');
  const [selectedRecordForDetail, setSelectedRecordForDetail] = useState<AttendanceRecord | null>(null);
  const [selectedRecordForEdit, setSelectedRecordForEdit] = useState<AttendanceRecord | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Filter records
  const filtered = records.filter((r) => {
    const matchesSearch =
      r.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.facilityName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchesFacility = facilityFilter === 'all' || r.facilityId === facilityFilter;

    return matchesSearch && matchesStatus && matchesFacility;
  });

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Distinct facilities for dropdown
  const facilities = Array.from(new Set(records.map((r) => JSON.stringify({ id: r.facilityId, name: r.facilityName }))))
    .map((str) => JSON.parse(str) as { id: string; name: string });

  return (
    <div className="bg-white rounded-2xl border border-brand-border-subtle shadow-card overflow-hidden">
      {/* Table Toolbar */}
      <div className="p-4 sm:p-5 border-b border-brand-border-subtle flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-brand-ivory/50">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-brand-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search employee, ID, or facility..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-brand-border focus:border-brand-secondary focus:ring-1 focus:ring-brand-secondary outline-none transition bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 text-xs rounded-xl border border-brand-border bg-white text-brand-charcoal outline-none focus:border-brand-secondary font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="present">Present</option>
            <option value="late">Late Arrival</option>
            <option value="absent">Absent</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
          </select>

          {/* Facility filter */}
          <select
            value={facilityFilter}
            onChange={(e) => {
              setFacilityFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 text-xs rounded-xl border border-brand-border bg-white text-brand-charcoal outline-none focus:border-brand-secondary font-medium"
          >
            <option value="all">All Facilities</option>
            {facilities.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name.split(' - ')[0]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-brand-border-subtle bg-brand-ivory text-brand-muted font-bold uppercase tracking-wider text-[11px]">
              <th className="py-3.5 px-4">Employee</th>
              <th className="py-3.5 px-4">Date</th>
              <th className="py-3.5 px-4">Check In</th>
              <th className="py-3.5 px-4">Check Out</th>
              <th className="py-3.5 px-4">Duration</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4">Facility</th>
              <th className="py-3.5 px-4">Verification</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-border-subtle/70">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-brand-muted font-medium">
                  No attendance records matched the search criteria.
                </td>
              </tr>
            ) : (
              paginated.map((row) => (
                <tr key={row.id} className="hover:bg-brand-ivory/60 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-brand-primary">{row.employeeName}</div>
                    <div className="text-[11px] text-brand-muted font-mono">{row.employeeCode}</div>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-brand-charcoal">{formatDate(row.date)}</td>
                  <td className="py-3.5 px-4 font-semibold text-brand-primary">{formatTime(row.checkInTime)}</td>
                  <td className="py-3.5 px-4 text-brand-muted">{formatTime(row.checkOutTime)}</td>
                  <td className="py-3.5 px-4 text-brand-muted">{formatDuration(row.checkInTime, row.checkOutTime)}</td>
                  <td className="py-3.5 px-4">
                    <AttendanceStatusBadge status={row.status} size="sm" />
                  </td>
                  <td className="py-3.5 px-4 text-brand-muted truncate max-w-[150px]" title={row.facilityName}>
                    {row.facilityName.split(' - ')[0]}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex flex-col gap-1 items-start">
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-brand-ivory border border-brand-border-subtle text-brand-muted">
                        {row.verificationMode}
                      </span>
                      {row.syncStatus !== 'synced' && <SyncStatusBadge status={row.syncStatus} />}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-1">
                    <button
                      onClick={() => setSelectedRecordForDetail(row)}
                      className="p-1.5 text-brand-muted hover:text-brand-primary rounded-lg hover:bg-black/5 transition"
                      title="View Verification Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {canEdit && (
                      <button
                        onClick={() => setSelectedRecordForEdit(row)}
                        className="p-1.5 text-brand-muted hover:text-brand-secondary rounded-lg hover:bg-black/5 transition"
                        title="Authorize Correction"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View (Narrow Screens) */}
      <div className="md:hidden divide-y divide-brand-border-subtle">
        {paginated.length === 0 ? (
          <div className="py-8 text-center text-brand-muted text-xs">
            No attendance records found.
          </div>
        ) : (
          paginated.map((row) => (
            <div key={row.id} className="p-4 space-y-2.5">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-sm text-brand-primary">{row.employeeName}</h4>
                  <p className="text-[11px] text-brand-muted font-mono">{row.employeeCode} • {formatDate(row.date)}</p>
                </div>
                <AttendanceStatusBadge status={row.status} size="sm" />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div className="bg-brand-ivory p-2 rounded-xl">
                  <span className="text-[10px] text-brand-muted block uppercase font-medium">Check In</span>
                  <span className="font-bold text-brand-primary">{formatTime(row.checkInTime)}</span>
                </div>
                <div className="bg-brand-ivory p-2 rounded-xl">
                  <span className="text-[10px] text-brand-muted block uppercase font-medium">Check Out</span>
                  <span className="font-bold text-brand-charcoal">{formatTime(row.checkOutTime)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 text-xs">
                <span className="text-brand-muted truncate max-w-[180px]">{row.facilityName}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setSelectedRecordForDetail(row)}
                    className="p-1.5 text-brand-muted hover:text-brand-primary"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  {canEdit && (
                    <button
                      onClick={() => setSelectedRecordForEdit(row)}
                      className="p-1.5 text-brand-muted hover:text-brand-secondary"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination Footer */}
      <div className="px-4 py-3 border-t border-brand-border-subtle bg-brand-ivory flex items-center justify-between text-xs text-brand-muted">
        <span>
          Showing {filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{' '}
          {Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} records
        </span>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1 rounded-lg border border-brand-border bg-white text-brand-charcoal disabled:opacity-40 hover:bg-brand-ivory transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-semibold text-brand-charcoal px-2">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1 rounded-lg border border-brand-border bg-white text-brand-charcoal disabled:opacity-40 hover:bg-brand-ivory transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedRecordForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-primary/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-modal border border-brand-border max-w-lg w-full p-6 max-h-[85vh] overflow-y-auto space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-brand-primary">Attendance Record Details</h3>
                <p className="text-xs text-brand-muted">Record #{selectedRecordForDetail.id}</p>
              </div>
              <button
                onClick={() => setSelectedRecordForDetail(null)}
                className="p-1 text-brand-muted hover:text-brand-charcoal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-brand-ivory rounded-xl space-y-1">
                <div className="font-semibold text-brand-charcoal">{selectedRecordForDetail.employeeName}</div>
                <div className="text-brand-muted">{selectedRecordForDetail.employeeCode} • {selectedRecordForDetail.departmentName}</div>
                <div className="text-brand-muted">{selectedRecordForDetail.facilityName}</div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 bg-brand-ivory rounded-xl">
                  <span className="text-brand-muted block text-[10px] uppercase font-bold">Status</span>
                  <AttendanceStatusBadge status={selectedRecordForDetail.status} size="sm" />
                </div>
                <div className="p-2.5 bg-brand-ivory rounded-xl">
                  <span className="text-brand-muted block text-[10px] uppercase font-bold">Sync Status</span>
                  <SyncStatusBadge status={selectedRecordForDetail.syncStatus} />
                </div>
              </div>

              {selectedRecordForDetail.verificationDetails && (
                <div className="p-3 bg-brand-mint/40 rounded-xl border border-brand-mint-dark/20 space-y-1">
                  <span className="font-bold text-brand-mint-dark">Biometric & Facility Verification</span>
                  <p className="text-brand-charcoal text-[11px]">{selectedRecordForDetail.verificationDetails.message}</p>
                  <div className="flex items-center gap-3 pt-1 text-[11px] text-brand-muted">
                    <span>Confidence: {Math.round(selectedRecordForDetail.verificationDetails.score * 100)}%</span>
                    {selectedRecordForDetail.verificationDetails.gpsDistanceMeters !== undefined && (
                      <span>GPS Distance: {selectedRecordForDetail.verificationDetails.gpsDistanceMeters}m</span>
                    )}
                  </div>
                </div>
              )}

              {selectedRecordForDetail.correctionHistory && selectedRecordForDetail.correctionHistory.length > 0 && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-1">
                  <span className="font-bold text-amber-900">Administrative Audit Trail</span>
                  {selectedRecordForDetail.correctionHistory.map((c, i) => (
                    <div key={i} className="text-[11px] text-amber-950 pt-1 border-t border-amber-200/50">
                      <div>Corrected by {c.approvedByName}: &ldquo;{c.reason}&rdquo;</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedRecordForDetail(null)}
                className="px-4 py-2 bg-brand-primary text-white rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Correction Modal */}
      <AttendanceCorrectionModal
        record={selectedRecordForEdit}
        isOpen={!!selectedRecordForEdit}
        onClose={() => setSelectedRecordForEdit(null)}
        onUpdated={(updated) => {
          if (onRecordUpdated) onRecordUpdated(updated);
        }}
      />
    </div>
  );
}
