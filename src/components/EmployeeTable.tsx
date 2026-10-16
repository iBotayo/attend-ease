'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { User } from '@/types/user';
import { Search, ShieldCheck, ShieldAlert, ArrowRight, UserCheck, UserX, ChevronLeft, ChevronRight } from 'lucide-react';

interface EmployeeTableProps {
  employees: User[];
  onToggleStatus: (id: string) => void;
}

export function EmployeeTable({ employees, onToggleStatus }: EmployeeTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  const departments = Array.from(new Set(employees.map((e) => e.departmentName)));

  const filtered = employees.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employeeId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDept = deptFilter === 'all' || emp.departmentName === deptFilter;
    const matchesRole = roleFilter === 'all' || emp.role === roleFilter;
    const matchesStatus =
      statusFilter === 'all' || (statusFilter === 'active' ? emp.isActive : !emp.isActive);

    return matchesSearch && matchesDept && matchesRole && matchesStatus;
  });

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getBiometricBadge = (status: User['biometricStatus']) => {
    switch (status) {
      case 'enrolled':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            <ShieldCheck className="w-3 h-3 text-emerald-600" /> Enrolled
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
            <ShieldAlert className="w-3 h-3 text-amber-600" /> Pending
          </span>
        );
      case 'not_enrolled':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
            Not Enrolled
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-brand-border-subtle shadow-card overflow-hidden">
      {/* Filters Toolbar */}
      <div className="p-4 sm:p-5 border-b border-brand-border-subtle flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-brand-ivory/50">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-brand-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, ID, or email..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-brand-border focus:border-brand-secondary focus:ring-1 focus:ring-brand-secondary outline-none transition bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={deptFilter}
            onChange={(e) => {
              setDeptFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 text-xs rounded-xl border border-brand-border bg-white text-brand-charcoal outline-none font-medium"
          >
            <option value="all">All Departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 text-xs rounded-xl border border-brand-border bg-white text-brand-charcoal outline-none font-medium"
          >
            <option value="all">All Roles</option>
            <option value="employee">Employee</option>
            <option value="supervisor">Supervisor</option>
            <option value="facility_admin">Facility Admin</option>
            <option value="system_admin">System Admin</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 text-xs rounded-xl border border-brand-border bg-white text-brand-charcoal outline-none font-medium"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-brand-border-subtle bg-brand-ivory text-brand-muted font-bold uppercase tracking-wider text-[11px]">
              <th className="py-3.5 px-4">Employee</th>
              <th className="py-3.5 px-4">Role</th>
              <th className="py-3.5 px-4">Department</th>
              <th className="py-3.5 px-4">Assigned Facility</th>
              <th className="py-3.5 px-4">Biometric Status</th>
              <th className="py-3.5 px-4">Account Status</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-border-subtle/70">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-brand-muted font-medium">
                  No employees matched the filters.
                </td>
              </tr>
            ) : (
              paginated.map((row) => (
                <tr key={row.id} className="hover:bg-brand-ivory/60 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      {row.avatarUrl ? (
                        <Image
                          src={row.avatarUrl}
                          alt={row.name}
                          width={32}
                          height={32}
                          className="w-8 h-8 rounded-full object-cover border border-brand-border shrink-0"
                          unoptimized
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-brand-primary text-brand-mint flex items-center justify-center font-bold text-xs shrink-0">
                          {row.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <Link
                          href={`/admin/employees/${row.id}`}
                          className="font-bold text-brand-primary hover:underline"
                        >
                          {row.name}
                        </Link>
                        <div className="text-[11px] text-brand-muted font-mono">
                          {row.employeeId} • {row.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 capitalize font-medium text-brand-charcoal">
                    {row.role.replace('_', ' ')}
                  </td>
                  <td className="py-3.5 px-4 text-brand-muted">{row.departmentName}</td>
                  <td className="py-3.5 px-4 text-brand-muted truncate max-w-[170px]" title={row.assignedFacilityName}>
                    {row.assignedFacilityName.split(' - ')[0]}
                  </td>
                  <td className="py-3.5 px-4">{getBiometricBadge(row.biometricStatus)}</td>
                  <td className="py-3.5 px-4">
                    <button
                      onClick={() => onToggleStatus(row.id)}
                      className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border transition cursor-pointer ${
                        row.isActive
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                      }`}
                      title="Click to toggle active status"
                    >
                      {row.isActive ? <UserCheck className="w-3 h-3 text-emerald-600" /> : <UserX className="w-3 h-3 text-rose-600" />}
                      <span>{row.isActive ? 'Active' : 'Inactive'}</span>
                    </button>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <Link
                      href={`/admin/employees/${row.id}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-brand-ivory hover:bg-brand-primary hover:text-white transition border border-brand-border-subtle"
                    >
                      <span>Manage</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden divide-y divide-brand-border-subtle">
        {paginated.length === 0 ? (
          <div className="py-8 text-center text-brand-muted text-xs">No employees found.</div>
        ) : (
          paginated.map((row) => (
            <div key={row.id} className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  {row.avatarUrl ? (
                    <Image
                      src={row.avatarUrl}
                      alt={row.name}
                      width={36}
                      height={36}
                      className="w-9 h-9 rounded-full object-cover border border-brand-border"
                      unoptimized
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-brand-primary text-brand-mint flex items-center justify-center font-bold text-xs">
                      {row.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <Link href={`/admin/employees/${row.id}`} className="font-bold text-sm text-brand-primary hover:underline">
                      {row.name}
                    </Link>
                    <p className="text-[11px] text-brand-muted font-mono">{row.employeeId}</p>
                  </div>
                </div>
                {getBiometricBadge(row.biometricStatus)}
              </div>

              <div className="text-xs text-brand-muted space-y-1">
                <div>
                  <strong className="text-brand-charcoal">Dept:</strong> {row.departmentName}
                </div>
                <div>
                  <strong className="text-brand-charcoal">Facility:</strong> {row.assignedFacilityName}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-brand-border-subtle/80 text-xs">
                <button
                  onClick={() => onToggleStatus(row.id)}
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                    row.isActive
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}
                >
                  {row.isActive ? 'Active' : 'Inactive'}
                </button>

                <Link
                  href={`/admin/employees/${row.id}`}
                  className="inline-flex items-center gap-1 font-semibold text-brand-secondary hover:underline"
                >
                  <span>View Details</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination Footer */}
      <div className="px-4 py-3 border-t border-brand-border-subtle bg-brand-ivory flex items-center justify-between text-xs text-brand-muted">
        <span>
          Showing {filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{' '}
          {Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} employees
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
    </div>
  );
}
