'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { attendanceService } from '@/services/attendance.service';
import { AttendanceRecord } from '@/types/attendance';
import { PageHeader } from '@/components/PageHeader';
import { AttendanceTable } from '@/components/AttendanceTable';
import { EmptyState, LoadingState } from '@/components/EmptyState';
import { History } from 'lucide-react';

export default function EmployeeHistoryPage() {
  const { user } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const history = await attendanceService.getHistory(user.employeeId);
      setRecords(history);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Attendance History"
        subtitle="Complete record of verified arrivals, departures, and facility verifications"
      />

      {isLoading ? (
        <LoadingState message="Loading your attendance logs..." />
      ) : records.length === 0 ? (
        <EmptyState
          title="No Attendance Records Found"
          description="You haven't recorded any attendance records yet. Your verified check-ins and departures will appear here."
          icon={History}
        />
      ) : (
        <AttendanceTable
          records={records}
          canEdit={false} // Employees view only; admins authorize corrections
        />
      )}
    </div>
  );
}
