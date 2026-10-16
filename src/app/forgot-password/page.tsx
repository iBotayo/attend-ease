'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { BrandLogo } from '@/components/BrandLogo';
import { authService } from '@/services/auth.service';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setError('Please provide your work email or employee ID.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await authService.requestPasswordReset(identifier.trim());
      setSuccessMessage(res.message);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Request failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-ivory flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center mb-2">
          <BrandLogo size="lg" />
        </div>
        <h2 className="mt-4 text-2xl font-black tracking-tight text-brand-primary">
          Password Recovery
        </h2>
        <p className="mt-1 text-xs text-brand-muted">
          We will simulate dispatching instructions to reset your account password.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-card rounded-3xl border border-brand-border-subtle sm:px-10">
          {successMessage ? (
            <div className="space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-brand-primary">Instructions Dispatched</h3>
              <p className="text-xs text-brand-muted leading-relaxed">{successMessage}</p>
              <Link
                href="/login"
                className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-brand-secondary hover:underline"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to sign in</span>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-brand-charcoal uppercase tracking-wider mb-1.5">
                  Work Email or Employee ID
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-brand-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. you@company.com"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-brand-border focus:border-brand-secondary outline-none transition bg-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-4 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-xs font-bold transition shadow-card flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>{isLoading ? 'Processing...' : 'Send Recovery Instructions'}</span>
              </button>

              <div className="pt-2 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-muted hover:text-brand-primary transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to login</span>
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
