'use client';

import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const btnVariants = {
    danger: 'bg-brand-danger hover:bg-brand-danger/90 text-white',
    warning: 'bg-brand-warning hover:bg-brand-warning/90 text-white',
    primary: 'bg-brand-primary hover:bg-brand-primary-hover text-white',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-primary/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-modal border border-brand-border max-w-md w-full p-6 overflow-hidden">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${variant === 'danger' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800'}`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-brand-primary">{title}</h3>
          </div>
          <button
            onClick={onCancel}
            className="text-brand-muted hover:text-brand-charcoal p-1 rounded-lg hover:bg-black/5"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs sm:text-sm text-brand-muted mb-6 leading-relaxed">
          {message}
        </p>

        <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-brand-charcoal hover:bg-black/5 rounded-xl transition"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 text-xs font-semibold rounded-xl shadow-subtle transition ${btnVariants[variant]}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
