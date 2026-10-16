'use client';

import React from 'react';
import { Facility } from '@/types/facility';
import { Building2, MapPin, Wifi, Shield, Edit, Users } from 'lucide-react';

interface FacilityCardProps {
  facility: Facility;
  onEdit: (facility: Facility) => void;
}

export function FacilityCard({ facility, onEdit }: FacilityCardProps) {
  const statusColors = {
    active: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    maintenance: 'bg-amber-50 text-amber-800 border-amber-200',
    inactive: 'bg-rose-50 text-rose-800 border-rose-200',
  };

  return (
    <div className="bg-white rounded-2xl border border-brand-border-subtle p-5 shadow-card hover:shadow-dropdown transition-all flex flex-col justify-between">
      <div className="space-y-4">
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-brand-primary/10 text-brand-primary shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-brand-primary leading-tight">
                {facility.name}
              </h3>
              <p className="text-[11px] font-mono text-brand-muted mt-0.5">{facility.code}</p>
            </div>
          </div>

          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusColors[facility.status]}`}
          >
            {facility.status}
          </span>
        </div>

        <p className="text-xs text-brand-muted leading-relaxed">
          {facility.address}
        </p>

        {/* Map / Geofence Blueprint Preview */}
        <div className="h-28 rounded-xl bg-brand-ivory border border-brand-border-subtle relative overflow-hidden flex items-center justify-center p-3 text-center">
          {/* Subtle grid pattern */}
          <div className="absolute inset-0 bg-[radial-gradient(#123C3A_1px,transparent_1px)] [background-size:12px_12px] opacity-15" />
          
          {/* Concentric Geofence Circle indicator */}
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-12 h-12 rounded-full border-2 border-brand-secondary bg-brand-secondary/10 flex items-center justify-center animate-pulse">
              <MapPin className="w-5 h-5 text-brand-secondary" />
            </div>
            <span className="text-[11px] font-mono font-semibold text-brand-primary mt-1">
              {facility.geofenceRadiusMeters}m Geofence Radius
            </span>
            <span className="text-[10px] text-brand-muted font-mono">
              {facility.coordinates.latitude.toFixed(4)}, {facility.coordinates.longitude.toFixed(4)}
            </span>
          </div>
        </div>

        {/* Verification Policies */}
        <div className="space-y-2 text-xs pt-1">
          <div className="flex items-start gap-2 text-brand-muted">
            <Wifi className="w-4 h-4 text-brand-secondary shrink-0 mt-0.5" />
            <span>
              <strong className="text-brand-charcoal">Network:</strong>{' '}
              {facility.networkPolicy.requireNetworkMatch
                ? `SSID: ${facility.networkPolicy.allowedSsidPrefixes.join(', ')}`
                : 'GPS-only (Network optional)'}
            </span>
          </div>

          <div className="flex items-start gap-2 text-brand-muted">
            <Shield className="w-4 h-4 text-brand-secondary shrink-0 mt-0.5" />
            <span>
              <strong className="text-brand-charcoal">Offline Tolerance:</strong>{' '}
              {facility.offlinePolicy.allowOfflineAttendance
                ? `Up to ${facility.offlinePolicy.maxOfflineHours}h buffer permitted`
                : 'Strict online only'}
            </span>
          </div>
        </div>
      </div>

      {/* Card Footer */}
      <div className="mt-5 pt-3 border-t border-brand-border-subtle flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-brand-muted font-medium">
          <Users className="w-4 h-4" />
          <span>{facility.activeEmployeeCount} Staff Assigned</span>
        </div>

        <button
          onClick={() => onEdit(facility)}
          className="inline-flex items-center gap-1 px-3 py-1.5 bg-brand-ivory hover:bg-brand-primary hover:text-white rounded-lg text-xs font-semibold text-brand-primary transition border border-brand-border-subtle"
        >
          <Edit className="w-3.5 h-3.5" />
          <span>Configure</span>
        </button>
      </div>
    </div>
  );
}
