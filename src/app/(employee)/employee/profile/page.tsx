'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/PageHeader';
import { formatDate } from '@/lib/utils/formatters';
import {
  User,
  Building,
  ShieldCheck,
  Smartphone,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

export default function EmployeeProfilePage() {
  const { user } = useAuth();
  const [phone, setPhone] = useState(user?.phone || '+1 (312) 555-0142');
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        title="Employee Profile"
        subtitle="Manage your personal information, assigned facility, and registered devices"
      />

      {isSaved && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Profile contact preferences updated successfully.</span>
        </div>
      )}

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
          <div className="flex items-center gap-1.5 font-bold text-emerald-800">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Enrolled & Active</span>
          </div>
          <span className="text-[10px] text-brand-muted block">
            Last enrolled: {formatDate(user?.enrolledAt)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal & Contact Info */}
        <form onSubmit={handleSave} className="bg-white rounded-3xl p-6 border border-brand-border-subtle shadow-card space-y-4">
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
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-brand-border focus:border-brand-secondary outline-none transition bg-white"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="px-5 py-2 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-xs font-bold transition shadow-subtle"
            >
              Update Preferences
            </button>
          </div>
        </form>

        {/* Assigned Facility & Registered Device */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-brand-border-subtle shadow-card space-y-3">
            <h3 className="font-bold text-sm text-brand-primary flex items-center gap-2">
              <Building className="w-4 h-4 text-brand-secondary" />
              <span>Assigned Facility</span>
            </h3>

            <div className="p-3.5 bg-brand-ivory rounded-2xl border border-brand-border-subtle space-y-1 text-xs">
              <div className="font-bold text-brand-primary">{user?.assignedFacilityName}</div>
              <p className="text-brand-muted text-[11px]">
                Main duty campus with active geofence and authorized Wi-Fi network routing.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-brand-border-subtle shadow-card space-y-3">
            <h3 className="font-bold text-sm text-brand-primary flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-brand-secondary" />
              <span>Registered Mobile Device</span>
            </h3>

            <div className="p-3.5 bg-brand-ivory rounded-2xl border border-brand-border-subtle space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-brand-charcoal">iPhone 15 Pro (A3101)</span>
                <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Active
                </span>
              </div>
              <p className="text-brand-muted text-[11px] font-mono">
                Device Fingerprint: sha256:4f8a...9f0
              </p>
              <p className="text-[11px] text-brand-muted">
                Last synchronized today at 08:02 AM
              </p>
            </div>
          </div>
        </div>
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
