'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useOffline } from '@/context/OfflineContext';
import { Sparkles, ArrowLeftRight, WifiOff, Wifi, ChevronDown } from 'lucide-react';
import Link from 'next/link';

export function DemoToolbar() {
  const { user, switchUser, availableDemoUsers, isMockMode } = useAuth();
  const { isSimulatedOffline, toggleSimulatedOffline } = useOffline();
  const [isOpen, setIsOpen] = useState(false);

  if (!isMockMode) {
    return null;
  }

  return (
    <aside aria-label="Development Demo Controls" className="bg-brand-primary text-white text-xs px-3 sm:px-4 py-1.5 border-b border-brand-primary-light flex flex-wrap items-center justify-between gap-2 z-40 relative">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded bg-brand-mint text-brand-mint-dark text-[11px] uppercase tracking-wide">
          <Sparkles className="w-3 h-3" /> Demo Mode
        </span>
        <span className="hidden md:inline text-brand-mint/80 text-xs">
          Frontend-only simulation phase. Real Go backend will integrate via service layer.
        </span>
      </div>

      <div className="flex items-center gap-2.5 sm:gap-4">
        {/* Toggle Simulated Offline */}
        <button
          onClick={toggleSimulatedOffline}
          type="button"
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-medium transition ${
            isSimulatedOffline
              ? 'bg-brand-warning text-white'
              : 'bg-white/10 text-brand-mint hover:bg-white/20'
          }`}
          title="Toggle simulated offline mode"
        >
          {isSimulatedOffline ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
          <span>{isSimulatedOffline ? 'Simulating Offline' : 'Simulate Offline'}</span>
        </button>

        {/* Quick Role Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-white/15 hover:bg-white/25 text-white font-medium transition"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-brand-mint" />
            <span className="max-w-[120px] truncate">{user?.name || 'Switch Role'}</span>
            <span className="text-[10px] text-brand-mint/70 capitalize">({user?.role.replace('_', ' ')})</span>
            <ChevronDown className="w-3 h-3 text-brand-mint/70 ml-0.5" />
          </button>

          {isOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
              <div className="absolute right-0 top-full mt-1.5 w-64 bg-white text-brand-charcoal rounded-xl shadow-dropdown border border-brand-border py-1 z-40">
                <div className="px-3 py-1.5 text-[11px] font-semibold text-brand-muted uppercase tracking-wider border-b border-brand-border-subtle">
                  Switch Active Demo User
                </div>
                <div className="max-h-60 overflow-y-auto py-1">
                  {availableDemoUsers.slice(0, 6).map((u) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        switchUser(u);
                        setIsOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-brand-ivory transition ${
                        user?.id === u.id ? 'bg-brand-mint/30 font-semibold text-brand-primary' : ''
                      }`}
                    >
                      <div>
                        <div className="text-brand-charcoal">{u.name}</div>
                        <div className="text-[11px] text-brand-muted capitalize">
                          {u.role.replace('_', ' ')} • {u.departmentName.split(' ')[0]}
                        </div>
                      </div>
                      {user?.id === u.id && (
                        <span className="text-[10px] bg-brand-primary text-brand-mint px-1.5 py-0.5 rounded">
                          Active
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                <div className="px-3 py-1.5 border-t border-brand-border-subtle bg-brand-ivory text-[11px] text-brand-muted flex justify-between">
                  <Link href="/employee/dashboard" className="text-brand-secondary hover:underline">
                    Employee View
                  </Link>
                  <Link href="/admin/dashboard" className="text-brand-primary font-semibold hover:underline">
                    Admin View
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
