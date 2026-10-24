import Link from 'next/link';
import { Container } from '@/components/shared/Container';
import { SmartImage } from '@/components/shared/SmartImage';
import { formatDate } from '@/platform/blocks';
import {
  PortfolioBlocks,
  SectionNumber,
} from './Blocks';
import type { CategoryWithCount, Page, Post, SiteContext } from '@/platform/types';

/* ---------------------------------- home ---------------------------------- */

export function PortfolioHome({
  page,
  posts,
  categories,
}: {
  ctx: SiteContext;
  page: Page;
  posts?: Post[];
  categories?: CategoryWithCount[];
}) {
  return <PortfolioBlocks blocks={page.blocks} posts={posts} categories={categories} />;
}

/* ------------------------------ generic page ------------------------------ */

export function PortfolioPageView({
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
      <section className="border-b border-[var(--c-border)]">
        <Container className="pb-12 pt-20 sm:pt-24">
          {page.eyebrow && (
            <p className="font-mono text-xs uppercase tracking-[0.3em] t-text-accent">{page.eyebrow}</p>
          )}
          <h1 className="mt-4 max-w-3xl font-serif text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            {page.title}
          </h1>
        </Container>
      </section>
      <PortfolioBlocks blocks={page.blocks} posts={posts} categories={categories} />
    </>
  );
}

/* ------------------------------ posts (journal) --------------------------- */

export function PortfolioPostList({
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
      <section className="border-b border-[var(--c-border)]">
        <Container className="pb-12 pt-20 sm:pt-24">
          <SectionNumber n="journal" />
          <h1 className="mt-4 font-serif text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            Journal
          </h1>
          <p className="mt-4 max-w-lg text-lg t-text-muted">
            Notes, process, and selected writing.
          </p>
          {categories.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
              <Link href="/posts" className="text-[11px] font-semibold uppercase tracking-[0.2em] t-text-accent">
                All
              </Link>
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/posts?category=${category.slug}`}
                  className="text-[11px] font-semibold uppercase tracking-[0.2em] t-text-muted transition-colors hover:text-[var(--c-fg)]"
                >
                  {category.name}
                </Link>
              ))}
            </div>
          )}
        </Container>
      </section>
      <section className="py-6">
        <Container>
          <div className="divide-y divide-[var(--c-border)]">
            {posts.map((post) => (
              <Link
                key={post.slug}
                href={`/posts/${post.slug}`}
                className="group grid gap-3 py-8 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] sm:items-center"
              >
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.2em] t-text-muted">
                    {formatDate(post.publishedAt)} · {post.readingMinutes} min
                  </p>
                  <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight transition-colors group-hover:t-text-accent">
                    {post.title}
                  </h2>
                  <p className="mt-2 max-w-xl leading-relaxed t-text-muted">{post.excerpt}</p>
                </div>
                {post.coverImage && (
                  <SmartImage
                    src={post.coverImage}
                    alt={post.coverAlt ?? post.title}
                    className="aspect-[16/10] w-full border border-[var(--c-border)]"
                    fallbackClassName="from-stone-200 via-stone-300 to-stone-400"
                  />
                )}
              </Link>
            ))}
            {posts.length === 0 && <p className="py-12 text-center t-text-muted">Nothing published yet.</p>}
          </div>
        </Container>
      </section>
    </>
  );
}

export function PortfolioPostView({
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
      <article>
        <Container className="pb-10 pt-20 sm:pt-24">
          <p className="font-mono text-xs uppercase tracking-[0.2em] t-text-muted">
            {formatDate(post.publishedAt)} · {post.readingMinutes} min read
          </p>
          <h1 className="mt-5 max-w-3xl font-serif text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            {post.title}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed t-text-muted">{post.excerpt}</p>
        </Container>
        {post.coverImage && (
          <Container>
            <SmartImage
              src={post.coverImage}
              alt={post.coverAlt ?? post.title}
              eager
              className="aspect-[16/8] w-full border border-[var(--c-border)]"
            />
          </Container>
        )}
        <Container>
          <div className="mx-auto max-w-2xl space-y-6 py-14">
            {post.body.map((paragraph, i) => (
              <p key={i} className={`leading-[1.9] ${i === 0 ? 'font-serif text-xl' : 'text-lg t-text-muted'}`}>
                {paragraph}
              </p>
            ))}
            <div className="border-t border-[var(--c-border)] pt-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] t-text-muted">
                Written by {post.author.name}
                {post.author.role ? ` · ${post.author.role}` : ''}
              </p>
            </div>
          </div>
        </Container>
      </article>

      {related.length > 0 && (
        <section className="border-t border-[var(--c-border)] py-16">
          <Container>
            <h2 className="font-serif text-3xl font-semibold tracking-tight">Keep reading</h2>
            <div className="mt-8 grid gap-10 sm:grid-cols-3">
              {related.map((rel) => (
                <Link key={rel.slug} href={`/posts/${rel.slug}`} className="group t-ring rounded-sm">
                  {rel.coverImage && (
                    <SmartImage
                      src={rel.coverImage}
                      alt={rel.coverAlt ?? rel.title}
                      className="aspect-[4/3] w-full border border-[var(--c-border)]"
                      fallbackClassName="from-stone-200 via-stone-300 to-stone-400"
                    />
                  )}
                  <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.2em] t-text-muted">
                    {formatDate(rel.publishedAt)}
                  </p>
                  <h3 className="mt-1.5 font-serif text-xl font-semibold tracking-tight transition-colors group-hover:t-text-accent">
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

export function PortfolioCategories({ categories }: { ctx: SiteContext; categories: CategoryWithCount[] }) {
  return (
    <section className="py-20 sm:py-24">
      <Container>
        <SectionNumber n="topics" />
        <h1 className="mt-4 font-serif text-5xl font-semibold tracking-tight">Topics</h1>
        <div className="mt-10 divide-y divide-[var(--c-border)] border-t border-[var(--c-border)]">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/posts?category=${category.slug}`}
              className="group flex items-baseline justify-between gap-4 py-5"
            >
              <span className="font-serif text-2xl font-semibold tracking-tight transition-colors group-hover:t-text-accent">
                {category.name}
              </span>
              <span className="font-mono text-xs t-text-muted">
                {category.postCount} {category.postCount === 1 ? 'entry' : 'entries'}
              </span>
            </Link>
          ))}
          {categories.length === 0 && <p className="py-6 t-text-muted">No topics yet.</p>}
        </div>
      </Container>
    </section>
  );
}

/* --------------------------------- not found ------------------------------ */

export function PortfolioNotFound() {
  return (
    <section className="py-28 sm:py-36">
      <Container>
        <SectionNumber n="404" />
        <h1 className="mt-4 font-serif text-6xl font-semibold tracking-tight sm:text-7xl">
          Nothing here.
        </h1>
        <p className="mt-5 max-w-md text-lg t-text-muted">
          The page you are looking for has been moved or never existed.
        </p>
        <Link
          href="/"
          className="t-ring mt-8 inline-flex border-b-2 border-[var(--c-fg)] pb-1 font-semibold transition-colors hover:border-[var(--c-accent)] hover:t-text-accent"
        >
          Back to the start →
        </Link>
      </Container>
    </section>
  );
}
