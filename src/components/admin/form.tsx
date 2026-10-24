'use client';

import { useFormStatus } from 'react-dom';
import { cn } from '@/components/shared/cn';

/** Submit button with automatic pending state. */
export function SubmitButton({
  children,
  className,
  variant = 'primary',
  pendingLabel,
  confirm,
  form,
}: {
  children: React.ReactNode;
  className?: string;
  variant?: 'primary' | 'outline' | 'danger';
  pendingLabel?: string;
  /** Native confirm dialog text for destructive actions. */
  confirm?: string;
  /** Associates the button with a form by id (for out-of-form submit buttons). */
  form?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      form={form}
      disabled={pending}
      onClick={(event) => {
        if (confirm && !window.confirm(confirm)) event.preventDefault();
      }}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:cursor-not-allowed disabled:opacity-60',
        variant === 'primary' && 'bg-indigo-600 text-white hover:bg-indigo-500',
        variant === 'outline' && 'border border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50',
        variant === 'danger' && 'bg-rose-600 text-white hover:bg-rose-500',
        className,
      )}
    >
      {pending && (
        <span aria-hidden="true" className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
      )}
      {pending ? (pendingLabel ?? 'Working…') : children}
    </button>
  );
}

/** Inline feedback block for action states. */
export function FormFeedback({ state }: { state: { error?: string; message?: string } }) {
  if (state.error) {
    return (
      <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
        {state.error}
      </p>
    );
  }
  if (state.message) {
    return (
      <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
        {state.message}
      </p>
    );
  }
  return null;
}

/** Labeled field wrapper. */
export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

export const inputClass =
  'block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20';
