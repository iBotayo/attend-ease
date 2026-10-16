'use client';

import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ title, description, icon: Icon = Inbox, action }: EmptyStateProps) {
  return (
    <div className="bg-white rounded-2xl border border-dashed border-brand-border p-8 sm:p-12 text-center max-w-lg mx-auto my-6">
      <div className="w-12 h-12 rounded-2xl bg-brand-ivory border border-brand-border text-brand-muted flex items-center justify-center mx-auto mb-4">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-base font-bold text-brand-primary mb-1">{title}</h3>
      <p className="text-xs sm:text-sm text-brand-muted mb-6 leading-relaxed">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-brand-primary text-white rounded-xl text-xs font-semibold hover:bg-brand-primary-hover transition shadow-subtle"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

export function LoadingState({ message = 'Loading details...' }: { message?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-brand-border-subtle p-12 text-center my-6 flex flex-col items-center justify-center">
      <div className="w-8 h-8 rounded-full border-3 border-brand-primary/20 border-t-brand-primary animate-spin mb-3" />
      <p className="text-xs font-medium text-brand-muted">{message}</p>
    </div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="bg-rose-50/50 rounded-2xl border border-rose-200 p-6 sm:p-8 text-center max-w-lg mx-auto my-6">
      <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto mb-3 font-bold text-lg">
        !
      </div>
      <h3 className="text-sm font-bold text-rose-900 mb-1">{title}</h3>
      <p className="text-xs text-rose-700 mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-3.5 py-1.5 bg-rose-700 text-white rounded-lg text-xs font-semibold hover:bg-rose-800 transition"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
