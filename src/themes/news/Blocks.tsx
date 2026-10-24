import Link from 'next/link';
import { Container } from '@/components/shared/Container';
import { SmartImage } from '@/components/shared/SmartImage';
import { formatDate, resolvePostlistPosts } from '@/platform/blocks';
import type { Block, CategoryWithCount, Post } from '@/platform/types';

/**
 * News / Magazine theme — block renderers.
 * Newspaper composition: kicker labels, ruled article rows with thumbnails,
 * lead-story treatment, and dense multi-column section fronts.
 */

export function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-bold uppercase tracking-[0.16em] t-text-primary">{children}</span>
  );
}

export function ArticleRow({
  post,
  categories,
  size = 'md',
}: {
  post: Post;
  categories?: CategoryWithCount[];
  size?: 'md' | 'lg';
}) {
  const category = categories?.find((c) => c.id === post.categoryId);
  return (
    <article className={`grid gap-4 border-b border-[var(--c-border)] py-5 sm:grid-cols-[1fr_auto] sm:items-start`}>
      <div className="min-w-0">
        <p className="flex flex-wrap items-baseline gap-x-2 text-[11px] font-bold uppercase tracking-[0.16em] t-text-muted">
          {category && <span className="t-text-primary">{category.name}</span>}
          <span>{formatDate(post.publishedAt)}</span>
          <span aria-hidden="true">·</span>
          <span>{post.readingMinutes} min</span>
        </p>
        <h3 className={`mt-1.5 font-serif font-bold leading-snug tracking-tight ${size === 'lg' ? 'text-3xl' : 'text-2xl'}`}>
          <Link href={`/posts/${post.slug}`} className="transition-colors hover:t-text-primary t-ring rounded-sm">
            {post.title}
          </Link>
        </h3>
        <p className={`mt-2 leading-relaxed t-text-muted ${size === 'lg' ? 'text-base' : 'line-clamp-2 text-sm'}`}>
          {post.excerpt}
        </p>
        <p className="mt-2 text-xs uppercase tracking-[0.12em] t-text-muted">By {post.author.name}</p>
      </div>
      {post.coverImage && (
        <Link href={`/posts/${post.slug}`} className="t-ring rounded-sm">
          <SmartImage
            src={post.coverImage}
            alt={post.coverAlt ?? post.title}
            className={size === 'lg' ? 'aspect-[16/9] w-full sm:w-72 rounded-sm' : 'hidden aspect-[4/3] w-40 rounded-sm sm:block'}
            fallbackClassName="from-stone-200 via-stone-300 to-stone-400"
          />
        </Link>
      )}
    </article>
  );
}

function Hero({ block }: { block: Extract<Block, { type: 'hero' }> }) {
  return (
    <section className="border-b border-[var(--c-border)] py-10">
      <Container>
        {block.eyebrow && <Kicker>{block.eyebrow}</Kicker>}
        <h1 className="mt-2 max-w-3xl font-serif text-4xl font-black leading-tight tracking-tight sm:text-5xl">
          {block.title}
        </h1>
        {block.subtitle && <p className="mt-3 max-w-2xl leading-relaxed t-text-muted">{block.subtitle}</p>}
        {block.image && (
          <SmartImage
            src={block.image}
            alt={block.imageAlt ?? ''}
            eager
            className="mt-6 aspect-[16/7] w-full rounded-sm"
            fallbackClassName="from-stone-200 via-stone-300 to-stone-400"
          />
        )}
        {(block.primaryCta || block.secondaryCta) && (
          <div className="mt-4 flex gap-5">
            {block.primaryCta && (
              <Link href={block.primaryCta.href} className="text-sm font-bold uppercase tracking-[0.12em] t-text-primary hover:underline">
                {block.primaryCta.label} →
              </Link>
            )}
            {block.secondaryCta && (
              <Link href={block.secondaryCta.href} className="text-sm font-bold uppercase tracking-[0.12em] t-text-muted hover:text-[var(--c-fg)]">
                {block.secondaryCta.label}
              </Link>
            )}
          </div>
        )}
      </Container>
    </section>
  );
}

function Logos({ block }: { block: Extract<Block, { type: 'logos' }> }) {
  return (
    <section className="border-b border-[var(--c-border)] py-6">
      <Container className="flex flex-wrap items-center gap-x-8 gap-y-2">
        {block.heading && <p className="text-[11px] font-bold uppercase tracking-[0.16em] t-text-muted">{block.heading}</p>}
        {block.items.map((item) => (
          <span key={item} className="text-sm font-semibold t-text-muted">{item}</span>
        ))}
      </Container>
    </section>
  );
}

