'use client';

import { useActionState } from 'react';
import {
  addDomainAction,
  removeDomainAction,
  setPrimaryDomainAction,
  type ActionState,
} from '@/app/admin/actions';
import { Field, FormFeedback, SubmitButton, inputClass } from '@/components/admin/form';

const initial: ActionState = {};

export interface DomainRow {
  id: number;
  host: string;
  isPrimary: boolean;
  verified: boolean;
}

export function DomainsManager({ siteId, domains }: { siteId: string; domains: DomainRow[] }) {
  const [addState, addFormAction] = useActionState(addDomainAction, initial);
  const [primaryState, primaryFormAction] = useActionState(setPrimaryDomainAction, initial);
  const [removeState, removeFormAction] = useActionState(removeDomainAction, initial);

  return (
    <div className="space-y-6">
      <form action={addFormAction} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <input type="hidden" name="siteId" value={siteId} />
        <h2 className="mb-1 font-semibold text-slate-900">Add a domain</h2>
        <p className="mb-4 text-sm text-slate-500">
          Bare hostname only (e.g. <code className="rounded bg-slate-100 px-1">acme.com</code>). The{' '}
          <code className="rounded bg-slate-100 px-1">www.</code> variant is a separate mapping — add it too if
          needed. New domains are unverified until DNS and hosting are configured separately.
        </p>
        <FormFeedback state={addState} />
        <div className="mt-3 flex flex-wrap gap-2">
          <Field label="Hostname" className="flex-1">
            <input type="text" name="host" required placeholder="acme.com" className={inputClass} />
          </Field>
          <div className="flex items-end">
            <SubmitButton pendingLabel="Adding…">Add domain</SubmitButton>
          </div>
        </div>
      </form>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
            <tr>
              <th scope="col" className="px-4 py-3">Hostname</th>
              <th scope="col" className="px-4 py-3">Primary</th>
              <th scope="col" className="px-4 py-3">Verified</th>
              <th scope="col" className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {domains.map((domain) => (
              <tr key={domain.id}>
                <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-800">{domain.host}</td>
                <td className="px-4 py-3">
                  {domain.isPrimary ? (
                    <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700">PRIMARY</span>
                  ) : (
                    <form action={primaryFormAction}>
                      <input type="hidden" name="siteId" value={siteId} />
                      <input type="hidden" name="domainId" value={domain.id} />
                      <SubmitButton variant="outline" className="px-2.5 py-1 text-xs" pendingLabel="…">
                        Make primary
                      </SubmitButton>
                    </form>
                  )}
                </td>
                <td className="px-4 py-3">
                  {domain.verified ? (
                    <span className="text-xs font-semibold text-emerald-600">verified</span>
                  ) : (
                    <span className="text-xs text-slate-400" title="DNS and hosting configuration are separate steps.">
                      pending
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <form action={removeFormAction}>
                    <input type="hidden" name="siteId" value={siteId} />
                    <input type="hidden" name="domainId" value={domain.id} />
                    <SubmitButton
                      variant="danger"
                      className="px-2.5 py-1 text-xs"
                      pendingLabel="…"
                      confirm={`Remove "${domain.host}" from this website?`}
                    >
                      Remove
                    </SubmitButton>
                  </form>
                </td>
              </tr>
            ))}
            {domains.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-400">
                  No domains mapped yet. The website is still reachable via preview routes.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {(primaryState.error || removeState.error) && (
        <div className="space-y-2">
          <FormFeedback state={primaryState} />
          <FormFeedback state={removeState} />
        </div>
      )}
    </div>
  );
}
