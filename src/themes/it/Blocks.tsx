import Link from 'next/link';
import { Container } from '@/components/shared/Container';
import { Icon } from '@/components/shared/Icon';
import { SmartImage } from '@/components/shared/SmartImage';
import { formatDate, resolvePostlistPosts } from '@/platform/blocks';
import type { Block, CategoryWithCount, Post } from '@/platform/types';

/**
 * IT / Technology theme — block renderers.
 * Dark console surfaces, mono metadata, gradient-accented panels, and
 * hairline borders. Everything degrades quietly when content is absent.
 */

const panel = 'rounded-lg border border-[var(--c-border)] bg-[color-mix(in_srgb,var(--c-bg)_60%,var(--c-muted))]';

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[11px] uppercase tracking-[0.3em] t-text-accent">
      <span aria-hidden="true" className="mr-2 text-[var(--c-muted-fg)]">{'//'}</span>
      {children}
    </p>
  );
}

function Hero({ block }: { block: Extract<Block, { type: 'hero' }> }) {
  return (
    <section className="border-b border-[var(--c-border)]">
      <Container className="py-16 sm:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_1fr]">
          <div>
            {block.eyebrow && <Eyebrow>{block.eyebrow}</Eyebrow>}
            <h1 className="mt-4 text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
              {block.title}
            </h1>
            {block.subtitle && (
              <p className="mt-6 max-w-xl text-lg leading-relaxed t-text-muted">{block.subtitle}</p>
            )}
            <div className="mt-9 flex flex-wrap gap-3">
              {block.primaryCta && (
                <Link
                  href={block.primaryCta.href}
                  className="t-btn t-ring rounded-md border border-[var(--c-accent)] px-6 py-3 font-mono text-sm font-bold t-text-accent transition hover:bg-[color-mix(in_srgb,var(--c-accent)_14%,transparent)]"
                >
                  {block.primaryCta.label}
                </Link>
              )}
              {block.secondaryCta && (
                <Link
                  href={block.secondaryCta.href}
                  className="t-ring rounded-md border border-[var(--c-border)] px-6 py-3 font-mono text-sm font-medium t-text-muted transition hover:text-[var(--c-fg)]"
                >
                  {block.secondaryCta.label}
                </Link>
              )}
            </div>
          </div>
          {block.image && (
            <div className="relative">
              <div
                aria-hidden="true"
                className="absolute -inset-3 rounded-xl bg-[radial-gradient(60%_60%_at_50%_40%,color-mix(in_srgb,var(--c-accent)_18%,transparent),transparent)]"
              />
              <SmartImage
                src={block.image}
                alt={block.imageAlt ?? ''}
                eager
                className={`relative aspect-[4/3] w-full ${panel}`}
              />
            </div>
          )}
        </div>
      </Container>
    </section>
  );
}

function Logos({ block }: { block: Extract<Block, { type: 'logos' }> }) {
  return (
    <section className="border-b border-[var(--c-border)] py-8">
      <Container className="flex flex-wrap items-center gap-x-8 gap-y-2">
        {block.heading && (
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] t-text-muted">{block.heading}</p>
        )}
        {block.items.map((item) => (
          <span key={item} className="font-mono text-sm font-semibold t-text-muted">{item}</span>
        ))}
      </Container>
    </section>
  );
}

