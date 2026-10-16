'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ConnectionStatus } from './ConnectionStatus';
import { BrandLogo } from './BrandLogo';
import { SyncQueueModal } from './SyncQueueModal';
import {
  Menu,
  Bell,
  LogOut,
  User,
  Shield,
  LayoutDashboard,
  CalendarCheck,
  ChevronDown,
  KeyRound,
} from 'lucide-react';

interface AppHeaderProps {
  onToggleSidebar?: () => void;
  title?: string;
  isEmployeeLayout?: boolean;
}

export function AppHeader({ onToggleSidebar, title, isEmployeeLayout = false }: AppHeaderProps) {
  const { user, logout, isMockMode } = useAuth();
  const isAdminRole = user?.role !== 'employee';
  const router = useRouter();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-brand-border-subtle shadow-subtle px-4 sm:px-6 py-2.5">
        <div className="flex items-center justify-between gap-4">
          {/* Left section */}
          <div className="flex items-center gap-3">
            {onToggleSidebar && (
              <button
                onClick={onToggleSidebar}
                className="lg:hidden p-2 text-brand-primary hover:bg-brand-ivory rounded-xl transition"
                aria-label="Toggle navigation sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}

            {isEmployeeLayout ? (
              <BrandLogo size="md" href="/employee/dashboard" />
            ) : (
              <div className="hidden sm:block">
                <h2 className="text-base font-bold text-brand-primary">{title || 'Administrator Portal'}</h2>
              </div>
            )}
          </div>

          {/* Center (Navigation for Employee desktop) */}
          {isEmployeeLayout && (
            <nav className="hidden md:flex items-center gap-1 bg-brand-ivory p-1 rounded-xl border border-brand-border-subtle">
              <Link
                href="/employee/dashboard"
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg text-brand-primary hover:bg-white transition"
              >
                Dashboard
              </Link>
              <Link
                href="/employee/attendance"
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg text-white bg-brand-primary hover:bg-brand-primary-hover shadow-subtle transition flex items-center gap-1.5"
              >
                <CalendarCheck className="w-3.5 h-3.5" />
                <span>Mark Attendance</span>
              </Link>
              <Link
                href="/employee/history"
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg text-brand-muted hover:text-brand-primary hover:bg-white transition"
              >
                History
              </Link>
              <Link
                href="/employee/profile"
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg text-brand-muted hover:text-brand-primary hover:bg-white transition"
              >
                Profile
              </Link>
            </nav>
          )}

          {/* Right section */}
          <div className="flex items-center gap-2 sm:gap-3.5">
            <ConnectionStatus onOpenSyncModal={() => setIsSyncModalOpen(true)} />

            {/* Notifications button */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-2 text-brand-muted hover:text-brand-primary hover:bg-brand-ivory rounded-xl transition relative"
                aria-label="View notifications"
              >
                <Bell className="w-5 h-5" />
                {isMockMode && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand-secondary" />
                )}
              </button>

              {notificationsOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setNotificationsOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-dropdown border border-brand-border py-2 z-40 animate-fade-in">
                    <div className="px-4 py-2 border-b border-brand-border-subtle flex items-center justify-between">
                      <span className="text-xs font-bold text-brand-primary uppercase tracking-wider">
                        Notifications
                      </span>
                      {isMockMode && <span className="text-[11px] text-brand-muted">2 unread</span>}
                    </div>
                    {!isMockMode ? (
                      <p className="px-4 py-6 text-center text-xs text-brand-muted">No notifications yet.</p>
                    ) : (
                    <div className="divide-y divide-brand-border-subtle/50 text-xs">
                      <div className="p-3 hover:bg-brand-ivory transition">
                        <div className="font-semibold text-brand-primary">Attendance Confirmed</div>
                        <p className="text-brand-muted text-[11px] mt-0.5">
                          Face & facility verification recorded successfully at 08:02 AM.
                        </p>
                        <span className="text-[10px] text-brand-muted/70 mt-1 block">15m ago</span>
                      </div>
                      <div className="p-3 hover:bg-brand-ivory transition">
                        <div className="font-semibold text-brand-primary">Offline Queue Status</div>
                        <p className="text-brand-muted text-[11px] mt-0.5">
                          IndexedDB offline storage adapter is active and operational.
                        </p>
                        <span className="text-[10px] text-brand-muted/70 mt-1 block">1 hour ago</span>
                      </div>
                    </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* User Profile dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-brand-ivory transition border border-transparent hover:border-brand-border-subtle"
              >
                {user?.avatarUrl ? (
                  <Image
                    src={user.avatarUrl}
                    alt={user.name}
                    width={32}
                    height={32}
                    className="w-8 h-8 rounded-full object-cover border border-brand-border shrink-0"
                    unoptimized
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-brand-primary text-brand-mint flex items-center justify-center font-bold text-xs shrink-0">
                    {user?.name?.charAt(0) || 'U'}
                  </div>
                )}
                <div className="hidden lg:block text-left">
                  <div className="text-xs font-bold text-brand-primary leading-tight">
                    {user?.name || 'User'}
                  </div>
                  <div className="text-[11px] text-brand-muted capitalize">
                    {user?.role?.replace('_', ' ') || 'Staff'}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-brand-muted hidden sm:block" />
              </button>

              {isProfileMenuOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setIsProfileMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-dropdown border border-brand-border py-1.5 z-40 animate-fade-in text-xs">
                    <div className="px-4 py-2 border-b border-brand-border-subtle">
                      <p className="font-bold text-brand-primary">{user?.name}</p>
                      <p className="text-brand-muted text-[11px] truncate">{user?.email}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-brand-mint text-brand-mint-dark capitalize">
                        {user?.role?.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="py-1">
                      <Link
                        href="/employee/dashboard"
                        onClick={() => setIsProfileMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-brand-charcoal hover:bg-brand-ivory transition"
                      >
                        <LayoutDashboard className="w-4 h-4 text-brand-muted" />
                        <span>Employee Portal</span>
                      </Link>

                      {isAdminRole && (
                        <Link
                          href="/admin/dashboard"
                          onClick={() => setIsProfileMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-brand-charcoal hover:bg-brand-ivory transition"
                        >
                          <Shield className="w-4 h-4 text-brand-muted" />
                          <span>Administrator Portal</span>
                        </Link>
                      )}

                      <Link
                        href="/employee/profile"
                        onClick={() => setIsProfileMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-brand-charcoal hover:bg-brand-ivory transition"
                      >
                        <User className="w-4 h-4 text-brand-muted" />
                        <span>My Profile</span>
                      </Link>

                      <Link
                        href="/change-password"
                        onClick={() => setIsProfileMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-brand-charcoal hover:bg-brand-ivory transition"
                      >
                        <KeyRound className="w-4 h-4 text-brand-muted" />
                        <span>Change Password</span>
                      </Link>
                    </div>

                    <div className="border-t border-brand-border-subtle pt-1 mt-1">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-brand-danger hover:bg-rose-50 transition font-semibold"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign out</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Sync Queue Modal */}
      <SyncQueueModal isOpen={isSyncModalOpen} onClose={() => setIsSyncModalOpen(false)} />
    </>
  );
}
