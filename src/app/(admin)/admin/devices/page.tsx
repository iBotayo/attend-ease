'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { LoadingState, EmptyState } from '@/components/EmptyState';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { deviceService } from '@/services/device.service';
import { RegisteredDevice, DeviceType, DeviceStatus } from '@/types/device';
import { formatDateTime } from '@/lib/utils/formatters';
import {
  Smartphone,
  Tablet,
  Monitor,
  ShieldCheck,
  ShieldAlert,
  Search,
  CheckCircle2,
  Lock,
} from 'lucide-react';

export default function AdminDevicesPage() {
  const [devices, setDevices] = useState<RegisteredDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<DeviceType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<DeviceStatus | 'all'>('all');

  // Revoke dialog state
  const [deviceToRevoke, setDeviceToRevoke] = useState<RegisteredDevice | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const list = await deviceService.getDevices();
      setDevices(list);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRevokeConfirm = async () => {
    if (!deviceToRevoke) return;

    const res = await deviceService.revokeDevice(deviceToRevoke.id);
    if (res.success && res.device) {
      setDevices((prev) => prev.map((d) => (d.id === res.device!.id ? res.device! : d)));
      setToastMessage(`Certificate revoked for "${deviceToRevoke.name}". Device can no longer queue attendance.`);
      setTimeout(() => setToastMessage(null), 4500);
    }
    setDeviceToRevoke(null);
  };

  const filteredDevices = devices.filter((d) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      d.name.toLowerCase().includes(q) ||
      d.model.toLowerCase().includes(q) ||
      d.fingerprintHash.toLowerCase().includes(q) ||
      (d.assignedUserName && d.assignedUserName.toLowerCase().includes(q));

    const matchesType = typeFilter === 'all' || d.deviceType === typeFilter;
    const matchesStatus = statusFilter === 'all' || d.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  const getDeviceIcon = (type: DeviceType) => {
    switch (type) {
      case 'tablet_kiosk':
        return <Tablet className="w-4 h-4 text-brand-secondary" />;
      case 'desktop':
        return <Monitor className="w-4 h-4 text-brand-secondary" />;
      default:
        return <Smartphone className="w-4 h-4 text-brand-secondary" />;
    }
  };

  const activeCount = devices.filter((d) => d.status === 'active').length;
  const kioskCount = devices.filter((d) => d.deviceType === 'tablet_kiosk').length;
  const revokedCount = devices.filter((d) => d.status === 'revoked').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Authorized Devices & Biometric Kiosks"
        subtitle="Manage hardware certificate enrollment, trusted mobile terminals, and kiosk attestation states"
      />

      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Security alert regarding device cryptographic authentication */}
      <div className="p-4 bg-brand-ivory rounded-2xl border border-brand-border-subtle text-xs flex items-start gap-3">
        <Lock className="w-5 h-5 text-brand-secondary shrink-0 mt-0.5" />
        <div className="text-brand-charcoal">
          <strong className="font-bold text-brand-primary">Hardware Certificate Attestation:</strong>{' '}
          Each enrolled terminal authenticates via unique cryptographic public key fingerprints. Biometric vectors and raw facial templates are NEVER exported or stored in client-accessible browser storage.
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Total Devices"
          value={devices.length}
          icon={Smartphone}
          subtitle="Enrolled hardware"
          variant="default"
        />
        <StatCard
          title="Active Certificates"
          value={activeCount}
          icon={ShieldCheck}
          subtitle="Authorized to capture"
          variant="success"
        />
        <StatCard
          title="Facility Kiosks"
          value={kioskCount}
          icon={Tablet}
          subtitle="Fixed campus tablets"
          variant="default"
        />
        <StatCard
          title="Revoked / Blocked"
          value={revokedCount}
          icon={ShieldAlert}
          subtitle="Hardware rejected"
          variant={revokedCount > 0 ? 'danger' : 'default'}
        />
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-2xl p-4 border border-brand-border-subtle shadow-card flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-brand-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search device name, employee, or hash..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-brand-border bg-white text-brand-charcoal text-xs outline-none focus:border-brand-secondary"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
            className="px-3 py-2 rounded-xl border border-brand-border bg-white text-brand-charcoal outline-none font-medium text-xs capitalize"
          >
            <option value="all">All Device Types</option>
            <option value="mobile_ios">iOS Mobile</option>
            <option value="mobile_android">Android Mobile</option>
            <option value="tablet_kiosk">Tablet Kiosk</option>
            <option value="desktop">Desktop Terminal</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="px-3 py-2 rounded-xl border border-brand-border bg-white text-brand-charcoal outline-none font-medium text-xs capitalize"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="revoked">Revoked</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>

      {/* Devices Table */}
      {isLoading ? (
        <LoadingState message="Loading registered hardware devices..." />
      ) : filteredDevices.length === 0 ? (
        <EmptyState
          title="No Devices Found"
          description="No registered devices match your search and filter parameters."
          icon={Smartphone}
        />
      ) : (
        <div className="bg-white rounded-3xl border border-brand-border-subtle shadow-card overflow-hidden">
          <div className="p-5 border-b border-brand-border-subtle bg-brand-ivory/50 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-brand-primary">Terminal Registry</h3>
              <p className="text-xs text-brand-muted">Cryptographic device fingerprints and synchronization timestamps</p>
            </div>
            <span className="text-xs font-semibold text-brand-secondary bg-brand-mint/50 px-2.5 py-1 rounded-full">
              {filteredDevices.length} Terminals
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-brand-border-subtle bg-brand-ivory text-brand-muted font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Device & Model</th>
                  <th className="py-3 px-4">Assigned User / Kiosk</th>
                  <th className="py-3 px-4">Facility Campus</th>
                  <th className="py-3 px-4">Fingerprint Hash</th>
                  <th className="py-3 px-4">Last Sync</th>
                  <th className="py-3 px-4">App Ver</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Certificate Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border-subtle/70">
                {filteredDevices.map((d) => (
                  <tr key={d.id} className="hover:bg-brand-ivory/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-brand-ivory border border-brand-border-subtle shrink-0">
                          {getDeviceIcon(d.deviceType)}
                        </div>
                        <div>
                          <div className="font-bold text-brand-primary">{d.name}</div>
                          <div className="text-[10px] text-brand-muted">{d.model}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {d.assignedUserName ? (
                        <div className="font-semibold text-brand-charcoal">{d.assignedUserName}</div>
                      ) : (
                        <span className="text-brand-muted italic">Unassigned (Kiosk Mode)</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-brand-muted">
                      {d.assignedFacilityName ? d.assignedFacilityName.split(' - ')[0] : 'All Facilities'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-[10px] bg-brand-ivory px-2 py-0.5 rounded border border-brand-border-subtle text-brand-muted truncate max-w-[140px] block" title={d.fingerprintHash}>
                        {d.fingerprintHash.slice(0, 16)}...
                      </span>
                    </td>
                    <td className="py-3 px-4 text-brand-charcoal font-medium">
                      {formatDateTime(d.lastSyncAt)}
                    </td>
                    <td className="py-3 px-4 text-brand-muted font-mono">
                      v{d.appVersion}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          d.status === 'active'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : d.status === 'revoked'
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {d.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {d.status === 'active' ? (
                        <button
                          onClick={() => setDeviceToRevoke(d)}
                          className="px-2.5 py-1 text-xs font-semibold text-rose-700 hover:text-rose-900 hover:bg-rose-50 rounded-lg border border-rose-200 transition"
                        >
                          Revoke Certificate
                        </button>
                      ) : (
                        <span className="text-[11px] text-brand-muted italic">Revoked</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirm Revocation Dialog */}
      <ConfirmDialog
        isOpen={!!deviceToRevoke}
        title="Revoke Device Hardware Certificate?"
        message={`Are you sure you want to revoke authorization for "${deviceToRevoke?.name}" (${deviceToRevoke?.model})? This device will be immediately barred from recording attendance or synchronizing offline queues.`}
        confirmLabel="Revoke Device"
        cancelLabel="Keep Active"
        variant="danger"
        onConfirm={handleRevokeConfirm}
        onCancel={() => setDeviceToRevoke(null)}
      />
    </div>
  );
}
