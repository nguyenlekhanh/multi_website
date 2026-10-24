import Link from 'next/link';
import { Container } from '@/components/shared/Container';
import { SmartImage } from '@/components/shared/SmartImage';
import { formatDate } from '@/platform/blocks';
import type { CategoryWithCount, Post, SiteContext } from '@/platform/types';

/* ------------------------------- Post list ------------------------------- */

function JournalRow({ post, categories }: { post: Post; categories?: CategoryWithCount[] }) {
  const category = categories?.find((c) => c.id === post.categoryId);
  return (
    <Link
      href={`/posts/${post.slug}`}
      className="group grid gap-5 rounded-3xl p-3 transition hover:bg-[var(--c-muted)] sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:items-center"
    >
      <SmartImage
        src={post.coverImage}
        alt={post.coverAlt ?? post.title}
        className="aspect-[16/10] w-full rounded-2xl"
        fallbackClassName="from-teal-700 via-teal-500 to-amber-400"
      />
      <div className="sm:pr-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] t-text-accent">
          {category ? `${category.name} · ` : ''}
          {formatDate(post.publishedAt)}
        </p>
        <h2 className="mt-2 font-serif text-2xl font-bold leading-snug tracking-tight transition-colors group-hover:text-[var(--c-primary)]">
          {post.title}
        </h2>
        <p className="mt-2 line-clamp-2 leading-relaxed t-text-muted">{post.excerpt}</p>
        <p className="mt-3 text-xs t-text-muted">
          By {post.author.name} · {post.readingMinutes} min read
        </p>
      </div>
    </Link>
  );
}

export function TravelPostList({
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
        <Container className="py-16 text-center sm:py-20">
          <p className="text-xs font-bold uppercase tracking-[0.22em] t-text-accent">Travel journal</p>
          <h1 className="mx-auto mt-3 max-w-2xl font-serif text-4xl font-bold tracking-tight sm:text-5xl">
            Notes from the road
          </h1>
          <p className="mx-auto mt-4 max-w-xl leading-relaxed t-text-muted">
            Guides and inspiration, written by the people who planned the routes.
          </p>

          {categories.length > 0 && (
            <div className="mt-8 flex flex-wrap justify-center gap-2">
              <Link
                href="/posts"
                className={`rounded-full border px-4 py-1.5 text-sm font-medium transition t-ring ${
                  !activeCategory ? 't-bg-primary border-transparent' : 't-btn-outline'
                }`}
              >
                All stories
              </Link>
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/posts?category=${category.slug}`}
                  className={`rounded-full border px-4 py-1.5 text-sm font-medium transition t-ring ${
                    activeCategory === category.slug ? 't-bg-primary border-transparent' : 't-btn-outline'
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

      <section className="py-12 sm:py-16">
        <Container>
          {posts.length === 0 ? (
            <p className="py-16 text-center t-text-muted">
              No stories here yet.{' '}
              <Link href="/posts" className="t-text-primary underline">
                View all stories
              </Link>
            </p>
          ) : (
            <div className="mx-auto flex max-w-4xl flex-col divide-y t-border">
              {posts.map((post) => (
                <JournalRow key={post.slug} post={post} categories={categories} />
              ))}
            </div>
          )}
        </Container>
      </section>
    </>
  );
}

/* ------------------------------- Post view ------------------------------- */

export function TravelPostView({
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
      <article className="py-14 sm:py-16">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] t-text-accent">Travel journal</p>
            <h1 className="mt-3 font-serif text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              {post.title}
            </h1>
            <div className="mt-6 flex items-center justify-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full t-bg-dark text-sm font-bold">
                {post.author.initials}
              </span>
              <div className="text-left">
                <p className="text-sm font-semibold">{post.author.name}</p>
                <p className="text-xs t-text-muted">
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
              className="mx-auto mt-10 aspect-[16/8] w-full max-w-4xl rounded-[2rem] shadow-xl"
            />
          )}

          <div className="mx-auto mt-12 max-w-2xl space-y-6">
            {post.body.map((paragraph, i) => (
              <p key={i} className="font-serif text-[17px] leading-8 text-[var(--c-fg)]/90">
                {paragraph}
              </p>
            ))}
          </div>
        </Container>
      </article>

      {related.length > 0 && (
        <section className="t-bg-muted py-14 sm:py-16">
          <Container>
            <div className="mx-auto max-w-4xl">
              <h2 className="font-serif text-2xl font-bold tracking-tight">More from the journal</h2>
              <div className="mt-8 grid gap-10 sm:grid-cols-3">
                {related.map((rel) => (
                  <Link key={rel.slug} href={`/posts/${rel.slug}`} className="group t-ring rounded-2xl">
                    <SmartImage
                      src={rel.coverImage}
                      alt={rel.coverAlt ?? rel.title}
                      className="aspect-[16/11] w-full rounded-2xl"
                      fallbackClassName="from-teal-700 via-teal-500 to-amber-400"
                    />
                    <h3 className="mt-3 font-serif text-lg font-bold leading-snug tracking-tight transition-colors group-hover:text-[var(--c-primary)]">
                      {rel.title}
                    </h3>
                    <p className="mt-1 text-xs t-text-muted">{formatDate(rel.publishedAt)}</p>
                  </Link>
                ))}
              </div>
            </div>
          </Container>
        </section>
      )}
    </>
  );
}
