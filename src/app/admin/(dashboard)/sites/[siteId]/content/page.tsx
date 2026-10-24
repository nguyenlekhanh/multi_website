import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSiteForAdmin } from '@/lib/admin/sites-service';
import {
  listAuthorsForAdmin,
  listCategoriesForAdmin,
  listPagesForAdmin,
  listPostsForAdmin,
} from '@/lib/admin/content-service';
import { isDataUnavailableError } from '@/platform/data/errors';
import { requireAdmin } from '@/lib/admin/require-admin';
import { PageHeader } from '@/components/admin/PageHeader';
import { ContentTabs, StatusPill } from '@/components/admin/ContentTabs';

export const metadata = { title: 'Content' };

export default async function ContentOverviewPage({ params }: { params: Promise<{ siteId: string }> }) {
  let actor;
  try {
    actor = await requireAdmin();
  } catch {
    notFound();
  }
  const { siteId } = await params;

  try {
    const siteResult = await getSiteForAdmin(actor, siteId);
    if (!siteResult.ok) notFound();
    const site = { id: siteResult.data.id, name: siteResult.data.name };

    const [pages, posts, categories, authors] = await Promise.all([
      listPagesForAdmin(actor, siteId, { pageSize: 50 }),
      listPostsForAdmin(actor, siteId, { pageSize: 50 }),
      listCategoriesForAdmin(actor, siteId),
      listAuthorsForAdmin(actor, siteId),
    ]);

    const pageItems = pages.ok ? pages.data.items : [];
    const postItems = posts.ok ? posts.data.items : [];
    const categoryItems = categories.ok ? categories.data : [];
    const authorItems = authors.ok ? authors.data : [];
    const recentPages = pageItems.slice(0, 5);
    const recentPosts = postItems.slice(0, 5);

    const stats = [
      { label: 'Pages', value: String(pages.ok ? pages.data.total : 0), hint: 'drafts + published', href: `/admin/sites/${siteId}/content/pages` },
      { label: 'Posts', value: String(posts.ok ? posts.data.total : 0), hint: 'drafts + published', href: `/admin/sites/${siteId}/content/posts` },
      { label: 'Categories', value: String(categoryItems.length), hint: 'post groupings', href: `/admin/sites/${siteId}/content/categories` },
      { label: 'Authors', value: String(authorItems.length), hint: 'post bylines', href: `/admin/sites/${siteId}/content/authors` },
    ];

    return (
      <>
        <PageHeader
          title="Content"
          description={`Pages and posts for ${site.name}. Drafts stay private until published.`}
          crumbs={[
            { label: 'Admin', href: '/admin' },
            { label: 'Websites', href: '/admin/sites' },
            { label: site.name, href: `/admin/sites/${site.id}` },
            { label: 'Content' },
          ]}
        />
        <ContentTabs siteId={siteId} active="overview" />

        <dl className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((stat) => (
            <Link key={stat.label} href={stat.href} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-300 hover:shadow">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{stat.label}</dt>
              <dd className="mt-1.5 text-2xl font-bold text-slate-900">{stat.value}</dd>
              <p className="mt-1 truncate text-xs text-slate-400">{stat.hint}</p>
            </Link>
          ))}
        </dl>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="font-semibold text-slate-900">Recently updated pages</h2>
              <Link href={`/admin/sites/${siteId}/content/pages`} className="text-sm font-semibold text-indigo-600 hover:underline">
                View all
              </Link>
            </header>
            <ul className="divide-y divide-slate-100">
              {recentPages.map((page) => (
                <li key={page.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <Link href={`/admin/sites/${siteId}/content/pages/${page.id}`} className="block truncate text-sm font-medium text-slate-900 hover:underline">
                      {page.title}
                    </Link>
                    <p className="truncate font-mono text-xs text-slate-400">/{page.slug}</p>
                  </div>
                  <StatusPill status={page.status} />
                </li>
              ))}
              {recentPages.length === 0 && <li className="px-5 py-6 text-center text-sm text-slate-400">No pages yet.</li>}
            </ul>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="font-semibold text-slate-900">Recently updated posts</h2>
              <Link href={`/admin/sites/${siteId}/content/posts`} className="text-sm font-semibold text-indigo-600 hover:underline">
                View all
              </Link>
            </header>
            <ul className="divide-y divide-slate-100">
              {recentPosts.map((post) => (
                <li key={post.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <Link href={`/admin/sites/${siteId}/content/posts/${post.id}`} className="block truncate text-sm font-medium text-slate-900 hover:underline">
                      {post.title}
                    </Link>
                    <p className="truncate font-mono text-xs text-slate-400">/posts/{post.slug}</p>
                  </div>
                  <StatusPill status={post.status} />
                </li>
              ))}
              {recentPosts.length === 0 && <li className="px-5 py-6 text-center text-sm text-slate-400">No posts yet.</li>}
            </ul>
          </section>
        </div>
      </>
    );
  } catch (error) {
    if (isDataUnavailableError(error)) {
      return (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
          <h2 className="font-semibold text-amber-800">Database unavailable</h2>
          <p className="mt-1 text-sm text-amber-700">The admin panel needs the PostgreSQL database. Try again shortly.</p>
        </div>
      );
    }
    throw error;
  }
}
