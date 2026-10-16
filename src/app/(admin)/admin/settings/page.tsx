'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { LoadingState } from '@/components/EmptyState';
import { settingsService } from '@/services/settings.service';
import { SystemSettings, MOCK_SYSTEM_SETTINGS } from '@/mocks/settings';
import {
  Building,
  Clock,
  MapPin,
  WifiOff,
  Shield,
  Bell,
  Save,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SystemSettings>(MOCK_SYSTEM_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'org' | 'attendance' | 'verification' | 'offline' | 'security' | 'notifications'
  >('org');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await settingsService.getSettings();
      setSettings(data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updated = await settingsService.updateSettings(settings);
      setSettings(updated);
      setToastMessage('System settings and attendance policies saved successfully.');
      setTimeout(() => setToastMessage(null), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = async () => {
    if (!confirm('Reset all organization settings to system defaults?')) return;
    setIsLoading(true);
    try {
      const reset = await settingsService.resetToDefaults();
      setSettings(reset);
      setToastMessage('Settings restored to factory defaults.');
      setTimeout(() => setToastMessage(null), 4000);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <LoadingState message="Loading system configuration..." />;
  }

  const tabs = [
    { id: 'org', label: 'Organization Profile', icon: Building },
    { id: 'attendance', label: 'Attendance & Grace Rules', icon: Clock },
    { id: 'verification', label: 'Geofence & Wi-Fi', icon: MapPin },
    { id: 'offline', label: 'Offline & Sync Buffer', icon: WifiOff },
    { id: 'security', label: 'Security & Privacy', icon: Shield },
    { id: 'notifications', label: 'Alerts & Digest', icon: Bell },
  ] as const;

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        title="System Settings & Operational Policies"
        subtitle="Manage global organizational parameters, geofence margins, offline buffering tolerances, and compliance rules"
        actions={
          <button
            onClick={handleResetDefaults}
            type="button"
            className="px-3.5 py-2 bg-brand-ivory hover:bg-brand-border-subtle text-brand-charcoal rounded-xl text-xs font-semibold transition border border-brand-border flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5 text-brand-secondary" />
            <span>Restore Defaults</span>
          </button>
        }
      />

      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Tabs and Form Container */}
      <div className="bg-white rounded-3xl border border-brand-border-subtle shadow-card overflow-hidden">
        {/* Tab Navigation */}
        <div className="border-b border-brand-border-subtle bg-brand-ivory/50 flex overflow-x-auto p-1.5 gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition whitespace-nowrap ${
                  isActive
                    ? 'bg-brand-primary text-white shadow-subtle'
                    : 'text-brand-muted hover:text-brand-charcoal hover:bg-brand-ivory'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-brand-mint' : 'text-brand-muted'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 sm:p-8 space-y-6">
          {/* TAB 1: Organization Profile */}
          {activeTab === 'org' && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h3 className="font-bold text-sm text-brand-primary">Organization Identity</h3>
                <p className="text-xs text-brand-muted">General brand details displayed across portals</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-brand-charcoal uppercase tracking-wider mb-1.5">
                    Organization Name
                  </label>
                  <input
                    type="text"
                    required
                    value={settings.organization.companyName}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        organization: { ...settings.organization, companyName: e.target.value },
                      })
                    }
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-brand-border bg-white outline-none focus:border-brand-secondary font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-charcoal uppercase tracking-wider mb-1.5">
                    Brand Tagline
                  </label>
                  <input
                    type="text"
                    value={settings.organization.tagline}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        organization: { ...settings.organization, tagline: e.target.value },
                      })
                    }
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-brand-border bg-white outline-none focus:border-brand-secondary font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-charcoal uppercase tracking-wider mb-1.5">
                    Support Inquiries Email
                  </label>
                  <input
                    type="email"
                    required
                    value={settings.organization.supportEmail}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        organization: { ...settings.organization, supportEmail: e.target.value },
                      })
                    }
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-brand-border bg-white outline-none focus:border-brand-secondary font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-charcoal uppercase tracking-wider mb-1.5">
                    System Timezone
                  </label>
                  <select
                    value={settings.organization.timezone}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        organization: { ...settings.organization, timezone: e.target.value },
                      })
                    }
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-brand-border bg-white outline-none focus:border-brand-secondary font-medium"
                  >
                    <option value="America/Chicago (CST)">America/Chicago (CST)</option>
                    <option value="America/New_York (EST)">America/New_York (EST)</option>
                    <option value="America/Los_Angeles (PST)">America/Los_Angeles (PST)</option>
                    <option value="UTC">Coordinated Universal Time (UTC)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Attendance Policies */}
          {activeTab === 'attendance' && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h3 className="font-bold text-sm text-brand-primary">Attendance Rules & Thresholds</h3>
                <p className="text-xs text-brand-muted">Punctuality parameters and automated checkout triggers</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-brand-charcoal uppercase tracking-wider mb-1.5">
                    Default Grace Period (Minutes)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={settings.attendancePolicies.defaultGracePeriodMinutes}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        attendancePolicies: {
                          ...settings.attendancePolicies,
                          defaultGracePeriodMinutes: parseInt(e.target.value, 10) || 0,
                        },
                      })
                    }
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-brand-border bg-white outline-none focus:border-brand-secondary font-mono"
                  />
                  <p className="text-[11px] text-brand-muted mt-1">
                    Arrivals within this margin after shift start are recorded as on-time.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-charcoal uppercase tracking-wider mb-1.5">
                    Auto-Checkout Limit (Hours)
                  </label>
                  <input
                    type="number"
                    min="4"
                    max="24"
                    value={settings.attendancePolicies.autoCheckoutHours}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        attendancePolicies: {
                          ...settings.attendancePolicies,
                          autoCheckoutHours: parseInt(e.target.value, 10) || 12,
                        },
                      })
                    }
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-brand-border bg-white outline-none focus:border-brand-secondary font-mono"
                  />
                  <p className="text-[11px] text-brand-muted mt-1">
                    Automatically closes unlogged shifts after this duration.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-charcoal uppercase tracking-wider mb-1.5">
                    Allow Early Check-In (Minutes)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="120"
                    value={settings.attendancePolicies.allowEarlyCheckInMinutes}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        attendancePolicies: {
                          ...settings.attendancePolicies,
                          allowEarlyCheckInMinutes: parseInt(e.target.value, 10) || 0,
                        },
                      })
                    }
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-brand-border bg-white outline-none focus:border-brand-secondary font-mono"
                  />
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.attendancePolicies.strictShiftEnforcement}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          attendancePolicies: {
                            ...settings.attendancePolicies,
                            strictShiftEnforcement: e.target.checked,
                          },
                        })
                      }
                      className="rounded text-brand-secondary focus:ring-brand-secondary"
                    />
                    <span className="text-xs font-semibold text-brand-charcoal">
                      Enforce strict shift assignment matching
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Geofence & Wi-Fi */}
          {activeTab === 'verification' && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h3 className="font-bold text-sm text-brand-primary">Perimeter & Connectivity Rules</h3>
                <p className="text-xs text-brand-muted">Hardware geofencing and campus network validation</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-brand-charcoal uppercase tracking-wider mb-1.5">
                    Default Geofence Radius (Meters)
                  </label>
                  <input
                    type="number"
                    min="25"
                    max="1000"
                    value={settings.facilityVerification.defaultGeofenceRadiusMeters}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        facilityVerification: {
                          ...settings.facilityVerification,
                          defaultGeofenceRadiusMeters: parseInt(e.target.value, 10) || 150,
                        },
                      })
                    }
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-brand-border bg-white outline-none focus:border-brand-secondary font-mono"
                  />
                </div>

                <div className="space-y-3 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.facilityVerification.requireGpsVerification}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          facilityVerification: {
                            ...settings.facilityVerification,
                            requireGpsVerification: e.target.checked,
                          },
                        })
                      }
                      className="rounded text-brand-secondary focus:ring-brand-secondary"
                    />
                    <span className="text-xs font-semibold text-brand-charcoal">
                      Require device GPS coordinate matching
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.facilityVerification.requireWifiSubnetMatch}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          facilityVerification: {
                            ...settings.facilityVerification,
                            requireWifiSubnetMatch: e.target.checked,
                          },
                        })
                      }
                      className="rounded text-brand-secondary focus:ring-brand-secondary"
                    />
                    <span className="text-xs font-semibold text-brand-charcoal">
                      Validate facility Wi-Fi subnet SSID prefix
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Offline & Sync Buffer */}
          {activeTab === 'offline' && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h3 className="font-bold text-sm text-brand-primary">Offline Queue Buffer Policies</h3>
                <p className="text-xs text-brand-muted">IndexedDB retention and supervisor audit triggers</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-brand-charcoal uppercase tracking-wider mb-1.5">
                    Max Offline Retention Buffer (Hours)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="72"
                    value={settings.offlinePolicy.maxOfflineQueueHours}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        offlinePolicy: {
                          ...settings.offlinePolicy,
                          maxOfflineQueueHours: parseInt(e.target.value, 10) || 12,
                        },
                      })
                    }
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-brand-border bg-white outline-none focus:border-brand-secondary font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-charcoal uppercase tracking-wider mb-1.5">
                    Supervisor Review Threshold (Hours)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="24"
                    value={settings.offlinePolicy.requireReviewThresholdHours}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        offlinePolicy: {
                          ...settings.offlinePolicy,
                          requireReviewThresholdHours: parseInt(e.target.value, 10) || 4,
                        },
                      })
                    }
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-brand-border bg-white outline-none focus:border-brand-secondary font-mono"
                  />
                  <p className="text-[11px] text-brand-muted mt-1">
                    Records synchronized past this threshold require manual supervisor sign-off.
                  </p>
                </div>

                <div className="col-span-2 space-y-2 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.offlinePolicy.allowOfflineAttendance}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          offlinePolicy: {
                            ...settings.offlinePolicy,
                            allowOfflineAttendance: e.target.checked,
                          },
                        })
                      }
                      className="rounded text-brand-secondary focus:ring-brand-secondary"
                    />
                    <span className="text-xs font-semibold text-brand-charcoal">
                      Enable offline attendance queueing in mobile browser IndexedDB
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.offlinePolicy.autoSyncOnReconnect}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          offlinePolicy: {
                            ...settings.offlinePolicy,
                            autoSyncOnReconnect: e.target.checked,
                          },
                        })
                      }
                      className="rounded text-brand-secondary focus:ring-brand-secondary"
                    />
                    <span className="text-xs font-semibold text-brand-charcoal">
                      Automatically initiate batch synchronization upon network reconnection
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: Security & Privacy */}
          {activeTab === 'security' && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h3 className="font-bold text-sm text-brand-primary">Security & Biometric Privacy</h3>
                <p className="text-xs text-brand-muted">Access controls, token policies, and biometric confidentiality</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-brand-charcoal uppercase tracking-wider mb-1.5">
                    Session Inactivity Timeout (Minutes)
                  </label>
                  <input
                    type="number"
                    min="15"
                    max="480"
                    value={settings.securityPrivacy.sessionTimeoutMinutes}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        securityPrivacy: {
                          ...settings.securityPrivacy,
                          sessionTimeoutMinutes: parseInt(e.target.value, 10) || 60,
                        },
                      })
                    }
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-brand-border bg-white outline-none focus:border-brand-secondary font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-charcoal uppercase tracking-wider mb-1.5">
                    Audit Log Retention Period (Days)
                  </label>
                  <input
                    type="number"
                    min="30"
                    max="365"
                    value={settings.securityPrivacy.biometricRetentionPolicyDays}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        securityPrivacy: {
                          ...settings.securityPrivacy,
                          biometricRetentionPolicyDays: parseInt(e.target.value, 10) || 90,
                        },
                      })
                    }
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-brand-border bg-white outline-none focus:border-brand-secondary font-mono"
                  />
                </div>

                <div className="col-span-2 space-y-2 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.securityPrivacy.mfaEnforcedForAdmins}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          securityPrivacy: {
                            ...settings.securityPrivacy,
                            mfaEnforcedForAdmins: e.target.checked,
                          },
                        })
                      }
                      className="rounded text-brand-secondary focus:ring-brand-secondary"
                    />
                    <span className="text-xs font-semibold text-brand-charcoal">
                      Enforce Multi-Factor Authentication (MFA) for administrative accounts
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.securityPrivacy.preventClientFormulaInjection}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          securityPrivacy: {
                            ...settings.securityPrivacy,
                            preventClientFormulaInjection: e.target.checked,
                          },
                        })
                      }
                      className="rounded text-brand-secondary focus:ring-brand-secondary"
                    />
                    <span className="text-xs font-semibold text-brand-charcoal">
                      Sanitize formula injection characters in all exported reports
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: Notifications */}
          {activeTab === 'notifications' && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h3 className="font-bold text-sm text-brand-primary">Automated Alerts & Digest Dispatch</h3>
                <p className="text-xs text-brand-muted">Configured triggers for supervisor alerts</p>
              </div>

              <div className="space-y-3 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notifications.notifyLateArrivals}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        notifications: {
                          ...settings.notifications,
                          notifyLateArrivals: e.target.checked,
                        },
                      })
                    }
                    className="rounded text-brand-secondary focus:ring-brand-secondary"
                  />
                  <span className="text-xs font-semibold text-brand-charcoal">
                    Notify shift supervisor on late employee arrivals exceeding grace period
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notifications.notifyPendingOfflineQueue}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        notifications: {
                          ...settings.notifications,
                          notifyPendingOfflineQueue: e.target.checked,
                        },
                      })
                    }
                    className="rounded text-brand-secondary focus:ring-brand-secondary"
                  />
                  <span className="text-xs font-semibold text-brand-charcoal">
                    Alert facility administrator when offline queue exceeds 10 pending events
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notifications.notifyUnusualLocationAttempts}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        notifications: {
                          ...settings.notifications,
                          notifyUnusualLocationAttempts: e.target.checked,
                        },
                      })
                    }
                    className="rounded text-brand-secondary focus:ring-brand-secondary"
                  />
                  <span className="text-xs font-semibold text-brand-charcoal">
                    Flag attendance attempts made greater than 500m from authorized facility geofence
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notifications.dailyDigestEmail}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        notifications: {
                          ...settings.notifications,
                          dailyDigestEmail: e.target.checked,
                        },
                      })
                    }
                    className="rounded text-brand-secondary focus:ring-brand-secondary"
                  />
                  <span className="text-xs font-semibold text-brand-charcoal">
                    Send daily attendance compliance digest to department managers
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Form Submit Footer */}
          <div className="pt-4 border-t border-brand-border-subtle flex items-center justify-end gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-xs font-bold transition shadow-card flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4 text-brand-mint" />
              <span>{isSaving ? 'Saving Policies...' : 'Save Configuration Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
