'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import { AttendanceTable } from '@/components/AttendanceTable';
import { LoadingState, ErrorState } from '@/components/EmptyState';
import { employeeService } from '@/services/employee.service';
import { facilityService } from '@/services/facility.service';
import { attendanceService } from '@/services/attendance.service';
import { User, Department } from '@/types/user';
import { Facility } from '@/types/facility';
import { AttendanceRecord } from '@/types/attendance';
import { formatDate } from '@/lib/utils/formatters';
import {
  ArrowLeft,
  ShieldCheck,
  Save,
  CheckCircle2,
} from 'lucide-react';

export default function EmployeeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [employee, setEmployee] = useState<User | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Edit form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<User['role']>('employee');
  const [departmentId, setDepartmentId] = useState('');
  const [assignedFacilityId, setAssignedFacilityId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (!id) return;

    const loadData = async () => {
      try {
        const [emp, depts, facs, attList] = await Promise.all([
          employeeService.getEmployeeById(id),
          employeeService.getDepartments(),
          facilityService.getFacilities(),
          attendanceService.getAllAttendance(),
        ]);

        if (emp) {
          setEmployee(emp);
          setName(emp.name);
          setEmail(emp.email);
          setPhone(emp.phone || '');
          setRole(emp.role);
          setDepartmentId(emp.departmentId);
          setAssignedFacilityId(emp.assignedFacilityId);

          const empAttendance = attList.filter((a) => a.employeeId === emp.employeeId || a.employeeId === emp.id);
          setAttendance(empAttendance);
        }
        setDepartments(depts);
        setFacilities(facs);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [id]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;

    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const updated = await employeeService.updateEmployee(employee.id, {
        name,
        email,
        phone,
        role,
        departmentId,
        assignedFacilityId,
      });

      if (updated) {
        setEmployee(updated);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async () => {
    if (!employee) return;
    const updated = await employeeService.toggleEmployeeStatus(employee.id);
    if (updated) {
      setEmployee(updated);
    }
  };

  if (isLoading) {
    return <LoadingState message="Loading employee details..." />;
  }

  if (!employee) {
    return (
      <ErrorState
        title="Employee Not Found"
        message="The requested employee record does not exist or may have been deleted."
        onRetry={() => router.push('/admin/employees')}
      />
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-2">
        <Link
          href="/admin/employees"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-muted hover:text-brand-primary transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Employee Directory</span>
        </Link>
      </div>

      <PageHeader
        title={employee.name}
        subtitle={`${employee.employeeId} • ${employee.departmentName}`}
        badge={
          <span
            className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
              employee.isActive
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {employee.isActive ? 'Active Account' : 'Deactivated'}
          </span>
        }
        actions={
          <button
            onClick={handleToggleActive}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition border ${
              employee.isActive
                ? 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            {employee.isActive ? 'Deactivate Account' : 'Reactivate Account'}
          </button>
        }
      />

      {saveSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Employee details updated successfully.</span>
        </div>
      )}

      {/* Top Profile Summary Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-brand-border-subtle shadow-card flex flex-col sm:flex-row items-start sm:items-center gap-6">
        {employee.avatarUrl ? (
          <Image
            src={employee.avatarUrl}
            alt={employee.name}
            width={72}
            height={72}
            className="w-18 h-18 rounded-full object-cover border-2 border-brand-border shadow-subtle shrink-0"
            unoptimized
          />
        ) : (
          <div className="w-18 h-18 rounded-full bg-brand-primary text-brand-mint text-xl font-bold flex items-center justify-center shrink-0">
            {employee.name.charAt(0)}
          </div>
        )}

        <div className="space-y-1 flex-1 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base font-bold text-brand-primary">{employee.name}</span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-brand-mint text-brand-mint-dark uppercase">
              {employee.role.replace('_', ' ')}
            </span>
          </div>
          <p className="text-brand-muted font-mono">{employee.employeeId} • {employee.email}</p>
          <p className="text-brand-muted">Assigned: {employee.assignedFacilityName}</p>
          <p className="text-brand-muted">Member since {formatDate(employee.joinedDate)}</p>
        </div>

        <div className="p-3 bg-brand-ivory rounded-2xl border border-brand-border-subtle text-xs space-y-1 shrink-0">
          <span className="text-[10px] uppercase font-bold text-brand-muted block">
            Biometric Enrollment
          </span>
          <div className="flex items-center gap-1.5 font-bold text-emerald-800">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="capitalize">{employee.biometricStatus}</span>
          </div>
          <span className="text-[10px] text-brand-muted block">
            Enrolled: {formatDate(employee.enrolledAt) || 'Pending'}
          </span>
        </div>
      </div>

      {/* Edit Form */}
      <form onSubmit={handleUpdate} className="bg-white rounded-3xl p-6 sm:p-8 border border-brand-border-subtle shadow-card space-y-5">
        <h3 className="text-sm font-bold text-brand-primary">Edit Employee Information</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-brand-charcoal uppercase tracking-wider mb-1.5">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-brand-border focus:border-brand-secondary outline-none transition bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-brand-charcoal uppercase tracking-wider mb-1.5">
              Work Email *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-brand-border focus:border-brand-secondary outline-none transition bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-brand-charcoal uppercase tracking-wider mb-1.5">
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-brand-border focus:border-brand-secondary outline-none transition bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-brand-charcoal uppercase tracking-wider mb-1.5">
              Role *
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as User['role'])}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-brand-border focus:border-brand-secondary outline-none transition bg-white font-medium"
            >
              <option value="employee">Employee</option>
              <option value="supervisor">Supervisor</option>
              <option value="facility_admin">Facility Administrator</option>
              <option value="system_admin">System Administrator</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-brand-charcoal uppercase tracking-wider mb-1.5">
              Department *
            </label>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-brand-border focus:border-brand-secondary outline-none transition bg-white font-medium"
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-brand-charcoal uppercase tracking-wider mb-1.5">
              Assigned Facility *
            </label>
            <select
              value={assignedFacilityId}
              onChange={(e) => setAssignedFacilityId(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-brand-border focus:border-brand-secondary outline-none transition bg-white font-medium"
            >
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-xs font-bold transition shadow-subtle flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4 text-brand-mint" />
            <span>{isSaving ? 'Saving Changes...' : 'Save Profile Changes'}</span>
          </button>
        </div>
      </form>

      {/* Attendance History for this Employee */}
      <div className="space-y-3">
        <h3 className="font-bold text-sm text-brand-primary">Attendance History for {employee.name}</h3>
        <AttendanceTable records={attendance} canEdit={true} />
      </div>
    </div>
  );
}
