'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { previewUploadAction, type PreviewActionState } from '@/app/admin/preview-actions';
import { SubmitButton } from '@/components/admin/form';

const initial: PreviewActionState = {};

/** Upload form for previewing an UNINSTALLED package (nothing is installed). */
export function PreviewLabUpload() {
  const [state, formAction] = useActionState(previewUploadAction, initial);
  return (
    <form action={formAction} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-1 font-semibold text-slate-900">Preview an uninstalled package</h2>
      <p className="mb-4 text-sm text-slate-500">
        Upload a theme <code className="rounded bg-slate-100 px-1">.zip</code> to render it with demo content —
        the same validator as installation runs first, but the package is only kept
        in memory for 30 minutes and never becomes installed or active.
      </p>
      {state.error && (
        <p role="alert" className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {state.error}
        </p>
      )}
      {state.errors && state.errors.length > 0 && (
        <ul className="mb-3 space-y-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {state.errors.map((e, i) => (
            <li key={i}>
              <code className="font-semibold">{e.path}</code>
              {e.field ? <span className="opacity-70"> · {e.field}</span> : null}: {e.message}
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-0 flex-1 text-sm font-medium text-slate-700">
          Theme ZIP
          <input
            type="file"
            name="file"
            accept=".zip,application/zip"
            required
            className="mt-1 block w-full cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
          />
        </label>
        <SubmitButton pendingLabel="Validating…">Preview without installing</SubmitButton>
      </div>
      <p className="mt-3 text-xs text-slate-400">
        Same limits as installation: ZIP ≤ 2 MB, ≤ 64 files, ≤ 8 MB extracted; CSS is sanitized.
      </p>
    </form>
  );
}

export interface PreviewToolbarMeta {
  name: string;
  id: string;
  version?: string;
  source: 'uninstalled' | 'installed' | 'native' | 'gallery';
}

const TEMPLATE_LABELS: Record<string, string> = {
  home: 'Home',
  page: 'Page',
  postList: 'Post list',
  post: 'Post',
  blocks: 'Block showcase',
  gallery: 'Variant gallery',
  notFound: '404',
};

/**
 * Sticky lab toolbar: template tabs + a desktop/mobile width toggle.
 * The toggle constrains the render width — an honest layout approximation,
 * not a device emulator (documented in docs/preview-lab.md).
 */
export function PreviewToolbar({
  src,
  current,
  templates,
  meta,
  children,
}: {
  src: string;
  current: string;
  templates: readonly string[];
  meta: PreviewToolbarMeta;
  children: React.ReactNode;
}) {
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="sticky top-0 z-50 border-b border-white/10 bg-slate-900/95 backdrop-blur" data-testid="preview-toolbar">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{meta.name}</p>
            <p className="text-[11px] text-slate-400">
              <code className="text-slate-300">{meta.id}</code>
              {meta.version ? ` · v${meta.version}` : ''}
              {meta.source === 'uninstalled' && (
                <span className="ml-2 rounded-full bg-amber-500/20 px-2 py-0.5 font-semibold text-amber-300">
                  uninstalled — staged preview only
                </span>
              )}
              {meta.source === 'installed' && (
                <span className="ml-2 rounded-full bg-sky-500/20 px-2 py-0.5 font-semibold text-sky-300">installed</span>
              )}
              {meta.source === 'native' && (
                <span className="ml-2 rounded-full bg-slate-500/20 px-2 py-0.5 font-semibold text-slate-300">native theme</span>
              )}
            </p>
          </div>

          <nav className="flex flex-wrap gap-1" aria-label="Preview templates">
            {templates.map((template) => (
              <Link
                key={template}
                href={`/admin/themes/lab/preview/${src}?template=${template}`}
                aria-current={template === current ? 'page' : undefined}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                  template === current
                    ? 'bg-white text-slate-900'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                {TEMPLATE_LABELS[template] ?? template}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <div className="flex rounded-lg border border-white/15 p-0.5" role="group" aria-label="Preview width">
              {(['desktop', 'mobile'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setDevice(mode)}
                  aria-pressed={device === mode}
                  className={`rounded-md px-3 py-1 text-xs font-semibold capitalize transition ${
                    device === mode ? 'bg-white text-slate-900' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
            <Link href="/admin/themes/lab" className="text-xs font-semibold text-sky-400 hover:underline">
              ← Lab
            </Link>
          </div>
        </div>
      </div>

      <div className={device === 'mobile' ? 'mx-auto w-full max-w-[420px] border-x border-slate-800 bg-white shadow-2xl' : ''} data-device={device}>
        <div className={device === 'mobile' ? 'max-h-[80vh] overflow-y-auto' : ''}>{children}</div>
      </div>
    </div>
  );
}
