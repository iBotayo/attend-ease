'use client';

import React from 'react';
import { AuthProvider } from './AuthContext';
import { OrganizationProvider } from './OrganizationContext';
import { OfflineProvider } from './OfflineContext';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <OrganizationProvider>
        <OfflineProvider>{children}</OfflineProvider>
      </OrganizationProvider>
    </AuthProvider>
  );
}