function Intro({ block }: { block: Extract<Block, { type: 'intro' }> }) {
  return (
    <section className="border-b border-[var(--c-border)] py-12">
      <Container>
        <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
          <div>
            {block.eyebrow && <Kicker>{block.eyebrow}</Kicker>}
            <h2 className="mt-2 font-serif text-3xl font-black leading-tight tracking-tight sm:text-4xl">{block.heading}</h2>
            {block.body.map((paragraph, i) => (
              <p key={i} className="mt-4 leading-relaxed t-text-muted">{paragraph}</p>
            ))}
          </div>
          {block.image && (
            <SmartImage
              src={block.image}
              alt={block.imageAlt ?? ''}
              className="aspect-[4/3] w-full self-start rounded-sm"
            />
          )}
        </div>
        {block.bullets && block.bullets.length > 0 && (
          <ul className="mt-6 grid gap-2 border-t border-[var(--c-border)] pt-4 sm:grid-cols-2">
            {block.bullets.map((bullet, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <span className="t-text-primary">▸</span>
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        )}
      </Container>
    </section>
  );
}

function Features({ block }: { block: Extract<Block, { type: 'features' }> }) {
  return (
    <section className="border-b border-[var(--c-border)] py-12">
      <Container>
        {block.eyebrow && <Kicker>{block.eyebrow}</Kicker>}
        {block.heading && (
          <h2 className="mt-2 font-serif text-3xl font-black tracking-tight">{block.heading}</h2>
        )}
        <div className="mt-8 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
          {block.items.map((item) => (
            <div key={item.title} className="border-t-2 border-t-[var(--c-primary)] pt-4">
              <h3 className="font-serif text-lg font-bold">{item.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed t-text-muted">{item.description}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

function Cards({ block }: { block: Extract<Block, { type: 'cards' }> }) {
  return (
    <section className="border-b border-[var(--c-border)] py-12">
      <Container>
        {block.eyebrow && <Kicker>{block.eyebrow}</Kicker>}
        {block.heading && (
          <h2 className="mt-2 font-serif text-3xl font-black tracking-tight">{block.heading}</h2>
        )}
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {block.items.map((item) => {
            const inner = (
              <>
                {item.image && (
                  <SmartImage
                    src={item.image}
                    alt={item.imageAlt ?? item.title}
                    className="aspect-[16/10] w-full rounded-sm"
                    fallbackClassName="from-stone-200 via-stone-300 to-stone-400"
                  />
                )}
                <h3 className="mt-3 font-serif text-xl font-bold leading-snug">{item.title}</h3>
                {item.description && <p className="mt-1.5 line-clamp-2 text-sm t-text-muted">{item.description}</p>}
                {item.meta && item.meta.length > 0 && (
                  <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.14em] t-text-primary">{item.meta.join(' · ')}</p>
                )}
              </>
            );
            return item.href ? (
              <Link key={item.title} href={item.href} className="group t-ring rounded-sm">
                {inner}
              </Link>
            ) : (
              <div key={item.title}>{inner}</div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}

function Stats({ block }: { block: Extract<Block, { type: 'stats' }> }) {
  return (
    <section className="t-bg-dark">
      <Container className="py-10">
        <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
          {block.items.map((item) => (
            <div key={item.label} className="text-center">
              <p className="font-serif text-4xl font-black tracking-tight text-white">{item.value}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[var(--c-dark-fg)]/70">{item.label}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

function Testimonials({ block }: { block: Extract<Block, { type: 'testimonials' }> }) {
  return (
    <section className="border-b border-[var(--c-border)] py-12">
      <Container>
        {block.heading && <h2 className="font-serif text-3xl font-black tracking-tight">{block.heading}</h2>}
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {block.items.map((item) => (
            <figure key={item.author} className="rounded-sm bg-[var(--c-muted)] p-5">
              <blockquote className="font-serif text-lg leading-relaxed">&ldquo;{item.quote}&rdquo;</blockquote>
              <figcaption className="mt-3 text-xs font-bold uppercase tracking-[0.14em] t-text-muted">
                {item.author}
                {item.role ? ` · ${item.role}` : ''}
              </figcaption>
            </figure>
          ))}
        </div>
      </Container>
    </section>
  );
}

function Cta({ block }: { block: Extract<Block, { type: 'cta' }> }) {
  return (
    <section className="border-y-2 border-y-[var(--c-fg)]">
      <Container className="flex flex-wrap items-center justify-between gap-4 py-8">
        <div>
          <h2 className="font-serif text-2xl font-black tracking-tight sm:text-3xl">{block.heading}</h2>
          {block.body && <p className="mt-1 t-text-muted">{block.body}</p>}
        </div>
        <Link
          href={block.buttonHref}
          className="t-ring t-bg-primary rounded-sm px-6 py-3 text-sm font-bold uppercase tracking-[0.1em] transition hover:opacity-90"
        >
          {block.buttonLabel}
        </Link>
      </Container>
    </section>
  );
}

function RichText({ block }: { block: Extract<Block, { type: 'richtext' }> }) {
  return (
    <section className="border-b border-[var(--c-border)] py-12">
      <Container>
        <div className="mx-auto max-w-2xl">
          {block.eyebrow && <Kicker>{block.eyebrow}</Kicker>}
          {block.heading && <h2 className="mt-2 font-serif text-3xl font-black tracking-tight">{block.heading}</h2>}
          <div className="mt-4 space-y-4">
            {block.paragraphs.map((paragraph, i) => (
              <p key={i} className="leading-relaxed t-text-muted">{paragraph}</p>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}

function Contact({ block }: { block: Extract<Block, { type: 'contact' }> }) {
  const rows = [block.email, block.phone, block.address, block.hours].filter(Boolean) as string[];
  return (
    <section className="border-b border-[var(--c-border)] py-12">
      <Container>
        <div className="mx-auto max-w-2xl border-2 border-[var(--c-fg)] p-6">
          {block.heading && <h2 className="font-serif text-2xl font-black tracking-tight">{block.heading}</h2>}
          {block.body?.map((paragraph, i) => (
            <p key={i} className="mt-2 text-sm leading-relaxed t-text-muted">{paragraph}</p>
          ))}
          <dl className="mt-4 space-y-1.5 text-sm font-medium">
            {rows.map((row) => (
              <dd key={row}>{row}</dd>
            ))}
          </dl>
        </div>
      </Container>
    </section>
  );
}

function PostList({
  block,
  posts,
  categories,
  featured = false,
}: {
  block: Extract<Block, { type: 'postlist' }>;
  posts?: Post[];
  categories?: CategoryWithCount[];
  featured?: boolean;
}) {
  const resolved = resolvePostlistPosts(block, posts ?? [], categories);
  if (resolved.length === 0) return null;
  const [lead, ...rest] = resolved;

  if (featured && lead) {
    return (
      <section className="border-b border-[var(--c-border)] py-8">
        <Container>
          {block.heading && (
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="font-serif text-2xl font-black tracking-tight">{block.heading}</h2>
              <Link href="/posts" className="text-[11px] font-bold uppercase tracking-[0.14em] t-text-primary hover:underline">
                More →
              </Link>
            </div>
          )}
          <Link href={`/posts/${lead.slug}`} className="group grid gap-5 t-ring rounded-sm lg:grid-cols-[3fr_2fr]">
            {lead.coverImage && (
              <SmartImage
                src={lead.coverImage}
                alt={lead.coverAlt ?? lead.title}
                eager
                className="aspect-[16/9] w-full rounded-sm"
                fallbackClassName="from-stone-200 via-stone-300 to-stone-400"
              />
            )}
            <div className="sm:self-center">
              <p className="flex flex-wrap items-baseline gap-x-2 text-[11px] font-bold uppercase tracking-[0.16em] t-text-muted">
                <span className="t-text-primary">Lead story</span>
                <span>{formatDate(lead.publishedAt)}</span>
              </p>
              <h3 className="mt-2 font-serif text-3xl font-black leading-tight tracking-tight group-hover:t-text-primary sm:text-4xl">
                {lead.title}
              </h3>
              <p className="mt-3 leading-relaxed t-text-muted">{lead.excerpt}</p>
              <p className="mt-3 text-xs uppercase tracking-[0.12em] t-text-muted">By {lead.author.name}</p>
            </div>
          </Link>
          {rest.length > 0 && (
            <div className="mt-2">
              {rest.map((post) => (
                <ArticleRow key={post.slug} post={post} categories={categories} />
              ))}
            </div>
          )}
        </Container>
      </section>
    );
  }

  return (
    <section className="border-b border-[var(--c-border)] py-8">
      <Container>
        <div className="mb-2 flex items-baseline justify-between border-b-2 border-b-[var(--c-fg)] pb-2">
          <h2 className="font-serif text-2xl font-black tracking-tight">{block.heading}</h2>
          <Link href="/posts" className="text-[11px] font-bold uppercase tracking-[0.14em] t-text-primary hover:underline">
            More →
          </Link>
        </div>
        <div className="sm:columns-2 sm:gap-10">
          {resolved.map((post) => (
            <ArticleRow key={post.slug} post={post} categories={categories} />
          ))}
        </div>
      </Container>
    </section>
  );
}

/** Render content blocks in the News visual language. */
export function NewsBlocks({
  blocks,
  posts,
  categories,
}: {
  blocks: Block[];
  posts?: Post[];
  categories?: CategoryWithCount[];
}) {
  let postlistIndex = 0;
  return (
    <>
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'hero':
            return <Hero key={i} block={block} />;
          case 'logos':
            return <Logos key={i} block={block} />;
          case 'intro':
            return <Intro key={i} block={block} />;
          case 'features':
            return <Features key={i} block={block} />;
          case 'cards':
            return <Cards key={i} block={block} />;
          case 'stats':
            return <Stats key={i} block={block} />;
          case 'testimonials':
            return <Testimonials key={i} block={block} />;
          case 'cta':
            return <Cta key={i} block={block} />;
          case 'richtext':
            return <RichText key={i} block={block} />;
          case 'contact':
            return <Contact key={i} block={block} />;
          case 'postlist': {
            const isFirst = postlistIndex === 0;
            postlistIndex += 1;
            return (
              <PostList key={i} block={block} posts={posts} categories={categories} featured={isFirst} />
            );
          }
          default:
            return null;
        }
      })}
    </>
  );
}
