import Link from 'next/link';
import { Container } from '@/components/shared/Container';
import { SmartImage } from '@/components/shared/SmartImage';
import { formatDate } from '@/platform/blocks';
import { AgencyBlocks, Eyebrow } from './Blocks';
import type { CategoryWithCount, Page, Post, SiteContext } from '@/platform/types';

/* ---------------------------------- home ---------------------------------- */

export function AgencyHome({
  page,
  posts,
  categories,
}: {
  ctx: SiteContext;
  page: Page;
  posts?: Post[];
  categories?: CategoryWithCount[];
}) {
  return <AgencyBlocks blocks={page.blocks} posts={posts} categories={categories} />;
}

/* ------------------------------ generic page ------------------------------ */

export function AgencyPageView({
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
      <section className="border-b-2 border-b-[var(--c-fg)] py-16">
        <Container>
          {page.eyebrow && <Eyebrow>{page.eyebrow}</Eyebrow>}
          <h1 className="mt-4 max-w-4xl text-5xl font-black uppercase leading-[0.95] tracking-tight sm:text-6xl">
            {page.title}
          </h1>
        </Container>
      </section>
      <AgencyBlocks blocks={page.blocks} posts={posts} categories={categories} />
    </>
  );
}

/* --------------------------------- posts ---------------------------------- */

