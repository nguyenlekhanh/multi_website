import { notFound } from 'next/navigation';
import { getSiteForAdmin } from '@/lib/admin/sites-service';
import { listAiJobsForAdmin } from '@/lib/ai/jobs-view';
import { requireAdmin } from '@/lib/admin/require-admin';
import { PageHeader } from '@/components/admin/PageHeader';
import { ContentTabs } from '@/components/admin/ContentTabs';
import { formatDate } from '@/platform/blocks';

export const metadata = { title: 'AI jobs' };

const STATUS_STYLE: Record<string, string> = {
  SUCCEEDED: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  FAILED: 'bg-rose-50 text-rose-700 ring-rose-200',
  PROCESSING: 'bg-sky-50 text-sky-700 ring-sky-200',
  PENDING: 'bg-slate-100 text-slate-600 ring-slate-200',
  CANCELLED: 'bg-amber-50 text-amber-700 ring-amber-200',
};

export default async function SiteAiJobsPage({ params }: { params: Promise<{ siteId: string }> }) {
  const actor = await requireAdmin();
  const { siteId } = await params;
  const siteResult = await getSiteForAdmin(actor, siteId);
  if (!siteResult.ok) notFound();
  const site = siteResult.data;
  const result = await listAiJobsForAdmin(actor, siteId, { limit: 100 });
  const jobs = result.ok ? result.data : [];

  return (
    <>
      <PageHeader
        title="AI job history"
        description="Generation and publishing jobs for this website. The worker processes queued jobs; failures show their sanitized error."
        crumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Websites', href: '/admin/sites' },
          { label: site.name, href: `/admin/sites/${site.id}` },
          { label: 'AI jobs' },
        ]}
      />
      <ContentTabs siteId={siteId} active="overview" />
      {!result.ok ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{result.error}</p>
      ) : jobs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-400">
          No AI jobs yet. Queue one from the AI automation page.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
              <tr>
                <th scope="col" className="px-4 py-3">Topic</th>
                <th scope="col" className="px-4 py-3">Status</th>
                <th scope="col" className="px-4 py-3">Attempts</th>
                <th scope="col" className="px-4 py-3">Scheduled</th>
                <th scope="col" className="px-4 py-3">Finished</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {jobs.map((job) => (
                <tr key={job.id} className="transition hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{job.topicTitle}</p>
                    {job.error && <p className="mt-0.5 max-w-md truncate text-xs text-rose-600">{job.error}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${STATUS_STYLE[job.status]}`}>
                      {job.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{job.attempts}/{job.maxAttempts}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{formatDate(job.scheduledAt)}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{job.finishedAt ? formatDate(job.finishedAt) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
