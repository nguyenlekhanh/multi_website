'use client';

import { useActionState } from 'react';
import { setSiteThemeAction, type ActionState } from '@/app/admin/actions';
import { FormFeedback, SubmitButton } from '@/components/admin/form';
import { cn } from '@/components/shared/cn';

const initial: ActionState = {};

export interface ThemeCard {
  id: string;
  name: string;
  description: string;
  version: string;
  colors: { primary: string; accent: string; background: string };
}

export function ThemePicker({ siteId, currentThemeId, themes }: {
  siteId: string;
  currentThemeId: string;
  themes: ThemeCard[];
}) {
  const [state, formAction] = useActionState(setSiteThemeAction, initial);
  const changed = themes.some((t) => t.id === currentThemeId);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="siteId" value={siteId} />
      <FormFeedback state={state} />
      {!changed && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          The currently stored theme id &ldquo;{currentThemeId}&rdquo; is not registered — pick a theme below to repair it.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        {themes.map((theme) => (
          <label
            key={theme.id}
            className="group flex cursor-pointer flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition has-[:checked]:border-indigo-500 has-[:checked]:ring-2 has-[:checked]:ring-indigo-500/30 hover:border-slate-300"
          >
            <span
              aria-hidden="true"
              className="flex h-20 items-end p-3"
              style={{ background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.background})` }}
            >
              <span className="rounded px-1.5 py-0.5 text-[11px] font-bold" style={{ backgroundColor: theme.colors.accent, color: '#fff' }}>
                {theme.name}
              </span>
            </span>
            <span className="flex flex-1 flex-col p-4">
              <input
                type="radio"
                name="themeId"
                value={theme.id}
                defaultChecked={theme.id === currentThemeId}
                className="sr-only"
              />
              <span className="flex items-center justify-between">
                <span className="font-semibold text-slate-900">{theme.name}</span>
                {theme.id === currentThemeId && (
                  <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700">ACTIVE</span>
                )}
              </span>
              <span className="mt-1.5 flex-1 text-xs leading-snug text-slate-500">{theme.description}</span>
              <span className="mt-2 font-mono text-[11px] text-slate-400">
                {theme.id} · v{theme.version}
              </span>
            </span>
          </label>
        ))}
      </div>
      <div className={cn('flex items-center gap-3 border-t border-slate-200 pt-5')}>
        <SubmitButton pendingLabel="Applying…">Apply theme</SubmitButton>
        <p className="text-xs text-slate-400">
          Content and settings are preserved — only presentation changes. The public site reflects the change on its next request.
        </p>
      </div>
    </form>
  );
}
