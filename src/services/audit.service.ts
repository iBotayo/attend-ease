import { AuditLog, AuditAction, AuditOutcome } from '@/types/audit';
import { mockStore } from '@/mocks';
import { generateCsv, downloadCsv } from '@/lib/utils/csv';
import { formatDateTime } from '@/lib/utils/formatters';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';

const IS_MOCK_ENABLED = process.env.NEXT_PUBLIC_ENABLE_MOCK_API !== 'false';

export interface AuditLogFilters {
  action?: AuditAction | 'all';
  outcome?: AuditOutcome | 'all';
  search?: string;
  startDate?: string;
  endDate?: string;
}

class AuditService {
  async getAuditLogs(filters?: AuditLogFilters): Promise<AuditLog[]> {
    if (!IS_MOCK_ENABLED) {
      return apiClient.get<AuditLog[]>(
        API_ENDPOINTS.AUDIT.LIST,
        filters as Record<string, string | number | boolean | undefined>
      );
    }

    let logs = mockStore.getAuditLogs();

    if (filters?.search) {
      const q = filters.search.toLowerCase();
      logs = logs.filter(
        (l) =>
          l.actorName.toLowerCase().includes(q) ||
          l.actorRole.toLowerCase().includes(q) ||
          l.affectedResource.toLowerCase().includes(q) ||
          l.details.toLowerCase().includes(q) ||
          l.action.toLowerCase().includes(q)
      );
    }

    if (filters?.action && filters.action !== 'all') {
      logs = logs.filter((l) => l.action === filters.action);
    }

    if (filters?.outcome && filters.outcome !== 'all') {
      logs = logs.filter((l) => l.outcome === filters.outcome);
    }

    if (filters?.startDate) {
      logs = logs.filter((l) => l.timestamp >= filters.startDate!);
    }

    if (filters?.endDate) {
      logs = logs.filter((l) => l.timestamp <= filters.endDate!);
    }

    return logs;
  }

  /**
   * Records an audit log entry.
   * Note: Client-emitted audit records are non-authoritative client telemetry.
   * True immutable audit trails are recorded and cryptographically sequenced server-side in the backend.
   */
  async logAction(entry: Omit<AuditLog, 'id' | 'timestamp'>): Promise<AuditLog> {
    if (!IS_MOCK_ENABLED) {
      return apiClient.post<AuditLog>(API_ENDPOINTS.AUDIT.LIST, entry);
    }
    return mockStore.addAuditLog(entry);
  }

  exportToCsv(logs: AuditLog[]): void {
    const columns = [
      { header: 'Timestamp', key: (l: AuditLog) => formatDateTime(l.timestamp) },
      { header: 'Actor Name', key: (l: AuditLog) => l.actorName },
      { header: 'Actor ID', key: (l: AuditLog) => l.actorId },
      { header: 'Role', key: (l: AuditLog) => l.actorRole },
      { header: 'Action', key: (l: AuditLog) => l.action },
      { header: 'Affected Resource', key: (l: AuditLog) => l.affectedResource },
      { header: 'Outcome', key: (l: AuditLog) => l.outcome.toUpperCase() },
      { header: 'Details', key: (l: AuditLog) => l.details },
    ];

    const csvData = generateCsv(columns, logs);
    const dateStr = new Date().toISOString().split('T')[0];
    downloadCsv(`audit_logs_${dateStr}.csv`, csvData);
  }
}

export const auditService = new AuditService();
