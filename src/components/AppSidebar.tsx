'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BrandLogo } from './BrandLogo';
import { useOffline } from '@/context/OfflineContext';
import {
  LayoutDashboard,
  Users,
  Building2,
  CalendarCheck2,
  WifiOff,
  Clock,
  BarChart3,
  Smartphone,
  ShieldAlert,
  Settings,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  X,
} from 'lucide-react';

interface AppSidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function AppSidebar({
  isCollapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}: AppSidebarProps) {
  const pathname = usePathname();
  const { pendingCount } = useOffline();

  // Close mobile drawer on Escape key press
  React.useEffect(() => {
    if (!mobileOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseMobile();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen, onCloseMobile]);

  const navItems = [
    {
      label: 'Dashboard',
      href: '/admin/dashboard',
      icon: LayoutDashboard,
    },
    {
      label: 'Employees',
      href: '/admin/employees',
      icon: Users,
    },
    {
      label: 'Facilities',
      href: '/admin/facilities',
      icon: Building2,
    },
    {
      label: 'Attendance Register',
      href: '/admin/attendance',
      icon: CalendarCheck2,
    },
    {
      label: 'Offline Records',
      href: '/admin/offline-records',
      icon: WifiOff,
      badge: pendingCount > 0 ? pendingCount : undefined,
    },
    {
      label: 'Shifts & Schedules',
      href: '/admin/shifts',
      icon: Clock,
    },
    {
      label: 'Reports & Export',
      href: '/admin/reports',
      icon: BarChart3,
    },
    {
      label: 'Devices',
      href: '/admin/devices',
      icon: Smartphone,
    },
    {
      label: 'Audit Logs',
      href: '/admin/audit-logs',
      icon: ShieldAlert,
    },
    {
      label: 'Settings',
      href: '/admin/settings',
      icon: Settings,
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-brand-primary text-white select-none">
      {/* Brand header */}
      <div className={`p-4 border-b border-brand-primary-light flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
        {!isCollapsed ? (
          <div className="flex items-center gap-2">
            <BrandLogo size="md" href="/admin/dashboard" />
          </div>
        ) : (
          <Link href="/admin/dashboard" className="p-1 rounded-xl bg-brand-primary-light hover:bg-brand-secondary transition">
            <UserCheck className="w-6 h-6 text-brand-mint" />
          </Link>
        )}

        <button
          onClick={onToggleCollapse}
          className="hidden lg:flex p-1.5 rounded-lg bg-brand-primary-light hover:bg-brand-secondary text-brand-mint transition"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        {/* Mobile close button */}
        <button
          onClick={onCloseMobile}
          className="lg:hidden p-1.5 rounded-lg bg-brand-primary-light hover:bg-brand-secondary text-brand-mint transition focus:outline-none focus:ring-2 focus:ring-brand-mint"
          aria-label="Close navigation drawer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/admin/dashboard' && pathname?.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onCloseMobile}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group relative ${
                isActive
                  ? 'bg-brand-secondary text-white shadow-subtle'
                  : 'text-brand-mint/80 hover:bg-white/10 hover:text-white'
              } ${isCollapsed ? 'justify-center px-2' : ''}`}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-brand-mint' : 'text-brand-mint/70 group-hover:text-brand-mint'}`} />
              
              {!isCollapsed && <span className="truncate">{item.label}</span>}

              {!isCollapsed && item.badge !== undefined && (
                <span className="ml-auto bg-brand-warning text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}

              {/* Collapsed badge pill */}
              {isCollapsed && item.badge !== undefined && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-brand-warning ring-2 ring-brand-primary" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer shortcut to Employee portal */}
      <div className="p-3 border-t border-brand-primary-light/80">
        <Link
          href="/employee/dashboard"
          className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-brand-mint/90 hover:bg-white/10 hover:text-white transition ${
            isCollapsed ? 'justify-center px-2' : ''
          }`}
          title={isCollapsed ? 'Switch to Employee Portal' : undefined}
        >
          <UserCheck className="w-4 h-4 text-brand-mint shrink-0" />
          {!isCollapsed && <span className="truncate">Employee View</span>}
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:block shrink-0 h-screen sticky top-0 transition-all duration-300 z-30 shadow-dropdown ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Administrator navigation drawer"
        >
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 left-0 w-72 bg-brand-primary shadow-modal z-10 animate-slide-right flex flex-col">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
