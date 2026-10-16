'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BrandLogo } from '@/components/BrandLogo';
import { useAuth } from '@/context/AuthContext';
import { validatePasswordStrength } from '@/lib/utils/password';
import { User } from '@/types/user';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle2, ShieldAlert, ArrowLeft } from 'lucide-react';

function homePathFor(user: User): string {
  if (user.role === 'org_admin' || user.role === 'system_admin' || user.role === 'facility_admin') {
    return '/admin/dashboard';
  }
  if (user.role === 'supervisor') return '/admin/attendance';
  return '/employee/dashboard';
}

export default function ChangePasswordPage() {
  const router = useRouter();
  const { user, isLoading, changePassword, logout } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return null;
  }

  const isForced = !!user.mustChangePassword && !success;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }
    const policyError = validatePasswordStrength(newPassword);
    if (policyError) {
      setError(policyError);
      return;
    }

    setIsSubmitting(true);
    try {
      const updated = await changePassword(currentPassword, newPassword);
      setSuccess(true);
      setTimeout(() => router.push(homePathFor(updated)), 1200);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Password change failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    router.push('/login');
  };

  const rules = [
    { label: '8+ characters', ok: newPassword.length >= 8 },
    { label: 'Upper & lowercase', ok: /[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword) },
    { label: 'A number', ok: /[0-9]/.test(newPassword) },
  ];

  const inputClass =
    'w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-brand-border focus:border-brand-secondary focus:ring-1 focus:ring-brand-secondary outline-none transition bg-white';

  return (
    <div className="min-h-screen bg-brand-ivory flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center mb-2">
          <BrandLogo size="lg" />
        </div>
        <h2 className="mt-4 text-2xl font-black tracking-tight text-brand-primary">Change Password</h2>
        <p className="mt-1 text-xs text-brand-muted">
          Signed in as {user.name} ({user.employeeId})
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-card rounded-3xl border border-brand-border-subtle sm:px-10">
          {success ? (
            <div className="space-y-3 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-brand-primary">Password Updated</h3>
              <p className="text-xs text-brand-muted">
                Other devices signed in to this account have been signed out. Redirecting...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {isForced && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <span>
                    Your account was created with a temporary password. Set your own password to continue.
                  </span>
                </div>
              )}

              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-brand-charcoal uppercase tracking-wider mb-1.5">
                  {isForced ? 'Temporary Password' : 'Current Password'}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-brand-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-charcoal uppercase tracking-wider mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-brand-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-brand-muted">
                  {rules.map((r) => (
                    <span key={r.label} className={r.ok ? 'text-brand-success font-semibold' : ''}>
                      {r.ok ? '✓' : '•'} {r.label}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-charcoal uppercase tracking-wider mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-brand-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowPasswords(!showPasswords)}
                className="inline-flex items-center gap-1.5 text-xs text-brand-muted hover:text-brand-charcoal"
              >
                {showPasswords ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showPasswords ? 'Hide passwords' : 'Show passwords'}</span>
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-3 px-4 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-xs font-bold transition shadow-card flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? 'Updating...' : 'Update Password'}
              </button>

              <div className="pt-2 text-center">
                {isForced ? (
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="text-xs font-semibold text-brand-muted hover:text-brand-primary transition"
                  >
                    Sign out instead
                  </button>
                ) : (
                  <Link
                    href={homePathFor(user)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-muted hover:text-brand-primary transition"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </Link>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
