import Link from 'next/link';
import { Container } from '@/components/shared/Container';
import { Icon } from '@/components/shared/Icon';
import { SmartImage } from '@/components/shared/SmartImage';
import { formatDate, resolvePostlistPosts } from '@/platform/blocks';
import type { Block, CategoryWithCount, Post } from '@/platform/types';

/**
 * Portfolio theme — block renderers.
 * Editorial minimalism: oversized serif headings, numbered sections,
 * hairline rules, and full-bleed imagery on a warm paper surface.
 */

export function SectionNumber({ n }: { n: string }) {
  return (
    <span className="font-mono text-xs tracking-[0.3em] t-text-muted" aria-hidden="true">
      ({n})
    </span>
  );
}

function Hero({ block }: { block: Extract<Block, { type: 'hero' }> }) {
  return (
    <section className="border-b border-[var(--c-border)]">
      <Container className="pb-12 pt-20 sm:pb-16 sm:pt-28">
        {block.eyebrow && (
          <p className="font-mono text-xs uppercase tracking-[0.3em] t-text-accent">{block.eyebrow}</p>
        )}
        <h1 className="mt-6 max-w-4xl font-serif text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
          {block.title}
        </h1>
        {block.subtitle && (
          <p className="mt-8 max-w-xl text-lg leading-relaxed t-text-muted">{block.subtitle}</p>
        )}
        {(block.primaryCta || block.secondaryCta) && (
          <div className="mt-10 flex flex-wrap gap-6">
            {block.primaryCta && (
              <Link
                href={block.primaryCta.href}
                className="t-ring border-b-2 border-[var(--c-fg)] pb-1 text-sm font-semibold transition-colors hover:border-[var(--c-accent)] hover:t-text-accent"
              >
                {block.primaryCta.label} →
              </Link>
            )}
            {block.secondaryCta && (
              <Link
                href={block.secondaryCta.href}
                className="t-ring t-text-muted pb-1 text-sm font-semibold transition-colors hover:text-[var(--c-fg)]"
              >
                {block.secondaryCta.label}
              </Link>
            )}
          </div>
        )}
      </Container>
      {block.image && (
        <Container>
          <SmartImage
            src={block.image}
            alt={block.imageAlt ?? ''}
            eager
            className="aspect-[16/8] w-full border border-[var(--c-border)]"
          />
        </Container>
      )}
    </section>
  );
}

function Logos({ block }: { block: Extract<Block, { type: 'logos' }> }) {
  return (
    <section className="border-b border-[var(--c-border)]">
      <Container className="py-12">
        <div className="flex flex-wrap items-baseline gap-x-10 gap-y-3">
          {block.heading && <p className="text-[11px] font-semibold uppercase tracking-[0.24em] t-text-muted">{block.heading}</p>}
          {block.items.map((item) => (
            <span key={item} className="font-serif text-lg italic t-text-muted">{item}</span>
          ))}
        </div>
      </Container>
    </section>
  );
}

