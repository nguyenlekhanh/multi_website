'use client';

import { useActionState } from 'react';
import { uploadThemeAction, rollbackThemeAction, uninstallThemeAction, type ActionState } from '@/app/admin/theme-actions';
import { Field, FormFeedback, SubmitButton, inputClass } from '@/components/admin/form';

const initial: ActionState = {};

export function ThemeUploadForm() {
  const [state, formAction] = useActionState(uploadThemeAction, initial);
  return (
    <form action={formAction} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-1 font-semibold text-slate-900">Upload theme package</h2>
      <p className="mb-4 text-sm text-slate-500">
        A <code className="rounded bg-slate-100 px-1">.zip</code> built with <code className="rounded bg-slate-100 px-1">npm run theme:pack</code> (MSP
        Theme Package v1 — manifest, JSON templates, scoped CSS, image assets only; no code). Validated
        server-side before anything is stored.
      </p>
      <FormFeedback state={state} />
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <Field label="Theme ZIP" className="min-w-0 flex-1">
          <input
            type="file"
            name="file"
            accept=".zip,application/zip"
            required
            className="block w-full cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
          />
        </Field>
        <div className="pb-0.5">
          <SubmitButton pendingLabel="Validating & installing…">Upload &amp; install</SubmitButton>
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-400">
        Limits: ZIP ≤ 2 MB, ≤ 64 files, ≤ 8 MB extracted. Install/update/rollback/uninstall are audited.
      </p>
    </form>
  );
}

export interface InstalledThemeRow {
  themeId: string;
  name: string;
  description: string;
  version: string;
  authorName: string;
  status: 'CURRENT' | 'ARCHIVED';
  updatedAt: string;
}

export function InstalledThemeCard({
  theme,
  archivedVersions,
  usedBy = [],
}: {
  theme: InstalledThemeRow;
  archivedVersions: { version: string; updatedAt: string }[];
  usedBy?: { id: string; name: string }[];
}) {
  const [rollbackState, rollbackFormAction] = useActionState(rollbackThemeAction, initial);
  const [uninstallState, uninstallFormAction] = useActionState(uninstallThemeAction, initial);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-2">
            <h3 className="font-semibold text-slate-900">{theme.name}</h3>
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">package:{theme.themeId}</code>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
              v{theme.version} · {theme.status}
            </span>
          </div>
          <p className="mt-1.5 line-clamp-2 text-sm t-text-muted">{theme.description}</p>
          <p className="mt-1 text-xs text-slate-400">by {theme.authorName} · updated {theme.updatedAt.slice(0, 10)}</p>
          {usedBy.length > 0 ? (
            <p className="mt-2 text-xs text-slate-500">
              Active on:{' '}
              {usedBy.map((site) => (
                <a key={site.id} href={`/admin/sites/${site.id}/theme`} className="font-semibold text-indigo-600 hover:underline">
                  {site.name}
                </a>
              )).reduce<React.ReactNode[]>((acc, node, i) => (i === 0 ? [node] : [...acc, ', ', node]), [])}
            </p>
          ) : (
            <p className="mt-2 text-xs text-slate-400">Not used by any website.</p>
          )}
        </div>
      </div>

      <FormFeedback state={rollbackState} />
      <FormFeedback state={uninstallState} />

      {archivedVersions.length > 0 && (
        <form action={rollbackFormAction} className="mt-3 flex flex-wrap items-end gap-2">
          <input type="hidden" name="themeId" value={theme.themeId} />
          <Field label="Roll back to">
            <select name="version" className={`${inputClass} w-40`} defaultValue={archivedVersions[0].version}>
              {archivedVersions.map((v) => (
                <option key={v.version} value={v.version}>v{v.version}</option>
              ))}
            </select>
          </Field>
          <div className="pb-0.5">
            <SubmitButton variant="outline" className="px-3 py-2 text-xs" pendingLabel="…">Roll back</SubmitButton>
          </div>
        </form>
      )}

      <form action={uninstallFormAction} className="mt-3">
        <input type="hidden" name="themeId" value={theme.themeId} />
        <SubmitButton
          variant="danger"
          className="px-3 py-1.5 text-xs"
          pendingLabel="…"
          confirm={`Uninstall "${theme.name}" (all versions)? Refused while any website uses it.`}
        >
          Uninstall
        </SubmitButton>
      </form>
    </div>
  );
}
