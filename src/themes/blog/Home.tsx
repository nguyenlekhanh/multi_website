import Link from 'next/link';
import { Container } from '@/components/shared/Container';
import { formatDate, resolvePostlistPosts } from '@/platform/blocks';
import type { CategoryWithCount, Page, Post, SiteContext } from '@/platform/types';
import { ArticleRow, FeaturedArticle } from './Blocks';

/**
 * Blog theme — home.
 * Article-first editorial layout: featured essay on top, ruled list of
 * latest stories, and an "In this issue" sidebar with categories.
 */
export function BlogHome({
  page,
  posts = [],
  categories = [],
}: {
  ctx: SiteContext;
  page: Page;
  posts?: Post[];
  categories?: CategoryWithCount[];
}) {
  const postlist = page.blocks.find((b): b is Extract<typeof b, { type: 'postlist' }> => b.type === 'postlist');
  const resolved = postlist
    ? resolvePostlistPosts({ ...postlist, limit: undefined }, posts, categories)
    : posts;

  const featured = resolved.find((p) => p.featured);
  const list = featured ? resolved.filter((p) => p.slug !== featured.slug) : resolved;

  return (
    <Container className="py-10 sm:py-12">
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="min-w-0 border-b-2 border-b-[var(--c-fg)]">
          {featured && <FeaturedArticle post={featured} categories={categories} />}

          <div className="flex items-baseline justify-between gap-4 border-b t-border pb-3">
            <h2 className="font-serif text-xl font-bold tracking-tight">
              {postlist?.heading ?? 'Latest stories'}
            </h2>
            <Link
              href="/posts"
              className="text-xs font-semibold uppercase tracking-[0.14em] t-text-primary hover:underline"
            >
              View all
            </Link>
          </div>

          {list.map((post) => (
            <ArticleRow key={post.slug} post={post} categories={categories} />
          ))}
          {list.length === 0 && <p className="py-8 text-sm t-text-muted">Nothing published yet.</p>}
        </div>

        <aside className="space-y-10 lg:border-l lg:t-border lg:pl-10">
          <section>
            <h3 className="border-b-2 border-b-[var(--c-fg)] pb-2 font-serif text-sm font-bold uppercase tracking-[0.14em]">
              In this issue
            </h3>
            <ul className="mt-4 space-y-3">
              {categories.map((category) => (
                <li key={category.id}>
                  <Link
                    href={`/posts?category=${category.slug}`}
                    className="group flex items-baseline justify-between gap-2 t-ring rounded-sm"
                  >
                    <span className="font-serif text-base font-semibold group-hover:t-text-primary transition-colors">
                      {category.name}
                    </span>
                    <span className="text-xs t-text-muted">{category.postCount}</span>
                  </Link>
                </li>
              ))}
              {categories.length === 0 && <li className="text-sm t-text-muted">No categories yet.</li>}
            </ul>
          </section>

          <section>
            <h3 className="border-b-2 border-b-[var(--c-fg)] pb-2 font-serif text-sm font-bold uppercase tracking-[0.14em]">
              From the archive
            </h3>
            <ul className="mt-4 space-y-4">
              {posts.slice(0, 3).map((post) => (
                <li key={post.slug}>
                  <Link href={`/posts/${post.slug}`} className="group block t-ring rounded-sm">
                    <p className="text-[11px] uppercase tracking-[0.14em] t-text-muted">
                      {formatDate(post.publishedAt)}
                    </p>
                    <p className="mt-1 font-serif text-sm font-semibold leading-snug group-hover:t-text-primary transition-colors">
                      {post.title}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="t-bg-muted p-5">
            <h3 className="font-serif text-sm font-bold uppercase tracking-[0.14em]">Subscribe</h3>
            <p className="mt-2 text-sm leading-relaxed t-text-muted">
              One essay a week, sent Sunday mornings. No spam, ever.
            </p>
            <Link
              href="/contact"
              className="t-btn t-bg-primary mt-4 inline-flex rounded-sm px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] t-ring"
            >
              Get in touch
            </Link>
          </section>
        </aside>
      </div>
    </Container>
  );
}
