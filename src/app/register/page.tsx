'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BrandLogo } from '@/components/BrandLogo';
import { organizationService } from '@/services/organization.service';
import { useAuth } from '@/context/AuthContext';
import {
  Building2,
  Mail,
  User,
  Phone,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

export default function RegisterOrganizationPage() {
  const router = useRouter();
  const { isMockMode } = useAuth();

  const [legalName, setLegalName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [contactPersonName, setContactPersonName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateForm = (): string | null => {
    if (!legalName.trim()) return 'Organization legal name is required.';
    if (!email.trim()) return 'Official organization email is required.';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) return 'Please enter a valid official email address.';
    if (!contactPersonName.trim()) return 'Contact person full name is required.';
    if (!contactPhone.trim()) return 'Contact phone number is required.';
    if (password.length < 8) return 'Password must be at least 8 characters long.';
    if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter.';
    if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter.';
    if (!/[0-9]/.test(password)) return 'Password must contain at least one number.';
    if (password !== confirmPassword) return 'Password confirmation does not match.';
    if (!termsAccepted) return 'You must accept the terms of service and privacy notice.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await organizationService.register({
        legalName: legalName.trim(),
        displayName: displayName.trim() || legalName.trim(),
        email: email.trim().toLowerCase(),
        contactPersonName: contactPersonName.trim(),
        contactPhone: contactPhone.trim(),
        password,
        confirmPassword,
        termsAccepted,
      });

      // Navigate to email verification step
      router.push(`/verify-email?email=${encodeURIComponent(result.adminEmail)}&orgId=${encodeURIComponent(result.organizationId)}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please check your information and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper for quick demo filling
  const fillDemoData = () => {
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    setLegalName(`St. Jude Medical Institute ${randomSuffix}`);
    setDisplayName(`St. Jude Health ${randomSuffix}`);
    setEmail(`director${randomSuffix}@stjude-health.org`);
    setContactPersonName('Dr. Katherine Bell');
    setContactPhone('+1 (312) 555-7890');
    setPassword('SecurePass123!');
    setConfirmPassword('SecurePass123!');
    setTermsAccepted(true);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-brand-ivory flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl text-center">
        <div className="flex justify-center mb-3">
          <BrandLogo size="lg" showTagline />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-brand-primary">
          Register Your Organization
        </h1>
        <p className="mt-1.5 text-xs sm:text-sm text-brand-muted max-w-md mx-auto">
          Deploy multi-facility attendance tracking, geofence perimeters, and facial verification for your workforce.
        </p>

        {isMockMode && (
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-mint text-brand-mint-dark text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Demo Mode Active</span>
            <button
              type="button"
              onClick={fillDemoData}
              className="ml-2 underline text-[11px] font-bold hover:text-brand-primary transition"
            >
              Fill Sample Organization
            </button>
          </div>
        )}
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white py-8 px-6 shadow-card rounded-3xl border border-brand-border-subtle sm:px-10">
          {error && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium flex items-start gap-2.5 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Organization Legal Name */}
            <div>
              <label className="block text-xs font-bold text-brand-charcoal uppercase tracking-wider mb-1.5">
                Organization Legal Name <span className="text-brand-danger">*</span>
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-brand-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Northwestern Memorial Hospital Inc."
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-brand-border focus:border-brand-secondary focus:ring-1 focus:ring-brand-secondary outline-none transition bg-white"
                />
              </div>
            </div>

            {/* Display Name (Optional) */}
            <div>
              <label className="block text-xs font-bold text-brand-charcoal uppercase tracking-wider mb-1.5">
                Display Name <span className="text-brand-muted text-[11px] font-normal">(Optional, shown on employee portal)</span>
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-brand-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="e.g. Northwestern Health"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-brand-border focus:border-brand-secondary focus:ring-1 focus:ring-brand-secondary outline-none transition bg-white"
                />
              </div>
            </div>

            {/* Official Email */}
            <div>
              <label className="block text-xs font-bold text-brand-charcoal uppercase tracking-wider mb-1.5">
                Official Organization Email <span className="text-brand-danger">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-brand-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="e.g. admin@organization.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-brand-border focus:border-brand-secondary focus:ring-1 focus:ring-brand-secondary outline-none transition bg-white"
                />
              </div>
              <p className="mt-1 text-[11px] text-brand-muted">
                A server-issued verification link will be sent to this email address.
              </p>
            </div>

            {/* Contact Person Name & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-brand-charcoal uppercase tracking-wider mb-1.5">
                  Contact Person Full Name <span className="text-brand-danger">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-brand-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Elena Rostova"
                    value={contactPersonName}
                    onChange={(e) => setContactPersonName(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-brand-border focus:border-brand-secondary focus:ring-1 focus:ring-brand-secondary outline-none transition bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-charcoal uppercase tracking-wider mb-1.5">
                  Contact Phone Number <span className="text-brand-danger">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-brand-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    placeholder="+1 (555) 000-0000"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-brand-border focus:border-brand-secondary focus:ring-1 focus:ring-brand-secondary outline-none transition bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Password & Confirm Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-brand-charcoal uppercase tracking-wider mb-1.5">
                  Initial Admin Password <span className="text-brand-danger">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-brand-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Min 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 text-xs rounded-xl border border-brand-border focus:border-brand-secondary focus:ring-1 focus:ring-brand-secondary outline-none transition bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-charcoal p-1"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-charcoal uppercase tracking-wider mb-1.5">
                  Confirm Password <span className="text-brand-danger">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-brand-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    placeholder="Repeat password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 text-xs rounded-xl border border-brand-border focus:border-brand-secondary focus:ring-1 focus:ring-brand-secondary outline-none transition bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-charcoal p-1"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Password Rules */}
            <div className="text-[11px] text-brand-muted space-y-1 bg-brand-ivory p-3 rounded-xl border border-brand-border-subtle">
              <span className="font-semibold text-brand-charcoal block mb-0.5">Password Requirements:</span>
              <div className="grid grid-cols-2 gap-1">
                <span className={`flex items-center gap-1 ${password.length >= 8 ? 'text-brand-success font-semibold' : ''}`}>
                  <CheckCircle2 className="w-3 h-3" /> Min 8 characters
                </span>
                <span className={`flex items-center gap-1 ${/[A-Z]/.test(password) && /[a-z]/.test(password) ? 'text-brand-success font-semibold' : ''}`}>
                  <CheckCircle2 className="w-3 h-3" /> Upper & lowercase
                </span>
                <span className={`flex items-center gap-1 ${/[0-9]/.test(password) ? 'text-brand-success font-semibold' : ''}`}>
                  <CheckCircle2 className="w-3 h-3" /> Numeric digit
                </span>
                <span className={`flex items-center gap-1 ${password && password === confirmPassword ? 'text-brand-success font-semibold' : ''}`}>
                  <CheckCircle2 className="w-3 h-3" /> Passwords match
                </span>
              </div>
            </div>

            {/* Terms and Privacy Checkbox */}
            <div className="pt-2">
              <label className="flex items-start gap-2.5 cursor-pointer text-xs text-brand-charcoal">
                <input
                  type="checkbox"
                  required
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 rounded text-brand-secondary focus:ring-brand-secondary"
                />
                <span>
                  I accept the{' '}
                  <span className="font-semibold text-brand-primary">Terms of Service</span> and acknowledge the{' '}
                  <span className="font-semibold text-brand-primary">Facial Biometric Data Privacy Notice</span>.
                </span>
              </label>
            </div>

            {/* Submit CTA */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-4 py-3.5 px-4 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-xs font-bold transition shadow-card flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{isLoading ? 'Creating Organization...' : 'Continue to Email Verification'}</span>
              <ArrowRight className="w-4 h-4 text-brand-mint" />
            </button>
          </form>

          {/* Already have an account */}
          <div className="mt-6 pt-5 border-t border-brand-border-subtle text-center text-xs text-brand-muted">
            <span>Already have an active organization account? </span>
            <Link href="/login" className="font-bold text-brand-primary hover:text-brand-secondary transition underline">
              Sign In
            </Link>
          </div>
        </div>

        {/* Security Safeguard Note */}
        <div className="mt-4 text-center">
          <p className="text-[11px] text-brand-muted flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-brand-secondary" />
            <span>Multi-Tenant Architecture: Organizations are strictly isolated by unique tenant IDs.</span>
          </p>
        </div>
      </div>
    </div>
  );
}
