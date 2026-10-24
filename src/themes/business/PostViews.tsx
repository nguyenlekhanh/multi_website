import Link from 'next/link';
import { Container } from '@/components/shared/Container';
import { SmartImage } from '@/components/shared/SmartImage';
import { formatDate } from '@/platform/blocks';
import type { CategoryWithCount, Post, SiteContext } from '@/platform/types';
import { BusinessBlocks, PostCard, SectionHeading } from './Blocks';
import type { Block } from '@/platform/types';

/* ------------------------------- Post list ------------------------------- */

export function BusinessPostList({
  posts,
  categories,
  activeCategory,
}: {
  ctx: SiteContext;
  posts: Post[];
  categories: CategoryWithCount[];
  activeCategory?: string;
}) {
  return (
    <>
      <section className="t-bg-muted border-b t-border">
        <Container className="py-14 sm:py-16">
          <p className="text-xs font-bold uppercase tracking-[0.18em] t-text-accent">Insights</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">Latest thinking</h1>
          <p className="mt-4 max-w-2xl text-lg t-text-muted">
            Field notes from our work across strategy, operations, and technology.
          </p>

          {categories.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-2">
              <Link
                href="/posts"
                className={`rounded-full border px-4 py-1.5 text-sm font-medium transition t-ring ${
                  !activeCategory
                    ? 't-bg-primary border-transparent'
                    : 't-btn-outline'
                }`}
              >
                All topics
              </Link>
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/posts?category=${category.slug}`}
                  className={`rounded-full border px-4 py-1.5 text-sm font-medium transition t-ring ${
                    activeCategory === category.slug
                      ? 't-bg-primary border-transparent'
                      : 't-btn-outline'
                  }`}
                >
                  {category.name}
                  <span className="ml-1.5 opacity-60">{category.postCount}</span>
                </Link>
              ))}
            </div>
          )}
        </Container>
      </section>

      <section className="py-14 sm:py-16">
        <Container>
          {posts.length === 0 ? (
            <p className="py-16 text-center t-text-muted">
              No articles in this topic yet. <Link href="/posts" className="t-text-primary underline">View all articles</Link>
            </p>
          ) : (
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <PostCard key={post.slug} post={post} categories={categories} />
              ))}
            </div>
          )}
        </Container>
      </section>
    </>
  );
}

/* ------------------------------- Post view ------------------------------- */

export function BusinessPostView({
  post,
  related,
}: {
  ctx: SiteContext;
  post: Post;
  related: Post[];
}) {
  return (
    <>
      <article className="py-14 sm:py-16">
        <Container>
          <div className="mx-auto max-w-3xl">
            <p className="text-sm t-text-muted">
              <Link href="/posts" className="t-text-primary hover:underline">Insights</Link>
              <span aria-hidden="true"> / </span>
              <span>Article</span>
            </p>
            <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-[2.75rem]">
              {post.title}
            </h1>
            <div className="mt-6 flex flex-wrap items-center gap-4 border-b t-border pb-8">
              <span className="flex h-11 w-11 items-center justify-center rounded-full t-bg-primary text-sm font-bold">
                {post.author.initials}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{post.author.name}</p>
                <p className="text-xs t-text-muted">
                  {post.author.role && `${post.author.role} · `}
                  {formatDate(post.publishedAt)} · {post.readingMinutes} min read
                </p>
              </div>
            </div>
          </div>

          {post.coverImage && (
            <SmartImage
              src={post.coverImage}
              alt={post.coverAlt ?? post.title}
              eager
              className="mx-auto mt-10 aspect-[16/8] w-full max-w-4xl rounded-2xl border t-border shadow-lg"
            />
          )}

          <div className="mx-auto mt-10 max-w-3xl space-y-6">
            {post.body.map((paragraph, i) => (
              <p key={i} className="text-[17px] leading-8 text-[var(--c-fg)]/85">
                {paragraph}
              </p>
            ))}
          </div>
        </Container>
      </article>

      {related.length > 0 && (
        <section className="t-bg-muted py-14 sm:py-16">
          <Container>
            <SectionHeading eyebrow="Keep reading" heading="Related insights" align="left" />
            <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((rel) => (
                <PostCard key={rel.slug} post={rel} />
              ))}
            </div>
          </Container>
        </section>
      )}

      <BusinessBlocks
        blocks={
          [
            {
              type: 'cta',
              heading: 'Working on something similar?',
              body: 'Our partners are happy to share how we have approached this for other companies.',
              buttonLabel: 'Book a consultation',
              buttonHref: '/contact',
            },
          ] satisfies Block[]
        }
      />
    </>
  );
}
