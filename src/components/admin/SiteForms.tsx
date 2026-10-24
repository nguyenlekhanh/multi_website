'use client';

import { useActionState } from 'react';
import {
  setSiteStatusAction,
  updateSiteMetaAction,
  type ActionState,
} from '@/app/admin/actions';
import { Field, FormFeedback, SubmitButton, inputClass } from '@/components/admin/form';

const initial: ActionState = {};

export function SiteNameForm({ siteId, name }: { siteId: string; name: string }) {
  const [state, formAction] = useActionState(updateSiteMetaAction, initial);
  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="siteId" value={siteId} />
      <FormFeedback state={state} />
      <Field label="Display name">
        <input type="text" name="name" defaultValue={name} required minLength={2} maxLength={120} className={inputClass} />
      </Field>
      <SubmitButton variant="outline" pendingLabel="Saving…">
        Save name
      </SubmitButton>
    </form>
  );
}

export function SiteStatusToggle({
  siteId,
  status,
  disabled,
  reason,
}: {
  siteId: string;
  status: 'ACTIVE' | 'INACTIVE';
  disabled?: boolean;
  reason?: string;
}) {
  const [state, formAction] = useActionState(setSiteStatusAction, initial);
  const next = status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
  const deactivating = next === 'INACTIVE';

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="siteId" value={siteId} />
      <input type="hidden" name="status" value={next} />
      <FormFeedback state={state} />
      <p className="text-sm leading-relaxed text-slate-500">
        {status === 'ACTIVE'
          ? 'Deactivating stops this website from resolving on any hostname. Content is kept and can be re-activated at any time.'
          : 'Activating restores public resolution for this website.'}
      </p>
      {disabled ? (
        <p className="text-sm text-slate-400">{reason ?? 'Only Super Admins can change site status.'}</p>
      ) : (
        <SubmitButton
          variant={deactivating ? 'danger' : 'primary'}
          pendingLabel="Updating…"
          confirm={
            deactivating
              ? 'Deactivate this website? It will stop resolving on all hostnames.'
              : undefined
          }
        >
          {status === 'ACTIVE' ? 'Deactivate website' : 'Activate website'}
        </SubmitButton>
      )}
    </form>
  );
}
