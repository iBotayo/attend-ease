'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useOffline } from '@/context/OfflineContext';
import { facilityService } from '@/services/facility.service';
import { attendanceService } from '@/services/attendance.service';
import { Facility } from '@/types/facility';
import { VerificationResult } from '@/types/attendance';
import { FacilityVerificationPanel } from '@/components/FacilityVerificationPanel';
import { FaceCapturePanel } from '@/components/FaceCapturePanel';
import {
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Building,
  CalendarCheck,
  RefreshCw,
  LogOut,
} from 'lucide-react';

export default function AttendanceWorkflowPage() {
  const { user, isMockMode } = useAuth();
  const { isEffectiveOffline, refreshPendingCount } = useOffline();

  // Workflow steps: 1 = Confirm, 2 = Facility & Face Verification, 3 = Complete
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [attendanceType, setAttendanceType] = useState<'check_in' | 'check_out'>('check_in');
  const [facility, setFacility] = useState<Facility | null>(null);

  // Simulation controls
  const [simulateOutcome, setSimulateOutcome] = useState<
    'pass' | 'fail_biometric' | 'fail_geofence' | 'location_denied' | 'camera_denied' | 'camera_unavailable'
  >('pass');

  // Verification state
  const [facilityVerification, setFacilityVerification] = useState<{
    passed: boolean;
    distanceMeters: number;
    networkMatch: boolean;
    details: string;
  } | null>(null);

  const [biometricResult, setBiometricResult] = useState<VerificationResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<{
    isOffline: boolean;
    type: 'check_in' | 'check_out';
  } | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    const facilities = await facilityService.getFacilities();
    const assigned = facilities.find((f) => f.id === user.assignedFacilityId) || facilities[0];
    setFacility(assigned);

    const sum = await attendanceService.getTodaySummary(user.employeeId);

    // If already checked in, default to check_out
    if (sum.hasCheckedIn && !sum.hasCheckedOut) {
      setAttendanceType('check_out');
    } else {
      setAttendanceType('check_in');
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFacilityVerified = useCallback((res: {
    passed: boolean;
    distanceMeters: number;
    networkMatch: boolean;
    details: string;
  }) => {
    setFacilityVerification(res);
  }, []);

  const handleBiometricVerified = (res: VerificationResult) => {
    setBiometricResult(res);
  };

  const handleFinalSubmit = async () => {
    if (!user || !facility || !biometricResult) return;

    setIsSubmitting(true);
    try {
      await attendanceService.recordAttendance({
        employeeId: user.id,
        employeeName: user.name,
        employeeCode: user.employeeId,
        departmentId: user.departmentId,
        departmentName: user.departmentName,
        facilityId: facility.id,
        facilityName: facility.name,
        type: attendanceType,
        isOffline: isEffectiveOffline,
        verificationMode: isEffectiveOffline ? 'offline_sync' : 'face_facility',
        // Record the real location check alongside the face result
        verificationDetails: {
          ...biometricResult,
          facilityMatch: facilityVerification?.passed ?? false,
          gpsDistanceMeters: facilityVerification?.distanceMeters,
          networkMatch: facilityVerification?.networkMatch,
        },
      });

      if (isEffectiveOffline) {
        await refreshPendingCount();
      }

      setSubmissionSuccess({
        isOffline: isEffectiveOffline,
        type: attendanceType,
      });
      setStep(3);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canFinalize = biometricResult?.isVerified && facilityVerification?.passed;

  // Tell the employee exactly which check is holding the Confirm button.
  const blockingReason = !facilityVerification
    ? 'Waiting for your location...'
    : !facilityVerification.passed
    ? `Location check failed. ${facilityVerification.details}`
    : !biometricResult?.isVerified
    ? 'Complete the face check above to continue.'
    : null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Workflow Step Indicators */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-brand-border-subtle shadow-card">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                step >= 1 ? 'bg-brand-primary text-brand-mint' : 'bg-brand-ivory text-brand-muted'
              }`}
            >
              1
            </span>
            <span className={`font-semibold ${step === 1 ? 'text-brand-primary' : 'text-brand-muted'}`}>
              Account & Policy
            </span>
          </div>

          <div className="w-8 sm:w-16 h-0.5 bg-brand-border-subtle" />

          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                step >= 2 ? 'bg-brand-primary text-brand-mint' : 'bg-brand-ivory text-brand-muted'
              }`}
            >
              2
            </span>
            <span className={`font-semibold ${step === 2 ? 'text-brand-primary' : 'text-brand-muted'}`}>
              Facility & Face Check
            </span>
          </div>

          <div className="w-8 sm:w-16 h-0.5 bg-brand-border-subtle" />

          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                step === 3 ? 'bg-brand-success text-white' : 'bg-brand-ivory text-brand-muted'
              }`}
            >
              3
            </span>
            <span className={`font-semibold ${step === 3 ? 'text-brand-success' : 'text-brand-muted'}`}>
              Confirmed
            </span>
          </div>
        </div>
      </div>

      {/* Development Demo Outcome Simulation Controls (demo mode only) */}
      {isMockMode && (
      <div className="bg-brand-primary/5 rounded-2xl p-4 border border-brand-primary/15 text-xs space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold text-brand-primary">
            <Sparkles className="w-4 h-4 text-brand-secondary" />
            <span>Demo Simulation Controls (Test Edge Cases)</span>
          </div>
          <span className="text-[11px] text-brand-muted">Frontend Simulation Mode</span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setSimulateOutcome('pass')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
              simulateOutcome === 'pass'
                ? 'bg-brand-success text-white shadow-subtle'
                : 'bg-white border border-brand-border text-brand-charcoal hover:bg-brand-ivory'
            }`}
          >
            Pass (Normal Flow)
          </button>

          <button
            type="button"
            onClick={() => setSimulateOutcome('fail_biometric')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
              simulateOutcome === 'fail_biometric'
                ? 'bg-brand-danger text-white shadow-subtle'
                : 'bg-white border border-brand-border text-brand-charcoal hover:bg-brand-ivory'
            }`}
          >
            Fail Biometric (Score 0.44)
          </button>

          <button
            type="button"
            onClick={() => setSimulateOutcome('fail_geofence')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
              simulateOutcome === 'fail_geofence'
                ? 'bg-brand-warning text-white shadow-subtle'
                : 'bg-white border border-brand-border text-brand-charcoal hover:bg-brand-ivory'
            }`}
          >
            Fail Geofence Boundary
          </button>

          <button
            type="button"
            onClick={() => setSimulateOutcome('location_denied')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
              simulateOutcome === 'location_denied'
                ? 'bg-rose-700 text-white shadow-subtle'
                : 'bg-white border border-brand-border text-brand-charcoal hover:bg-brand-ivory'
            }`}
          >
            Location Permission Denied
          </button>

          <button
            type="button"
            onClick={() => setSimulateOutcome('camera_denied')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
              simulateOutcome === 'camera_denied'
                ? 'bg-rose-700 text-white shadow-subtle'
                : 'bg-white border border-brand-border text-brand-charcoal hover:bg-brand-ivory'
            }`}
          >
            Camera Denied
          </button>

          <button
            type="button"
            onClick={() => setSimulateOutcome('camera_unavailable')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
              simulateOutcome === 'camera_unavailable'
                ? 'bg-amber-700 text-white shadow-subtle'
                : 'bg-white border border-brand-border text-brand-charcoal hover:bg-brand-ivory'
            }`}
          >
            Camera Unavailable
          </button>
        </div>
      </div>
      )}

      {/* STEP 1: Confirm Employee Account & Shift */}
      {step === 1 && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-brand-border-subtle shadow-card space-y-6 animate-fade-in">
          <div>
            <span className="text-xs font-bold text-brand-secondary uppercase tracking-wider block">
              Step 1 of 3
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-brand-primary tracking-tight mt-1">
              Confirm Account & Action
            </h2>
            <p className="text-xs sm:text-sm text-brand-muted mt-0.5">
              Verify your employee credentials and attendance target for this session.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-brand-ivory border border-brand-border-subtle flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-primary text-brand-mint flex items-center justify-center font-bold text-base shrink-0">
              {user?.name.charAt(0)}
            </div>
            <div className="space-y-1 text-xs">
              <div className="font-extrabold text-sm text-brand-primary">{user?.name}</div>
              <div className="text-brand-muted font-mono">{user?.employeeId} • {user?.email}</div>
              <div className="text-brand-muted">{user?.departmentName}</div>
              <div className="text-brand-charcoal font-semibold flex items-center gap-1.5 pt-1">
                <Building className="w-3.5 h-3.5 text-brand-secondary" />
                <span>{user?.assignedFacilityName}</span>
              </div>
            </div>
          </div>

          {/* Action selection (Check In vs Check Out) */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-brand-charcoal uppercase tracking-wider">
              Select Attendance Action
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAttendanceType('check_in')}
                className={`p-4 rounded-2xl border text-left transition ${
                  attendanceType === 'check_in'
                    ? 'border-brand-primary bg-brand-primary text-white shadow-card'
                    : 'border-brand-border bg-white text-brand-charcoal hover:bg-brand-ivory'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <CalendarCheck className={`w-4 h-4 ${attendanceType === 'check_in' ? 'text-brand-mint' : 'text-brand-secondary'}`} />
                  <span className="font-extrabold text-sm">Shift Check-In</span>
                </div>
                <p className={`text-xs ${attendanceType === 'check_in' ? 'text-white/80' : 'text-brand-muted'}`}>
                  Record arrival timestamp at facility.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setAttendanceType('check_out')}
                className={`p-4 rounded-2xl border text-left transition ${
                  attendanceType === 'check_out'
                    ? 'border-brand-secondary bg-brand-secondary text-white shadow-card'
                    : 'border-brand-border bg-white text-brand-charcoal hover:bg-brand-ivory'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <LogOut className={`w-4 h-4 ${attendanceType === 'check_out' ? 'text-brand-mint' : 'text-brand-secondary'}`} />
                  <span className="font-extrabold text-sm">Shift Check-Out</span>
                </div>
                <p className={`text-xs ${attendanceType === 'check_out' ? 'text-white/80' : 'text-brand-muted'}`}>
                  Conclude work and log departure.
                </p>
              </button>
            </div>
          </div>

          {/* Offline advisory */}
          {isEffectiveOffline && (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold">Offline Attendance Permitted:</strong> Your attendance timestamp and biometric verification event will be cryptographically queued in your device’s local IndexedDB and automatically synchronized when connectivity is restored.
              </div>
            </div>
          )}

          <div className="pt-2 flex items-center justify-between">
            <Link
              href="/employee/dashboard"
              className="px-4 py-2 text-xs font-semibold text-brand-muted hover:text-brand-charcoal transition"
            >
              Cancel
            </Link>

            <button
              onClick={() => setStep(2)}
              className="px-6 py-3 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-xs font-bold transition shadow-card inline-flex items-center gap-2"
            >
              <span>Proceed to Biometric Verification</span>
              <ArrowRight className="w-4 h-4 text-brand-mint" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Facility & Biometric Verification */}
      {step === 2 && facility && (
        <div className="space-y-6 animate-fade-in">
          {/* Facility Location Panel */}
          <FacilityVerificationPanel
            facility={facility}
            simulateState={
              simulateOutcome === 'fail_geofence'
                ? 'fail_geofence'
                : simulateOutcome === 'location_denied'
                ? 'location_denied'
                : 'pass'
            }
            onVerificationComplete={handleFacilityVerified}
          />

          {/* Face Capture Panel */}
          <FaceCapturePanel
            employeeName={user?.name || 'Employee'}
            employeeCode={user?.employeeId || ''}
            isOffline={isEffectiveOffline}
            overrideSimulate={
              simulateOutcome === 'fail_biometric'
                ? 'fail_biometric'
                : simulateOutcome === 'camera_denied'
                ? 'camera_denied'
                : simulateOutcome === 'camera_unavailable'
                ? 'camera_unavailable'
                : 'pass'
            }
            onVerificationComplete={handleBiometricVerified}
            onReset={() => setBiometricResult(null)}
          />

          {/* Actions & Submit */}
          <div className="bg-white rounded-2xl p-5 border border-brand-border-subtle shadow-card flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              onClick={() => {
                setBiometricResult(null);
                setStep(1);
              }}
              className="px-4 py-2 text-xs font-semibold text-brand-muted hover:text-brand-charcoal inline-flex items-center gap-1.5 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Step 1</span>
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={handleFinalSubmit}
                disabled={!canFinalize || isSubmitting}
                className="px-8 py-3 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-xs font-extrabold transition shadow-card inline-flex items-center gap-2 disabled:opacity-40"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-brand-mint" />
                    <span>Recording Attendance...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-brand-mint" />
                    <span>
                      Confirm {attendanceType === 'check_in' ? 'Check-In' : 'Check-Out'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
          {blockingReason && !isSubmitting && (
            <p className="text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
              {blockingReason}
            </p>
          )}
        </div>
      )}

      {/* STEP 3: Complete & Confirmation */}
      {step === 3 && submissionSuccess && (
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-brand-border-subtle shadow-modal text-center space-y-6 animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto ring-8 ring-emerald-50">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-success">
              Verification Accepted
            </span>
            <h2 className="text-2xl font-black text-brand-primary">
              {submissionSuccess.type === 'check_in' ? 'Check-In Recorded' : 'Check-Out Recorded'}
            </h2>
            <p className="text-xs sm:text-sm text-brand-muted max-w-md mx-auto">
              {biometricResult?.faceMatch
                ? 'Your identity has been authenticated against facility policies.'
                : 'Your location was verified against facility policies.'}
            </p>
          </div>

          <div className="p-4 bg-brand-ivory rounded-2xl border border-brand-border-subtle max-w-md mx-auto text-xs space-y-2 text-left">
            <div className="flex justify-between">
              <span className="text-brand-muted">Employee:</span>
              <span className="font-bold text-brand-charcoal">{user?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-brand-muted">Timestamp:</span>
              <span className="font-mono font-semibold text-brand-charcoal">
                {new Date().toLocaleTimeString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-brand-muted">Facility:</span>
              <span className="font-semibold text-brand-charcoal">{facility?.name.split(' - ')[0]}</span>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-brand-border-subtle">
              <span className="text-brand-muted">Storage:</span>
              {submissionSuccess.isOffline ? (
                <span className="text-amber-800 font-semibold bg-amber-100 px-2 py-0.5 rounded text-[10px]">
                  Buffered in IndexedDB (Pending Sync)
                </span>
              ) : (
                <span className="text-emerald-800 font-semibold bg-emerald-100 px-2 py-0.5 rounded text-[10px]">
                  Direct Synced
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Link
              href="/employee/dashboard"
              className="w-full sm:w-auto px-6 py-2.5 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-xs font-bold transition shadow-subtle"
            >
              Return to Dashboard
            </Link>
            <Link
              href="/employee/history"
              className="w-full sm:w-auto px-6 py-2.5 bg-brand-ivory hover:bg-brand-border-subtle text-brand-charcoal rounded-xl text-xs font-semibold transition border border-brand-border"
            >
              View Attendance History
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
