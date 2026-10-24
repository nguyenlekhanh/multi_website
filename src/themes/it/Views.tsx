import Link from 'next/link';
import { Container } from '@/components/shared/Container';
import { SmartImage } from '@/components/shared/SmartImage';
import { formatDate } from '@/platform/blocks';
import { Eyebrow, TechBlocks } from './Blocks';
import type { CategoryWithCount, Page, Post, SiteContext } from '@/platform/types';

/* ---------------------------------- home ---------------------------------- */

export function TechHome({
  page,
  posts,
  categories,
}: {
  ctx: SiteContext;
  page: Page;
  posts?: Post[];
  categories?: CategoryWithCount[];
}) {
  return <TechBlocks blocks={page.blocks} posts={posts} categories={categories} />;
}

/* ------------------------------ generic page ------------------------------ */

export function TechPageView({
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
      <section className="border-b border-[var(--c-border)] py-16">
        <Container>
          {page.eyebrow && <Eyebrow>{page.eyebrow}</Eyebrow>}
          <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">{page.title}</h1>
        </Container>
      </section>
      <TechBlocks blocks={page.blocks} posts={posts} categories={categories} />
    </>
  );
}

/* --------------------------------- posts ---------------------------------- */

export function TechPostList({
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
  return (
    <>
      <section className="border-b border-[var(--c-border)] py-14">
        <Container>
          <Eyebrow>{active ? `section: ${active.slug}` : 'field_notes'}</Eyebrow>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
            {active ? active.name : 'Engineering notes'}
          </h1>
          {active?.description && <p className="mt-3 max-w-2xl leading-relaxed t-text-muted">{active.description}</p>}

          {categories.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              <Link
                href="/posts"
                className={`t-ring rounded-md border px-3.5 py-1.5 font-mono text-xs ${
                  !activeCategory ? 'border-[var(--c-accent)] t-text-accent' : 'border-[var(--c-border)] t-text-muted hover:text-[var(--c-fg)]'
                }`}
              >
                all
              </Link>
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/posts?category=${category.slug}`}
                  className={`t-ring rounded-md border px-3.5 py-1.5 font-mono text-xs ${
                    activeCategory === category.slug
                      ? 'border-[var(--c-accent)] t-text-accent'
                      : 'border-[var(--c-border)] t-text-muted hover:text-[var(--c-fg)]'
                  }`}
                >
                  {category.slug}
                </Link>
              ))}
            </div>
          )}
        </Container>
      </section>

      <section className="py-12">
        <Container>
          {posts.length === 0 ? (
            <p className="py-12 text-center font-mono text-sm t-text-muted">
              no_entries_found. <Link href="/posts" className="t-text-accent">view_all</Link>
            </p>
          ) : (
            <div className="divide-y divide-[var(--c-border)] border-y border-[var(--c-border)]">
              {posts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/posts/${post.slug}`}
                  className="group grid gap-2 py-6 sm:grid-cols-[160px_1fr_auto] sm:items-baseline"
                >
                  <span className="font-mono text-xs t-text-muted">{formatDate(post.publishedAt)}</span>
                  <span>
                    <span className="block font-mono text-lg font-bold transition-colors group-hover:t-text-accent">
                      {post.title}
                    </span>
                    <span className="mt-1 block max-w-2xl text-sm leading-relaxed t-text-muted">{post.excerpt}</span>
                  </span>
                  <span className="font-mono text-xs t-text-muted">{post.readingMinutes} min</span>
                </Link>
              ))}
            </div>
          )}
        </Container>
      </section>
    </>
  );
}

export function TechPostView({
  post,
  related,
}: {
  ctx: SiteContext;
  post: Post;
  related: Post[];
  categories?: CategoryWithCount[];
}) {
  return (
    <>
      <article className="py-14">
        <Container>
          <div className="mx-auto max-w-2xl">
            <Eyebrow>engineering_notes</Eyebrow>
            <h1 className="mt-3 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">{post.title}</h1>
            <p className="mt-5 text-lg leading-relaxed t-text-muted">{post.excerpt}</p>
            <div className="mt-6 border-y border-[var(--c-border)] py-3 font-mono text-xs t-text-muted">
              {post.author.name}
              {post.author.role ? ` — ${post.author.role}` : ''} · {formatDate(post.publishedAt)} ·{' '}
              {post.readingMinutes} min
            </div>
          </div>

          {post.coverImage && (
            <SmartImage
              src={post.coverImage}
              alt={post.coverAlt ?? post.title}
              eager
              className="mx-auto mt-10 aspect-[16/8] w-full max-w-4xl rounded-lg border border-[var(--c-border)]"
            />
          )}

          <div className="mx-auto mt-10 max-w-2xl space-y-6">
            {post.body.map((paragraph, i) => (
              <p key={i} className="leading-[1.85] text-[var(--c-fg)]/90">{paragraph}</p>
            ))}
          </div>
        </Container>
      </article>

      {related.length > 0 && (
        <section className="border-t border-[var(--c-border)] py-14">
          <Container>
            <Eyebrow>related_reading</Eyebrow>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {related.map((rel) => (
                <Link
                  key={rel.slug}
                  href={`/posts/${rel.slug}`}
                  className={`${'group'} t-ring rounded-lg border border-[var(--c-border)] p-4 transition hover:border-[color-mix(in_srgb,var(--c-accent)_60%,var(--c-border))]`}
                >
                  <p className="font-mono text-[11px] t-text-muted">{formatDate(rel.publishedAt)}</p>
                  <h3 className="mt-1.5 font-mono text-sm font-bold leading-snug transition-colors group-hover:t-text-accent">
                    {rel.title}
                  </h3>
                </Link>
              ))}
            </div>
          </Container>
        </section>
      )}
    </>
  );
}

/* ------------------------------- categories ------------------------------- */

export function TechCategories({ categories }: { ctx: SiteContext; categories: CategoryWithCount[] }) {
  return (
    <section className="py-16">
      <Container>
        <Eyebrow>categories</Eyebrow>
        <h1 className="mt-3 text-4xl font-bold tracking-tight">Browse topics</h1>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/posts?category=${category.slug}`}
              className="t-ring rounded-lg border border-[var(--c-border)] p-5 transition hover:border-[color-mix(in_srgb,var(--c-accent)_60%,var(--c-border))]"
            >
              <p className="font-mono text-sm font-bold">{category.slug}</p>
              <p className="mt-1.5 text-sm t-text-muted">
                {category.name} · {category.postCount} entries
              </p>
            </Link>
          ))}
          {categories.length === 0 && <p className="t-text-muted">No categories yet.</p>}
        </div>
      </Container>
    </section>
  );
}

/* --------------------------------- 404 ------------------------------------ */

export function TechNotFound() {
  return (
    <section className="py-24 sm:py-32">
      <Container className="text-center">
        <p className="font-mono text-sm t-text-accent">error: 404_not_found</p>
        <h1 className="mt-4 text-5xl font-bold tracking-tight">Route unavailable</h1>
        <p className="mx-auto mt-4 max-w-md font-mono text-sm t-text-muted">
          The requested resource does not exist on this server.
        </p>
        <Link
          href="/"
          className="t-ring mt-8 inline-flex rounded-md border border-[var(--c-accent)] px-6 py-3 font-mono text-sm font-bold t-text-accent"
        >
          return_home
        </Link>
      </Container>
    </section>
  );
}
