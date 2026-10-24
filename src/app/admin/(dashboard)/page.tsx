import Link from 'next/link';
import { listSitesForAdmin, type AdminSiteSummary } from '@/lib/admin/sites-service';
import type { AdminSessionUser } from '@/lib/admin/types';
import { requireAdmin } from '@/lib/admin/require-admin';
import { isDataUnavailableError } from '@/platform/data/errors';
import { PageHeader } from '@/components/admin/PageHeader';
import { listThemes } from '@/platform/registry';

export const metadata = { title: 'Overview' };

export default async function AdminOverviewPage() {
  let actor: AdminSessionUser;
  let sites: AdminSiteSummary[];
  try {
    actor = await requireAdmin();
    const result = await listSitesForAdmin(actor, { status: 'ALL' });
    sites = result.ok ? result.data : [];
  } catch (error) {
    if (isDataUnavailableError(error)) {
      return (
        <Notice title="Database unavailable">
          The admin panel needs the PostgreSQL database. Verify DATA_SOURCE=postgres and DATABASE_URL, then try again.
        </Notice>
      );
    }
    throw error;
  }
  const active = sites.filter((s) => s.status === 'ACTIVE').length;
  const themes = listThemes();

  const stats = [
    { label: 'Websites', value: String(sites.length), hint: `${active} active` },
    { label: 'Registered themes', value: String(themes.length), hint: themes.map((t) => t.name).join(', ') },
    {
      label: 'Domains mapped',
      value: String(sites.reduce((sum, s) => sum + s.domainCount, 0)),
      hint: 'primary domains resolve publicly',
    },
    { label: 'Your role', value: actor.role === 'SUPER_ADMIN' ? 'Super' : 'Site', hint: 'admin' },
  ];

  return (
    <>
      <PageHeader
        title={`Welcome, ${actor.name.split(' ')[0]}`}
        description={
          actor.role === 'SUPER_ADMIN'
            ? 'You can manage every website on the platform.'
            : 'You can manage the websites assigned to you.'
        }
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

      <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{stat.label}</dt>
            <dd className="mt-1.5 text-2xl font-bold text-slate-900">{stat.value}</dd>
            <p className="mt-1 truncate text-xs text-slate-400">{stat.hint}</p>
          </div>
        ))}
      </dl>

      <h2 className="mb-3 mt-10 text-lg font-semibold text-slate-900">Websites</h2>
      {sites.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-sm text-slate-500">
            No websites are assigned to you yet. Ask a Super Admin to grant you access.
          </p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {sites.slice(0, 6).map((site) => (
            <li key={site.id}>
              <Link
                href={`/admin/sites/${site.id}`}
                className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-300 hover:shadow"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-slate-900">{site.name}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      site.status === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {site.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="mt-1 font-mono text-xs text-slate-400">{site.primaryDomain ?? site.id}</p>
                <p className="mt-3 text-sm text-slate-500">
                  Theme: <span className="font-medium text-slate-700">{themeName(site.themeId)}</span>
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function themeName(themeId: string): string {
  return listThemes().find((t) => t.id === themeId)?.name ?? themeId;
}


function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
      <h2 className="font-semibold text-amber-800">{title}</h2>
      <p className="mt-1 text-sm text-amber-700">{children}</p>
    </div>
  );
}
