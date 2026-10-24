import Link from 'next/link';
import { Container } from '@/components/shared/Container';
import { Icon } from '@/components/shared/Icon';
import { SmartImage } from '@/components/shared/SmartImage';
import { formatDate, resolvePostlistPosts } from '@/platform/blocks';
import type { Block, CategoryWithCount, Post } from '@/platform/types';

/**
 * Agency theme — block renderers.
 * Bold print-brutalist composition: oversized uppercase display, thick
 * borders, hard offset shadows, numbered process rows, and vivid accents.
 */

const hardShadow = 'border-2 border-[var(--c-fg)] shadow-[6px_6px_0_var(--c-fg)]';

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.24em] t-text-accent">
      <span aria-hidden="true" className="h-2 w-6 t-bg-accent" />
      {children}
    </p>
  );
}

function Hero({ block }: { block: Extract<Block, { type: 'hero' }> }) {
  return (
    <section className="border-b-2 border-b-[var(--c-fg)]">
      <Container className="py-16 sm:py-24">
        {block.eyebrow && <Eyebrow>{block.eyebrow}</Eyebrow>}
        <h1 className="mt-5 max-w-4xl text-5xl font-black uppercase leading-[0.95] tracking-tight sm:text-7xl">
          {block.title}
        </h1>
        {block.subtitle && (
          <p className="mt-7 max-w-xl text-lg leading-relaxed t-text-muted">{block.subtitle}</p>
        )}
        <div className="mt-10 flex flex-wrap gap-4">
          {block.primaryCta && (
            <Link
              href={block.primaryCta.href}
              className="t-ring t-bg-primary border-2 border-[var(--c-fg)] px-7 py-3.5 text-sm font-black uppercase tracking-wide text-[var(--c-primary-fg)] shadow-[6px_6px_0_var(--c-fg)] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[3px_3px_0_var(--c-fg)]"
            >
              {block.primaryCta.label}
            </Link>
          )}
          {block.secondaryCta && (
            <Link
              href={block.secondaryCta.href}
              className="t-ring border-2 border-[var(--c-fg)] bg-[var(--c-bg)] px-7 py-3.5 text-sm font-black uppercase tracking-wide shadow-[6px_6px_0_var(--c-fg)] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[3px_3px_0_var(--c-fg)]"
            >
              {block.secondaryCta.label}
            </Link>
          )}
        </div>
      </Container>
      {block.image && (
        <Container className="pb-16">
          <SmartImage
            src={block.image}
            alt={block.imageAlt ?? ''}
            eager
            className={`aspect-[16/8] w-full ${hardShadow}`}
          />
        </Container>
      )}
    </section>
  );
}

function Logos({ block }: { block: Extract<Block, { type: 'logos' }> }) {
  return (
    <section className="border-b-2 border-b-[var(--c-fg)]">
      <Container className="flex flex-wrap items-center gap-x-8 gap-y-2 py-6">
        {block.heading && (
          <p className="text-xs font-black uppercase tracking-[0.2em] t-text-muted">{block.heading}</p>
        )}
        {block.items.map((item) => (
          <span key={item} className="text-lg font-black uppercase tracking-tight t-text-muted">{item}</span>
        ))}
      </Container>
    </section>
  );
}

