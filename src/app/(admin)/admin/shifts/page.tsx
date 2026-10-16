'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { LoadingState } from '@/components/EmptyState';
import { shiftService, CreateShiftInput } from '@/services/shift.service';
import { facilityService } from '@/services/facility.service';
import { Shift } from '@/types/shift';
import { Facility } from '@/types/facility';
import {
  Clock,
  Plus,
  Calendar,
  Users,
  CheckCircle2,
  Edit,
  X,
  ShieldCheck,
} from 'lucide-react';

export default function AdminShiftsPage() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('16:30');
  const [gracePeriod, setGracePeriod] = useState('15');
  const [facilityId, setFacilityId] = useState('');
  const [assignedDays, setAssignedDays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon - Fri
  const [isActive, setIsActive] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [shiftList, facList] = await Promise.all([
        shiftService.getShifts(),
        facilityService.getFacilities(),
      ]);
      setShifts(shiftList);
      setFacilities(facList);
      if (facList.length > 0 && !facilityId) {
        setFacilityId(facList[0].id);
      }
    } finally {
      setIsLoading(false);
    }
  }, [facilityId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenAdd = () => {
    setEditingShift(null);
    setName('');
    setCode('');
    setStartTime('08:00');
    setEndTime('16:30');
    setGracePeriod('15');
    setFacilityId(facilities[0]?.id || '');
    setAssignedDays([1, 2, 3, 4, 5]);
    setIsActive(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (shift: Shift) => {
    setEditingShift(shift);
    setName(shift.name);
    setCode(shift.code);
    setStartTime(shift.startTime);
    setEndTime(shift.endTime);
    setGracePeriod(shift.gracePeriodMinutes.toString());
    setFacilityId(shift.assignedFacilityId || facilities[0]?.id || '');
    setAssignedDays(shift.assignedDays);
    setIsActive(shift.isActive);
    setIsModalOpen(true);
  };

  const toggleDay = (day: number) => {
    setAssignedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;

    setIsSubmitting(true);
    try {
      const selectedFac = facilities.find((f) => f.id === facilityId);
      const input: CreateShiftInput = {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        startTime,
        endTime,
        gracePeriodMinutes: parseInt(gracePeriod, 10) || 15,
        assignedFacilityId: facilityId,
        assignedFacilityName: selectedFac ? selectedFac.name : undefined,
        assignedDays,
        isActive,
      };

      if (editingShift) {
        const updated = await shiftService.updateShift(editingShift.id, input);
        if (updated) {
          setShifts((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
          setToastMessage(`Shift "${updated.name}" updated successfully.`);
        }
      } else {
        const created = await shiftService.createShift(input);
        setShifts((prev) => [created, ...prev]);
        setToastMessage(`New shift pattern "${created.name}" created.`);
      }

      setIsModalOpen(false);
      setTimeout(() => setToastMessage(null), 3500);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (id: string) => {
    const updated = await shiftService.toggleShiftStatus(id);
    if (updated) {
      setShifts((prev) => prev.map((s) => (s.id === id ? updated : s)));
    }
  };

  const daysLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const activeCount = shifts.filter((s) => s.isActive).length;
  const totalEmployees = shifts.reduce((acc, s) => acc + s.employeeCount, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shifts & Schedules"
        subtitle="Define recurring attendance rosters, arrival grace windows, and facility operational work shifts"
        actions={
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-xs font-bold transition shadow-card flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 text-brand-mint" />
            <span>Create Shift</span>
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
          title="Total Shifts"
          value={shifts.length}
          icon={Clock}
          subtitle="Configured schedules"
          variant="default"
        />
        <StatCard
          title="Active Schedules"
          value={activeCount}
          icon={Calendar}
          subtitle={`${Math.round((activeCount / (shifts.length || 1)) * 100)}% currently running`}
          variant="success"
        />
        <StatCard
          title="Staff Scheduled"
          value={totalEmployees}
          icon={Users}
          subtitle="Enrolled workforce"
          variant="default"
        />
        <StatCard
          title="Grace Tolerance"
          value="15m"
          icon={ShieldCheck}
          subtitle="Standard late margin"
          variant="warning"
        />
      </div>

      {/* Shifts Table */}
      {isLoading ? (
        <LoadingState message="Loading work shifts and schedules..." />
      ) : (
        <div className="bg-white rounded-3xl border border-brand-border-subtle shadow-card overflow-hidden">
          <div className="p-5 border-b border-brand-border-subtle bg-brand-ivory/50 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-brand-primary">Scheduled Shift Profiles</h3>
              <p className="text-xs text-brand-muted">Operational hours, grace boundaries, and assigned campus locations</p>
            </div>
            <span className="text-xs font-semibold text-brand-secondary bg-brand-mint/50 px-2.5 py-1 rounded-full">
              {shifts.length} Shifts Configured
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-brand-border-subtle bg-brand-ivory text-brand-muted font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Shift Details</th>
                  <th className="py-3 px-4">Working Hours</th>
                  <th className="py-3 px-4">Grace Period</th>
                  <th className="py-3 px-4">Working Days</th>
                  <th className="py-3 px-4">Facility Campus</th>
                  <th className="py-3 px-4">Staff</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border-subtle/70">
                {shifts.map((s) => (
                  <tr key={s.id} className="hover:bg-brand-ivory/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-brand-primary">{s.name}</div>
                      <div className="text-[10px] text-brand-muted font-mono">{s.code}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-brand-charcoal font-mono">
                        {s.startTime} - {s.endTime}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-900 border border-amber-200">
                        {s.gracePeriodMinutes} mins
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        {daysLabels.map((lbl, idx) => {
                          const isAssigned = s.assignedDays.includes(idx);
                          return (
                            <span
                              key={lbl}
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                isAssigned
                                  ? 'bg-brand-primary text-brand-mint'
                                  : 'bg-brand-ivory text-brand-muted/40'
                              }`}
                            >
                              {lbl.charAt(0)}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-brand-muted">
                      {s.assignedFacilityName ? s.assignedFacilityName.split(' - ')[0] : 'All Facilities'}
                    </td>
                    <td className="py-3 px-4 font-semibold text-brand-charcoal">
                      {s.employeeCount} assigned
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleStatus(s.id)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition ${
                          s.isActive
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-rose-50 hover:text-rose-800 hover:border-rose-200'
                            : 'bg-zinc-100 text-zinc-600 border-zinc-200 hover:bg-emerald-50 hover:text-emerald-800'
                        }`}
                        title="Click to toggle status"
                      >
                        {s.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOpenEdit(s)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-brand-secondary hover:text-brand-primary rounded-lg hover:bg-brand-ivory transition"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Shift Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-primary/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-modal border border-brand-border max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-brand-border-subtle bg-brand-ivory flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-brand-primary/10 text-brand-primary">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-brand-primary">
                    {editingShift ? 'Edit Shift Configuration' : 'Create New Shift'}
                  </h3>
                  <p className="text-xs text-brand-muted">Define time boundaries and facility assignments</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 hover:bg-black/5 rounded-lg text-brand-muted"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-brand-charcoal uppercase tracking-wider mb-1.5">
                    Shift Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Clinical Morning Roster"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-brand-border bg-white outline-none focus:border-brand-secondary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-charcoal uppercase tracking-wider mb-1.5">
                    Shift Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CMR-01"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-brand-border bg-white outline-none focus:border-brand-secondary font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-charcoal uppercase tracking-wider mb-1.5">
                    Grace Margin (mins) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    required
                    value={gracePeriod}
                    onChange={(e) => setGracePeriod(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-brand-border bg-white outline-none focus:border-brand-secondary font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-charcoal uppercase tracking-wider mb-1.5">
                    Shift Start Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-brand-border bg-white outline-none focus:border-brand-secondary font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-charcoal uppercase tracking-wider mb-1.5">
                    Shift End Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-brand-border bg-white outline-none focus:border-brand-secondary font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-charcoal uppercase tracking-wider mb-1.5">
                  Assigned Facility Campus
                </label>
                <select
                  value={facilityId}
                  onChange={(e) => setFacilityId(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-brand-border bg-white outline-none focus:border-brand-secondary font-medium"
                >
                  {facilities.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Working Days Selector */}
              <div>
                <label className="block text-xs font-bold text-brand-charcoal uppercase tracking-wider mb-1.5">
                  Scheduled Days of Week
                </label>
                <div className="grid grid-cols-7 gap-1.5">
                  {daysLabels.map((lbl, idx) => {
                    const isSelected = assignedDays.includes(idx);
                    return (
                      <button
                        key={lbl}
                        type="button"
                        onClick={() => toggleDay(idx)}
                        className={`py-2 rounded-xl text-xs font-bold transition border ${
                          isSelected
                            ? 'bg-brand-primary text-white border-brand-primary'
                            : 'bg-white text-brand-muted border-brand-border hover:bg-brand-ivory'
                        }`}
                      >
                        {lbl}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded text-brand-secondary focus:ring-brand-secondary"
                  />
                  <span className="text-xs font-semibold text-brand-charcoal">
                    Shift is active for current attendance scheduling
                  </span>
                </label>
              </div>

              <div className="pt-3 border-t border-brand-border-subtle flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-brand-charcoal hover:bg-black/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-brand-primary text-white hover:bg-brand-primary-hover shadow-subtle disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingShift ? 'Update Shift' : 'Create Shift'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
