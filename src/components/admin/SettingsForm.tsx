'use client';

import { useActionState } from 'react';
import { updateSettingsAction, type ActionState } from '@/app/admin/actions';
import { Field, FormFeedback, SubmitButton, inputClass } from '@/components/admin/form';
import { NavListEditor } from '@/components/admin/NavListEditor';
import type { SiteSettings } from '@/platform/types';

const initial: ActionState = {};

const COLOR_FIELDS: { key: string; label: string }[] = [
  { key: 'primary', label: 'Primary' },
  { key: 'primaryForeground', label: 'On primary' },
  { key: 'accent', label: 'Accent' },
  { key: 'background', label: 'Page background' },
  { key: 'foreground', label: 'Body text' },
  { key: 'muted', label: 'Muted surface' },
  { key: 'mutedForeground', label: 'Muted text' },
  { key: 'border', label: 'Borders' },
  { key: 'dark', label: 'Dark surface' },
  { key: 'darkForeground', label: 'On dark' },
];

const TYPOGRAPHY_OPTIONS = [
  { value: 'system', label: 'System default' },
  { value: 'sans', label: 'Sans-serif' },
  { value: 'serif', label: 'Serif' },
  { value: 'mono', label: 'Monospace' },
  { value: 'rounded', label: 'Rounded' },
];

export function SettingsForm({
  siteId,
  siteName,
  settings,
  typography,
}: {
  siteId: string;
  siteName: string;
  settings: SiteSettings;
  typography: { headingFont?: string; bodyFont?: string };
}) {
  const [state, formAction] = useActionState(updateSettingsAction, initial);

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="siteId" value={siteId} />
      <FormFeedback state={state} />

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-semibold text-slate-900">Identity</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Display name">
            <input type="text" name="name" defaultValue={siteName} required minLength={2} maxLength={120} className={inputClass} />
          </Field>
          <Field label="Tagline">
            <input type="text" name="tagline" defaultValue={settings.identity.tagline} maxLength={200} className={inputClass} />
          </Field>
          <Field label="Logo wordmark">
            <input type="text" name="logoText" defaultValue={settings.identity.logoText} maxLength={40} className={inputClass} />
          </Field>
          <Field label="Logo monogram" hint="1–2 letters shown when no logo image is set.">
            <input type="text" name="logoInitials" defaultValue={settings.identity.logoInitials} maxLength={3} className={inputClass} />
          </Field>
          <Field label="Logo image URL" hint="Site path (/images/logo.svg) or https:// URL. Optional.">
            <input type="text" name="logoUrl" defaultValue={settings.identity.logoUrl ?? ''} className={inputClass} />
          </Field>
          <Field label="Favicon URL" hint="Site path or https:// URL. Optional.">
            <input type="text" name="faviconUrl" defaultValue={settings.identity.faviconUrl ?? ''} className={inputClass} />
          </Field>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 font-semibold text-slate-900">Brand colors</h2>
        <p className="mb-4 text-sm text-slate-500">Themes apply these through their brand variables.</p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {COLOR_FIELDS.map((field) => (
            <Field key={field.key} label={field.label}>
              <span className="flex items-center gap-1.5">
                <input
                  type="color"
                  defaultValue={settings.colors[field.key as keyof typeof settings.colors]}
                  onChange={(e) => {
                    const text = document.querySelector<HTMLInputElement>(`[data-color-text="${field.key}"]`);
                    if (text) text.value = e.target.value;
                  }}
                  className="h-9 w-9 shrink-0 cursor-pointer rounded border border-slate-300"
                  aria-label={`${field.label} color picker`}
                />
                <input
                  type="text"
                  name={`color_${field.key}`}
                  data-color-text={field.key}
                  defaultValue={settings.colors[field.key as keyof typeof settings.colors]}
                  pattern="#[0-9a-fA-F]{3,8}"
                  className="w-full min-w-0 rounded-lg border border-slate-300 px-2 py-2 font-mono text-xs focus:border-indigo-500 focus:outline-none"
                  aria-label={`${field.label} hex value`}
                />
              </span>
            </Field>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-semibold text-slate-900">Navigation</h2>
        <div className="space-y-6">
          <NavListEditor prefix="nav" label="Main navigation" initial={settings.nav} />
          <NavListEditor prefix="footer" label="Footer navigation" initial={settings.footerNav} />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-semibold text-slate-900">SEO defaults</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Default title">
            <input type="text" name="seoDefaultTitle" defaultValue={settings.seo.defaultTitle} maxLength={120} className={inputClass} />
          </Field>
          <Field label="Title template" hint="%s is replaced with the page title.">
            <input type="text" name="seoTitleTemplate" defaultValue={settings.seo.titleTemplate} maxLength={120} className={inputClass} />
          </Field>
          <Field label="Meta description" className="sm:col-span-2">
            <textarea name="seoDescription" defaultValue={settings.seo.description} rows={2} maxLength={300} className={inputClass} />
          </Field>
          <Field label="Keywords" hint="Comma-separated.">
            <input type="text" name="seoKeywords" defaultValue={(settings.seo.keywords ?? []).join(', ')} className={inputClass} />
          </Field>
          <Field label="Social image URL" hint="Used for link previews.">
            <input type="text" name="seoSocialImage" defaultValue={settings.seo.socialImage ?? ''} className={inputClass} />
          </Field>
          <Field label="Twitter handle" hint="Optional, e.g. @yourbrand">
            <input type="text" name="seoTwitterHandle" defaultValue={settings.seo.twitterHandle ?? ''} className={inputClass} />
          </Field>
          <Field label="Heading font">
            <select name="headingFont" defaultValue={typography.headingFont ?? 'system'} className={inputClass}>
              {TYPOGRAPHY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Body font">
            <select name="bodyFont" defaultValue={typography.bodyFont ?? 'system'} className={inputClass}>
              {TYPOGRAPHY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      <div className="sticky bottom-4 flex items-center justify-between rounded-xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur">
        <p className="text-xs text-slate-400">Changes apply to this website only and appear on its next request.</p>
        <SubmitButton pendingLabel="Saving settings…">Save settings</SubmitButton>
      </div>
    </form>
  );
}
