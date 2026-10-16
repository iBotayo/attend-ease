'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { AppHeader } from '@/components/AppHeader';
import { DemoToolbar } from '@/components/DemoToolbar';
import { OfflineBanner } from '@/components/OfflineBanner';
import { MobileNavigation } from '@/components/MobileNavigation';

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-ivory flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-3 border-brand-primary/20 border-t-brand-primary animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null;
  }
  return (
    <div className="min-h-screen flex flex-col bg-brand-ivory text-brand-charcoal">
      {/* Development Demo & Role Switcher Toolbar */}
      <DemoToolbar />

      {/* Offline Status Warning Banner */}
      <OfflineBanner />

      {/* Employee Top Header */}
      <AppHeader isEmployeeLayout />

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 pb-24 md:pb-10">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileNavigation />
    </div>
  );
}
