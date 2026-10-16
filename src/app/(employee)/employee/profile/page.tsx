'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/PageHeader';
import { deviceService } from '@/services/device.service';
import { RegisteredDevice } from '@/types/device';
import { formatDate } from '@/lib/utils/formatters';
import {
  User,
  Building,
  ShieldCheck,
  Smartphone,
  Sparkles,
  KeyRound,
  ArrowRight,
} from 'lucide-react';

const BIOMETRIC_LABELS: Record<string, string> = {
  enrolled: 'Enrolled',
  pending: 'Enrollment Pending',
  failed: 'Enrollment Failed',
  not_enrolled: 'Not Enrolled',
};

export default function EmployeeProfilePage() {
  const { user } = useAuth();
  const [devices, setDevices] = useState<RegisteredDevice[]>([]);

  useEffect(() => {
    if (!user) return;
    deviceService
      .getDevices()
      .then((all) => setDevices(all.filter((d) => d.assignedUserId === user.id)))
      .catch(() => setDevices([]));
  }, [user]);

  const isEnrolled = user?.biometricStatus === 'enrolled';

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        title="Employee Profile"
        subtitle="Manage your personal information, assigned facility, and registered devices"
      />

      {/* Profile Overview Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-brand-border-subtle shadow-card flex flex-col sm:flex-row items-start sm:items-center gap-6">
        {user?.avatarUrl ? (
          <Image
            src={user.avatarUrl}
            alt={user.name}
            width={80}
            height={80}
            className="w-20 h-20 rounded-full object-cover border-2 border-brand-border shadow-subtle shrink-0"
            unoptimized
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-brand-primary text-brand-mint text-2xl font-bold flex items-center justify-center shrink-0">
            {user?.name.charAt(0)}
          </div>
        )}

        <div className="space-y-1 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold text-brand-primary">{user?.name}</h2>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-brand-mint text-brand-mint-dark capitalize">
              {user?.role.replace('_', ' ')}
            </span>
          </div>

          <p className="text-xs text-brand-muted font-mono">
            Employee Code: <span className="font-bold text-brand-charcoal">{user?.employeeId}</span>
          </p>
          <p className="text-xs text-brand-muted">
            {user?.departmentName} • Joined {formatDate(user?.joinedDate)}
          </p>
        </div>

        <div className="p-3 bg-brand-ivory rounded-2xl border border-brand-border-subtle text-xs space-y-1 shrink-0">
          <span className="text-[10px] uppercase font-bold text-brand-muted block">
            Biometric Enrollment
          </span>
          <div className={`flex items-center gap-1.5 font-bold ${isEnrolled ? 'text-emerald-800' : 'text-brand-muted'}`}>
            <ShieldCheck className={`w-4 h-4 ${isEnrolled ? 'text-emerald-600' : 'text-brand-muted'}`} />
            <span>{BIOMETRIC_LABELS[user?.biometricStatus ?? 'not_enrolled'] ?? 'Not Enrolled'}</span>
          </div>
          {user?.enrolledAt && (
            <span className="text-[10px] text-brand-muted block">
              Last enrolled: {formatDate(user.enrolledAt)}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal & Contact Info */}
        <div className="bg-white rounded-3xl p-6 border border-brand-border-subtle shadow-card space-y-4">
          <h3 className="font-bold text-sm text-brand-primary flex items-center gap-2">
            <User className="w-4 h-4 text-brand-secondary" />
            <span>Personal & Contact Information</span>
          </h3>

          <div>
            <label className="block text-xs font-semibold text-brand-charcoal mb-1">
              Full Legal Name
            </label>
            <input
              type="text"
              readOnly
              value={user?.name || ''}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-brand-border-subtle bg-brand-ivory text-brand-muted font-medium outline-none cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-brand-charcoal mb-1">
              Work Email Address
            </label>
            <input
              type="email"
              readOnly
              value={user?.email || ''}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-brand-border-subtle bg-brand-ivory text-brand-muted font-medium outline-none cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-brand-charcoal mb-1">
              Mobile Contact Number
            </label>
            <input
              type="tel"
              readOnly
              value={user?.phone || 'Not provided'}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-brand-border-subtle bg-brand-ivory text-brand-muted font-medium outline-none cursor-not-allowed"
            />
          </div>

          <p className="text-[11px] text-brand-muted">
            To update your contact details, ask your organization administrator.
          </p>
        </div>

        {/* Assigned Facility & Registered Device */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-brand-border-subtle shadow-card space-y-3">
            <h3 className="font-bold text-sm text-brand-primary flex items-center gap-2">
              <Building className="w-4 h-4 text-brand-secondary" />
              <span>Assigned Facility</span>
            </h3>

            <div className="p-3.5 bg-brand-ivory rounded-2xl border border-brand-border-subtle space-y-1 text-xs">
              <div className="font-bold text-brand-primary">{user?.assignedFacilityName || 'No facility assigned'}</div>
              <p className="text-brand-muted text-[11px]">
                Your check-ins are verified against this facility&apos;s location.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-brand-border-subtle shadow-card space-y-3">
            <h3 className="font-bold text-sm text-brand-primary flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-brand-secondary" />
              <span>Registered Mobile Device</span>
            </h3>

            {devices.length === 0 ? (
              <p className="p-3.5 bg-brand-ivory rounded-2xl border border-brand-border-subtle text-xs text-brand-muted">
                No device is registered to your account.
              </p>
            ) : (
              devices.map((d) => (
                <div key={d.id} className="p-3.5 bg-brand-ivory rounded-2xl border border-brand-border-subtle space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-brand-charcoal">
                      {d.name} ({d.model})
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize ${
                        d.status === 'active'
                          ? 'text-emerald-800 bg-emerald-50 border-emerald-200'
                          : 'text-rose-800 bg-rose-50 border-rose-200'
                      }`}
                    >
                      {d.status}
                    </span>
                  </div>
                  <p className="text-brand-muted text-[11px] font-mono truncate">
                    Device Fingerprint: {d.fingerprintHash}
                  </p>
                  {d.lastSyncAt && (
                    <p className="text-[11px] text-brand-muted">Last synchronized {formatDate(d.lastSyncAt)}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Account Security */}
      <div className="bg-white rounded-3xl p-6 border border-brand-border-subtle shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-brand-primary/10 text-brand-primary shrink-0">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-brand-primary">Password</h3>
            <p className="text-xs text-brand-muted">
              Changing your password signs you out on every other device.
            </p>
          </div>
        </div>
        <Link
          href="/change-password"
          className="self-start sm:self-auto px-4 py-2 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-xs font-bold transition shadow-subtle inline-flex items-center gap-1.5"
        >
          <span>Change Password</span>
          <ArrowRight className="w-3.5 h-3.5 text-brand-mint" />
        </Link>
      </div>

      {/* Biometric Privacy & Security Note */}
      <div className="bg-brand-mint/30 rounded-2xl p-4 border border-brand-mint-dark/20 text-xs text-brand-mint-dark flex items-start gap-2.5">
        <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold">Biometric Privacy Safeguard:</strong> In compliance with security standards, raw biometric facial templates are encrypted with irreversible one-way mathematical hashes. Biometric vectors are never rendered or stored in client-accessible browser storage.
        </div>
      </div>
    </div>
  );
}
