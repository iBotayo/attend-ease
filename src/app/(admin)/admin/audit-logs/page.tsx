'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { LoadingState } from '@/components/EmptyState';
import { auditService, AuditLogFilters } from '@/services/audit.service';
import { AuditLog, AuditAction, AuditOutcome } from '@/types/audit';
import { formatDateTime } from '@/lib/utils/formatters';
import {
  ShieldAlert,
  Download,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  Filter,
} from 'lucide-react';

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<AuditAction | 'all'>('all');
  const [outcomeFilter, setOutcomeFilter] = useState<AuditOutcome | 'all'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const filters: AuditLogFilters = {
        action: actionFilter,
        outcome: outcomeFilter,
        search: search || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      };
      const data = await auditService.getAuditLogs(filters);
      setLogs(data);
    } finally {
      setIsLoading(false);
    }
  }, [actionFilter, outcomeFilter, search, startDate, endDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleExport = () => {
    auditService.exportToCsv(logs);
    setToastMessage(`Exported ${logs.length} audit entries to CSV.`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleResetFilters = () => {
    setSearch('');
    setActionFilter('all');
    setOutcomeFilter('all');
    setStartDate('');
    setEndDate('');
  };

  const successCount = logs.filter((l) => l.outcome === 'success').length;
  const warningCount = logs.filter((l) => l.outcome === 'warning').length;
  const failureCount = logs.filter((l) => l.outcome === 'failure').length;

  const getOutcomeBadge = (outcome: AuditOutcome) => {
    switch (outcome) {
      case 'success':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            SUCCESS
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200">
            <AlertTriangle className="w-3 h-3 text-amber-700" />
            WARNING
          </span>
        );
      case 'failure':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-600" />
            FAILURE
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs & Compliance Ledger"
        subtitle="Immutable security trail of administrative overrides, facility policy adjustments, and system events"
        actions={
          <button
            onClick={handleExport}
            disabled={logs.length === 0}
            className="px-4 py-2 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-xs font-bold transition shadow-card flex items-center gap-1.5 disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-brand-mint" />
            <span>Export Audit Trail</span>
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
          title="Total Events"
          value={logs.length}
          icon={FileText}
          subtitle="Matching query filters"
          variant="default"
        />
        <StatCard
          title="Successful Operations"
          value={successCount}
          icon={CheckCircle2}
          subtitle="Verified executions"
          variant="success"
        />
        <StatCard
          title="Warnings & Flags"
          value={warningCount}
          icon={AlertTriangle}
          subtitle="Supervisory notifications"
          variant={warningCount > 0 ? 'warning' : 'default'}
        />
        <StatCard
          title="Security Alerts"
          value={failureCount}
          icon={ShieldAlert}
          subtitle="Failed authorization attempts"
          variant={failureCount > 0 ? 'danger' : 'default'}
        />
      </div>

      {/* Query Filter Controls */}
      <div className="bg-white rounded-2xl p-4 border border-brand-border-subtle shadow-card space-y-3 text-xs">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 text-brand-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search actor, action, or details..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-brand-border bg-white text-brand-charcoal text-xs outline-none focus:border-brand-secondary"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value as typeof actionFilter)}
              className="px-3 py-2 rounded-xl border border-brand-border bg-white text-brand-charcoal outline-none font-medium text-xs capitalize"
            >
              <option value="all">All Action Categories</option>
              <option value="user_login">User Login</option>
              <option value="attendance_correction">Attendance Correction</option>
              <option value="offline_records_synced">Offline Sync</option>
              <option value="employee_created">Employee Created</option>
              <option value="employee_updated">Employee Updated</option>
              <option value="employee_status_changed">Employee Status</option>
              <option value="facility_created">Facility Created</option>
              <option value="facility_updated">Facility Updated</option>
              <option value="device_revoked">Device Revoked</option>
              <option value="policy_updated">Policy Updated</option>
            </select>

            <select
              value={outcomeFilter}
              onChange={(e) => setOutcomeFilter(e.target.value as typeof outcomeFilter)}
              className="px-3 py-2 rounded-xl border border-brand-border bg-white text-brand-charcoal outline-none font-medium text-xs capitalize"
            >
              <option value="all">All Outcomes</option>
              <option value="success">Success</option>
              <option value="warning">Warning</option>
              <option value="failure">Failure</option>
            </select>

            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 rounded-xl border border-brand-border bg-white text-brand-charcoal outline-none font-mono text-xs"
              title="Start Date"
            />

            {(search || actionFilter !== 'all' || outcomeFilter !== 'all' || startDate || endDate) && (
              <button
                onClick={handleResetFilters}
                className="text-xs font-semibold text-brand-secondary hover:underline px-2"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      {isLoading ? (
        <LoadingState message="Loading compliance audit trail..." />
      ) : logs.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-brand-border-subtle shadow-card space-y-2">
          <ShieldAlert className="w-12 h-12 text-brand-muted mx-auto opacity-40" />
          <h3 className="font-bold text-sm text-brand-primary">No Audit Logs Found</h3>
          <p className="text-xs text-brand-muted">No security events match the selected criteria.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-brand-border-subtle shadow-card overflow-hidden">
          <div className="p-5 border-b border-brand-border-subtle bg-brand-ivory/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-brand-secondary" />
              <h3 className="font-bold text-sm text-brand-primary">Immutable Activity Records</h3>
            </div>
            <span className="text-xs font-mono text-brand-muted">
              {logs.length} Ledger Entries
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-brand-border-subtle bg-brand-ivory text-brand-muted font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Action Event</th>
                  <th className="py-3 px-4">Target Resource</th>
                  <th className="py-3 px-4">Operation Details</th>
                  <th className="py-3 px-4">IP Address</th>
                  <th className="py-3 px-4 text-right">Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border-subtle/70">
                {logs.map((l) => (
                  <tr key={l.id} className="hover:bg-brand-ivory/50 transition-colors">
                    <td className="py-3 px-4 font-mono text-brand-charcoal text-[11px] whitespace-nowrap">
                      {formatDateTime(l.timestamp)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-brand-primary">{l.actorName}</div>
                      <div className="text-[10px] text-brand-muted font-mono">{l.actorRole} ({l.actorId})</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-brand-ivory border border-brand-border-subtle text-brand-charcoal uppercase">
                        {l.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-brand-charcoal">
                      {l.affectedResource}
                    </td>
                    <td className="py-3 px-4 text-brand-muted max-w-xs truncate" title={l.details}>
                      {l.details}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-brand-muted">
                      {l.ipAddress || '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {getOutcomeBadge(l.outcome)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
