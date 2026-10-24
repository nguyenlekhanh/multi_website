import Link from 'next/link';
import { listSitesForAdmin } from '@/lib/admin/sites-service';
import { requireAdmin } from '@/lib/admin/require-admin';
import { PageHeader, StatusPill } from '@/components/admin/PageHeader';
import { listThemes } from '@/platform/registry';
import { formatDate } from '@/platform/blocks';

export const metadata = { title: 'Websites' };

export default async function SitesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const actor = await requireAdmin();
  const params = await searchParams;
  const search = params.q?.trim() ?? '';
  const status = params.status === 'ACTIVE' || params.status === 'INACTIVE' || params.status === 'ALL'
    ? params.status
    : 'ALL';

  const result = await listSitesForAdmin(actor, { search, status });
  const sites = result.ok ? result.data : [];
  const themes = listThemes();

  return (
    <>
      <PageHeader
        title="Websites"
        description="Every website served by this platform. Search, filter, and manage each one."
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Websites' }]}
        actions={
          actor.role === 'SUPER_ADMIN' ? (
            <Link
              href="/admin/sites/new"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
            >
              + New website
            </Link>
          ) : undefined
        }
      />

      <form className="mb-5 flex flex-wrap gap-2" role="search">
        <input
          type="search"
          name="q"
          defaultValue={search}
          placeholder="Search by name or site ID…"
          aria-label="Search websites"
          className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
        />
        <select
          name="status"
          defaultValue={status}
          aria-label="Filter by status"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="ALL">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
        <button type="submit" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          Filter
        </button>
      </form>

      {!result.ok ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{result.error}</p>
      ) : sites.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="font-medium text-slate-600">No websites match.</p>
          <p className="mt-1 text-sm text-slate-400">
            {search || status !== 'ALL' ? 'Try a different search or filter.' : 'Create your first website to get started.'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
              <tr>
                <th scope="col" className="px-4 py-3">Website</th>
                <th scope="col" className="px-4 py-3">Primary domain</th>
                <th scope="col" className="px-4 py-3">Theme</th>
                <th scope="col" className="px-4 py-3">Status</th>
                <th scope="col" className="px-4 py-3">Updated</th>
                <th scope="col" className="px-4 py-3"><span className="sr-only">Manage</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sites.map((site) => (
                <tr key={site.id} className="transition hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{site.name}</p>
                    <p className="font-mono text-xs text-slate-400">{site.id}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">
                    {site.primaryDomain ?? <span className="text-slate-400">none</span>}
                    {site.domainCount > 1 && (
                      <span className="ml-1 text-slate-400">+{site.domainCount - 1}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {themes.find((t) => t.id === site.themeId)?.name ?? site.themeId}
                  </td>
                  <td className="px-4 py-3"><StatusPill status={site.status} /></td>
                  <td className="px-4 py-3 text-xs text-slate-500">{formatDate(site.updatedAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/sites/${site.id}`}
                      className="rounded-lg px-3 py-1.5 text-sm font-semibold text-indigo-600 hover:bg-indigo-50"
                    >
                      Manage →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
