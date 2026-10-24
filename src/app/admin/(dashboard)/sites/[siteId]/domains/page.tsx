import { notFound } from 'next/navigation';
import { getSiteForAdmin } from '@/lib/admin/sites-service';
import { requireAdmin } from '@/lib/admin/require-admin';
import { PageHeader } from '@/components/admin/PageHeader';
import { DomainsManager } from '@/components/admin/DomainsManager';

export const metadata = { title: 'Domains' };

export default async function SiteDomainsPage({ params }: { params: Promise<{ siteId: string }> }) {
  const actor = await requireAdmin();
  const { siteId } = await params;
  const result = await getSiteForAdmin(actor, siteId);
  if (!result.ok) notFound();
  const site = result.data;

  return (
    <>
      <PageHeader
        title="Domains"
        description={`Hostnames that resolve to ${site.name}. Mappings here drive the public site resolver.`}
        crumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Websites', href: '/admin/sites' },
          { label: site.name, href: `/admin/sites/${site.id}` },
          { label: 'Domains' },
        ]}
      />
      <div className="mb-6 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm leading-relaxed text-sky-800">
        <strong className="font-semibold">Heads-up:</strong> saving a mapping here does not register the
        domain or configure DNS. Domain registration, DNS records, and Vercel project domain configuration
        must be completed separately — the site resolves publicly only after those steps are done.
      </div>
      <DomainsManager siteId={site.id} domains={site.domains} />
    </>
  );
}
