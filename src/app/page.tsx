'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function RootPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        if (user.role === 'org_admin' || user.role === 'system_admin' || user.role === 'facility_admin') {
          router.replace('/admin/dashboard');
        } else if (user.role === 'supervisor') {
          router.replace('/admin/attendance');
        } else {
          router.replace('/employee/dashboard');
        }
      } else {
        router.replace('/login');
      }
    }
  }, [user, isLoading, router]);

  return (
    <div className="min-h-screen bg-brand-ivory flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-3 border-brand-primary/20 border-t-brand-primary animate-spin" />
    </div>
  );
}
