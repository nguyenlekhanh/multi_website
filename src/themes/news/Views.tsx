import Link from 'next/link';
import { Container } from '@/components/shared/Container';
import { SmartImage } from '@/components/shared/SmartImage';
import { formatDate } from '@/platform/blocks';
import { ArticleRow, Kicker } from './Blocks';
import type { CategoryWithCount, Page, Post, SiteContext } from '@/platform/types';
import { NewsBlocks } from './Blocks';

/* ---------------------------------- home ---------------------------------- */

export function NewsHome({
  page,
  posts,
  categories,
  ctx,
}: {
  ctx: SiteContext;
  page: Page;
  posts?: Post[];
  categories?: CategoryWithCount[];
}) {
  return (
    <>
      {/* The front page has no article-level h1; the site name carries it. */}
      <h1 className="sr-only">{ctx.settings.identity.name}</h1>
      <NewsBlocks blocks={page.blocks} posts={posts} categories={categories} />
    </>
  );
}

/* ------------------------------ generic page ------------------------------ */

export function NewsPageView({
  page,
  posts,
  categories,
}: {
  ctx: SiteContext;
  page: Page;
  posts?: Post[];
  categories?: CategoryWithCount[];
}) {
  return (
    <>
      <section className="border-b border-[var(--c-border)] py-10">
        <Container>
          {page.eyebrow && <Kicker>{page.eyebrow}</Kicker>}
          <h1 className="mt-2 max-w-3xl font-serif text-4xl font-black leading-tight tracking-tight sm:text-5xl">
            {page.title}
          </h1>
        </Container>
      </section>
      <NewsBlocks blocks={page.blocks} posts={posts} categories={categories} />
    </>
  );
}

/* -------------------------------- posts ----------------------------------- */