function Intro({ block }: { block: Extract<Block, { type: 'intro' }> }) {
  return (
    <section className="border-b-2 border-b-[var(--c-fg)] py-16 sm:py-20">
      <Container>
        <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr]">
          <div>
            {block.eyebrow && <Eyebrow>{block.eyebrow}</Eyebrow>}
            <h2 className="mt-4 text-4xl font-black uppercase leading-[0.95] tracking-tight sm:text-5xl">
              {block.heading}
            </h2>
          </div>
          <div className="sm:pt-2">
            {block.body.map((paragraph, i) => (
              <p key={i} className="mt-4 text-lg leading-relaxed t-text-muted first:mt-0">{paragraph}</p>
            ))}
            {block.bullets && block.bullets.length > 0 && (
              <ul className="mt-6 space-y-2">
                {block.bullets.map((bullet, i) => (
                  <li key={i} className="flex gap-2.5 text-sm font-bold uppercase tracking-wide">
                    <span className="t-text-accent">■</span>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        {block.image && (
          <SmartImage
            src={block.image}
            alt={block.imageAlt ?? ''}
            className={`mt-10 aspect-[16/7] w-full ${hardShadow}`}
          />
        )}
      </Container>
    </section>
  );
}

function Features({ block }: { block: Extract<Block, { type: 'features' }> }) {
  return (
    <section className="border-b-2 border-b-[var(--c-fg)] py-16 sm:py-20">
      <Container>
        {block.eyebrow && <Eyebrow>{block.eyebrow}</Eyebrow>}
        {block.heading && (
          <h2 className="mt-4 max-w-2xl text-4xl font-black uppercase leading-[0.95] tracking-tight sm:text-5xl">
            {block.heading}
          </h2>
        )}
        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          {block.items.map((item, i) => (
            <div key={item.title} className={`${hardShadow} flex gap-5 p-6 transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[3px_3px_0_var(--c-fg)]`}>
              <span className="font-mono text-4xl font-black leading-none t-text-accent">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div>
                {item.icon && <Icon name={item.icon} className="mb-2 h-5 w-5 t-text-muted" />}
                <h3 className="text-lg font-black uppercase tracking-tight">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed t-text-muted">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

function Cards({ block }: { block: Extract<Block, { type: 'cards' }> }) {
  return (
    <section className="border-b-2 border-b-[var(--c-fg)] py-16 sm:py-20">
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            {block.eyebrow && <Eyebrow>{block.eyebrow}</Eyebrow>}
            {block.heading && (
              <h2 className="mt-4 text-4xl font-black uppercase leading-[0.95] tracking-tight sm:text-5xl">
                {block.heading}
              </h2>
            )}
          </div>
          {block.intro && <p className="max-w-sm text-sm leading-relaxed t-text-muted">{block.intro}</p>}
        </div>
        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {block.items.map((item) => {
            const inner = (
              <>
                {item.image && (
                  <SmartImage
                    src={item.image}
                    alt={item.imageAlt ?? item.title}
                    className="aspect-[4/3] w-full border-b-2 border-b-[var(--c-fg)]"
                    fallbackClassName="from-stone-200 via-stone-300 to-stone-400"
                  />
                )}
                <div className="p-5">
                  {item.tag && (
                    <span className="t-bg-accent px-2 py-0.5 text-[11px] font-black uppercase tracking-[0.14em] text-white">
                      {item.tag}
                    </span>
                  )}
                  <h3 className="mt-2 text-xl font-black uppercase tracking-tight">{item.title}</h3>
                  {item.description && (
                    <p className="mt-2 text-sm leading-relaxed t-text-muted">{item.description}</p>
                  )}
                  {item.meta && item.meta.length > 0 && (
                    <p className="mt-3 text-[11px] font-black uppercase tracking-[0.18em] t-text-muted">
                      {item.meta.join(' / ')}
                    </p>
                  )}
                </div>
              </>
            );
            const cls = `group block ${hardShadow} transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[3px_3px_0_var(--c-fg)] t-ring`;
            return item.href ? (
              <Link key={item.title} href={item.href} className={cls}>
                {inner}
              </Link>
            ) : (
              <div key={item.title} className={cls}>
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
    <section className="border-b-2 border-b-[var(--c-fg)] t-bg-primary">
      <Container className="py-12">
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
          {block.items.map((item) => (
            <div key={item.label} className="text-center">
              <p className="text-5xl font-black tracking-tight text-[var(--c-primary-fg)]">{item.value}</p>
              <p className="mt-1.5 text-xs font-black uppercase tracking-[0.16em] text-[var(--c-primary-fg)]/85">
                {item.label}
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
    <section className="border-b-2 border-b-[var(--c-fg)] py-16 sm:py-20">
      <Container>
        {block.eyebrow && <Eyebrow>{block.eyebrow}</Eyebrow>}
        {block.heading && (
          <h2 className="mt-4 text-4xl font-black uppercase leading-[0.95] tracking-tight sm:text-5xl">
            {block.heading}
          </h2>
        )}
        <div className="mt-12 grid gap-8 lg:grid-cols-3">
          {block.items.map((item, i) => (
            <figure key={item.author} className={`${hardShadow} flex flex-col p-6`}>
              <span className="font-mono text-4xl font-black leading-none t-text-accent" aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </span>
              <blockquote className="mt-3 flex-1 text-base font-medium leading-relaxed">
                &ldquo;{item.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-5 border-t-2 border-[var(--c-border)] pt-3 text-xs font-black uppercase tracking-[0.14em]">
                {item.author}
                {item.role ? <span className="t-text-muted"> — {item.role}</span> : null}
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
    <section className="py-20 sm:py-28">
      <Container>
        <div className={`${hardShadow} t-bg-primary p-10 text-center sm:p-16`}>
          <h2 className="mx-auto max-w-3xl text-4xl font-black uppercase leading-[0.95] tracking-tight text-[var(--c-primary-fg)] sm:text-6xl">
            {block.heading}
          </h2>
          {block.body && (
            <p className="mx-auto mt-5 max-w-xl text-lg text-[var(--c-primary-fg)]/90">{block.body}</p>
          )}
          <Link
            href={block.buttonHref}
            className="t-ring mt-9 inline-flex border-2 border-[var(--c-fg)] bg-[var(--c-bg)] px-8 py-4 text-sm font-black uppercase tracking-wide shadow-[6px_6px_0_var(--c-fg)] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[3px_3px_0_var(--c-fg)]"
          >
            {block.buttonLabel}
          </Link>
        </div>
      </Container>
    </section>
  );
}

function RichText({ block }: { block: Extract<Block, { type: 'richtext' }> }) {
  return (
    <section className="border-b-2 border-b-[var(--c-fg)] py-16">
      <Container>
        <div className="mx-auto max-w-2xl">
          {block.eyebrow && <Eyebrow>{block.eyebrow}</Eyebrow>}
          {block.heading && (
            <h2 className="mt-4 text-3xl font-black uppercase tracking-tight">{block.heading}</h2>
          )}
          <div className="mt-5 space-y-4">
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
    <section className="border-b-2 border-b-[var(--c-fg)] py-16">
      <Container>
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            {block.heading && (
              <h2 className="text-3xl font-black uppercase tracking-tight">{block.heading}</h2>
            )}
            {block.body?.map((paragraph, i) => (
              <p key={i} className="mt-3 leading-relaxed t-text-muted">{paragraph}</p>
            ))}
          </div>
          <dl className="space-y-3">
            {rows.map((row) => (
              <div key={row} className="border-2 border-[var(--c-fg)] px-4 py-3 text-sm font-black uppercase tracking-wide">
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
    <section className="border-b-2 border-b-[var(--c-fg)] py-16">
      <Container>
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-3xl font-black uppercase tracking-tight">{block.heading}</h2>
          <Link href="/posts" className="text-xs font-black uppercase tracking-[0.16em] t-text-accent hover:underline">
            All →
          </Link>
        </div>
        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {resolved.map((post) => (
            <Link key={post.slug} href={`/posts/${post.slug}`} className="group t-ring">
              <p className="font-mono text-[11px] font-black uppercase tracking-[0.18em] t-text-muted">
                {formatDate(post.publishedAt)} · {post.readingMinutes} min
              </p>
              <h3 className="mt-2 text-2xl font-black uppercase leading-tight tracking-tight transition-colors group-hover:t-text-accent">
                {post.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed t-text-muted">{post.excerpt}</p>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}

/** Render content blocks in the Agency visual language. */
export function AgencyBlocks({
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
