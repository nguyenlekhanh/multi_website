import Link from 'next/link';
import { Container } from '@/components/shared/Container';
import { Icon } from '@/components/shared/Icon';
import { SmartImage } from '@/components/shared/SmartImage';
import { formatDate, resolvePostlistPosts } from '@/platform/blocks';
import type { Block, CategoryWithCount, Post } from '@/platform/types';

/**
 * Travel theme — block renderers.
 * Immersive visual language: full-bleed photography, rounded image cards
 * with overlay text, serif display headings, warm cream surfaces.
 */

export function SectionHeading({
  eyebrow,
  heading,
  intro,
  align = 'center',
}: {
  eyebrow?: string;
  heading: string;
  intro?: string;
  align?: 'left' | 'center';
}) {
  return (
    <div className={align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      {eyebrow && (
        <p className="text-xs font-bold uppercase tracking-[0.22em] t-text-accent">{eyebrow}</p>
      )}
      <h2 className="mt-2 font-serif text-3xl font-bold tracking-tight sm:text-4xl">{heading}</h2>
      {intro && <p className="mt-4 leading-relaxed t-text-muted sm:text-lg">{intro}</p>}
    </div>
  );
}

function Hero({ block }: { block: Extract<Block, { type: 'hero' }> }) {
  return (
    <section className="relative flex min-h-[92vh] items-end overflow-hidden">
      <SmartImage
        src={block.image}
        alt={block.imageAlt ?? ''}
        eager
        className="absolute inset-0 h-full w-full"
        fallbackClassName="from-teal-800 via-teal-600 to-amber-500"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/30"
      />
      <Container className="relative pb-20 pt-40 sm:pb-24">
        <div className="max-w-2xl">
          {block.eyebrow && (
            <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-white backdrop-blur">
              {block.eyebrow}
            </span>
          )}
          <h1 className="mt-5 font-serif text-5xl font-bold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl">
            {block.title}
          </h1>
          {block.subtitle && (
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/90">{block.subtitle}</p>
          )}
          <div className="mt-9 flex flex-wrap items-center gap-3">
            {block.primaryCta && (
              <Link
                href={block.primaryCta.href}
                className="t-btn t-bg-primary t-ring rounded-full px-7 py-3.5 text-sm font-semibold"
              >
                {block.primaryCta.label}
              </Link>
            )}
            {block.secondaryCta && (
              <Link
                href={block.secondaryCta.href}
                className="t-ring rounded-full border border-white/50 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15"
              >
                {block.secondaryCta.label}
              </Link>
            )}
          </div>
        </div>
      </Container>
    </section>
  );
}

function Cards({ block }: { block: Extract<Block, { type: 'cards' }> }) {
  const cols =
    block.columns === 4
      ? 'sm:grid-cols-2 lg:grid-cols-4'
      : block.columns === 2
        ? 'sm:grid-cols-2'
        : 'sm:grid-cols-2 lg:grid-cols-3';
  return (
    <section className="py-16 sm:py-24">
      <Container>
        <SectionHeading eyebrow={block.eyebrow} heading={block.heading} intro={block.intro} />
        <div className={`mt-12 grid gap-6 ${cols}`}>
          {block.items.map((item) => {
            const inner = (
              <>
                <SmartImage
                  src={item.image}
                  alt={item.imageAlt ?? item.title}
                  className="absolute inset-0 h-full w-full transition-transform duration-700 group-hover:scale-105"
                  fallbackClassName="from-amber-200 via-orange-300 to-teal-500"
                />
                <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                {item.tag && (
                  <span className="absolute right-4 top-4 rounded-full t-bg-primary px-3 py-1 text-xs font-bold uppercase tracking-wide">
                    {item.tag}
                  </span>
                )}
                <div className="relative mt-auto p-5 text-white">
                  <h3 className="font-serif text-xl font-bold tracking-tight">{item.title}</h3>
                  {item.description && (
                    <p className="mt-1.5 line-clamp-2 text-sm text-white/85">{item.description}</p>
                  )}
                  {item.meta && item.meta.length > 0 && (
                    <p className="mt-2.5 text-xs font-medium uppercase tracking-wider text-white/75">
                      {item.meta.join(' · ')}
                    </p>
                  )}
                </div>
              </>
            );
            const cls =
              'group relative flex aspect-[3/4] flex-col overflow-hidden rounded-3xl t-ring';
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

function Features({ block }: { block: Extract<Block, { type: 'features' }> }) {
  return (
    <section className="t-bg-muted py-16 sm:py-24">
      <Container>
        <SectionHeading eyebrow={block.eyebrow} heading={block.heading} intro={block.intro} />
        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {block.items.map((item) => (
            <div key={item.title} className="text-center sm:text-left">
              {item.icon && (
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full t-bg-primary-soft t-text-primary">
                  <Icon name={item.icon} className="h-5.5 w-5.5" />
                </span>
              )}
              <h3 className="mt-4 font-serif text-lg font-bold tracking-tight">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed t-text-muted">{item.description}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

function Stats({ block }: { block: Extract<Block, { type: 'stats' }> }) {
  return (
    <section className="t-bg-dark">
      <Container className="py-16">
        <div className="grid grid-cols-2 gap-10 lg:grid-cols-4">
          {block.items.map((item) => (
            <div key={item.label} className="text-center">
              <p className="font-serif text-4xl font-bold tracking-tight text-white sm:text-5xl">{item.value}</p>
              <p className="mt-2 text-sm text-[var(--c-dark-fg)]/75">{item.label}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

function Intro({ block }: { block: Extract<Block, { type: 'intro' }> }) {
  return (
    <section className="py-16 sm:py-24">
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {block.image && (
            <SmartImage
              src={block.image}
              alt={block.imageAlt ?? ''}
              className={`aspect-[4/5] w-full rounded-[2rem] shadow-xl sm:aspect-[4/3] ${block.reversed ? 'lg:order-2' : ''}`}
            />
          )}
          <div>
            {block.eyebrow && (
              <p className="text-xs font-bold uppercase tracking-[0.22em] t-text-accent">{block.eyebrow}</p>
            )}
            <h2 className="mt-2 font-serif text-3xl font-bold tracking-tight sm:text-4xl">{block.heading}</h2>
            {block.body.map((paragraph, i) => (
              <p key={i} className="mt-4 leading-relaxed t-text-muted">
                {paragraph}
              </p>
            ))}
            {block.bullets && block.bullets.length > 0 && (
              <ul className="mt-6 space-y-3">
                {block.bullets.map((bullet, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full t-bg-accent-soft t-text-accent">
                      <Icon name="check" className="h-3.5 w-3.5" strokeWidth={2.4} />
                    </span>
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

export function JournalCard({ post }: { post: Post }) {
  return (
    <Link href={`/posts/${post.slug}`} className="group t-ring rounded-2xl">
      <SmartImage
        src={post.coverImage}
        alt={post.coverAlt ?? post.title}
        className="aspect-[16/11] w-full rounded-2xl"
        fallbackClassName="from-teal-700 via-teal-500 to-amber-400"
      />
      <div className="pt-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] t-text-accent">
          {formatDate(post.publishedAt)} · {post.readingMinutes} min read
        </p>
        <h3 className="mt-1.5 font-serif text-xl font-bold leading-snug tracking-tight transition-colors group-hover:text-[var(--c-primary)]">
          {post.title}
        </h3>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed t-text-muted">{post.excerpt}</p>
      </div>
    </Link>
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
  const resolved = resolvePostlistPosts(block, posts ?? [], categories);
  if (resolved.length === 0) return null;
  return (
    <section className="py-16 sm:py-24">
      <Container>
        <SectionHeading eyebrow={block.eyebrow ?? 'Travel journal'} heading={block.heading} intro={block.intro} />
        <div className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {resolved.map((post) => (
            <JournalCard key={post.slug} post={post} />
          ))}
        </div>
      </Container>
    </section>
  );
}

function Testimonials({ block }: { block: Extract<Block, { type: 'testimonials' }> }) {
  return (
    <section className="t-bg-muted py-16 sm:py-24">
      <Container>
        <SectionHeading eyebrow={block.eyebrow} heading={block.heading} />
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {block.items.map((item) => (
            <figure key={item.author} className="flex flex-col rounded-3xl bg-[var(--c-bg)] p-7 shadow-sm ring-1 ring-black/5">
              <span aria-hidden="true" className="font-serif text-5xl leading-none t-text-accent">
                &ldquo;
              </span>
              <blockquote className="mt-3 flex-1 font-serif text-lg leading-relaxed">{item.quote}</blockquote>
              <figcaption className="mt-6 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full t-bg-dark text-xs font-bold">
                  {item.initials}
                </span>
                <div>
                  <p className="text-sm font-semibold">{item.author}</p>
                  {item.role && <p className="text-xs t-text-muted">{item.role}</p>}
                </div>
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
    <section className="py-16 sm:py-24">
      <Container>
        <div className="relative overflow-hidden rounded-[2.5rem] t-bg-dark px-6 py-16 text-center sm:px-16">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[radial-gradient(80%_120%_at_50%_-10%,color-mix(in_srgb,var(--c-primary)_70%,transparent),transparent)]"
          />
          <div className="relative mx-auto max-w-2xl">
            <h2 className="font-serif text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {block.heading}
            </h2>
            {block.body && (
              <p className="mt-4 leading-relaxed text-[var(--c-dark-fg)]/85">{block.body}</p>
            )}
            <Link
              href={block.buttonHref}
              className="mt-8 inline-flex t-ring rounded-full px-8 py-3.5 text-sm font-semibold transition hover:opacity-90"
              style={{ backgroundColor: 'var(--c-primary)', color: 'var(--c-primary-fg)' }}
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
    <section className="py-14 sm:py-16">
      <Container>
        <div className="mx-auto max-w-3xl">
          {block.eyebrow && (
            <p className="text-xs font-bold uppercase tracking-[0.22em] t-text-accent">{block.eyebrow}</p>
          )}
          {block.heading && (
            <h2 className="mt-2 font-serif text-3xl font-bold tracking-tight">{block.heading}</h2>
          )}
          <div className="mt-5 space-y-5">
            {block.paragraphs.map((paragraph, i) => (
              <p key={i} className="leading-relaxed t-text-muted">
                {paragraph}
              </p>
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
    <section className="py-14 sm:py-16">
      <Container>
        <div className="mx-auto max-w-3xl rounded-[2rem] t-bg-muted p-8 sm:p-10">
          {block.heading && (
            <h2 className="font-serif text-2xl font-bold tracking-tight">{block.heading}</h2>
          )}
          {block.body?.map((paragraph, i) => (
            <p key={i} className="mt-3 leading-relaxed t-text-muted">
              {paragraph}
            </p>
          ))}
          <dl className="mt-8 grid gap-5 sm:grid-cols-2">
            {rows.map((row) => (
              <div key={row.value} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full t-bg-primary">
                  <Icon name={row.icon} className="h-4.5 w-4.5" />
                </span>
                <dd className="pt-2 text-sm font-medium">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Container>
    </section>
  );
}

/** Render a list of content blocks in the Travel visual language. */
export function TravelBlocks({
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
            return null;
          case 'features':
            return <Features key={i} block={block} />;
          case 'stats':
            return <Stats key={i} block={block} />;
          case 'intro':
            return <Intro key={i} block={block} />;
          case 'cards':
            return <Cards key={i} block={block} />;
          case 'postlist':
            return <PostListSection key={i} block={block} posts={posts} categories={categories} />;
          case 'testimonials':
            return <Testimonials key={i} block={block} />;
          case 'cta':
            return <Cta key={i} block={block} />;
          case 'richtext':
            return <RichText key={i} block={block} />;
          case 'contact':
            return <Contact key={i} block={block} />;
          default:
            return null;
        }
      })}
    </>
  );
}
