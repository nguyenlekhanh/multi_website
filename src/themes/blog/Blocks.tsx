import Link from 'next/link';
import { Container } from '@/components/shared/Container';
import { SmartImage } from '@/components/shared/SmartImage';
import { formatDate } from '@/platform/blocks';
import type { Block, CategoryWithCount, Post } from '@/platform/types';

/**
 * Blog theme — article presentations.
 * Editorial layouts: ruled article rows, a large featured story, serif
 * headlines, and small-caps metadata.
 */

export function CategoryChip({ category }: { category?: CategoryWithCount }) {
  if (!category) return null;
  return (
    <span className="text-[11px] font-bold uppercase tracking-[0.18em] t-text-primary">{category.name}</span>
  );
}

export function ArticleRow({
  post,
  categories,
  withThumb = true,
}: {
  post: Post;
  categories?: CategoryWithCount[];
  withThumb?: boolean;
}) {
  const category = categories?.find((c) => c.id === post.categoryId);
  return (
    <article className="grid gap-4 border-b t-border py-7 sm:grid-cols-[1fr_auto] sm:items-start">
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] t-text-muted">
          <CategoryChip category={category} />
          {category && <span aria-hidden="true"> · </span>}
          {formatDate(post.publishedAt)}
        </p>
        <h3 className="mt-2 font-serif text-2xl font-bold leading-snug tracking-tight">
          <Link href={`/posts/${post.slug}`} className="transition-colors hover:t-text-primary t-ring rounded-sm">
            {post.title}
          </Link>
        </h3>
        <p className="mt-2 line-clamp-2 leading-relaxed t-text-muted">{post.excerpt}</p>
        <p className="mt-3 text-xs t-text-muted">
          By {post.author.name} · {post.readingMinutes} min read
        </p>
      </div>
      {withThumb && post.coverImage && (
        <Link href={`/posts/${post.slug}`} className="t-ring rounded-lg">
          <SmartImage
            src={post.coverImage}
            alt={post.coverAlt ?? post.title}
            className="hidden aspect-[4/3] w-44 rounded-lg sm:block"
            fallbackClassName="from-stone-300 via-stone-400 to-stone-500"
          />
        </Link>
      )}
    </article>
  );
}

export function FeaturedArticle({ post, categories }: { post: Post; categories?: CategoryWithCount[] }) {
  const category = categories?.find((c) => c.id === post.categoryId);
  return (
    <article className="pb-10">
      <Link href={`/posts/${post.slug}`} className="group block t-ring rounded-xl">
        <SmartImage
          src={post.coverImage}
          alt={post.coverAlt ?? post.title}
          eager
          className="aspect-[16/8] w-full rounded-xl border t-border"
          fallbackClassName="from-stone-300 via-stone-400 to-stone-500"
        />
        <div className="mt-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] t-text-primary">
            {category ? `${category.name} · ` : ''}
            Featured essay
          </p>
          <h2 className="mt-2 font-serif text-3xl font-bold leading-tight tracking-tight transition-colors group-hover:t-text-primary sm:text-4xl lg:text-[2.75rem]">
            {post.title}
          </h2>
          <p className="mt-3 max-w-2xl leading-relaxed t-text-muted sm:text-lg">{post.excerpt}</p>
          <p className="mt-4 text-xs uppercase tracking-[0.14em] t-text-muted">
            {post.author.name} · {formatDate(post.publishedAt)} · {post.readingMinutes} min read
          </p>
        </div>
      </Link>
    </article>
  );
}

