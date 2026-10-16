'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { BrandLogo } from '@/components/BrandLogo';
import { organizationService } from '@/services/organization.service';
import { useAuth } from '@/context/AuthContext';
import {
  Mail,
  KeyRound,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  ArrowLeft,
  ShieldCheck,
} from 'lucide-react';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isMockMode } = useAuth();

  const emailParam = searchParams.get('email') || '';
  const orgIdParam = searchParams.get('orgId') || '';

  const [email, setEmail] = useState(emailParam);
  const [orgId] = useState(orgIdParam);
  const [token, setToken] = useState('');
  const [demoToken, setDemoToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verifiedSuccess, setVerifiedSuccess] = useState(false);

  // In demo mode, fetch the server-issued token for testing convenience
  useEffect(() => {
    if (email && isMockMode) {
      const pending = organizationService.getDemoVerificationToken(email);
      setDemoToken(pending);
    }
  }, [email, isMockMode]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      setError('Please enter the server-issued verification code.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await organizationService.verifyEmail({
        token: token.trim(),
        email: email.trim(),
      });

      setVerifiedSuccess(true);
      // Wait a moment for celebration feedback, then navigate to setup wizard
      setTimeout(() => {
        router.push(
          `/setup-organization?orgId=${encodeURIComponent(res.organization.id || orgId)}&email=${encodeURIComponent(
            res.organization.email
          )}`
        );
      }, 900);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Verification failed. Token may be invalid or expired.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email.trim()) {
      setError('Please provide an email address to resend verification.');
      return;
    }

    setIsResending(true);
    setResendMessage(null);
    setError(null);

    try {
      const res = await organizationService.resendVerification(email.trim());
      setResendMessage(res.message);
      if (isMockMode) {
        const freshToken = organizationService.getDemoVerificationToken(email.trim());
        setDemoToken(freshToken);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to resend verification link.');
    } finally {
      setIsResending(false);
    }
  };

  const autofillDemoToken = () => {
    if (demoToken) {
      setToken(demoToken);
      setError(null);
    }
  };

  return (
    <div className="min-h-screen bg-brand-ivory flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center mb-3">
          <BrandLogo size="lg" showTagline />
        </div>
        <div className="w-12 h-12 rounded-2xl bg-brand-mint text-brand-primary flex items-center justify-center mx-auto mb-3">
          <Mail className="w-6 h-6 text-brand-secondary" />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-brand-primary">
          Verify Organization Email
        </h1>
        <p className="mt-1 text-xs text-brand-muted max-w-sm mx-auto">
          We sent a single-use verification token to{' '}
          <strong className="text-brand-charcoal">{email || 'your registered email'}</strong>.
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-card rounded-3xl border border-brand-border-subtle sm:px-10">
          {error && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium flex items-start gap-2.5 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {resendMessage && (
            <div className="mb-5 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium flex items-start gap-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{resendMessage}</span>
            </div>
          )}

          {verifiedSuccess && (
            <div className="mb-5 p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2.5 animate-fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <div>Email verified successfully!</div>
                <div className="text-[11px] font-normal text-emerald-700">Redirecting to Organization Setup Wizard...</div>
              </div>
            </div>
          )}

          {/* Demo helper banner */}
          {isMockMode && demoToken && (
            <div className="mb-5 p-3.5 bg-brand-primary/5 rounded-2xl border border-brand-primary/15 text-xs space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-brand-primary">
                <Sparkles className="w-3.5 h-3.5 text-brand-secondary" />
                <span>Demo Simulation Token</span>
              </div>
              <p className="text-[11px] text-brand-muted">
                Server-issued mock token with 15-minute expiration:
              </p>
              <div className="flex items-center justify-between gap-2 bg-white px-2.5 py-1.5 rounded-lg border border-brand-border font-mono text-[11px] text-brand-charcoal">
                <span className="truncate">{demoToken}</span>
                <button
                  type="button"
                  onClick={autofillDemoToken}
                  className="shrink-0 text-xs font-bold text-brand-secondary hover:text-brand-primary transition underline"
                >
                  Use Token
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-4">
            {!emailParam && (
              <div>
                <label className="block text-xs font-bold text-brand-charcoal uppercase tracking-wider mb-1.5">
                  Official Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-brand-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="admin@organization.org"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-brand-border focus:border-brand-secondary focus:ring-1 focus:ring-brand-secondary outline-none transition bg-white"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-brand-charcoal uppercase tracking-wider mb-1.5">
                Verification Token / Code
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-brand-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Paste single-use verification token"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs font-mono rounded-xl border border-brand-border focus:border-brand-secondary focus:ring-1 focus:ring-brand-secondary outline-none transition bg-white"
                />
              </div>
              <p className="mt-1 text-[11px] text-brand-muted">
                Server tokens expire after 15 minutes and can only be used once.
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading || verifiedSuccess}
              className="w-full mt-2 py-3.5 px-4 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-xs font-bold transition shadow-card flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-brand-mint" />
                  <span>Validating Token...</span>
                </>
              ) : (
                <>
                  <span>Verify Email & Proceed to Setup</span>
                  <ArrowRight className="w-4 h-4 text-brand-mint" />
                </>
              )}
            </button>
          </form>

          {/* Resend actions */}
          <div className="mt-6 pt-5 border-t border-brand-border-subtle flex items-center justify-between text-xs">
            <Link
              href="/register"
              className="inline-flex items-center gap-1 text-brand-muted hover:text-brand-charcoal transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Register</span>
            </Link>

            <button
              type="button"
              onClick={handleResend}
              disabled={isResending}
              className="font-bold text-brand-secondary hover:text-brand-primary transition disabled:opacity-50"
            >
              {isResending ? 'Sending...' : 'Resend Code'}
            </button>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-4 text-center">
          <p className="text-[11px] text-brand-muted flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-brand-secondary" />
            <span>Server-side authorization: Client cannot self-certify email ownership.</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-brand-ivory flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-3 border-brand-primary/20 border-t-brand-primary animate-spin" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
