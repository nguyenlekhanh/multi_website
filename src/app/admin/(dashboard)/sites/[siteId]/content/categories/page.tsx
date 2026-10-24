import { notFound } from 'next/navigation';
import { getSiteForAdmin } from '@/lib/admin/sites-service';
import { listCategoriesForAdmin } from '@/lib/admin/content-service';
import { requireAdmin } from '@/lib/admin/require-admin';
import { PageHeader } from '@/components/admin/PageHeader';
import { ContentTabs } from '@/components/admin/ContentTabs';
import { CategoryManager } from '@/components/admin/TaxonomyManagers';

export const metadata = { title: 'Categories' };

export default async function ContentCategoriesPage({ params }: { params: Promise<{ siteId: string }> }) {
  const actor = await requireAdmin();
  const { siteId } = await params;
  const siteResult = await getSiteForAdmin(actor, siteId);
  if (!siteResult.ok) notFound();
  const site = siteResult.data;
  const result = await listCategoriesForAdmin(actor, siteId);

  return (
    <>
      <PageHeader
        title="Categories"
        description={`Group ${site.name}'s posts. Categories are site-scoped and referenced in public /posts?category=… URLs.`}
        crumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Websites', href: '/admin/sites' },
          { label: 'Content', href: `/admin/sites/${siteId}/content` },
          { label: 'Categories' },
        ]}
      />
      <ContentTabs siteId={siteId} active="categories" />
      <CategoryManager siteId={siteId} categories={result.ok ? result.data : []} />
    </>
  );
}