function Intro({ block }: { block: Extract<Block, { type: 'intro' }> }) {
  return (
    <section className="border-b border-[var(--c-border)] py-20 sm:py-24">
      <Container>
        <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr]">
          {block.image && (
            <SmartImage
              src={block.image}
              alt={block.imageAlt ?? ''}
              className={`aspect-[4/5] w-full border border-[var(--c-border)] ${block.reversed ? 'lg:order-2' : ''}`}
            />
          )}
          <div className="max-w-xl">
            {block.eyebrow && (
              <p className="font-mono text-xs uppercase tracking-[0.3em] t-text-accent">{block.eyebrow}</p>
            )}
            <h2 className="mt-4 font-serif text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              {block.heading}
            </h2>
            <div className="mt-6 space-y-4">
              {block.body.map((paragraph, i) => (
                <p key={i} className="text-lg leading-relaxed t-text-muted">{paragraph}</p>
              ))}
            </div>
            {block.bullets && block.bullets.length > 0 && (
              <ul className="mt-8 space-y-2.5">
                {block.bullets.map((bullet, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className="t-text-accent">—</span>
                    <span className="leading-relaxed">{bullet}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Container>
    </section>
  );
}

function Features({ block }: { block: Extract<Block, { type: 'features' }> }) {
  return (
    <section className="border-b border-[var(--c-border)] py-20 sm:py-24">
      <Container>
        <div className="flex items-baseline justify-between">
          {block.heading && (
            <h2 className="max-w-xl font-serif text-4xl font-semibold leading-tight tracking-tight">{block.heading}</h2>
          )}
          {block.intro && <p className="hidden max-w-sm text-sm leading-relaxed t-text-muted md:block">{block.intro}</p>}
        </div>
        <div className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {block.items.map((item, i) => (
            <div key={item.title} className="border-t border-[var(--c-fg)] pt-5">
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-xs t-text-muted">{String(i + 1).padStart(2, '0')}</span>
                {item.icon && <Icon name={item.icon} className="h-4 w-4 t-text-accent" />}
              </div>
              <h3 className="mt-4 font-serif text-xl font-semibold tracking-tight">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed t-text-muted">{item.description}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

function Cards({ block }: { block: Extract<Block, { type: 'cards' }> }) {
  return (
    <section className="border-b border-[var(--c-border)] py-20 sm:py-24">
      <Container>
        {block.eyebrow && (
          <p className="font-mono text-xs uppercase tracking-[0.3em] t-text-accent">{block.eyebrow}</p>
        )}
        {block.heading && (
          <h2 className="mt-4 max-w-2xl font-serif text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            {block.heading}
          </h2>
        )}
        <div className="mt-12 grid gap-x-8 gap-y-12 sm:grid-cols-2">
          {block.items.map((item, i) => {
            const inner = (
              <>
                {item.image && (
                  <SmartImage
                    src={item.image}
                    alt={item.imageAlt ?? item.title}
                    className="aspect-[4/3] w-full border border-[var(--c-border)]"
                    fallbackClassName="from-stone-200 via-stone-300 to-stone-400"
                  />
                )}
                <div className="mt-4 flex items-baseline justify-between gap-3">
                  <h3 className="font-serif text-xl font-semibold tracking-tight transition-colors group-hover:t-text-accent">
                    {item.title}
                  </h3>
                  <span className="font-mono text-xs t-text-muted">{String(i + 1).padStart(2, '0')}</span>
                </div>
                {item.description && <p className="mt-2 text-sm leading-relaxed t-text-muted">{item.description}</p>}
                {item.meta && item.meta.length > 0 && (
                  <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] t-text-muted">
                    {item.meta.join(' · ')}
                  </p>
                )}
              </>
            );
            return item.href ? (
              <Link key={item.title} href={item.href} className="group t-ring rounded-sm">
                {inner}
              </Link>
            ) : (
              <div key={item.title} className="group">
                {inner}
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}

function Stats({ block }: { block: Extract<Block, { type: 'stats' }> }) {
  return (
    <section className="border-b border-[var(--c-border)]">
      <Container className="py-14">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {block.items.map((item, i) => (
            <div key={item.label} className="border-t border-[var(--c-fg)] pt-4">
              <p className="font-serif text-5xl font-semibold tracking-tight">{item.value}</p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] t-text-muted">
                {String(i + 1).padStart(2, '0')} — {item.label}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

function Testimonials({ block }: { block: Extract<Block, { type: 'testimonials' }> }) {
  return (
    <section className="border-b border-[var(--c-border)] py-20 sm:py-24">
      <Container>
        {block.heading && (
          <h2 className="max-w-xl font-serif text-4xl font-semibold leading-tight tracking-tight">{block.heading}</h2>
        )}
        <div className="mt-12 grid gap-12 lg:grid-cols-3">
          {block.items.map((item, i) => (
            <figure key={item.author} className="border-t border-[var(--c-border)] pt-6">
              <span className="font-mono text-xs t-text-muted">{String(i + 1).padStart(2, '0')}</span>
              <blockquote className="mt-4 font-serif text-xl leading-relaxed tracking-tight">
                &ldquo;{item.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] t-text-muted">
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
    <section className="py-24 sm:py-32">
      <Container className="text-center">
        <h2 className="mx-auto max-w-3xl font-serif text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
          {block.heading}
        </h2>
        {block.body && (
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed t-text-muted">{block.body}</p>
        )}
        <Link
          href={block.buttonHref}
          className="t-ring mt-10 inline-flex border-b-2 border-[var(--c-fg)] pb-1.5 text-base font-semibold transition-colors hover:border-[var(--c-accent)] hover:t-text-accent"
        >
          {block.buttonLabel} →
        </Link>
      </Container>
    </section>
  );
}

function RichText({ block }: { block: Extract<Block, { type: 'richtext' }> }) {
  return (
    <section className="border-b border-[var(--c-border)] py-16 sm:py-20">
      <Container>
        <div className="mx-auto max-w-2xl">
          {block.eyebrow && (
            <p className="font-mono text-xs uppercase tracking-[0.3em] t-text-accent">{block.eyebrow}</p>
          )}
          {block.heading && (
            <h2 className="mt-3 font-serif text-3xl font-semibold tracking-tight">{block.heading}</h2>
          )}
          <div className="mt-6 space-y-5">
            {block.paragraphs.map((paragraph, i) => (
              <p key={i} className="text-lg leading-relaxed t-text-muted">{paragraph}</p>
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
    <section className="border-b border-[var(--c-border)] py-16 sm:py-20">
      <Container>
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            {block.heading && (
              <h2 className="font-serif text-3xl font-semibold tracking-tight">{block.heading}</h2>
            )}
            {block.body?.map((paragraph, i) => (
              <p key={i} className="mt-4 leading-relaxed t-text-muted">{paragraph}</p>
            ))}
          </div>
          <dl className="space-y-4">
            {rows.map((row) => (
              <div key={row} className="border-b border-[var(--c-border)] pb-3 text-sm font-medium">
                {row}
              </div>
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
}: {
  block: Extract<Block, { type: 'postlist' }>;
  posts?: Post[];
  categories?: CategoryWithCount[];
}) {
  const resolved = resolvePostlistPosts(block, posts ?? [], categories);
  if (resolved.length === 0) return null;
  return (
    <section className="border-b border-[var(--c-border)] py-20 sm:py-24">
      <Container>
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-serif text-4xl font-semibold tracking-tight">{block.heading}</h2>
          <Link href="/posts" className="text-[11px] font-semibold uppercase tracking-[0.2em] t-text-muted hover:text-[var(--c-fg)]">
            All entries →
          </Link>
        </div>
        <div className="mt-10 divide-y divide-[var(--c-border)] border-t border-[var(--c-border)]">
          {resolved.map((post) => (
            <Link key={post.slug} href={`/posts/${post.slug}`} className="group grid gap-2 py-6 sm:grid-cols-[140px_1fr_auto] sm:items-baseline">
              <span className="font-mono text-xs t-text-muted">{formatDate(post.publishedAt)}</span>
              <span>
                <span className="block font-serif text-2xl font-semibold tracking-tight transition-colors group-hover:t-text-accent">
                  {post.title}
                </span>
                <span className="mt-1 block max-w-2xl text-sm leading-relaxed t-text-muted">{post.excerpt}</span>
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] t-text-muted">
                {post.readingMinutes} min
              </span>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}

/** Render content blocks in the Portfolio visual language. */
export function PortfolioBlocks({
  blocks,
  posts,
  categories,
}: {
  blocks: Block[];
  posts?: Post[];
  categories?: CategoryWithCount[];
}) {
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
          case 'postlist':
            return <PostList key={i} block={block} posts={posts} categories={categories} />;
          default:
            return null;
        }
      })}
    </>
  );
}
