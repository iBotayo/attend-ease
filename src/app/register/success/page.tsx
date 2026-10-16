'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { BrandLogo } from '@/components/BrandLogo';
import { useAuth } from '@/context/AuthContext';
import {
  CheckCircle2,
  Building2,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Users,
  Compass,
  FileCheck,
} from 'lucide-react';

function RegisterSuccessContent() {
  const searchParams = useSearchParams();
  const { isMockMode } = useAuth();

  const orgName = searchParams.get('orgName') || 'Your Organization';
  const email = searchParams.get('email') || '';
  const orgId = searchParams.get('orgId') || '';

  return (
    <div className="min-h-screen bg-brand-ivory flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl text-center">
        <div className="flex justify-center mb-3">
          <BrandLogo size="lg" showTagline />
        </div>

        <div className="w-16 h-16 bg-brand-mint text-brand-primary rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-card">
          <CheckCircle2 className="w-10 h-10 text-brand-secondary" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-brand-primary">
          Organization Successfully Activated
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-brand-muted max-w-md mx-auto">
          Welcome to Attend Ease. <strong className="text-brand-charcoal">{orgName}</strong> is now
          provisioned and ready for multi-facility attendance tracking.
        </p>

        {isMockMode && (
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-mint text-brand-mint-dark text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Simulated Onboarding Session</span>
          </div>
        )}
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white py-8 px-6 shadow-card rounded-3xl border border-brand-border-subtle sm:px-10 space-y-6">
          {/* Summary Box */}
          <div className="bg-brand-ivory rounded-2xl p-4 border border-brand-border space-y-3 text-xs">
            <div className="font-bold text-brand-primary flex items-center gap-2 pb-2 border-b border-brand-border/60">
              <Building2 className="w-4 h-4 text-brand-secondary" />
              <span>Provisioned Tenant Details</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-brand-muted">Registered Name:</span>
                <p className="font-semibold text-brand-charcoal truncate">{orgName}</p>
              </div>
              {orgId && (
                <div>
                  <span className="text-brand-muted">Organization ID:</span>
                  <p className="font-mono text-brand-charcoal truncate">{orgId}</p>
                </div>
              )}
              {email && (
                <div>
                  <span className="text-brand-muted">Admin Account:</span>
                  <p className="font-semibold text-brand-charcoal truncate">{email}</p>
                </div>
              )}
              <div>
                <span className="text-brand-muted">Account Status:</span>
                <p className="font-semibold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Email Verified & Active</span>
                </p>
              </div>
            </div>
          </div>

          {/* Recommended Next Administrative Steps */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-brand-charcoal uppercase tracking-wider">
              Recommended Next Steps
            </h3>

            <div className="space-y-2">
              <div className="p-3 rounded-xl border border-brand-border-subtle hover:border-brand-secondary/40 transition flex items-start gap-3 bg-white">
                <div className="p-2 rounded-lg bg-brand-ivory text-brand-secondary shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <span className="font-bold text-brand-primary block">Invite Team Members</span>
                  <span className="text-brand-muted text-[11px]">
                    Add employees, supervisors, and facility administrators in the Directory.
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-brand-border-subtle hover:border-brand-secondary/40 transition flex items-start gap-3 bg-white">
                <div className="p-2 rounded-lg bg-brand-ivory text-brand-secondary shrink-0">
                  <Compass className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <span className="font-bold text-brand-primary block">Fine-tune Geofence Boundaries</span>
                  <span className="text-brand-muted text-[11px]">
                    Confirm GPS coordinates and radius margins for your active campus facilities.
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-brand-border-subtle hover:border-brand-secondary/40 transition flex items-start gap-3 bg-white">
                <div className="p-2 rounded-lg bg-brand-ivory text-brand-secondary shrink-0">
                  <FileCheck className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <span className="font-bold text-brand-primary block">Review Attendance Policies</span>
                  <span className="text-brand-muted text-[11px]">
                    Configure shift schedules, late grace periods, and offline reconciliation rules.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation CTAs */}
          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <Link
              href="/admin/dashboard"
              className="flex-1 py-3 px-4 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-xs font-bold transition shadow-card flex items-center justify-center gap-2"
            >
              <span>Go to Admin Portal</span>
              <ArrowRight className="w-4 h-4 text-brand-mint" />
            </Link>

            <Link
              href="/login"
              className="py-3 px-5 rounded-xl border border-brand-border text-xs font-semibold text-brand-charcoal hover:bg-brand-ivory transition flex items-center justify-center"
            >
              Sign In with Another Account
            </Link>
          </div>
        </div>

        {/* Security Safeguard Note */}
        <div className="mt-4 text-center">
          <p className="text-[11px] text-brand-muted flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-brand-secondary" />
            <span>Role-Based Access Control enforced: Administrators cannot access other organizations.</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RegisterSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-brand-ivory flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-3 border-brand-primary/20 border-t-brand-primary animate-spin" />
        </div>
      }
    >
      <RegisterSuccessContent />
    </Suspense>
  );
}
