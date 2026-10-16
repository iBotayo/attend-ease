'use client';

import React, { useState } from 'react';
import { AttendanceRecord } from '@/types/attendance';
import { useAuth } from '@/context/AuthContext';
import { attendanceService } from '@/services/attendance.service';
import { X, Edit3, ShieldAlert, History } from 'lucide-react';
import { formatDateTime } from '@/lib/utils/formatters';

interface AttendanceCorrectionModalProps {
  record: AttendanceRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: (updated: AttendanceRecord) => void;
}

export function AttendanceCorrectionModal({
  record,
  isOpen,
  onClose,
  onUpdated,
}: AttendanceCorrectionModalProps) {
  const { user } = useAuth();
  const [correctedTime, setCorrectedTime] = useState(
    record?.checkInTime ? new Date(record.checkInTime).toISOString().slice(0, 16) : ''
  );
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !record) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Please provide a mandatory justification reason for the administrative correction.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const isoTime = new Date(correctedTime).toISOString();
      const updated = await attendanceService.correctAttendance(record.id, {
        correctedTime: isoTime,
        reason: reason.trim(),
        approvedBy: user?.employeeId || 'ADMIN',
        approvedByName: user?.name || 'Administrator',
        notes: notes.trim() || undefined,
      });

      if (updated) {
        onUpdated(updated);
        onClose();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Correction failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-primary/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-modal border border-brand-border max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-brand-border-subtle bg-brand-ivory flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-brand-primary/10 text-brand-primary">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-brand-primary">Authorize Attendance Correction</h2>
              <p className="text-xs text-brand-muted">
                {record.employeeName} ({record.employeeCode}) • {record.date}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-brand-muted hover:text-brand-charcoal rounded-lg hover:bg-black/5"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium">
              {error}
            </div>
          )}

          {/* Original Values */}
          <div className="p-3 bg-brand-ivory rounded-xl border border-brand-border-subtle text-xs space-y-1">
            <span className="font-semibold text-brand-charcoal">Original Recorded Arrival:</span>
            <p className="text-brand-muted">
              {record.checkInTime ? formatDateTime(record.checkInTime) : 'No check-in timestamp recorded (Marked Absent)'}
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-brand-charcoal uppercase tracking-wider mb-1.5">
              Corrected Arrival Timestamp *
            </label>
            <input
              type="datetime-local"
              required
              value={correctedTime}
              onChange={(e) => setCorrectedTime(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-brand-border focus:border-brand-secondary focus:ring-1 focus:ring-brand-secondary outline-none transition bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-brand-charcoal uppercase tracking-wider mb-1.5">
              Reason for Correction *
            </label>
            <textarea
              required
              rows={3}
              placeholder="e.g. Approved supervisor override: Badge reader malfunction verified with security log #V-102"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-brand-border focus:border-brand-secondary focus:ring-1 focus:ring-brand-secondary outline-none transition bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-brand-charcoal uppercase tracking-wider mb-1.5">
              Audit Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="Internal ticket or incident reference"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-brand-border focus:border-brand-secondary focus:ring-1 focus:ring-brand-secondary outline-none transition bg-white"
            />
          </div>

          {/* Audit History Placeholder */}
          {record.correctionHistory && record.correctionHistory.length > 0 && (
            <div className="pt-2">
              <h3 className="text-xs font-bold text-brand-primary flex items-center gap-1.5 mb-2">
                <History className="w-3.5 h-3.5 text-brand-secondary" />
                <span>Previous Correction History</span>
              </h3>
              <div className="space-y-2">
                {record.correctionHistory.map((h, i) => (
                  <div key={i} className="p-2.5 bg-brand-ivory rounded-lg text-[11px] text-brand-muted border border-brand-border-subtle">
                    <div className="font-semibold text-brand-charcoal">
                      Corrected by {h.approvedByName} ({h.approvedBy}) at {formatDateTime(h.appliedAt)}
                    </div>
                    <div>Reason: {h.reason}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <span>
              All administrative corrections create an immutable audit log entry documenting your actor ID and reason.
            </span>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-brand-charcoal hover:bg-black/5 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-xs font-bold transition shadow-subtle disabled:opacity-50"
            >
              {isSubmitting ? 'Applying Correction...' : 'Apply Correction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
