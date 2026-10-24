import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSiteForAdmin } from '@/lib/admin/sites-service';
import { requireAdmin } from '@/lib/admin/require-admin';
import { PageHeader, StatusPill } from '@/components/admin/PageHeader';
import { SiteNameForm, SiteStatusToggle } from '@/components/admin/SiteForms';
import { listThemes } from '@/platform/registry';
import { formatDate } from '@/platform/blocks';

export const metadata = { title: 'Website' };

export default async function SiteDetailPage({ params }: { params: Promise<{ siteId: string }> }) {
  const actor = await requireAdmin();
  const { siteId } = await params;
  const result = await getSiteForAdmin(actor, siteId);
  if (!result.ok) notFound();
  const site = result.data;
  const theme = listThemes().find((t) => t.id === site.themeId);

  const sections = [
    { href: `/admin/sites/${site.id}/content`, title: 'Content', description: 'Pages, posts, categories, and authors — the CMS.' },
    { href: `/admin/sites/${site.id}/settings`, title: 'Branding & SEO', description: 'Identity, colors, navigation, SEO defaults, typography.' },
    { href: `/admin/sites/${site.id}/theme`, title: 'Theme', description: 'Switch the active theme from the registered list.' },
    { href: `/admin/sites/${site.id}/domains`, title: 'Domains', description: 'Hostname mappings, primary domain, verification status.' },
  ];

  return (
    <>
      <PageHeader
        title={site.name}
        description={`${site.id} · ${theme?.name ?? site.themeId} theme`}
        crumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Websites', href: '/admin/sites' },
          { label: site.name },
        ]}
        actions={<StatusPill status={site.status} />}
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {sections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-300 hover:shadow"
          >
            <p className="font-semibold text-slate-900">{section.title} →</p>
            <p className="mt-1 text-sm leading-snug text-slate-500">{section.description}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-slate-900">Website name</h2>
          <SiteNameForm siteId={site.id} name={site.name} />
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-slate-900">Status</h2>
          <SiteStatusToggle
            siteId={site.id}
            status={site.status}
            disabled={actor.role !== 'SUPER_ADMIN'}
            reason={actor.role !== 'SUPER_ADMIN' ? 'Only Super Admins can activate or deactivate websites.' : undefined}
          />
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="mb-4 font-semibold text-slate-900">Details</h2>
          <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
            <Row label="Site ID" value={site.id} mono />
            <Row label="Primary domain" value={site.primaryDomain ?? '—'} mono />
            <Row label="Domains" value={`${site.domainCount} mapped`} />
            <Row label="Active theme" value={theme ? `${theme.name} (${theme.id})` : site.themeId} />
            <Row label="Last updated" value={formatDate(site.updatedAt)} />
            <Row
              label="Assigned admins"
              value={site.memberships ? site.memberships.map((m) => m.email).join(', ') || 'none' : 'visible to Super Admins'}
            />
          </dl>
        </section>
      </div>
    </>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 pb-2 last:border-0">
      <dt className="text-slate-500">{label}</dt>
      <dd className={`text-right font-medium text-slate-900 ${mono ? 'font-mono text-xs' : ''}`}>{value}</dd>
    </div>
  );
}
