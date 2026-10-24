import { notFound } from 'next/navigation';
import { getSiteForAdmin } from '@/lib/admin/sites-service';
import { requireAdmin } from '@/lib/admin/require-admin';
import { PageHeader } from '@/components/admin/PageHeader';
import { SettingsForm } from '@/components/admin/SettingsForm';

export const metadata = { title: 'Settings' };

export default async function SiteSettingsPage({ params }: { params: Promise<{ siteId: string }> }) {
  const actor = await requireAdmin();
  const { siteId } = await params;
  const result = await getSiteForAdmin(actor, siteId);
  if (!result.ok) notFound();
  const site = result.data;
  const typography = (site.extras.typography ?? {}) as { headingFont?: string; bodyFont?: string };

  return (
    <>
      <PageHeader
        title="Branding & SEO"
        description={`Settings for ${site.name}. Only this website is affected.`}
        crumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Websites', href: '/admin/sites' },
          { label: site.name, href: `/admin/sites/${site.id}` },
          { label: 'Settings' },
        ]}
      />
      <SettingsForm siteId={site.id} siteName={site.name} settings={site.settings} typography={typography} />
    </>
  );
}