export function AgencyPostList({
  posts,
  categories,
}: {
  ctx: SiteContext;
  posts: Post[];
  categories: CategoryWithCount[];
  activeCategory?: string;
}) {
  return (
    <>
      <section className="border-b-2 border-b-[var(--c-fg)] py-16">
        <Container>
          <Eyebrow>Journal</Eyebrow>
          <h1 className="mt-4 text-5xl font-black uppercase leading-[0.95] tracking-tight sm:text-6xl">
            Field notes
          </h1>
          {categories.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-2">
              <Link
                href="/posts"
                className="t-ring border-2 border-[var(--c-fg)] px-4 py-2 text-xs font-black uppercase tracking-wide shadow-[4px_4px_0_var(--c-fg)]"
              >
                All
              </Link>
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/posts?category=${category.slug}`}
                  className="t-ring border-2 border-[var(--c-fg)] px-4 py-2 text-xs font-black uppercase tracking-wide t-text-muted shadow-[4px_4px_0_var(--c-fg)] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_var(--c-fg)]"
                >
                  {category.name}
                </Link>
              ))}
            </div>
          )}
        </Container>
      </section>
      <section className="py-14">
        <Container>
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <Link key={post.slug} href={`/posts/${post.slug}`} className="group t-ring">
                {post.coverImage && (
                  <SmartImage
                    src={post.coverImage}
                    alt={post.coverAlt ?? post.title}
                    className="aspect-[4/3] w-full border-2 border-[var(--c-fg)]"
                    fallbackClassName="from-stone-200 via-stone-300 to-stone-400"
                  />
                )}
                <p className="mt-4 font-mono text-[11px] font-black uppercase tracking-[0.18em] t-text-muted">
                  {formatDate(post.publishedAt)} · {post.readingMinutes} min
                </p>
                <h2 className="mt-1.5 text-2xl font-black uppercase leading-tight tracking-tight transition-colors group-hover:t-text-accent">
                  {post.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed t-text-muted">{post.excerpt}</p>
              </Link>
            ))}
            {posts.length === 0 && <p className="t-text-muted">Nothing published yet.</p>}
          </div>
        </Container>
      </section>
    </>
  );
}

export function AgencyPostView({
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
          <Eyebrow>Journal entry</Eyebrow>
          <h1 className="mt-4 max-w-4xl text-5xl font-black uppercase leading-[0.95] tracking-tight sm:text-6xl">
            {post.title}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed t-text-muted">{post.excerpt}</p>
          <div className="mt-7 flex flex-wrap gap-3 font-mono text-[11px] font-black uppercase tracking-[0.16em]">
            <span className="border-2 border-[var(--c-fg)] px-3 py-1.5">{post.author.name}</span>
            <span className="border-2 border-[var(--c-fg)] px-3 py-1.5">{formatDate(post.publishedAt)}</span>
            <span className="t-bg-accent border-2 border-[var(--c-fg)] px-3 py-1.5 text-white">
              {post.readingMinutes} min read
            </span>
          </div>
        </Container>
        {post.coverImage && (
          <Container className="mt-10">
            <SmartImage
              src={post.coverImage}
              alt={post.coverAlt ?? post.title}
              eager
              className={`aspect-[16/8] w-full ${hardShadowClass()}`}
            />
          </Container>
        )}
        <Container>
          <div className="mx-auto max-w-2xl space-y-6 py-14">
            {post.body.map((paragraph, i) => (
              <p key={i} className="text-lg leading-[1.85]">{paragraph}</p>
            ))}
            <p className="border-t-2 border-[var(--c-fg)] pt-5 text-xs font-black uppercase tracking-[0.16em] t-text-muted">
              Filed by {post.author.name}
              {post.author.role ? ` — ${post.author.role}` : ''}
            </p>
          </div>
        </Container>
      </article>

      {related.length > 0 && (
        <section className="border-t-2 border-t-[var(--c-fg)] py-14">
          <Container>
            <h2 className="text-3xl font-black uppercase tracking-tight">More entries</h2>
            <div className="mt-8 grid gap-8 sm:grid-cols-3">
              {related.map((rel) => (
                <Link key={rel.slug} href={`/posts/${rel.slug}`} className="group t-ring">
                  <p className="font-mono text-[11px] font-black uppercase tracking-[0.18em] t-text-muted">
                    {formatDate(rel.publishedAt)}
                  </p>
                  <h3 className="mt-1.5 text-xl font-black uppercase leading-tight tracking-tight transition-colors group-hover:t-text-accent">
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

export function AgencyCategories({ categories }: { ctx: SiteContext; categories: CategoryWithCount[] }) {
  return (
    <section className="py-16">
      <Container>
        <Eyebrow>Journal index</Eyebrow>
        <h1 className="mt-4 text-5xl font-black uppercase tracking-tight">Topics</h1>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/posts?category=${category.slug}`}
              className={`${hardShadowClass()} t-ring group block p-6 transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[3px_3px_0_var(--c-fg)]`}
            >
              <h2 className="text-2xl font-black uppercase tracking-tight group-hover:t-text-accent">
                {category.name}
              </h2>
              <p className="mt-1.5 font-mono text-xs font-black uppercase tracking-[0.16em] t-text-muted">
                {category.postCount} {category.postCount === 1 ? 'entry' : 'entries'}
              </p>
            </Link>
          ))}
          {categories.length === 0 && <p className="t-text-muted">No topics yet.</p>}
        </div>
      </Container>
    </section>
  );
}

/* --------------------------------- 404 ------------------------------------ */

export function AgencyNotFound() {
  return (
    <section className="py-24 sm:py-32">
      <Container>
        <Eyebrow>Error 404</Eyebrow>
        <h1 className="mt-4 text-6xl font-black uppercase leading-[0.95] tracking-tight sm:text-7xl">
          Dead end.
        </h1>
        <p className="mt-5 max-w-md text-lg t-text-muted">
          This page doesn&apos;t exist — but bold ideas start with wrong turns.
        </p>
        <Link
          href="/"
          className="t-ring mt-9 inline-flex t-bg-primary border-2 border-[var(--c-fg)] px-7 py-3.5 text-sm font-black uppercase tracking-wide text-[var(--c-primary-fg)] shadow-[6px_6px_0_var(--c-fg)] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[3px_3px_0_var(--c-fg)]"
        >
          Back to the good stuff
        </Link>
      </Container>
    </section>
  );
}

function hardShadowClass() {
  return 'border-2 border-[var(--c-fg)] shadow-[6px_6px_0_var(--c-fg)]';
}
