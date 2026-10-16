'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { EmployeeTable } from '@/components/EmployeeTable';
import { AddEmployeeModal } from '@/components/AddEmployeeModal';
import { LoadingState } from '@/components/EmptyState';
import { employeeService } from '@/services/employee.service';
import { facilityService } from '@/services/facility.service';
import { User, Department } from '@/types/user';
import { Facility } from '@/types/facility';
import { UserPlus } from 'lucide-react';

export default function AdminEmployeesPage() {
  const [employees, setEmployees] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [empList, deptList, facList] = await Promise.all([
        employeeService.getEmployees(),
        employeeService.getDepartments(),
        facilityService.getFacilities(),
      ]);
      setEmployees(empList);
      setDepartments(deptList);
      setFacilities(facList);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleStatus = async (id: string) => {
    const updated = await employeeService.toggleEmployeeStatus(id);
    if (updated) {
      setEmployees((prev) => prev.map((e) => (e.id === id ? updated : e)));
    }
  };

  const handleEmployeeCreated = (newEmp: User) => {
    setEmployees((prev) => [newEmp, ...prev]);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employee Directory"
        subtitle="Manage facility staff rosters, biometric enrollment status, and authorization states"
        actions={
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-xs font-bold transition shadow-card flex items-center gap-1.5"
          >
            <UserPlus className="w-4 h-4 text-brand-mint" />
            <span>Add Employee</span>
          </button>
        }
      />

      {isLoading ? (
        <LoadingState message="Loading staff directory..." />
      ) : (
        <EmployeeTable
          employees={employees}
          onToggleStatus={handleToggleStatus}
        />
      )}

      <AddEmployeeModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onEmployeeCreated={handleEmployeeCreated}
        departments={departments}
        facilities={facilities}
      />
    </div>
  );
}
