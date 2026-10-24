import { notFound } from 'next/navigation';
import { getSiteForAdmin } from '@/lib/admin/sites-service';
import {
  getPostForAdmin,
  listAuthorsForAdmin,
  listCategoriesForAdmin,
  listMediaForAdmin,
} from '@/lib/admin/content-service';
import { requireAdmin } from '@/lib/admin/require-admin';
import { PageHeader } from '@/components/admin/PageHeader';
import { ContentTabs } from '@/components/admin/ContentTabs';
import { PostEditor } from '@/components/admin/PostEditor';

export const metadata = { title: 'Edit post' };

export default async function EditContentPostPage({
  params,
}: {
  params: Promise<{ siteId: string; postId: string }>;
}) {
  const actor = await requireAdmin();
  const { siteId, postId } = await params;
  const numericId = Number(postId);
  if (!Number.isInteger(numericId)) notFound();

  const site = await getSiteForAdmin(actor, siteId);
  if (!site.ok) notFound();
  const result = await getPostForAdmin(actor, siteId, numericId);
  if (!result.ok) notFound();

  const [categories, authors, media] = await Promise.all([
    listCategoriesForAdmin(actor, siteId),
    listAuthorsForAdmin(actor, siteId),
    listMediaForAdmin(actor, siteId),
  ]);

  return (
    <>
      <PageHeader
        title={`Edit: ${result.data.title}`}
        description={`/posts/${result.data.slug} · ${result.data.status.toLowerCase()}`}
        crumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Websites', href: '/admin/sites' },
          { label: 'Content', href: `/admin/sites/${siteId}/content` },
          { label: 'Posts', href: `/admin/sites/${siteId}/content/posts` },
          { label: result.data.title },
        ]}
      />
      <ContentTabs siteId={siteId} active="posts" />
      <PostEditor
        siteId={siteId}
        post={result.data}
        authors={authors.ok ? authors.data.map((a) => ({ id: a.id, name: a.name })) : []}
        categories={categories.ok ? categories.data.map((c) => ({ id: c.id, name: c.name })) : []}
        media={media.ok ? media.data : []}
      />
    </>
  );
}
