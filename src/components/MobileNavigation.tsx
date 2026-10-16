'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, CalendarCheck, History, User } from 'lucide-react';

export function MobileNavigation() {
  const pathname = usePathname();

  const navItems = [
    {
      label: 'Home',
      href: '/employee/dashboard',
      icon: LayoutDashboard,
    },
    {
      label: 'Mark Attendance',
      href: '/employee/attendance',
      icon: CalendarCheck,
      isPrimaryAction: true,
    },
    {
      label: 'History',
      href: '/employee/history',
      icon: History,
    },
    {
      label: 'Profile',
      href: '/employee/profile',
      icon: User,
    },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-brand-border-subtle md:hidden px-3 py-1.5 shadow-dropdown">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          if (item.isPrimaryAction) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center -mt-5 group"
              >
                <div className="w-12 h-12 rounded-full bg-brand-primary text-brand-mint shadow-dropdown flex items-center justify-center ring-4 ring-brand-ivory group-hover:bg-brand-primary-hover group-active:scale-95 transition">
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-bold text-brand-primary mt-1">
                  Attendance
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center py-1 px-3 rounded-lg text-[10px] font-semibold transition ${
                isActive ? 'text-brand-secondary font-bold' : 'text-brand-muted hover:text-brand-primary'
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
