'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive?: boolean;
    label?: string;
  };
  variant?: 'default' | 'success' | 'warning' | 'danger';
  onClick?: () => void;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = 'default',
  onClick,
}: StatCardProps) {
  const iconVariants = {
    default: 'bg-brand-primary/10 text-brand-primary',
    success: 'bg-brand-success/15 text-brand-success',
    warning: 'bg-brand-warning/15 text-brand-warning',
    danger: 'bg-brand-danger/15 text-brand-danger',
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl p-5 border border-brand-border-subtle shadow-card transition-all ${
        onClick ? 'cursor-pointer hover:shadow-dropdown hover:border-brand-secondary/40' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-muted">
            {title}
          </p>
          <p className="text-2xl sm:text-3xl font-extrabold text-brand-primary tracking-tight">
            {value}
          </p>
        </div>
        <div className={`p-3 rounded-xl shrink-0 ${iconVariants[variant]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {(subtitle || trend) && (
        <div className="mt-3 pt-3 border-t border-brand-border-subtle flex items-center justify-between text-xs text-brand-muted">
          {subtitle && <span>{subtitle}</span>}
          {trend && (
            <span
              className={`font-semibold ml-auto flex items-center gap-1 ${
                trend.isPositive ? 'text-brand-success' : 'text-brand-danger'
              }`}
            >
              {trend.value} {trend.label && <span className="font-normal text-brand-muted">({trend.label})</span>}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
