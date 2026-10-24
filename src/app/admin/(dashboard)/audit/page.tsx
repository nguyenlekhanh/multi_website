import Link from 'next/link';
import { listAudit } from '@/lib/admin/sites-service';
import { requireAdmin } from '@/lib/admin/require-admin';
import { PageHeader } from '@/components/admin/PageHeader';
import { formatDate } from '@/platform/blocks';

export const metadata = { title: 'Audit log' };

const ACTION_LABELS: Record<string, string> = {
  'site.create': 'Website created',
  'site.update': 'Website updated',
  'site.status_change': 'Status changed',
  'site.theme_change': 'Theme changed',
  'site.settings_update': 'Settings updated',
  'domain.add': 'Domain added',
  'domain.set_primary': 'Primary domain changed',
  'domain.remove': 'Domain removed',
};

export default async function AuditPage() {
  const actor = await requireAdmin();
  const result = await listAudit(actor, { limit: 100 });
  const entries = result.ok ? result.data : [];

  return (
    <>
      <PageHeader
        title="Audit log"
        description="Security-sensitive administration actions, newest first."
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Audit log' }]}
      />
      {!result.ok ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{result.error}</p>
      ) : entries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-400">
          No administrative actions recorded yet.
        </div>
      ) : (
        <ol className="space-y-3">
          {entries.map((entry) => (
            <li key={entry.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-600">
                  {ACTION_LABELS[entry.action] ?? entry.action}
                </span>
                <time className="text-xs text-slate-400" dateTime={entry.createdAt}>
                  {formatDate(entry.createdAt)}
                </time>
              </div>
              <p className="mt-2 text-sm text-slate-800">{entry.summary}</p>
              <p className="mt-1 text-xs text-slate-400">
                by {entry.actorEmail}
                {entry.targetSiteId && (
                  <>
                    {' · '}
                    <Link href={`/admin/sites/${entry.targetSiteId}`} className="font-mono hover:text-slate-600 hover:underline">
                      {entry.targetSiteId}
                    </Link>
                  </>
                )}
              </p>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
