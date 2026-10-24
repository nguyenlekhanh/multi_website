'use client';

import { useState, useTransition } from 'react';
import { switchSiteTheme } from '@/platform/actions';
import { cn } from '@/components/shared/cn';

/**
 * Development-only floating bar.
 *
 * Rendered by the platform (not by themes) when the app runs outside
 * production. It exposes the two dev controls required for the MVP:
 * switching the active theme of the current site, and hopping between the
 * demo sites via their preview routes.
 */

export interface DevBarProps {
  siteId: string;
  siteName: string;
  currentThemeId: string;
  themes: { id: string; name: string }[];
  sites: { id: string; name: string; themeName: string; color: string }[];
  preview: boolean;
}

export function DevBar({ siteId, siteName, currentThemeId, themes, sites, preview }: DevBarProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const activeTheme = themes.find((t) => t.id === currentThemeId)?.name ?? currentThemeId;

  function handleThemeSwitch(themeId: string) {
    setError(null);
    startTransition(async () => {
      const result = await switchSiteTheme(siteId, themeId);
      if (!result.ok) setError(result.error ?? 'Switch failed.');
    });
  }

  return (
    <div className="fixed bottom-4 right-4 z-[100] font-sans text-sm">
      {open && (
        <div
          className="mb-3 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-white/10 bg-slate-900/95 text-slate-200 shadow-2xl backdrop-blur"
          data-testid="dev-bar-panel"
        >
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold uppercase tracking-wider text-slate-400">
                Dev preview · {preview ? 'preview route' : 'mapped hostname'}
              </p>
              <p className="truncate text-sm font-semibold text-white">{siteName}</p>
            </div>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- full navigation so the preview cookie applies immediately */}
            <a
              href="/preview/clear"
              className="ml-3 shrink-0 rounded-md border border-white/15 px-2 py-1 text-xs text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              Exit preview
            </a>
          </div>

          <div className="px-4 py-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Active theme
            </p>
            <div className="flex flex-wrap gap-1.5">
              {themes.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  disabled={pending}
                  onClick={() => handleThemeSwitch(theme.id)}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-xs font-medium transition',
                    theme.id === currentThemeId
                      ? 'bg-emerald-500/90 text-slate-950'
                      : 'bg-white/10 text-slate-200 hover:bg-white/20',
                    pending && 'opacity-60',
                  )}
                  data-testid={`theme-switch-${theme.id}`}
                >
                  {theme.name}
                  {theme.id === currentThemeId ? ' ✓' : ''}
                </button>
              ))}
            </div>
            {error && <p className="mt-2 text-xs text-rose-400">{error}</p>}
          </div>

          <div className="border-t border-white/10 px-4 py-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Switch demo site
            </p>
            <div className="grid gap-1.5">
              {sites.map((site) => (
                <a
                  key={site.id}
                  href={`/preview/${site.id}`}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs transition hover:bg-white/10',
                    site.id === siteId ? 'bg-white/10 text-white' : 'text-slate-300',
                  )}
                  data-testid={`site-switch-${site.id}`}
                >
                  <span
                    aria-hidden="true"
                    className="h-3 w-3 shrink-0 rounded-full ring-1 ring-white/20"
                    style={{ backgroundColor: site.color }}
                  />
                  <span className="min-w-0 flex-1 truncate font-medium">{site.name}</span>
                  <span className="shrink-0 text-slate-500">{site.themeName}</span>
                </a>
              ))}
            </div>
          </div>

          <p className="border-t border-white/10 px-4 py-2.5 text-[11px] leading-snug text-slate-500">
            Theme switches are development-only and reset when the server restarts. In production,
            a site&apos;s active theme comes from its configuration.
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="ml-auto flex items-center gap-2 rounded-full bg-slate-900/95 px-4 py-2.5 text-xs font-semibold text-white shadow-2xl ring-1 ring-white/15 backdrop-blur transition hover:bg-slate-800"
        data-testid="dev-bar-toggle"
      >
        <span aria-hidden="true" className="h-2 w-2 rounded-full bg-emerald-400" />
        {open ? 'Close dev bar' : `${siteName} · ${activeTheme}`}
      </button>
    </div>
  );
}
