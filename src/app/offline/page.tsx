'use client';

import React from 'react';
import Link from 'next/link';
import { BrandLogo } from '@/components/BrandLogo';
import { WifiOff, RefreshCw, ArrowLeft, ShieldAlert } from 'lucide-react';

export default function OfflinePage() {
  const handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-brand-ivory flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 text-center">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-6">
          <BrandLogo size="lg" showTagline />
        </div>

        <div className="bg-white py-8 px-6 shadow-card rounded-3xl border border-brand-border-subtle sm:px-10">
          <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 mx-auto mb-4 border border-amber-200">
            <WifiOff className="w-8 h-8" />
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-brand-primary tracking-tight">
            You Are Currently Offline
          </h1>

          <p className="mt-2 text-xs sm:text-sm text-brand-muted leading-relaxed">
            Attend Ease detected that your device has lost connection to the server or internet.
          </p>

          <div className="mt-5 p-3.5 bg-brand-mint/40 border border-brand-mint text-brand-primary rounded-xl text-left text-xs space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-brand-primary">
              <ShieldAlert className="w-4 h-4 text-brand-secondary shrink-0" />
              <span>Offline Attendance Queuing Active</span>
            </div>
            <p className="text-[11px] text-brand-muted leading-normal">
              Attendance check-ins performed on registered devices are safely preserved in local IndexedDB storage and will be synchronized when connectivity is restored.
            </p>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleReload}
              className="flex-1 py-2.5 px-4 bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-subtle"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Connection</span>
            </button>
            <Link
              href="/"
              className="flex-1 py-2.5 px-4 bg-white border border-brand-border hover:bg-brand-ivory text-brand-charcoal text-xs font-bold rounded-xl transition flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-brand-muted" />
              <span>Return Home</span>
            </Link>
          </div>
        </div>

        <p className="mt-6 text-[11px] text-brand-muted">
          Attend Ease Progressive Web App &bull; Local Storage Guaranteed
        </p>
      </div>
    </div>
  );
}
