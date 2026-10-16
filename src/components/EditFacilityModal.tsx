'use client';

import React, { useState } from 'react';
import { Facility } from '@/types/facility';
import { facilityService, CreateFacilityInput } from '@/services/facility.service';
import { X, Building2, MapPin, Shield } from 'lucide-react';

interface EditFacilityModalProps {
  facility?: Facility | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (facility: Facility) => void;
}

export function EditFacilityModal({
  facility,
  isOpen,
  onClose,
  onSaved,
}: EditFacilityModalProps) {
  const isEditing = !!facility;

  const [name, setName] = useState(facility?.name || '');
  const [code, setCode] = useState(facility?.code || '');
  const [address, setAddress] = useState(facility?.address || '');
  const [latitude, setLatitude] = useState(facility?.coordinates.latitude.toString() || '41.8951');
  const [longitude, setLongitude] = useState(facility?.coordinates.longitude.toString() || '-87.6242');
  const [radius, setRadius] = useState(facility?.geofenceRadiusMeters.toString() || '150');
  const [requireNetwork, setRequireNetwork] = useState(facility?.networkPolicy.requireNetworkMatch ?? true);
  const [ssidPrefixes, setSsidPrefixes] = useState(facility?.networkPolicy.allowedSsidPrefixes.join(', ') || 'MMC-SecureCorp');
  const [allowOffline, setAllowOffline] = useState(facility?.offlinePolicy.allowOfflineAttendance ?? true);
  const [maxOfflineHours, setMaxOfflineHours] = useState(facility?.offlinePolicy.maxOfflineHours.toString() || '12');
  const [status, setStatus] = useState<Facility['status']>(facility?.status || 'active');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      setError('Facility Name and Code are required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const input: CreateFacilityInput = {
        name: name.trim(),
        code: code.trim(),
        address: address.trim(),
        latitude: parseFloat(latitude) || 41.8951,
        longitude: parseFloat(longitude) || -87.6242,
        geofenceRadiusMeters: parseInt(radius, 10) || 150,
        requireNetworkMatch: requireNetwork,
        allowedSsidPrefixes: ssidPrefixes.split(',').map((s) => s.trim()).filter(Boolean),
        allowOfflineAttendance: allowOffline,
        maxOfflineHours: parseInt(maxOfflineHours, 10) || 12,
        requireReviewThresholdHours: 4,
        status,
      };

      let result: Facility | undefined;
      if (isEditing && facility) {
        result = await facilityService.updateFacility(facility.id, input);
      } else {
        result = await facilityService.createFacility(input);
      }

      if (result) {
        onSaved(result);
        onClose();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-primary/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-modal border border-brand-border max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-brand-border-subtle bg-brand-ivory flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-brand-primary/10 text-brand-primary">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-brand-primary">
                {isEditing ? 'Configure Facility Parameters' : 'Add New Facility'}
              </h2>
              <p className="text-xs text-brand-muted">
                {isEditing ? facility.code : 'Define geofence boundary & verification rules'}
              </p>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-brand-charcoal uppercase tracking-wider mb-1.5">
                Facility Name *
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
                Facility Code *
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-brand-border focus:border-brand-secondary outline-none transition bg-white uppercase font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-brand-charcoal uppercase tracking-wider mb-1.5">
              Physical Street Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-brand-border focus:border-brand-secondary outline-none transition bg-white"
            />
          </div>

          <div className="p-4 bg-brand-ivory rounded-2xl border border-brand-border-subtle space-y-3">
            <h3 className="text-xs font-bold text-brand-primary flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-brand-secondary" />
              <span>Geolocation & Geofence Coordinates</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-brand-muted mb-1">
                  Latitude
                </label>
                <input
                  type="text"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-brand-border bg-white outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-brand-muted mb-1">
                  Longitude
                </label>
                <input
                  type="text"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-brand-border bg-white outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-brand-muted mb-1">
                  Geofence Radius (Meters)
                </label>
                <input
                  type="number"
                  min="25"
                  max="2000"
                  value={radius}
                  onChange={(e) => setRadius(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-brand-border bg-white outline-none font-mono"
                />
              </div>
            </div>
          </div>

          <div className="p-4 bg-brand-ivory rounded-2xl border border-brand-border-subtle space-y-3">
            <h3 className="text-xs font-bold text-brand-primary flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-brand-secondary" />
              <span>Network & Offline Policies</span>
            </h3>

            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requireNetwork}
                  onChange={(e) => setRequireNetwork(e.target.checked)}
                  className="rounded text-brand-secondary focus:ring-brand-secondary"
                />
                <span className="text-xs font-medium text-brand-charcoal">
                  Enforce matching facility Wi-Fi SSID / subnet validation
                </span>
              </label>

              {requireNetwork && (
                <div>
                  <label className="block text-[11px] text-brand-muted mb-1">
                    Allowed SSID Prefixes (comma separated)
                  </label>
                  <input
                    type="text"
                    value={ssidPrefixes}
                    onChange={(e) => setSsidPrefixes(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-brand-border bg-white outline-none"
                  />
                </div>
              )}

              <label className="flex items-center gap-2 cursor-pointer pt-2">
                <input
                  type="checkbox"
                  checked={allowOffline}
                  onChange={(e) => setAllowOffline(e.target.checked)}
                  className="rounded text-brand-secondary focus:ring-brand-secondary"
                />
                <span className="text-xs font-medium text-brand-charcoal">
                  Allow offline attendance queueing for this facility
                </span>
              </label>

              {allowOffline && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] text-brand-muted mb-1">
                      Max Offline Hours Buffer
                    </label>
                    <input
                      type="number"
                      value={maxOfflineHours}
                      onChange={(e) => setMaxOfflineHours(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-brand-border bg-white outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-brand-muted mb-1">
                      Facility Operational Status
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as Facility['status'])}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-brand-border bg-white outline-none capitalize"
                    >
                      <option value="active">Active</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
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
              {isSubmitting ? 'Saving...' : isEditing ? 'Update Facility' : 'Create Facility'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
