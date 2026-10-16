'use client';

import React, { useState } from 'react';
import { User } from '@/types/user';
import { Facility } from '@/types/facility';
import { Department } from '@/types/user';
import { employeeService, CreateEmployeeInput } from '@/services/employee.service';
import { X, UserPlus } from 'lucide-react';

interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEmployeeCreated: (employee: User) => void;
  departments: Department[];
  facilities: Facility[];
}

export function AddEmployeeModal({
  isOpen,
  onClose,
  onEmployeeCreated,
  departments,
  facilities,
}: AddEmployeeModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<User['role']>('employee');
  const [departmentId, setDepartmentId] = useState(departments[0]?.id || '');
  const [facilityId, setFacilityId] = useState(facilities[0]?.id || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError('Name and Email are required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const input: CreateEmployeeInput = {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        role,
        departmentId: departmentId || departments[0]?.id,
        assignedFacilityId: facilityId || facilities[0]?.id,
      };

      const created = await employeeService.createEmployee(input);
      onEmployeeCreated(created);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create employee');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-primary/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-modal border border-brand-border max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-brand-border-subtle bg-brand-ivory flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-brand-primary/10 text-brand-primary">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-brand-primary">Add New Employee</h2>
              <p className="text-xs text-brand-muted">Provision staff profile and facility assignment</p>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-brand-charcoal uppercase tracking-wider mb-1.5">
              Full Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Maya Lin"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-brand-border focus:border-brand-secondary focus:ring-1 focus:ring-brand-secondary outline-none transition bg-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-brand-charcoal uppercase tracking-wider mb-1.5">
                Work Email *
              </label>
              <input
                type="email"
                required
                placeholder="maya.lin@attendease.internal"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-brand-border focus:border-brand-secondary focus:ring-1 focus:ring-brand-secondary outline-none transition bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-brand-charcoal uppercase tracking-wider mb-1.5">
                Phone Number
              </label>
              <input
                type="tel"
                placeholder="+1 (312) 555-0199"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-brand-border focus:border-brand-secondary focus:ring-1 focus:ring-brand-secondary outline-none transition bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-brand-charcoal uppercase tracking-wider mb-1.5">
                System Role *
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
          </div>

          <div>
            <label className="block text-xs font-bold text-brand-charcoal uppercase tracking-wider mb-1.5">
              Assigned Facility *
            </label>
            <select
              value={facilityId}
              onChange={(e) => setFacilityId(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-brand-border focus:border-brand-secondary outline-none transition bg-white font-medium"
            >
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2.5">
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
              {isSubmitting ? 'Creating...' : 'Create Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
