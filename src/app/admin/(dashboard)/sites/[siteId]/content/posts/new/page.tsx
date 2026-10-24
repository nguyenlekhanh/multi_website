import { notFound } from 'next/navigation';
import { getSiteForAdmin } from '@/lib/admin/sites-service';
import {
  listAuthorsForAdmin,
  listCategoriesForAdmin,
  listMediaForAdmin,
} from '@/lib/admin/content-service';
import { requireAdmin } from '@/lib/admin/require-admin';
import { PageHeader } from '@/components/admin/PageHeader';
import { ContentTabs } from '@/components/admin/ContentTabs';
import { PostEditor } from '@/components/admin/PostEditor';

export const metadata = { title: 'New post' };

export default async function NewContentPostPage({ params }: { params: Promise<{ siteId: string }> }) {
  const actor = await requireAdmin();
  const { siteId } = await params;
  const site = await getSiteForAdmin(actor, siteId);
  if (!site.ok) notFound();

  const [categories, authors, media] = await Promise.all([
    listCategoriesForAdmin(actor, siteId),
    listAuthorsForAdmin(actor, siteId),
    listMediaForAdmin(actor, siteId),
  ]);

  return (
    <>
      <PageHeader
        title="New post"
        description="Posts render at /posts/<slug> with author, category, and cover image. Drafts are private."
        crumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Websites', href: '/admin/sites' },
          { label: 'Content', href: `/admin/sites/${siteId}/content` },
          { label: 'Posts', href: `/admin/sites/${siteId}/content/posts` },
          { label: 'New' },
        ]}
      />
      <ContentTabs siteId={siteId} active="posts" />
      <PostEditor
        siteId={siteId}
        authors={authors.ok ? authors.data.map((a) => ({ id: a.id, name: a.name })) : []}
        categories={categories.ok ? categories.data.map((c) => ({ id: c.id, name: c.name })) : []}
        media={media.ok ? media.data : []}
      />
    </>
  );
}
