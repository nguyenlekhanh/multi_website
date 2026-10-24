import { notFound } from 'next/navigation';
import { getSiteForAdmin } from '@/lib/admin/sites-service';
import { listAuthorsForAdmin } from '@/lib/admin/content-service';
import { requireAdmin } from '@/lib/admin/require-admin';
import { PageHeader } from '@/components/admin/PageHeader';
import { ContentTabs } from '@/components/admin/ContentTabs';
import { AuthorManager } from '@/components/admin/TaxonomyManagers';

export const metadata = { title: 'Authors' };

export default async function ContentAuthorsPage({ params }: { params: Promise<{ siteId: string }> }) {
  const actor = await requireAdmin();
  const { siteId } = await params;
  const siteResult = await getSiteForAdmin(actor, siteId);
  if (!siteResult.ok) notFound();
  const site = siteResult.data;
  const result = await listAuthorsForAdmin(actor, siteId);

  return (
    <>
      <PageHeader
        title="Authors"
        description={`Bylines for ${site.name}'s posts. Authors are site-scoped and never shared across websites.`}
        crumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Websites', href: '/admin/sites' },
          { label: 'Content', href: `/admin/sites/${siteId}/content` },
          { label: 'Authors' },
        ]}
      />
      <ContentTabs siteId={siteId} active="authors" />
      <AuthorManager siteId={siteId} authors={result.ok ? result.data : []} />
    </>
  );
}
