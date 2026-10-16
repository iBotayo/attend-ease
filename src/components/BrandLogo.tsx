'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  href?: string;
  className?: string;
  showTagline?: boolean;
}

export function BrandLogo({ size = 'md', href, className = '', showTagline = false }: BrandLogoProps) {
  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  const content = (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className={`${iconSizes[size]} rounded-xl bg-brand-primary flex items-center justify-center text-brand-mint shadow-subtle shrink-0`}>
        <ShieldCheck className="w-5/6 h-5/6" strokeWidth={2.2} />
      </div>
      <div className="flex flex-col">
        <div className={`font-bold tracking-tight text-brand-primary ${textSizes[size]} flex items-center gap-1`}>
          <span>Attend</span>
          <span className="text-brand-secondary">Ease</span>
        </div>
        {showTagline && (
          <span className="text-[11px] font-medium text-brand-muted -mt-1 tracking-wide">
            Attendance made simple.
          </span>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-block transition-opacity hover:opacity-90">
        {content}
      </Link>
    );
  }

  return content;
}
