'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Organization } from '@/types/organization';
import { organizationService } from '@/services/organization.service';
import { useAuth } from './AuthContext';

interface OrganizationContextType {
  organization: Organization | null;
  availableOrganizations: Organization[];
  isLoading: boolean;
  switchOrganization: (orgId: string) => Promise<void>;
  refreshOrganization: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [availableOrganizations, setAvailableOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadOrganization = useCallback(async () => {
    setIsLoading(true);
    try {
      const all = await organizationService.getOrganizations();
      setAvailableOrganizations(all);

      if (user?.organizationId) {
        const current = all.find((o) => o.id === user.organizationId) || (await organizationService.getOrganization(user.organizationId));
        setOrganization(current || all[0] || null);
      } else if (all.length > 0) {
        setOrganization(all[0]);
      } else {
        setOrganization(null);
      }
    } catch {
      setOrganization(null);
    } finally {
      setIsLoading(false);
    }
  }, [user?.organizationId]);

  useEffect(() => {
    if (user) {
      loadOrganization();
    } else {
      setOrganization(null);
      setIsLoading(false);
    }
  }, [user, loadOrganization]);

  useEffect(() => {
    if (organization?.id && typeof window !== 'undefined') {
      sessionStorage.setItem('attend_ease_org_id', organization.id);
      localStorage.setItem('attend_ease_org_id', organization.id);
    } else if (!organization && typeof window !== 'undefined') {
      sessionStorage.removeItem('attend_ease_org_id');
      localStorage.removeItem('attend_ease_org_id');
    }
  }, [organization]);

  const switchOrganization = async (orgId: string) => {
    setIsLoading(true);
    try {
      const target = availableOrganizations.find((o) => o.id === orgId) || (await organizationService.getOrganization(orgId));
      if (target) {
        setOrganization(target);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const refreshOrganization = async () => {
    await loadOrganization();
  };

  return (
    <OrganizationContext.Provider
      value={{
        organization,
        availableOrganizations,
        isLoading,
        switchOrganization,
        refreshOrganization,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}
