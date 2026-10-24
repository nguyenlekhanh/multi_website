'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { createSiteAction, type ActionState } from '@/app/admin/actions';
import { Field, FormFeedback, SubmitButton, inputClass } from '@/components/admin/form';

const initial: ActionState = {};

export function NewSiteForm({ themes }: { themes: { id: string; name: string; description: string }[] }) {
  const [state, formAction] = useActionState(createSiteAction, initial);

  return (
    <form action={formAction} className="space-y-5">
      <FormFeedback state={state} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Site ID"
          hint="Stable identifier and URL slug — lowercase letters, digits, hyphens. Immutable after creation."
        >
          <input type="text" name="siteId" required pattern="[a-z0-9][a-z0-9-]{1,62}" placeholder="acme-corp" className={inputClass} />
        </Field>
        <Field label="Display name">
          <input type="text" name="name" required minLength={2} maxLength={120} placeholder="Acme Corp" className={inputClass} />
        </Field>
      </div>
      <Field label="Tagline" hint="Used as the default SEO description; editable later in Settings.">
        <input type="text" name="tagline" maxLength={200} placeholder="What this website is about" className={inputClass} />
      </Field>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-slate-700">Active theme</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {themes.map((theme, i) => (
            <label
              key={theme.id}
              className="flex cursor-pointer flex-col rounded-xl border border-slate-200 p-4 transition has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50/50 hover:border-slate-300"
            >
              <input type="radio" name="themeId" value={theme.id} defaultChecked={i === 0} className="sr-only" />
              <span className="text-sm font-semibold text-slate-900">{theme.name}</span>
              <span className="mt-1 text-xs leading-snug text-slate-500">{theme.description}</span>
              <span className="mt-2 font-mono text-[11px] text-slate-400">{theme.id}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <Field
        label="Primary domain (optional)"
        hint="Bare hostname only, e.g. acme.com. Can also be added later under Domains. DNS and hosting configuration are separate steps."
      >
        <input type="text" name="primaryDomain" placeholder="acme.com" className={inputClass} />
      </Field>

      <div className="flex gap-3 border-t border-slate-200 pt-5">
        <SubmitButton pendingLabel="Creating…">Create website</SubmitButton>
        <Link
          href="/admin/sites"
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
