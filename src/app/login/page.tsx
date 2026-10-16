'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BrandLogo } from '@/components/BrandLogo';
import { useAuth } from '@/context/AuthContext';
import { Eye, EyeOff, Lock, User, ArrowRight, Sparkles, AlertCircle, Building2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, isMockMode } = useAuth();

  const [identifier, setIdentifier] = useState(isMockMode ? 'EMP-1001' : '');
  const [password, setPassword] = useState(isMockMode ? 'password123' : '');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setError('Please enter your Employee ID or Work Email.');
      return;
    }
    if (!password) {
      setError('Please enter your account password.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const authenticatedUser = await login({
        identifier: identifier.trim(),
        password,
        rememberMe,
      });

      // Accounts created with a shared temporary password must set their own first
      if (authenticatedUser.mustChangePassword) {
        router.push('/change-password');
      } else if (
        authenticatedUser.role === 'org_admin' ||
        authenticatedUser.role === 'system_admin' ||
        authenticatedUser.role === 'facility_admin'
      ) {
        router.push('/admin/dashboard');
      } else if (authenticatedUser.role === 'supervisor') {
        router.push('/admin/attendance');
      } else {
        router.push('/employee/dashboard');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed. Please check credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const setDemoAccount = (empId: string, pwd = 'password123') => {
    setIdentifier(empId);
    setPassword(pwd);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-brand-ivory flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center mb-2">
          <BrandLogo size="lg" showTagline />
        </div>
        <h2 className="mt-4 text-2xl font-black tracking-tight text-brand-primary">
          Sign in to your account
        </h2>
        <p className="mt-1 text-xs text-brand-muted">
          Facial verification and attendance management portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-card rounded-3xl border border-brand-border-subtle sm:px-10">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-brand-charcoal uppercase tracking-wider mb-1.5">
                Work Email or Employee ID
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-brand-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="e.g. EMP-1001 or you@company.com"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-brand-border focus:border-brand-secondary focus:ring-1 focus:ring-brand-secondary outline-none transition bg-white"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-brand-charcoal uppercase tracking-wider">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-semibold text-brand-secondary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-brand-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter your account password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 text-xs rounded-xl border border-brand-border focus:border-brand-secondary focus:ring-1 focus:ring-brand-secondary outline-none transition bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-charcoal p-1"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded text-brand-secondary focus:ring-brand-secondary"
                />
                <span className="text-xs text-brand-muted">Remember this device</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-xs font-bold transition shadow-card flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{isLoading ? 'Authenticating...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4 text-brand-mint" />
            </button>
          </form>

          {/* Organization Registration Link */}
          <div className="mt-6 pt-5 border-t border-brand-border-subtle text-center">
            <p className="text-xs text-brand-muted">
              Registering a new organization or facility?
            </p>
            <Link
              href="/register"
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-brand-primary bg-brand-ivory hover:bg-brand-mint/40 hover:text-brand-primary-hover border border-brand-border-subtle transition"
            >
              <Building2 className="w-4 h-4 text-brand-secondary" />
              <span>Register Organization</span>
            </Link>
          </div>

          {/* Quick Demo Presets - Only shown in Demo Mode */}
          {isMockMode && (
            <div className="mt-5 pt-4 border-t border-brand-border-subtle">
              <span className="text-[11px] font-bold text-brand-muted uppercase tracking-wider block mb-2 text-center">
                Quick Demo Presets
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDemoAccount('EMP-1001')}
                  className="p-2.5 rounded-xl border border-brand-border-subtle bg-brand-ivory hover:border-brand-secondary hover:bg-brand-mint/20 transition text-left text-xs"
                >
                  <div className="font-bold text-brand-primary">Sarah Lin</div>
                  <div className="text-[10px] text-brand-muted">Employee Portal</div>
                </button>

                <button
                  type="button"
                  onClick={() => setDemoAccount('EMP-1004')}
                  className="p-2.5 rounded-xl border border-brand-border-subtle bg-brand-ivory hover:border-brand-primary hover:bg-brand-primary/10 transition text-left text-xs"
                >
                  <div className="font-bold text-brand-primary">Marcus Vance</div>
                  <div className="text-[10px] text-brand-muted">Administrator Portal</div>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Security Notice */}
        <div className="mt-4 text-center">
          <p className="text-[11px] text-brand-muted flex items-center justify-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-brand-secondary" />
            <span>
              {isMockMode
                ? 'Development Demo Mode: Authenticating with local mock directory.'
                : 'Connected to live Go REST API backend.'}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
