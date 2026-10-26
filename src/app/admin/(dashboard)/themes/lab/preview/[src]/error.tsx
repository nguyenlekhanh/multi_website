'use client';

import Link from 'next/link';

/**
 * Rendering-error boundary for Preview Lab surfaces: a theme that throws
 * during preview shows a readable message here instead of the global error
 * page, so authors immediately see which package failed.
 */
export default function PreviewError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-6">
      <div className="max-w-xl text-center">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-rose-600">Preview Lab</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">The theme failed to render</h1>
        <p className="mt-3 text-sm text-slate-600">
          This is a rendering error in the theme (or preview), not data loss. Nothing was installed or activated.
        </p>
        <pre className="mt-4 overflow-x-auto rounded-lg border border-rose-200 bg-rose-50 p-3 text-left text-xs text-rose-700">
          {error.message}
        </pre>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Try again
          </button>
          <Link
            href="/admin/themes/lab"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            ← Back to the Preview Lab
          </Link>
        </div>
      </div>
    </div>
  );
}
