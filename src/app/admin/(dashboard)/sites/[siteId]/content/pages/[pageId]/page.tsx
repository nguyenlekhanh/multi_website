import { notFound } from 'next/navigation';
import { getPageForAdmin, listMediaForAdmin } from '@/lib/admin/content-service';
import { getSiteForAdmin } from '@/lib/admin/sites-service';
import { requireAdmin } from '@/lib/admin/require-admin';
import { PageHeader } from '@/components/admin/PageHeader';
import { ContentTabs } from '@/components/admin/ContentTabs';
import { PageEditor } from '@/components/admin/PageEditor';

export const metadata = { title: 'Edit page' };

export default async function EditContentPagePage({
  params,
}: {
  params: Promise<{ siteId: string; pageId: string }>;
}) {
  const actor = await requireAdmin();
  const { siteId, pageId } = await params;
  const numericId = Number(pageId);
  if (!Number.isInteger(numericId)) notFound();

  const site = await getSiteForAdmin(actor, siteId);
  if (!site.ok) notFound();
  const result = await getPageForAdmin(actor, siteId, numericId);
  if (!result.ok) notFound();
  const media = await listMediaForAdmin(actor, siteId);

  return (
    <>
      <PageHeader
        title={`Edit: ${result.data.title}`}
        description={`/${result.data.slug} · ${result.data.status.toLowerCase()}`}
        crumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Websites', href: '/admin/sites' },
          { label: 'Content', href: `/admin/sites/${siteId}/content` },
          { label: 'Pages', href: `/admin/sites/${siteId}/content/pages` },
          { label: result.data.title },
        ]}
      />
      <ContentTabs siteId={siteId} active="pages" />
      <PageEditor
        siteId={siteId}
        page={result.data}
        media={media.ok ? media.data : []}
        canDelete={!result.data.isHomepage}
      />
    </>
  );
}
