import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSiteForAdmin } from '@/lib/admin/sites-service';
import { getAiSettings, listTopics } from '@/lib/ai/content-automation';
import { providerAvailability } from '@/lib/ai/types';
import { listAiJobsForAdmin } from '@/lib/ai/jobs-view';
import { requireAdmin } from '@/lib/admin/require-admin';
import { PageHeader } from '@/components/admin/PageHeader';
import { ContentTabs } from '@/components/admin/ContentTabs';
import { StatusPill } from '@/components/admin/ContentTabs';
import { AiConfigForm, TopicManager, GenerateNowForm } from '@/components/admin/AiConfigForm';
import { listAuthorsForAdmin, listCategoriesForAdmin } from '@/lib/admin/content-service';

export const metadata = { title: 'AI automation' };

export default async function SiteAiPage({ params }: { params: Promise<{ siteId: string }> }) {
  const actor = await requireAdmin();
  const { siteId } = await params;
  const siteResult = await getSiteForAdmin(actor, siteId);
  if (!siteResult.ok) notFound();
  const site = siteResult.data;

  const [settings, topics, jobs, categories, authors] = await Promise.all([
    getAiSettings(actor, siteId),
    listTopics(actor, siteId),
    listAiJobsForAdmin(actor, siteId, { limit: 8 }),
    listCategoriesForAdmin(actor, siteId),
    listAuthorsForAdmin(actor, siteId),
  ]);

  const config = settings.ok ? settings.data : null;
  const topicsList = topics.ok ? topics.data : [];
  const jobList = jobs.ok ? jobs.data : [];
  const availability = providerAvailability().map((p: ReturnType<typeof providerAvailability>[number]) => ({
    ...p,
    selected: config?.provider === p.type,
  }));

  return (
    <>
      <PageHeader
        title="AI content automation"
        description={`Configure AI-assisted drafts for ${site.name}. Generated content is always saved as a draft for review — publishing happens only in SCHEDULED/AUTOPILOT modes via the worker.`}
        crumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Websites', href: '/admin/sites' },
          { label: site.name, href: `/admin/sites/${site.id}` },
          { label: 'AI' },
        ]}
        actions={
          <Link
            href={`/admin/sites/${siteId}/ai/jobs`}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Job history →
          </Link>
        }
      />
      <ContentTabs siteId={siteId} active="overview" />

      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-slate-900">Providers (server-side configuration)</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {availability.map((p) => (
            <div
              key={p.type}
              className={`rounded-lg border p-3.5 text-sm ${
                p.selected ? 'border-indigo-400 bg-indigo-50/50' : 'border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-bold text-slate-800">{p.type}</span>
                <StatusPill status={p.available ? 'PUBLISHED' : 'DRAFT'} />
              </div>
              <p className="mt-2 text-xs leading-relaxed t-text-muted">{p.note}</p>
              {p.selected && <p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-indigo-600">Selected for this site</p>}
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-400">
          API keys live exclusively in server environment variables and are never shown here or exposed to the browser.
          Ollama is a local service — loopback URLs are allowed only for it.
        </p>
      </section>

      {config ? (
        <div className="space-y-6">
          <AiConfigForm siteId={siteId} config={config} categories={categories.ok ? categories.data.map((c) => ({ id: c.id, name: c.name })) : []} authors={authors.ok ? authors.data.map((a) => ({ id: a.id, name: a.name })) : []} />
          <TopicManager siteId={siteId} topics={topicsList.map((t) => ({ id: t.id, title: t.title, keywords: t.keywords, excluded: t.excluded, active: t.active, lastUsedAt: t.lastUsedAt?.toISOString() ?? null }))} />
          <GenerateNowForm siteId={siteId} topics={topicsList.filter((t) => t.active).map((t) => ({ id: t.id, title: t.title }))} />
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="font-semibold text-slate-900">Recent jobs</h2>
              <Link href={`/admin/sites/${siteId}/ai/jobs`} className="text-sm font-semibold text-indigo-600 hover:underline">
                Full history →
              </Link>
            </header>
            <ul className="divide-y divide-slate-100">
              {jobList.slice(0, 5).map((job) => (
                <li key={job.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{job.topicTitle}</p>
                    <p className="truncate text-xs text-slate-400">{job.error ?? `attempt ${job.attempts}/${job.maxAttempts}`}</p>
                  </div>
                  <StatusPill status={job.status === 'SUCCEEDED' ? 'PUBLISHED' : 'DRAFT'} />
                </li>
              ))}
              {jobList.length === 0 && <li className="px-5 py-6 text-center text-sm text-slate-400">No jobs yet.</li>}
            </ul>
          </section>
        </div>
      ) : (
        <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {settings.ok ? 'Unknown error' : settings.error}
        </p>
      )}
    </>
  );
}
