'use client';

import { useEffect, useRef, type ReactNode } from 'react';

import { ErrorBanner } from './ErrorBanner';
import { GlassCard } from './GlassCard';
import { PrimaryButton } from './PrimaryButton';
import { SecondaryButton } from './SecondaryButton';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description?: string;
  variant?: 'default' | 'danger';
  confirmLabel: string;
  cancelLabel?: string;
  isConfirmDisabled?: boolean;
  isLoading?: boolean;
  bannerError?: string;
  countdownSeconds?: number;
  children?: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  variant = 'default',
  confirmLabel,
  cancelLabel = 'Hủy',
  isConfirmDisabled = false,
  isLoading = false,
  bannerError,
  countdownSeconds,
  children,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerElementRef = useRef<Element | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    triggerElementRef.current = document.activeElement;
    dialogRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        onCancel();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;

      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (triggerElementRef.current instanceof HTMLElement) {
        triggerElementRef.current.focus();
      }
    };
  }, [isOpen, onCancel]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        tabIndex={-1}
        className="w-full max-w-md outline-none"
      >
        <GlassCard variant={variant}>
          <h2 id="confirm-dialog-title" className="mb-2 font-heading text-lg font-semibold text-slate-100">
            {title}
          </h2>
          {description ? <p className="mb-4 text-sm text-slate-400">{description}</p> : null}

          {bannerError ? (
            <ErrorBanner message={bannerError} countdownSeconds={countdownSeconds} />
          ) : null}

          {children ? <div className="mb-4">{children}</div> : null}

          <div className="flex gap-3">
            <SecondaryButton onClick={onCancel} disabled={isLoading}>
              {cancelLabel}
            </SecondaryButton>
            <PrimaryButton
              onClick={onConfirm}
              disabled={isConfirmDisabled}
              isLoading={isLoading}
              className={variant === 'danger' ? 'from-neon-danger to-neon-danger/80' : ''}
            >
              {confirmLabel}
            </PrimaryButton>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