function PostListSection({
  block,
  posts,
  categories,
}: {
  block: Extract<Block, { type: 'postlist' }>;
  posts?: Post[];
  categories?: CategoryWithCount[];
}) {
  const all = posts ?? [];
  const featured = block.limit ? undefined : all.find((p) => p.featured);
  const list = (featured ? all.filter((p) => p.slug !== featured.slug) : all).slice(
    0,
    block.limit ?? all.length,
  );
  return (
    <section>
      <div className="flex items-baseline justify-between gap-4 border-b-2 border-b-[var(--c-fg)] pb-3">
        <h2 className="font-serif text-xl font-bold tracking-tight">{block.heading}</h2>
        <Link href="/posts" className="text-xs font-semibold uppercase tracking-[0.14em] t-text-primary hover:underline">
          View all
        </Link>
      </div>
      <div>
        {list.map((post) => (
          <ArticleRow key={post.slug} post={post} categories={categories} />
        ))}
        {list.length === 0 && <p className="py-8 text-sm t-text-muted">Nothing published yet.</p>}
      </div>
    </section>
  );
}

function RichText({ block }: { block: Extract<Block, { type: 'richtext' }> }) {
  return (
    <section className="py-12">
      <div className="mx-auto max-w-2xl">
        {block.eyebrow && (
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] t-text-primary">{block.eyebrow}</p>
        )}
        {block.heading && (
          <h2 className="mt-2 font-serif text-3xl font-bold tracking-tight">{block.heading}</h2>
        )}
        <div className="mt-5 space-y-5">
          {block.paragraphs.map((paragraph, i) => (
            <p key={i} className="font-serif text-[17px] leading-8 text-[var(--c-fg)]/90">
              {paragraph}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features({ block }: { block: Extract<Block, { type: 'features' }> }) {
  return (
    <section className="py-12">
      <div className="mx-auto max-w-3xl">
        <h2 className="font-serif text-2xl font-bold tracking-tight">{block.heading}</h2>
        <div className="mt-8 grid gap-8 sm:grid-cols-3">
          {block.items.map((item) => (
            <div key={item.title} className="border-t-2 border-t-[var(--c-fg)] pt-4">
              <h3 className="font-serif text-lg font-bold">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed t-text-muted">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Contact({ block }: { block: Extract<Block, { type: 'contact' }> }) {
  return (
    <section className="py-12">
      <div className="mx-auto max-w-2xl border-y-2 border-y-[var(--c-fg)] py-8 text-center">
        {block.heading && <h2 className="font-serif text-2xl font-bold tracking-tight">{block.heading}</h2>}
        {block.body?.map((paragraph, i) => (
          <p key={i} className="mt-3 leading-relaxed t-text-muted">
            {paragraph}
          </p>
        ))}
        <div className="mt-5 space-y-1 text-sm">
          {block.email && (
            <p>
              <span className="t-text-primary">{block.email}</span>
            </p>
          )}
          {block.hours && <p className="t-text-muted">{block.hours}</p>}
        </div>
      </div>
    </section>
  );
}

/** Render content blocks in the Blog visual language (generic pages). */
export function BlogBlocks({ blocks, posts, categories }: { blocks: Block[]; posts?: Post[]; categories?: CategoryWithCount[] }) {
  return (
    <>
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'hero':
            return (
              <section key={i} className="border-b t-border py-16 text-center">
                <div className="mx-auto max-w-2xl px-4">
                  {block.eyebrow && (
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] t-text-primary">{block.eyebrow}</p>
                  )}
                  <h1 className="mt-2 font-serif text-4xl font-bold tracking-tight">{block.title}</h1>
                  {block.subtitle && <p className="mt-4 leading-relaxed t-text-muted">{block.subtitle}</p>}
                </div>
              </section>
            );
          case 'postlist':
            return (
              <Container key={i} className="py-12">
                <PostListSection block={block} posts={posts} categories={categories} />
              </Container>
            );
          case 'richtext':
            return <RichText key={i} block={block} />;
          case 'features':
            return <Features key={i} block={block} />;
          case 'contact':
            return <Contact key={i} block={block} />;
          case 'testimonials':
          case 'stats':
          case 'intro':
          case 'logos':
          case 'cards':
          case 'cta':
            return null;
          default:
            return null;
        }
      })}
    </>
  );
}
