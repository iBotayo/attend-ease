'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { BrandLogo } from '@/components/BrandLogo';
import { organizationService } from '@/services/organization.service';
import { useAuth } from '@/context/AuthContext';
import { SetupOrganizationDto } from '@/types/organization';
import {
  Building2,
  MapPin,
  ShieldCheck,
  Clock,
  Users,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  AlertCircle,
  Plus,
  Trash2,
  Crosshair,
  Compass,
  Check,
  Lock,
} from 'lucide-react';

interface EmployeeDraft {
  name: string;
  email: string;
  role: 'employee' | 'supervisor' | 'facility_admin';
  departmentName: string;
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
];

function SetupOrganizationContent() {
  const searchParams = useSearchParams();
  const { isMockMode } = useAuth();

  const orgIdParam = searchParams.get('orgId') || 'org-demo-1';
  const emailParam = searchParams.get('email') || '';

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setupComplete, setSetupComplete] = useState(false);
  const [gpsDetecting, setGpsDetecting] = useState(false);
  const [gpsNotice, setGpsNotice] = useState<string | null>(null);

  // Step 1: Profile
  const [displayName, setDisplayName] = useState('');
  const [industry, setIndustry] = useState('Technology & Professional Services');
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  );

  // Step 2: Facility & Geofence
  const [facilityName, setFacilityName] = useState('Headquarters - Main Facility');
  const [facilityAddress, setFacilityAddress] = useState('100 Innovation Blvd, Tech Hub');
  const [latitude, setLatitude] = useState(37.7749);
  const [longitude, setLongitude] = useState(-122.4194);
  const [geofenceRadiusMeters, setGeofenceRadiusMeters] = useState(150);

  // Step 3: Attendance Rules
  const [requireBiometrics, setRequireBiometrics] = useState(true);
  const [allowOffline, setAllowOffline] = useState(true);
  const [gracePeriodMinutes, setGracePeriodMinutes] = useState(15);

  // Step 4: Shift Schedule
  const [shiftName, setShiftName] = useState('General Day Shift');
  const [shiftStartTime, setShiftStartTime] = useState('09:00');
  const [shiftEndTime, setShiftEndTime] = useState('17:00');
  const [shiftDays, setShiftDays] = useState<number[]>([1, 2, 3, 4, 5]);

  // Step 5: Initial Team Members
  const [employees, setEmployees] = useState<EmployeeDraft[]>([
    {
      name: 'Operations Lead',
      email: 'ops@company.internal',
      role: 'supervisor',
      departmentName: 'Operations',
    },
  ]);
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpEmail, setNewEmpEmail] = useState('');
  const [newEmpRole, setNewEmpRole] = useState<'employee' | 'supervisor' | 'facility_admin'>('employee');
  const [newEmpDept, setNewEmpDept] = useState('General Operations');

  const toggleDay = (day: number) => {
    if (shiftDays.includes(day)) {
      if (shiftDays.length > 1) {
        setShiftDays(shiftDays.filter((d) => d !== day));
      }
    } else {
      setShiftDays([...shiftDays, day].sort());
    }
  };

  const handleAddEmployee = () => {
    if (!newEmpName.trim() || !newEmpEmail.trim()) {
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmpEmail.trim())) {
      setError('Please provide a valid email for the team member.');
      return;
    }

    setEmployees([
      ...employees,
      {
        name: newEmpName.trim(),
        email: newEmpEmail.trim().toLowerCase(),
        role: newEmpRole,
        departmentName: newEmpDept.trim() || 'General Operations',
      },
    ]);
    setNewEmpName('');
    setNewEmpEmail('');
    setNewEmpDept('General Operations');
    setError(null);
  };

  const handleRemoveEmployee = (index: number) => {
    setEmployees(employees.filter((_, i) => i !== index));
  };

  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      setGpsNotice('Geolocation is not supported by this browser.');
      return;
    }

    setGpsDetecting(true);
    setGpsNotice(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(parseFloat(pos.coords.latitude.toFixed(6)));
        setLongitude(parseFloat(pos.coords.longitude.toFixed(6)));
        setGpsDetecting(false);
        setGpsNotice(
          `Detected location with accuracy within ±${Math.round(pos.coords.accuracy)}m.`
        );
      },
      (err) => {
        setGpsDetecting(false);
        setGpsNotice(`Could not retrieve location: ${err.message}. Retaining coordinates.`);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const validateCurrentStep = (): boolean => {
    setError(null);
    if (step === 1) {
      if (!displayName.trim()) {
        setError('Please enter a display or brand name for the organization.');
        return false;
      }
    } else if (step === 2) {
      if (!facilityName.trim()) {
        setError('Please provide a facility name.');
        return false;
      }
      if (!facilityAddress.trim()) {
        setError('Please provide a physical address for this facility.');
        return false;
      }
      if (isNaN(latitude) || latitude < -90 || latitude > 90) {
        setError('Please enter a valid latitude (-90 to 90).');
        return false;
      }
      if (isNaN(longitude) || longitude < -180 || longitude > 180) {
        setError('Please enter a valid longitude (-180 to 180).');
        return false;
      }
      if (geofenceRadiusMeters < 20 || geofenceRadiusMeters > 5000) {
        setError('Geofence radius must be between 20 and 5,000 meters.');
        return false;
      }
    } else if (step === 3) {
      if (gracePeriodMinutes < 0 || gracePeriodMinutes > 120) {
        setError('Grace period must be between 0 and 120 minutes.');
        return false;
      }
    } else if (step === 4) {
      if (!shiftName.trim()) {
        setError('Please enter a shift name.');
        return false;
      }
      if (!shiftStartTime || !shiftEndTime) {
        setError('Please enter both shift start and end times.');
        return false;
      }
      if (shiftDays.length === 0) {
        setError('Please select at least one active workday for this shift.');
        return false;
      }
    }
    return true;
  };

  const nextStep = () => {
    if (validateCurrentStep()) {
      setStep((prev) => Math.min(prev + 1, 6));
    }
  };

  const prevStep = () => {
    setError(null);
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleCompleteSetup = async () => {
    if (!validateCurrentStep()) return;

    setIsSubmitting(true);
    setError(null);

    const setupPayload: SetupOrganizationDto = {
      organizationId: orgIdParam,
      displayName: displayName.trim(),
      industry: industry.trim(),
      timezone: timezone.trim(),
      facilityName: facilityName.trim(),
      facilityAddress: facilityAddress.trim(),
      latitude,
      longitude,
      geofenceRadiusMeters,
      requireBiometrics,
      allowOffline,
      gracePeriodMinutes,
      shiftName: shiftName.trim(),
      shiftStartTime,
      shiftEndTime,
      shiftDays,
      initialEmployees: employees.map((e) => ({
        name: e.name,
        email: e.email,
        role: e.role,
        departmentName: e.departmentName,
      })),
    };

    try {
      await organizationService.completeSetup(setupPayload);
      setSetupComplete(true);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to complete organization setup. Please check details and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepsList = [
    { num: 1, title: 'Profile', icon: Building2 },
    { num: 2, title: 'Facility', icon: MapPin },
    { num: 3, title: 'Policies', icon: ShieldCheck },
    { num: 4, title: 'Shifts', icon: Clock },
    { num: 5, title: 'Team', icon: Users },
    { num: 6, title: 'Review', icon: CheckCircle2 },
  ];

  return (
    <div className="min-h-screen bg-brand-ivory flex flex-col py-8 px-4 sm:px-6 lg:px-8">
      {/* Top Header */}
      <div className="max-w-4xl mx-auto w-full flex items-center justify-between pb-6 border-b border-brand-border">
        <BrandLogo size="md" showTagline />
        <div className="flex items-center gap-2">
          {isMockMode ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-brand-mint text-brand-primary border border-brand-primary/10">
              <Sparkles className="w-3 h-3 text-brand-secondary" />
              Demo Simulation Mode
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-900 border border-emerald-300">
              <Lock className="w-3 h-3 text-emerald-700" />
              Live Backend Connected
            </span>
          )}
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-4xl mx-auto w-full mt-6">
        {/* Wizard Step Progress Tracker */}
        <div className="mb-8">
          <h1 className="text-2xl font-black text-brand-primary tracking-tight">
            Organization Setup Wizard
          </h1>
          <p className="text-xs text-brand-muted mt-1">
            Configure initial facilities, geofence, attendance policies, and work schedules for{' '}
            <strong className="text-brand-charcoal">{emailParam || 'your organization'}</strong>.
          </p>

          <div className="mt-5 grid grid-cols-6 gap-2">
            {stepsList.map((s) => {
              const Icon = s.icon;
              const isPast = step > s.num || setupComplete;
              const isCurrent = step === s.num && !setupComplete;
              return (
                <div
                  key={s.num}
                  className={`flex flex-col items-center p-2 rounded-xl border text-center transition-all ${
                    isCurrent
                      ? 'bg-brand-primary text-white border-brand-primary shadow-subtle'
                      : isPast
                      ? 'bg-brand-mint/40 text-brand-primary border-brand-mint-dark/20'
                      : 'bg-white text-brand-muted border-brand-border-subtle opacity-70'
                  }`}
                >
                  <div className="flex items-center justify-center w-6 h-6 rounded-full mb-1 text-xs">
                    {isPast ? (
                      <Check className="w-4 h-4 text-emerald-700" />
                    ) : (
                      <Icon className="w-4 h-4" />
                    )}
                  </div>
                  <span className="text-[11px] font-bold hidden sm:inline">{s.title}</span>
                  <span className="text-[10px] sm:hidden">#{s.num}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Wizard Card Body */}
        <div className="bg-white rounded-3xl border border-brand-border-subtle shadow-card p-6 sm:p-10">
          {error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-medium flex items-start gap-2.5 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {setupComplete ? (
            /* Celebration Completion View */
            <div className="text-center py-8 space-y-5 animate-fade-in">
              <div className="w-16 h-16 bg-brand-mint rounded-3xl flex items-center justify-center mx-auto text-brand-primary shadow-subtle">
                <CheckCircle2 className="w-10 h-10 text-brand-secondary" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-brand-primary">Setup Complete!</h2>
                <p className="text-xs text-brand-muted mt-1 max-w-md mx-auto">
                  Your organization profile, primary facility, attendance policies, and initial
                  schedule have been configured successfully.
                </p>
              </div>

              <div className="bg-brand-ivory rounded-2xl p-4 max-w-md mx-auto text-left border border-brand-border text-xs space-y-2">
                <div className="flex justify-between py-1 border-b border-brand-border/60">
                  <span className="text-brand-muted">Organization Name</span>
                  <span className="font-bold text-brand-charcoal">{displayName || 'Main Org'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-brand-border/60">
                  <span className="text-brand-muted">Initial Facility</span>
                  <span className="font-bold text-brand-charcoal">{facilityName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-brand-border/60">
                  <span className="text-brand-muted">Geofence Radius</span>
                  <span className="font-bold text-brand-charcoal">{geofenceRadiusMeters} meters</span>
                </div>
                <div className="flex justify-between py-1 border-b border-brand-border/60">
                  <span className="text-brand-muted">Primary Shift</span>
                  <span className="font-bold text-brand-charcoal">
                    {shiftName} ({shiftStartTime} - {shiftEndTime})
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-brand-muted">Team Members Provisioned</span>
                  <span className="font-bold text-brand-charcoal">{employees.length + 1} users</span>
                </div>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/admin/dashboard"
                  className="px-6 py-3 rounded-xl bg-brand-primary text-white text-xs font-bold hover:bg-brand-primary-hover shadow-subtle flex items-center justify-center gap-2"
                >
                  Go to Admin Dashboard
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href={`/register/success?orgName=${encodeURIComponent(displayName || 'Your Organization')}&email=${encodeURIComponent(emailParam)}&orgId=${encodeURIComponent(orgIdParam)}`}
                  className="px-6 py-3 rounded-xl bg-white text-brand-secondary border border-brand-secondary/30 hover:bg-brand-mint/20 text-xs font-bold flex items-center justify-center"
                >
                  View Activation Receipt
                </Link>
                <Link
                  href="/login"
                  className="px-6 py-3 rounded-xl bg-brand-ivory text-brand-charcoal text-xs font-semibold hover:bg-brand-border/40 border border-brand-border flex items-center justify-center"
                >
                  Return to Login
                </Link>
              </div>
            </div>
          ) : (
            /* Wizard Steps Content */
            <div>
              {/* STEP 1: ORGANIZATION PROFILE */}
              {step === 1 && (
                <div className="space-y-6 animate-fade-in">
                  <div>
                    <h2 className="text-lg font-black text-brand-primary flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-brand-secondary" />
                      Step 1: Organization Profile
                    </h2>
                    <p className="text-xs text-brand-muted mt-1">
                      Set up your company or institution branding and operational regional defaults.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-brand-charcoal mb-1">
                        Brand / Display Name *
                      </label>
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="e.g. Apex Health Logistics"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border bg-white text-brand-charcoal text-xs focus:outline-none focus:ring-2 focus:ring-brand-primary"
                      />
                      <span className="text-[11px] text-brand-muted mt-1 block">
                        This name will be displayed on employee check-in portals and badges.
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-brand-charcoal mb-1">
                          Industry Sector
                        </label>
                        <select
                          value={industry}
                          onChange={(e) => setIndustry(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border bg-white text-brand-charcoal text-xs focus:outline-none focus:ring-2 focus:ring-brand-primary"
                        >
                          <option value="Technology & Professional Services">
                            Technology & Professional Services
                          </option>
                          <option value="Healthcare & Clinical Services">
                            Healthcare & Clinical Services
                          </option>
                          <option value="Manufacturing & Warehousing">
                            Manufacturing & Warehousing
                          </option>
                          <option value="Education & Academic Institutions">
                            Education & Academic Institutions
                          </option>
                          <option value="Government & Public Sector">
                            Government & Public Sector
                          </option>
                          <option value="Hospitality & Retail">Hospitality & Retail</option>
                          <option value="Construction & Field Services">
                            Construction & Field Services
                          </option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-brand-charcoal mb-1">
                          Primary Timezone
                        </label>
                        <select
                          value={timezone}
                          onChange={(e) => setTimezone(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border bg-white text-brand-charcoal text-xs focus:outline-none focus:ring-2 focus:ring-brand-primary"
                        >
                          <option value="UTC">UTC (Universal Coordinated Time)</option>
                          <option value="America/New_York">America/New_York (Eastern Time)</option>
                          <option value="America/Chicago">America/Chicago (Central Time)</option>
                          <option value="America/Denver">America/Denver (Mountain Time)</option>
                          <option value="America/Los_Angeles">America/Los_Angeles (Pacific Time)</option>
                          <option value="Europe/London">Europe/London (GMT/BST)</option>
                          <option value="Europe/Paris">Europe/Paris (CET)</option>
                          <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                          <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: FACILITY & GEOFENCE */}
              {step === 2 && (
                <div className="space-y-6 animate-fade-in">
                  <div>
                    <h2 className="text-lg font-black text-brand-primary flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-brand-secondary" />
                      Step 2: Primary Facility & Geofence
                    </h2>
                    <p className="text-xs text-brand-muted mt-1">
                      Configure your first physical site and geofence boundary for GPS check-in verification.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-brand-charcoal mb-1">
                        Facility Name *
                      </label>
                      <input
                        type="text"
                        value={facilityName}
                        onChange={(e) => setFacilityName(e.target.value)}
                        placeholder="e.g. Downtown Innovation Center"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border bg-white text-brand-charcoal text-xs focus:outline-none focus:ring-2 focus:ring-brand-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-brand-charcoal mb-1">
                        Physical Street Address *
                      </label>
                      <input
                        type="text"
                        value={facilityAddress}
                        onChange={(e) => setFacilityAddress(e.target.value)}
                        placeholder="e.g. 500 Market St, Suite 400"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border bg-white text-brand-charcoal text-xs focus:outline-none focus:ring-2 focus:ring-brand-primary"
                      />
                    </div>

                    <div className="bg-brand-ivory p-4 rounded-2xl border border-brand-border space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <span className="text-xs font-bold text-brand-primary flex items-center gap-1.5">
                          <Compass className="w-4 h-4 text-brand-secondary" />
                          GPS Coordinates & Perimeter
                        </span>
                        <button
                          type="button"
                          onClick={handleDetectGPS}
                          disabled={gpsDetecting}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-primary text-white text-[11px] font-semibold hover:bg-brand-primary-hover disabled:opacity-50"
                        >
                          <Crosshair className={`w-3.5 h-3.5 ${gpsDetecting ? 'animate-spin' : ''}`} />
                          {gpsDetecting ? 'Detecting Location...' : 'Use My Current Location'}
                        </button>
                      </div>

                      {gpsNotice && (
                        <div className="text-[11px] text-brand-secondary bg-brand-mint/40 p-2 rounded-lg border border-brand-mint-dark/20">
                          {gpsNotice}
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-brand-muted mb-1">
                            Latitude (-90 to 90)
                          </label>
                          <input
                            type="number"
                            step="0.000001"
                            value={latitude}
                            onChange={(e) => setLatitude(parseFloat(e.target.value))}
                            className="w-full px-3 py-2 rounded-lg border border-brand-border bg-white text-brand-charcoal text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-brand-muted mb-1">
                            Longitude (-180 to 180)
                          </label>
                          <input
                            type="number"
                            step="0.000001"
                            value={longitude}
                            onChange={(e) => setLongitude(parseFloat(e.target.value))}
                            className="w-full px-3 py-2 rounded-lg border border-brand-border bg-white text-brand-charcoal text-xs font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-semibold text-brand-charcoal">
                            Geofence Radius: {geofenceRadiusMeters} meters
                          </span>
                          <span className="text-brand-muted text-[11px]">
                            Recommended: 100 - 300m for urban buildings
                          </span>
                        </div>
                        <input
                          type="range"
                          min="20"
                          max="1000"
                          step="10"
                          value={geofenceRadiusMeters}
                          onChange={(e) => setGeofenceRadiusMeters(parseInt(e.target.value, 10))}
                          className="w-full accent-brand-secondary cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: ATTENDANCE RULES */}
              {step === 3 && (
                <div className="space-y-6 animate-fade-in">
                  <div>
                    <h2 className="text-lg font-black text-brand-primary flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-brand-secondary" />
                      Step 3: Verification & Offline Policies
                    </h2>
                    <p className="text-xs text-brand-muted mt-1">
                      Enforce anti-spoofing biometrics and configure how offline records are handled.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-start justify-between p-4 rounded-2xl border border-brand-border bg-brand-ivory/50">
                      <div className="pr-4">
                        <div className="text-xs font-bold text-brand-charcoal">
                          Enforce Biometric Identity & Anti-Spoofing Liveness
                        </div>
                        <p className="text-[11px] text-brand-muted mt-0.5">
                          Employees must complete a live camera capture and pass facial verification
                          before clocking in. Client feeds are validated through biometric service.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={requireBiometrics}
                        onChange={(e) => setRequireBiometrics(e.target.checked)}
                        className="mt-1 w-4 h-4 accent-brand-primary rounded cursor-pointer"
                      />
                    </div>

                    <div className="flex items-start justify-between p-4 rounded-2xl border border-brand-border bg-brand-ivory/50">
                      <div className="pr-4">
                        <div className="text-xs font-bold text-brand-charcoal">
                          Allow Offline Attendance Queueing
                        </div>
                        <p className="text-[11px] text-brand-muted mt-0.5">
                          Permits workers in remote or signal-deprived zones to punch attendance locally.
                          Events are stored securely in IndexedDB and synchronized upon reconnection.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={allowOffline}
                        onChange={(e) => setAllowOffline(e.target.checked)}
                        className="mt-1 w-4 h-4 accent-brand-primary rounded cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-brand-charcoal mb-1">
                        Arrival Grace Period (Minutes)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="120"
                        value={gracePeriodMinutes}
                        onChange={(e) => setGracePeriodMinutes(parseInt(e.target.value, 10) || 0)}
                        className="w-full sm:w-48 px-3.5 py-2.5 rounded-xl border border-brand-border bg-white text-brand-charcoal text-xs focus:outline-none focus:ring-2 focus:ring-brand-primary"
                      />
                      <span className="text-[11px] text-brand-muted mt-1 block">
                        Grace window permitted past scheduled shift start before marking as late.
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: PRIMARY SHIFT SCHEDULE */}
              {step === 4 && (
                <div className="space-y-6 animate-fade-in">
                  <div>
                    <h2 className="text-lg font-black text-brand-primary flex items-center gap-2">
                      <Clock className="w-5 h-5 text-brand-secondary" />
                      Step 4: Primary Shift Schedule
                    </h2>
                    <p className="text-xs text-brand-muted mt-1">
                      Define the baseline work schedule for employees assigned to this facility.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-brand-charcoal mb-1">
                        Shift Name *
                      </label>
                      <input
                        type="text"
                        value={shiftName}
                        onChange={(e) => setShiftName(e.target.value)}
                        placeholder="e.g. Standard Morning Shift"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border bg-white text-brand-charcoal text-xs focus:outline-none focus:ring-2 focus:ring-brand-primary"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-brand-charcoal mb-1">
                          Start Time *
                        </label>
                        <input
                          type="time"
                          value={shiftStartTime}
                          onChange={(e) => setShiftStartTime(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border bg-white text-brand-charcoal text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-brand-charcoal mb-1">
                          End Time *
                        </label>
                        <input
                          type="time"
                          value={shiftEndTime}
                          onChange={(e) => setShiftEndTime(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border bg-white text-brand-charcoal text-xs font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-brand-charcoal mb-2">
                        Active Workdays *
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {DAYS_OF_WEEK.map((d) => {
                          const active = shiftDays.includes(d.value);
                          return (
                            <button
                              key={d.value}
                              type="button"
                              onClick={() => toggleDay(d.value)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                active
                                  ? 'bg-brand-primary text-white shadow-subtle'
                                  : 'bg-brand-ivory text-brand-muted border border-brand-border hover:border-brand-primary/40'
                              }`}
                            >
                              {d.label}
                            </button>
                          );
                        })}
                      </div>
                      <span className="text-[11px] text-brand-muted mt-1.5 block">
                        Selected days: {shiftDays.length} days / week
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 5: TEAM INVITATIONS */}
              {step === 5 && (
                <div className="space-y-6 animate-fade-in">
                  <div>
                    <h2 className="text-lg font-black text-brand-primary flex items-center gap-2">
                      <Users className="w-5 h-5 text-brand-secondary" />
                      Step 5: Initial Team Members (Optional)
                    </h2>
                    <p className="text-xs text-brand-muted mt-1">
                      Invite key supervisors or department heads. You can add more members anytime later.
                    </p>
                  </div>

                  <div className="bg-brand-ivory p-4 rounded-2xl border border-brand-border space-y-3">
                    <span className="text-xs font-bold text-brand-primary">Invite a Team Member</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <input
                          type="text"
                          placeholder="Full Name (e.g. Sarah Connor)"
                          value={newEmpName}
                          onChange={(e) => setNewEmpName(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-brand-border bg-white text-brand-charcoal text-xs"
                        />
                      </div>
                      <div>
                        <input
                          type="email"
                          placeholder="Email (e.g. sarah@company.internal)"
                          value={newEmpEmail}
                          onChange={(e) => setNewEmpEmail(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-brand-border bg-white text-brand-charcoal text-xs"
                        />
                      </div>
                      <div>
                        <select
                          value={newEmpRole}
                          onChange={(e) =>
                            setNewEmpRole(
                              e.target.value as 'employee' | 'supervisor' | 'facility_admin'
                            )
                          }
                          className="w-full px-3 py-2 rounded-lg border border-brand-border bg-white text-brand-charcoal text-xs"
                        >
                          <option value="employee">Employee</option>
                          <option value="supervisor">Supervisor</option>
                          <option value="facility_admin">Facility Administrator</option>
                        </select>
                      </div>
                      <div>
                        <input
                          type="text"
                          placeholder="Department (e.g. Operations)"
                          value={newEmpDept}
                          onChange={(e) => setNewEmpDept(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-brand-border bg-white text-brand-charcoal text-xs"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleAddEmployee}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-brand-primary text-white text-xs font-bold hover:bg-brand-primary-hover shadow-subtle"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Member
                      </button>
                    </div>
                  </div>

                  {/* List of members */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-brand-charcoal">
                      Provisioning List ({employees.length} members)
                    </span>
                    {employees.length === 0 ? (
                      <div className="text-xs text-brand-muted italic py-3 text-center border border-dashed border-brand-border rounded-xl">
                        No team members added yet. You can invite your workforce from the Admin panel after setup.
                      </div>
                    ) : (
                      <div className="divide-y divide-brand-border/60 border border-brand-border rounded-xl overflow-hidden bg-white">
                        {employees.map((emp, i) => (
                          <div
                            key={i}
                            className="p-3 flex items-center justify-between text-xs hover:bg-brand-ivory/50 transition-colors"
                          >
                            <div>
                              <div className="font-bold text-brand-charcoal">{emp.name}</div>
                              <div className="text-[11px] text-brand-muted">
                                {emp.email} &bull; {emp.departmentName} &bull;{' '}
                                <span className="capitalize font-semibold text-brand-secondary">
                                  {emp.role.replace('_', ' ')}
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveEmployee(i)}
                              className="text-rose-600 hover:text-rose-800 p-1.5 rounded-lg hover:bg-rose-50"
                              title="Remove invite"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 6: REVIEW & FINALIZE */}
              {step === 6 && (
                <div className="space-y-6 animate-fade-in">
                  <div>
                    <h2 className="text-lg font-black text-brand-primary flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-brand-secondary" />
                      Step 6: Review & Finalize Setup
                    </h2>
                    <p className="text-xs text-brand-muted mt-1">
                      Confirm your setup parameters before initial facility provisioning.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-brand-ivory/60 p-4 rounded-2xl border border-brand-border space-y-2 text-xs">
                      <div className="font-bold text-brand-primary flex items-center gap-1.5 pb-1 border-b border-brand-border">
                        <Building2 className="w-3.5 h-3.5 text-brand-secondary" />
                        Organization & Facility
                      </div>
                      <div>
                        <span className="text-brand-muted">Brand Name: </span>
                        <strong className="text-brand-charcoal">{displayName || 'Main Org'}</strong>
                      </div>
                      <div>
                        <span className="text-brand-muted">Facility: </span>
                        <strong className="text-brand-charcoal">{facilityName}</strong>
                      </div>
                      <div>
                        <span className="text-brand-muted">Coordinates: </span>
                        <span className="font-mono text-[11px] text-brand-charcoal">
                          {latitude}, {longitude}
                        </span>
                      </div>
                      <div>
                        <span className="text-brand-muted">Geofence: </span>
                        <strong className="text-brand-charcoal">{geofenceRadiusMeters}m</strong>
                      </div>
                    </div>

                    <div className="bg-brand-ivory/60 p-4 rounded-2xl border border-brand-border space-y-2 text-xs">
                      <div className="font-bold text-brand-primary flex items-center gap-1.5 pb-1 border-b border-brand-border">
                        <Clock className="w-3.5 h-3.5 text-brand-secondary" />
                        Policies & Schedule
                      </div>
                      <div>
                        <span className="text-brand-muted">Biometrics: </span>
                        <strong className={requireBiometrics ? 'text-emerald-700' : 'text-amber-700'}>
                          {requireBiometrics ? 'Enforced' : 'Optional'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-brand-muted">Offline Queue: </span>
                        <strong className={allowOffline ? 'text-emerald-700' : 'text-amber-700'}>
                          {allowOffline ? 'Allowed (IndexedDB)' : 'Disabled'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-brand-muted">Shift: </span>
                        <strong className="text-brand-charcoal">
                          {shiftName} ({shiftStartTime} - {shiftEndTime})
                        </strong>
                      </div>
                      <div>
                        <span className="text-brand-muted">Team Members: </span>
                        <strong className="text-brand-charcoal">{employees.length} invited</strong>
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-brand-primary/5 border border-brand-primary/15 text-xs text-brand-muted flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-brand-secondary shrink-0 mt-0.5" />
                    <span>
                      Completing this setup will activate the organization, provision the initial
                      site records, and enable authorized employee attendance logging.
                    </span>
                  </div>
                </div>
              )}

              {/* Navigation Actions */}
              <div className="mt-8 pt-6 border-t border-brand-border flex items-center justify-between">
                {step > 1 ? (
                  <button
                    type="button"
                    onClick={prevStep}
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-brand-border text-xs font-semibold text-brand-charcoal hover:bg-brand-ivory disabled:opacity-50"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                ) : (
                  <div />
                )}

                {step < 6 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-brand-primary text-white text-xs font-bold hover:bg-brand-primary-hover shadow-subtle"
                  >
                    Next Step
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleCompleteSetup}
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-primary text-white text-xs font-bold hover:bg-brand-primary-hover disabled:opacity-50 shadow-subtle"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Provisioning Organization...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Complete Organization Setup
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SetupOrganizationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-brand-ivory flex items-center justify-center p-4">
          <div className="text-xs font-bold text-brand-muted animate-pulse">
            Loading Organization Setup Wizard...
          </div>
        </div>
      }
    >
      <SetupOrganizationContent />
    </Suspense>
  );
}
