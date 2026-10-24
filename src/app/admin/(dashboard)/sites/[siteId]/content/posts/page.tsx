import Link from 'next/link';
import { listPostsForAdmin } from '@/lib/admin/content-service';
import { requireAdmin } from '@/lib/admin/require-admin';
import { PageHeader } from '@/components/admin/PageHeader';
import { ContentTabs, StatusPill } from '@/components/admin/ContentTabs';
import { PostRowActions } from '@/components/admin/ContentRowActions';

export const metadata = { title: 'Posts' };

export default async function ContentPostsPage({
  params,
  searchParams,
}: {
  params: Promise<{ siteId: string }>;
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const actor = await requireAdmin();
  const { siteId } = await params;
  const query = await searchParams;
  const search = query.q?.trim() ?? '';
  const status = query.status === 'DRAFT' || query.status === 'PUBLISHED' ? query.status : 'ALL';
  const page = Math.max(Number(query.page ?? '1') || 1, 1);

  const result = await listPostsForAdmin(actor, siteId, { search, status, page, pageSize: 15 });
  const totalPages = result.ok ? Math.max(Math.ceil(result.data.total / result.data.pageSize), 1) : 1;
  const items = result.ok ? result.data.items : [];

  return (
    <>
      <PageHeader
        title="Posts"
        description="Articles rendered at /posts/<slug>. Drafts are private."
        crumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Websites', href: '/admin/sites' },
          { label: 'Content', href: `/admin/sites/${siteId}/content` },
          { label: 'Posts' },
        ]}
        actions={
          <Link
            href={`/admin/sites/${siteId}/content/posts/new`}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
          >
            + New post
          </Link>
        }
      />
      <ContentTabs siteId={siteId} active="posts" />

      <form className="mb-5 flex flex-wrap gap-2" role="search">
        <input type="hidden" name="page" value="1" />
        <input
          type="search"
          name="q"
          defaultValue={search}
          placeholder="Search by title or slug…"
          aria-label="Search posts"
          className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
        />
        <select name="status" defaultValue={status} aria-label="Filter by status" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
          <option value="ALL">All statuses</option>
          <option value="PUBLISHED">Published</option>
          <option value="DRAFT">Draft</option>
        </select>
        <button type="submit" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          Filter
        </button>
      </form>

      {!result.ok ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{result.error}</p>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="font-medium text-slate-600">No posts found.</p>
          <p className="mt-1 text-sm text-slate-400">{search || status !== 'ALL' ? 'Try a different search or filter.' : 'Create your first post.'}</p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                <tr>
                  <th scope="col" className="px-4 py-3">Post</th>
                  <th scope="col" className="px-4 py-3">Category</th>
                  <th scope="col" className="px-4 py-3">Author</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                  <th scope="col" className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => (
                  <tr key={item.id} className="transition hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link href={`/admin/sites/${siteId}/content/posts/${item.id}`} className="font-medium text-slate-900 hover:underline">
                        {item.title}
                        {item.featured && (
                          <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700">FEATURED</span>
                        )}
                      </Link>
                      <p className="font-mono text-xs text-slate-400">/posts/{item.slug}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{item.categoryName ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{item.authorName}</td>
                    <td className="px-4 py-3"><StatusPill status={item.status} /></td>
                    <td className="px-4 py-3">
                      <PostRowActions siteId={siteId} postId={item.id} status={item.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Pagination">
              <span className="text-slate-400">Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={`/admin/sites/${siteId}/content/posts?page=${page - 1}&q=${encodeURIComponent(search)}&status=${status}`}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    ← Previous
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={`/admin/sites/${siteId}/content/posts?page=${page + 1}&q=${encodeURIComponent(search)}&status=${status}`}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Next →
                  </Link>
                )}
              </div>
            </nav>
          )}
        </>
      )}
    </>
  );
}
