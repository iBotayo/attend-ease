'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { AppSidebar } from '@/components/AppSidebar';
import { AppHeader } from '@/components/AppHeader';
import { DemoToolbar } from '@/components/DemoToolbar';
import { OfflineBanner } from '@/components/OfflineBanner';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  React.useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.replace('/login');
      } else if (user.role === 'employee') {
        router.replace('/employee/dashboard');
      }
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-ivory flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-3 border-brand-primary/20 border-t-brand-primary animate-spin" />
      </div>
    );
  }

  if (!user || user.role === 'employee') {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-brand-ivory text-brand-charcoal">
      {/* Demo Mode & Role Switcher Toolbar */}
      <DemoToolbar />

      {/* Offline Status Warning Banner */}
      <OfflineBanner />

      <div className="flex-1 flex w-full">
        {/* Left Collapsible Sidebar */}
        <AppSidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          mobileOpen={mobileDrawerOpen}
          onCloseMobile={() => setMobileDrawerOpen(false)}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <AppHeader onToggleSidebar={() => setMobileDrawerOpen(true)} />

          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
