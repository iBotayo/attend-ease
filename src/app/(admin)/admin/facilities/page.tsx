'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { FacilityCard } from '@/components/FacilityCard';
import { EditFacilityModal } from '@/components/EditFacilityModal';
import { LoadingState, EmptyState } from '@/components/EmptyState';
import { facilityService } from '@/services/facility.service';
import { Facility } from '@/types/facility';
import {
  Building2,
  Plus,
  Search,
  CheckCircle2,
  Shield,
  Wifi,
  Users,
} from 'lucide-react';

export default function AdminFacilitiesPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'maintenance' | 'inactive'>('all');

  // Modal state
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await facilityService.getFacilities();
      setFacilities(data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenAdd = () => {
    setSelectedFacility(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (fac: Facility) => {
    setSelectedFacility(fac);
    setIsModalOpen(true);
  };

  const handleSaved = (savedFacility: Facility) => {
    setFacilities((prev) => {
      const exists = prev.some((f) => f.id === savedFacility.id);
      if (exists) {
        return prev.map((f) => (f.id === savedFacility.id ? savedFacility : f));
      }
      return [savedFacility, ...prev];
    });

    const isEdit = !!selectedFacility;
    setSuccessToast(isEdit ? `Facility "${savedFacility.name}" configuration updated.` : `New facility "${savedFacility.name}" created.`);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const filteredFacilities = facilities.filter((f) => {
    const matchesSearch =
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.code.toLowerCase().includes(search.toLowerCase()) ||
      f.address.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || f.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalAssignedStaff = facilities.reduce((acc, f) => acc + f.activeEmployeeCount, 0);
  const activeCount = facilities.filter((f) => f.status === 'active').length;
  const strictWifiCount = facilities.filter((f) => f.networkPolicy.requireNetworkMatch).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Facility Infrastructure & Geofences"
        subtitle="Manage duty sites, GPS geofencing radius, authorized Wi-Fi subnets, and offline buffering policies"
        actions={
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-xs font-bold transition shadow-card flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 text-brand-mint" />
            <span>Add Facility</span>
          </button>
        }
      />

      {successToast && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Total Facilities"
          value={facilities.length}
          icon={Building2}
          subtitle="Registered premises"
          variant="default"
        />
        <StatCard
          title="Active Geofences"
          value={activeCount}
          icon={Shield}
          subtitle={`${Math.round((activeCount / (facilities.length || 1)) * 100)}% operational`}
          variant="success"
        />
        <StatCard
          title="Assigned Personnel"
          value={totalAssignedStaff}
          icon={Users}
          subtitle="Across all sites"
          variant="default"
        />
        <StatCard
          title="Strict Wi-Fi Subnets"
          value={strictWifiCount}
          icon={Wifi}
          subtitle="Network verification enabled"
          variant="warning"
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-brand-border-subtle shadow-card flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-brand-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search facility name, code, or address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3.5 py-2 text-xs rounded-xl border border-brand-border focus:border-brand-secondary outline-none transition bg-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <label className="text-xs font-semibold text-brand-muted hidden sm:inline">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="px-3 py-2 text-xs rounded-xl border border-brand-border bg-white text-brand-charcoal outline-none font-medium"
          >
            <option value="all">All Statuses ({facilities.length})</option>
            <option value="active">Active</option>
            <option value="maintenance">Maintenance</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Facilities Grid */}
      {isLoading ? (
        <LoadingState message="Loading facilities and geofence perimeters..." />
      ) : filteredFacilities.length === 0 ? (
        <EmptyState
          title="No Facilities Found"
          description={
            search || statusFilter !== 'all'
              ? 'No facilities match your search criteria. Try clearing the filter.'
              : 'No facilities have been registered yet.'
          }
          icon={Building2}
          action={{
            label: search || statusFilter !== 'all' ? 'Clear Filters' : 'Add First Facility',
            onClick:
              search || statusFilter !== 'all'
                ? () => {
                    setSearch('');
                    setStatusFilter('all');
                  }
                : handleOpenAdd,
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFacilities.map((fac) => (
            <FacilityCard key={fac.id} facility={fac} onEdit={handleOpenEdit} />
          ))}
        </div>
      )}

      {/* Edit / Create Facility Modal */}
      <EditFacilityModal
        facility={selectedFacility}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={handleSaved}
      />
    </div>
  );
}