export function NewsPostList({
  posts,
  categories,
  activeCategory,
}: {
  ctx: SiteContext;
  posts: Post[];
  categories: CategoryWithCount[];
  activeCategory?: string;
}) {
  const active = categories.find((c) => c.slug === activeCategory);
  const [lead, ...rest] = posts;
  return (
    <>
      <section className="border-b border-[var(--c-border)] py-8">
        <Container>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] t-text-primary">
            {active ? `Section: ${active.name}` : 'All stories'}
          </p>
          <h1 className="mt-1 font-serif text-4xl font-black tracking-tight sm:text-5xl">
            {active ? active.name : 'Latest news'}
          </h1>
          {active?.description && <p className="mt-2 max-w-2xl t-text-muted">{active.description}</p>}

          {categories.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-1.5 border-y border-[var(--c-border)] py-2.5">
              <Link
                href="/posts"
                className={`text-xs font-bold uppercase tracking-[0.14em] ${!activeCategory ? 't-text-primary' : 't-text-muted hover:text-[var(--c-fg)]'}`}
              >
                All
              </Link>
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/posts?category=${category.slug}`}
                  className={`text-xs font-bold uppercase tracking-[0.14em] ${
                    activeCategory === category.slug ? 't-text-primary' : 't-text-muted hover:text-[var(--c-fg)]'
                  }`}
                >
                  {category.name}
                </Link>
              ))}
            </div>
          )}
        </Container>
      </section>

      <section className="py-8">
        <Container>
          {posts.length === 0 ? (
            <p className="py-12 text-center t-text-muted">
              No stories in this section yet.{' '}
              <Link href="/posts" className="t-text-primary hover:underline">View all stories</Link>
            </p>
          ) : (
            <>
              {lead && (
                <ArticleRow post={lead} categories={categories} size="lg" />
              )}
              <div className="sm:columns-2 sm:gap-10 sm:[&>article]:break-inside-avoid">
                {rest.map((post) => (
                  <ArticleRow key={post.slug} post={post} categories={categories} />
                ))}
              </div>
            </>
          )}
        </Container>
      </section>
    </>
  );
}

export function NewsPostView({
  post,
  related,
  categories,
}: {
  ctx: SiteContext;
  post: Post;
  related: Post[];
  categories?: CategoryWithCount[];
}) {
  const category = categories?.find((c) => c.id === post.categoryId);
  return (
    <>
      <article className="py-10">
        <Container>
          <div className="mx-auto max-w-3xl">
            <p className="flex flex-wrap items-baseline gap-x-2 text-[11px] font-bold uppercase tracking-[0.16em]">
              {category && <span className="t-text-primary">{category.name}</span>}
              <span className="t-text-muted">{formatDate(post.publishedAt)}</span>
            </p>
            <h1 className="mt-3 font-serif text-4xl font-black leading-[1.1] tracking-tight sm:text-5xl">
              {post.title}
            </h1>
            <p className="mt-4 font-serif text-xl leading-relaxed t-text-muted">{post.excerpt}</p>
            <div className="mt-6 flex items-center gap-3 border-y border-[var(--c-border)] py-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full t-bg-dark text-xs font-bold">
                {post.author.initials}
              </span>
              <div>
                <p className="text-sm font-bold">{post.author.name}</p>
                <p className="text-xs t-text-muted">
                  {post.author.role ? `${post.author.role} · ` : ''}
                  {post.readingMinutes} min read
                </p>
              </div>
            </div>
          </div>

          {post.coverImage && (
            <SmartImage
              src={post.coverImage}
              alt={post.coverAlt ?? post.title}
              eager
              className="mx-auto mt-8 aspect-[16/8] w-full max-w-4xl rounded-sm"
              fallbackClassName="from-stone-200 via-stone-300 to-stone-400"
            />
          )}

          <div className="t-dropcap mx-auto mt-10 max-w-[680px] space-y-6">
            {post.body.map((paragraph, i) => (
              <p key={i} className="text-[17px] leading-[1.85] text-[var(--c-fg)]/90">
                {paragraph}
              </p>
            ))}
            <div className="border-t border-[var(--c-border)] pt-5 text-xs uppercase tracking-[0.12em] t-text-muted">
              By {post.author.name}
              {post.author.role ? ` — ${post.author.role}` : ''}
            </div>
          </div>
        </Container>
      </article>

      {related.length > 0 && (
        <section className="t-bg-muted py-10">
          <Container>
            <div className="mb-2 flex items-baseline justify-between border-b-2 border-b-[var(--c-fg)] pb-2">
              <h2 className="font-serif text-2xl font-black tracking-tight">More from the newsroom</h2>
            </div>
            <div className="sm:columns-2 sm:gap-10 sm:[&>article]:break-inside-avoid">
              {related.map((rel) => (
                <ArticleRow key={rel.slug} post={rel} />
              ))}
            </div>
          </Container>
        </section>
      )}
    </>
  );
}

/* ------------------------------- categories ------------------------------- */

export function NewsCategories({ categories }: { ctx: SiteContext; categories: CategoryWithCount[] }) {
  return (
    <section className="py-12">
      <Container>
        <Kicker>Sections</Kicker>
        <h1 className="mt-2 font-serif text-4xl font-black tracking-tight">Browse the paper</h1>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/posts?category=${category.slug}`}
              className="group rounded-sm border-2 border-[var(--c-fg)] p-5 transition hover:bg-[var(--c-muted)]"
            >
              <h2 className="font-serif text-2xl font-black tracking-tight group-hover:t-text-primary">
                {category.name}
              </h2>
              {category.description && <p className="mt-1.5 text-sm t-text-muted">{category.description}</p>}
              <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.14em] t-text-muted">
                {category.postCount} {category.postCount === 1 ? 'story' : 'stories'}
              </p>
            </Link>
          ))}
          {categories.length === 0 && <p className="t-text-muted">No sections yet.</p>}
        </div>
      </Container>
    </section>
  );
}

/* --------------------------------- 404 ------------------------------------ */

export function NewsNotFound() {
  return (
    <section className="py-20">
      <Container className="text-center">
        <p className="font-mono text-sm font-bold t-text-primary">404</p>
        <h1 className="mt-3 font-serif text-5xl font-black tracking-tight">Story not found</h1>
        <p className="mx-auto mt-4 max-w-md t-text-muted">
          This page has been unpublished, moved, or never made print.
        </p>
        <Link
          href="/"
          className="t-ring t-bg-primary mt-8 inline-flex rounded-sm px-6 py-3 text-sm font-bold uppercase tracking-[0.1em]"
        >
          Front page
        </Link>
      </Container>
    </section>
  );
}
