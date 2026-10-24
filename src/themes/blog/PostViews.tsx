import Link from 'next/link';
import { Container } from '@/components/shared/Container';
import { SmartImage } from '@/components/shared/SmartImage';
import { formatDate } from '@/platform/blocks';
import type { CategoryWithCount, Post, SiteContext } from '@/platform/types';
import { ArticleRow } from './Blocks';

/* ------------------------------- Post list ------------------------------- */

export function BlogPostList({
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
    <Container className="py-12">
      <div className="border-b-2 border-b-[var(--c-fg)] pb-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] t-text-primary">
          {active ? 'Category' : 'The archive'}
        </p>
        <h1 className="mt-1 font-serif text-4xl font-bold tracking-tight sm:text-5xl">
          {active ? active.name : 'All essays'}
        </h1>
        {active?.description && <p className="mt-3 max-w-xl t-text-muted">{active.description}</p>}
      </div>

      {categories.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 border-b t-border pb-4">
          <Link
            href="/posts"
            className={`text-xs font-bold uppercase tracking-[0.18em] transition-colors t-ring rounded-sm ${
              !activeCategory ? 't-text-primary' : 't-text-muted hover:text-[var(--c-fg)]'
            }`}
          >
            All
          </Link>
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/posts?category=${category.slug}`}
              className={`text-xs font-bold uppercase tracking-[0.18em] transition-colors t-ring rounded-sm ${
                activeCategory === category.slug ? 't-text-primary' : 't-text-muted hover:text-[var(--c-fg)]'
              }`}
            >
              {category.name} ({category.postCount})
            </Link>
          ))}
        </div>
      )}

      <div>
        {posts.map((post) => (
          <ArticleRow key={post.slug} post={post} categories={categories} />
        ))}
        {posts.length === 0 && (
          <p className="py-10 text-sm t-text-muted">
            No essays here yet. <Link href="/posts" className="t-text-primary hover:underline">Back to all essays</Link>
          </p>
        )}
      </div>
    </Container>
  );
}

/* ------------------------------- Post view ------------------------------- */

export function BlogPostView({
  post,
  related,
}: {
  ctx: SiteContext;
  post: Post;
  related: Post[];
}) {
  return (
    <>
      <article className="py-12 sm:py-14">
        <Container>
          <div className="mx-auto max-w-[680px]">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] t-text-primary">Essay</p>
            <h1 className="mt-3 font-serif text-4xl font-bold leading-[1.15] tracking-tight sm:text-5xl">
              {post.title}
            </h1>
            <p className="mt-5 font-serif text-lg leading-relaxed t-text-muted">{post.excerpt}</p>
            <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-y t-border py-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-full t-bg-dark text-xs font-bold">
                {post.author.initials}
              </span>
              <div className="min-w-0 text-sm">
                <p className="font-semibold">{post.author.name}</p>
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
              className="mx-auto mt-10 aspect-[16/8] w-full max-w-4xl rounded-lg border t-border"
              fallbackClassName="from-stone-300 via-stone-400 to-stone-500"
            />
          )}

          <div className="t-dropcap mx-auto mt-10 max-w-[680px] space-y-6">
            {post.body.map((paragraph, i) => (
              <p key={i} className="font-serif text-[17.5px] leading-[1.85] text-[var(--c-fg)]/90">
                {paragraph}
              </p>
            ))}
          </div>

          <div className="mx-auto mt-12 max-w-[680px] border-y t-border py-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] t-text-muted">About the author</p>
            <div className="mt-3 flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full t-bg-dark text-sm font-bold">
                {post.author.initials}
              </span>
              <div>
                <p className="font-serif text-lg font-bold">{post.author.name}</p>
                {post.author.role && <p className="text-xs uppercase tracking-[0.14em] t-text-muted">{post.author.role}</p>}
                {post.author.bio && <p className="mt-2 text-sm leading-relaxed t-text-muted">{post.author.bio}</p>}
              </div>
            </div>
          </div>
        </Container>
      </article>

      {related.length > 0 && (
        <section className="t-bg-muted py-12">
          <Container>
            <div className="mx-auto max-w-[880px]">
              <h2 className="border-b-2 border-b-[var(--c-fg)] pb-3 font-serif text-xl font-bold tracking-tight">
                More essays
              </h2>
              <div className="grid gap-8 sm:grid-cols-3 sm:pt-8">
                {related.map((rel) => (
                  <Link key={rel.slug} href={`/posts/${rel.slug}`} className="group block t-ring rounded-lg">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] t-text-primary">
                      {formatDate(rel.publishedAt)}
                    </p>
                    <h3 className="mt-1.5 font-serif text-lg font-bold leading-snug tracking-tight group-hover:t-text-primary transition-colors">
                      {rel.title}
                    </h3>
                    <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed t-text-muted">{rel.excerpt}</p>
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
