import { AttendanceRecord } from '@/types/attendance';
import { mockStore } from '@/mocks';
import { generateCsv, downloadCsv } from '@/lib/utils/csv';
import { formatTime } from '@/lib/utils/formatters';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';

const IS_MOCK_ENABLED = process.env.NEXT_PUBLIC_ENABLE_MOCK_API !== 'false';

export interface ReportFilterParams {
  startDate?: string;
  endDate?: string;
  facilityId?: string;
  departmentId?: string;
  status?: string;
}

export interface ReportSummaryStats {
  totalRecords: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  reviewRequiredCount: number;
  attendanceRatePercent: number;
  onTimeRatePercent: number;
}

class ReportService {
  async getReportData(filters: ReportFilterParams): Promise<{
    records: AttendanceRecord[];
    summary: ReportSummaryStats;
  }> {
    if (!IS_MOCK_ENABLED) {
      return apiClient.get<{
        records: AttendanceRecord[];
        summary: ReportSummaryStats;
      }>(API_ENDPOINTS.REPORTS.SUMMARY, filters as Record<string, string | number | boolean | undefined>);
    }

    let records = mockStore.getAttendance();

    if (filters.startDate) {
      records = records.filter((r) => r.date >= filters.startDate!);
    }
    if (filters.endDate) {
      records = records.filter((r) => r.date <= filters.endDate!);
    }
    if (filters.facilityId && filters.facilityId !== 'all') {
      records = records.filter((r) => r.facilityId === filters.facilityId);
    }
    if (filters.departmentId && filters.departmentId !== 'all') {
      records = records.filter((r) => r.departmentId === filters.departmentId);
    }
    if (filters.status && filters.status !== 'all') {
      records = records.filter((r) => r.status === filters.status);
    }

    const totalRecords = records.length;
    const presentCount = records.filter((r) => r.status === 'present').length;
    const lateCount = records.filter((r) => r.status === 'late').length;
    const absentCount = records.filter((r) => r.status === 'absent').length;
    const reviewRequiredCount = records.filter((r) => r.syncStatus === 'review_required').length;

    const attended = presentCount + lateCount;
    const attendanceRatePercent = totalRecords > 0 ? Math.round((attended / totalRecords) * 100) : 0;
    const onTimeRatePercent = attended > 0 ? Math.round((presentCount / attended) * 100) : 0;

    return {
      records,
      summary: {
        totalRecords,
        presentCount,
        lateCount,
        absentCount,
        reviewRequiredCount,
        attendanceRatePercent,
        onTimeRatePercent,
      },
    };
  }

  exportToCsv(records: AttendanceRecord[], filenamePrefix = 'attend_ease_report'): void {
    const columns = [
      { header: 'Employee ID', key: (r: AttendanceRecord) => r.employeeCode },
      { header: 'Employee Name', key: (r: AttendanceRecord) => r.employeeName },
      { header: 'Department', key: (r: AttendanceRecord) => r.departmentName },
      { header: 'Facility', key: (r: AttendanceRecord) => r.facilityName },
      { header: 'Date', key: (r: AttendanceRecord) => r.date },
      { header: 'Check In', key: (r: AttendanceRecord) => formatTime(r.checkInTime) },
      { header: 'Check Out', key: (r: AttendanceRecord) => formatTime(r.checkOutTime) },
      { header: 'Status', key: (r: AttendanceRecord) => r.status.toUpperCase() },
      { header: 'Verification Mode', key: (r: AttendanceRecord) => r.verificationMode },
      { header: 'Sync Status', key: (r: AttendanceRecord) => r.syncStatus },
      { header: 'Notes', key: (r: AttendanceRecord) => r.notes || '' },
    ];

    const csvData = generateCsv(columns, records);
    const dateStr = new Date().toISOString().split('T')[0];
    downloadCsv(`${filenamePrefix}_${dateStr}.csv`, csvData);
  }
}

export const reportService = new ReportService();
