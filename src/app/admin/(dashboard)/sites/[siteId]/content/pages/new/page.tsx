import { notFound } from 'next/navigation';
import { getSiteForAdmin } from '@/lib/admin/sites-service';
import { listMediaForAdmin } from '@/lib/admin/content-service';
import { requireAdmin } from '@/lib/admin/require-admin';
import { PageHeader } from '@/components/admin/PageHeader';
import { ContentTabs } from '@/components/admin/ContentTabs';
import { PageEditor } from '@/components/admin/PageEditor';

export const metadata = { title: 'New page' };

export default async function NewContentPagePage({ params }: { params: Promise<{ siteId: string }> }) {
  const actor = await requireAdmin();
  const { siteId } = await params;
  const site = await getSiteForAdmin(actor, siteId);
  if (!site.ok) notFound();
  const media = await listMediaForAdmin(actor, siteId);

  return (
    <>
      <PageHeader
        title="New page"
        description="Pages render at /<slug>. Add content blocks, then publish when ready."
        crumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Websites', href: '/admin/sites' },
          { label: 'Content', href: `/admin/sites/${siteId}/content` },
          { label: 'Pages', href: `/admin/sites/${siteId}/content/pages` },
          { label: 'New' },
        ]}
      />
      <ContentTabs siteId={siteId} active="pages" />
      <PageEditor siteId={siteId} media={media.ok ? media.data : []} canDelete={false} />
    </>
  );
}
