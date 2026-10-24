import Link from 'next/link';
import { notFound } from 'next/navigation';
import { providerAvailability } from '@/lib/ai/types';
import { requireAdmin } from '@/lib/admin/require-admin';
import { isDataUnavailableError } from '@/platform/data/errors';
import { PageHeader } from '@/components/admin/PageHeader';

export const metadata = { title: 'AI automation' };

export default async function AdminAiPage() {
  try {
    await requireAdmin();
  } catch {
    notFound();
  }

  const availability = providerAvailability();
  const anyAvailable = availability.some((p) => p.available);

  let recentJobs: { id: string; topicTitle: string; status: string; siteId: string; createdAt: Date }[] = [];
  let dbError = false;
  try {
    recentJobs = await listAllRecentJobs();
  } catch (error) {
    if (isDataUnavailableError(error)) dbError = true;
    else throw error;
  }

  return (
    <>
      <PageHeader
        title="AI content automation"
        description="Global provider status and recent generation activity across all websites you can access."
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'AI' }]}
      />

      <section className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 font-semibold text-slate-900">Provider configuration (server-side)</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {availability.map((p) => (
            <div key={p.type} className="rounded-lg border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-slate-800">{p.type}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    p.available ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {p.available ? 'configured' : 'not configured'}
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed t-text-muted">{p.note}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Providers are configured with server environment variables (OLLAMA_BASE_URL, OPENAI_API_KEY,
          OPENAI_COMPAT_BASE_URL/​_API_KEY). API keys are never shown in the UI or sent to the browser. Each website
          selects a provider and model on its own AI page.
        </p>
        {!anyAvailable && (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
            No provider is configured yet — set OLLAMA_BASE_URL (local Ollama) or the OpenAI variables, then restart the
            server/worker. See docs/ai-content-automation.md.
          </p>
        )}
      </section>

      {dbError ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          Database unavailable — job history cannot be loaded.
        </p>
      ) : (
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <header className="border-b border-slate-100 px-5 py-4">
            <h2 className="font-semibold text-slate-900">Recent AI jobs (accessible sites)</h2>
          </header>
          <ul className="divide-y divide-slate-100">
            {recentJobs.map((job) => (
              <li key={job.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">{job.topicTitle}</p>
                  <Link href={`/admin/sites/${job.siteId}/ai/jobs`} className="font-mono text-xs text-slate-400 hover:underline">
                    {job.siteId}
                  </Link>
                </div>
                <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-600">
                  {job.status}
                </span>
              </li>
            ))}
            {recentJobs.length === 0 && (
              <li className="px-5 py-8 text-center text-sm text-slate-400">
                No AI jobs yet. Open a website → AI → queue a generation.
              </li>
            )}
          </ul>
        </section>
      )}
    </>
  );
}

async function listAllRecentJobs() {
  const { requireAdmin } = await import('@/lib/admin/require-admin');
  const actor = await requireAdmin();
  // Site-scoped: resolve accessible sites via the same service the sites list uses.
  const { listSitesForAdmin } = await import('@/lib/admin/sites-service');
  const sites = await listSitesForAdmin(actor);
  const siteIds = sites.ok ? sites.data.map((s) => s.id) : [];
  if (siteIds.length === 0) return [];
  const { getPrisma } = await import('@/platform/data/prisma');
  return getPrisma().aiJob.findMany({
    where: { siteId: { in: siteIds } },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: { id: true, topicTitle: true, status: true, siteId: true, createdAt: true },
  });
}