function Intro({ block }: { block: Extract<Block, { type: 'intro' }> }) {
  return (
    <section className="border-b border-[var(--c-border)] py-16 sm:py-20">
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className={block.reversed ? 'lg:order-2' : ''}>
            {block.eyebrow && <Eyebrow>{block.eyebrow}</Eyebrow>}
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{block.heading}</h2>
            {block.body.map((paragraph, i) => (
              <p key={i} className="mt-4 leading-relaxed t-text-muted">{paragraph}</p>
            ))}
            {block.bullets && block.bullets.length > 0 && (
              <ul className="mt-6 space-y-2.5">
                {block.bullets.map((bullet, i) => (
                  <li key={i} className="flex gap-2.5 font-mono text-sm">
                    <span className="t-text-accent">[ok]</span>
                    <span className="leading-relaxed">{bullet}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {block.image && (
            <SmartImage
              src={block.image}
              alt={block.imageAlt ?? ''}
              className={`aspect-[4/3] w-full ${panel}`}
            />
          )}
        </div>
      </Container>
    </section>
  );
}

function Features({ block }: { block: Extract<Block, { type: 'features' }> }) {
  return (
    <section className="border-b border-[var(--c-border)] py-16 sm:py-20">
      <Container>
        {block.eyebrow && <Eyebrow>{block.eyebrow}</Eyebrow>}
        {block.heading && <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{block.heading}</h2>}
        {block.intro && <p className="mt-3 max-w-2xl leading-relaxed t-text-muted">{block.intro}</p>}
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {block.items.map((item) => (
            <div
              key={item.title}
              className={`${panel} group p-5 transition hover:border-[color-mix(in_srgb,var(--c-accent)_60%,var(--c-border))]`}
            >
              {item.icon && (
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--c-border)] t-text-accent">
                  <Icon name={item.icon} className="h-4.5 w-4.5" />
                </span>
              )}
              <h3 className="mt-3.5 font-mono text-sm font-bold">{item.title}</h3>
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
    <section className="border-b border-[var(--c-border)] py-16 sm:py-20">
      <Container>
        {block.eyebrow && <Eyebrow>{block.eyebrow}</Eyebrow>}
        {block.heading && <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{block.heading}</h2>}
        {block.intro && <p className="mt-3 max-w-2xl leading-relaxed t-text-muted">{block.intro}</p>}
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {block.items.map((item) => {
            const inner = (
              <>
                {item.image && (
                  <SmartImage
                    src={item.image}
                    alt={item.imageAlt ?? item.title}
                    className="aspect-[16/10] w-full"
                    fallbackClassName="from-slate-700 via-slate-800 to-slate-900"
                  />
                )}
                <div className="p-5">
                  {item.tag && (
                    <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] t-text-accent">
                      {item.tag}
                    </span>
                  )}
                  <h3 className="mt-1 font-mono text-base font-bold">{item.title}</h3>
                  {item.description && (
                    <p className="mt-2 text-sm leading-relaxed t-text-muted">{item.description}</p>
                  )}
                  {item.meta && item.meta.length > 0 && (
                    <p className="mt-3 font-mono text-[11px] t-text-muted">{item.meta.join(' · ')}</p>
                  )}
                </div>
              </>
            );
            const cls = 'group block overflow-hidden rounded-lg border border-[var(--c-border)] transition hover:border-[color-mix(in_srgb,var(--c-accent)_60%,var(--c-border))] t-ring';
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
    <section className="border-y border-[var(--c-border)] bg-[color-mix(in_srgb,var(--c-muted)_50%,transparent)]">
      <Container className="py-12">
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
          {block.items.map((item) => (
            <div key={item.label} className="text-center">
              <p className="font-mono text-4xl font-bold tracking-tight t-text-accent">{item.value}</p>
              <p className="mt-1.5 font-mono text-xs uppercase tracking-[0.14em] t-text-muted">{item.label}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

function Testimonials({ block }: { block: Extract<Block, { type: 'testimonials' }> }) {
  return (
    <section className="border-b border-[var(--c-border)] py-16 sm:py-20">
      <Container>
        {block.eyebrow && <Eyebrow>{block.eyebrow}</Eyebrow>}
        {block.heading && <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{block.heading}</h2>}
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {block.items.map((item) => (
            <figure key={item.author} className={`${panel} flex flex-col p-5`}>
              <span aria-hidden="true" className="font-mono text-2xl leading-none t-text-accent">{'</>'}</span>
              <blockquote className="mt-3 flex-1 text-sm leading-relaxed">{item.quote}</blockquote>
              <figcaption className="mt-4 border-t border-[var(--c-border)] pt-3 font-mono text-xs">
                <span className="font-bold">{item.author}</span>
                {item.role && <span className="t-text-muted"> — {item.role}</span>}
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
    <section className="py-20 sm:py-24">
      <Container>
        <div className={`${panel} relative overflow-hidden p-8 text-center sm:p-14`}>
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[radial-gradient(60%_80%_at_50%_0%,color-mix(in_srgb,var(--c-accent)_14%,transparent),transparent)]"
          />
          <div className="relative mx-auto max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{block.heading}</h2>
            {block.body && <p className="mt-4 leading-relaxed t-text-muted">{block.body}</p>}
            <Link
              href={block.buttonHref}
              className="t-ring mt-8 inline-flex rounded-md border border-[var(--c-accent)] px-7 py-3 font-mono text-sm font-bold t-text-accent transition hover:bg-[color-mix(in_srgb,var(--c-accent)_14%,transparent)]"
            >
              {block.buttonLabel}
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}

function RichText({ block }: { block: Extract<Block, { type: 'richtext' }> }) {
  return (
    <section className="border-b border-[var(--c-border)] py-14">
      <Container>
        <div className="mx-auto max-w-2xl">
          {block.eyebrow && <Eyebrow>{block.eyebrow}</Eyebrow>}
          {block.heading && <h2 className="mt-3 text-3xl font-bold tracking-tight">{block.heading}</h2>}
          <div className="mt-5 space-y-4">
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
  const rows = [
    { icon: 'mail' as const, value: block.email },
    { icon: 'phone' as const, value: block.phone },
    { icon: 'pin' as const, value: block.address },
    { icon: 'check' as const, value: block.hours },
  ].filter((r): r is { icon: typeof r.icon; value: string } => Boolean(r.value));

  return (
    <section className="border-b border-[var(--c-border)] py-14">
      <Container>
        <div className="mx-auto max-w-2xl">
          {block.heading && <h2 className="text-2xl font-bold tracking-tight">{block.heading}</h2>}
          {block.body?.map((paragraph, i) => (
            <p key={i} className="mt-3 leading-relaxed t-text-muted">{paragraph}</p>
          ))}
          <dl className="mt-7 grid gap-3 font-mono text-sm sm:grid-cols-2">
            {rows.map((row) => (
              <div key={row.value} className={`${panel} flex items-center gap-3 p-3.5`}>
                <Icon name={row.icon} className="h-4 w-4 shrink-0 t-text-accent" />
                <dd>{row.value}</dd>
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
    <section className="border-b border-[var(--c-border)] py-16 sm:py-20">
      <Container>
        {block.eyebrow && <Eyebrow>{block.eyebrow}</Eyebrow>}
        <div className="mt-3 flex items-baseline justify-between gap-4">
          <h2 className="text-3xl font-bold tracking-tight">{block.heading}</h2>
          <Link href="/posts" className="font-mono text-xs t-text-accent hover:underline">
            view_all →
          </Link>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resolved.map((post) => (
            <Link
              key={post.slug}
              href={`/posts/${post.slug}`}
              className={`${panel} group flex flex-col p-5 transition hover:border-[color-mix(in_srgb,var(--c-accent)_60%,var(--c-border))] t-ring`}
            >
              <p className="font-mono text-[11px] t-text-muted">
                {formatDate(post.publishedAt)} · {post.readingMinutes} min
              </p>
              <h3 className="mt-2 font-mono text-base font-bold leading-snug transition-colors group-hover:t-text-accent">
                {post.title}
              </h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed t-text-muted">{post.excerpt}</p>
              <span className="mt-4 font-mono text-xs t-text-accent opacity-0 transition group-hover:opacity-100">
                read_article →
              </span>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}

/** Render content blocks in the IT/Tech visual language. */
export function TechBlocks({
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
