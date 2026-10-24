import Link from 'next/link';
import { Container } from '@/components/shared/Container';
import { Icon } from '@/components/shared/Icon';
import { SmartImage } from '@/components/shared/SmartImage';
import { formatDate, resolvePostlistPosts } from '@/platform/blocks';
import type { Block, CategoryWithCount, Post } from '@/platform/types';

/**
 * Business theme — block renderers.
 *
 * The corporate visual language: light sections, strong navy/gold accents,
 * card grids, and a dark stats band. Section order comes from page content;
 * every section is typed against the shared Block union.
 */

export function SectionHeading({
  eyebrow,
  heading,
  intro,
  align = 'center',
  dark = false,
}: {
  eyebrow?: string;
  heading: string;
  intro?: string;
  align?: 'left' | 'center';
  dark?: boolean;
}) {
  return (
    <div className={align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      {eyebrow && (
        <p className={`text-xs font-bold uppercase tracking-[0.18em] ${dark ? 't-text-accent' : 't-text-accent'}`}>
          {eyebrow}
        </p>
      )}
      <h2 className={`mt-2 text-3xl font-bold tracking-tight sm:text-4xl ${dark ? 'text-white' : ''}`}>
        {heading}
      </h2>
      {intro && (
        <p className={`mt-4 text-base leading-relaxed sm:text-lg ${dark ? 'text-[var(--c-dark-fg)]/85' : 't-text-muted'}`}>
          {intro}
        </p>
      )}
    </div>
  );
}

function Hero({ block }: { block: Extract<Block, { type: 'hero' }> }) {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(to_bottom,var(--c-muted),transparent_70%)]"
      />
      <Container className="relative py-16 sm:py-24 lg:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            {block.eyebrow && (
              <span className="inline-flex items-center rounded-full border t-border t-bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-wider t-text-muted">
                {block.eyebrow}
              </span>
            )}
            <h1 className="mt-5 text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-[3.4rem]">
              {block.title}
            </h1>
            {block.subtitle && (
              <p className="mt-5 max-w-xl text-lg leading-relaxed t-text-muted">{block.subtitle}</p>
            )}
            <div className="mt-8 flex flex-wrap items-center gap-3">
              {block.primaryCta && (
                <Link
                  href={block.primaryCta.href}
                  className="t-btn t-bg-primary t-ring rounded-md px-6 py-3 text-sm font-semibold"
                >
                  {block.primaryCta.label}
                </Link>
              )}
              {block.secondaryCta && (
                <Link
                  href={block.secondaryCta.href}
                  className="t-btn t-btn-outline t-ring rounded-md px-6 py-3 text-sm font-semibold"
                >
                  {block.secondaryCta.label}
                </Link>
              )}
            </div>
          </div>

          {block.image && (
            <div className="relative">
              <div aria-hidden="true" className="absolute -right-3 -top-3 h-full w-full rounded-xl t-bg-accent opacity-20" />
              <SmartImage
                src={block.image}
                alt={block.imageAlt ?? ''}
                eager
                className="relative aspect-[4/3] w-full rounded-xl shadow-2xl lg:aspect-[5/4]"
              />
              <div className="absolute -bottom-6 left-6 hidden rounded-lg t-bg-primary px-5 py-4 shadow-xl sm:block">
                <p className="text-2xl font-bold">94%</p>
                <p className="text-xs" style={{ color: 'var(--c-primary-fg)', opacity: 0.8 }}>
                  client retention
                </p>
              </div>
            </div>
          )}
        </div>
      </Container>
    </section>
  );
}

function Logos({ block }: { block: Extract<Block, { type: 'logos' }> }) {
  return (
    <section className="border-y t-border">
      <Container className="py-10">
        {block.heading && (
          <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] t-text-muted">
            {block.heading}
          </p>
        )}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          {block.items.map((item) => (
            <span key={item} className="text-lg font-bold tracking-tight text-[var(--c-fg)]/35">
              {item}
            </span>
          ))}
        </div>
      </Container>
    </section>
  );
}

function Features({ block }: { block: Extract<Block, { type: 'features' }> }) {
  return (
    <section className="py-16 sm:py-20">
      <Container>
        <SectionHeading eyebrow={block.eyebrow} heading={block.heading} intro={block.intro} />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {block.items.map((item) => (
            <div
              key={item.title}
              className="group rounded-xl border t-border t-bg-muted p-6 transition hover:border-[var(--c-accent)] hover:shadow-md"
            >
              {item.icon && (
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg t-bg-primary">
                  <Icon name={item.icon} className="h-5 w-5" />
                </span>
              )}
              <h3 className="mt-4 text-base font-semibold">{item.title}</h3>
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
      <Container className="py-14">
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
          {block.items.map((item) => (
            <div key={item.label} className="text-center">
              <p className="text-3xl font-bold tracking-tight text-white sm:text-4xl">{item.value}</p>
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
    <section className="py-16 sm:py-20">
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {block.image && (
            <SmartImage
              src={block.image}
              alt={block.imageAlt ?? ''}
              className={`aspect-[4/3] w-full rounded-xl shadow-lg ${block.reversed ? 'lg:order-2' : ''}`}
            />
          )}
          <div>
            {block.eyebrow && (
              <p className="text-xs font-bold uppercase tracking-[0.18em] t-text-accent">{block.eyebrow}</p>
            )}
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{block.heading}</h2>
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

export function PostCard({ post, categories }: { post: Post; categories?: CategoryWithCount[] }) {
  const category = categories?.find((c) => c.id === post.categoryId);
  return (
    <Link href={`/posts/${post.slug}`} className="group flex flex-col t-ring rounded-xl">
      <SmartImage
        src={post.coverImage}
        alt={post.coverAlt ?? post.title}
        className="aspect-[16/10] w-full rounded-xl border t-border"
      />
      <div className="flex flex-1 flex-col pt-4">
        {category && (
          <p className="text-xs font-semibold uppercase tracking-wider t-text-accent">{category.name}</p>
        )}
        <h3 className="mt-1.5 text-lg font-semibold leading-snug tracking-tight transition-colors group-hover:text-[var(--c-primary)]">
          {post.title}
        </h3>
        <p className="mt-2 flex-1 text-sm leading-relaxed t-text-muted">{post.excerpt}</p>
        <p className="mt-3 text-xs t-text-muted">
          {formatDate(post.publishedAt)} · {post.readingMinutes} min read
        </p>
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
    <section className="t-bg-muted py-16 sm:py-20">
      <Container>
        <SectionHeading eyebrow={block.eyebrow} heading={block.heading} intro={block.intro} align="left" />
        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {resolved.map((post) => (
            <PostCard key={post.slug} post={post} categories={categories} />
          ))}
        </div>
      </Container>
    </section>
  );
}

function Testimonials({ block }: { block: Extract<Block, { type: 'testimonials' }> }) {
  return (
    <section className="py-16 sm:py-20">
      <Container>
        <SectionHeading eyebrow={block.eyebrow} heading={block.heading} />
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {block.items.map((item) => (
            <figure key={item.author} className="flex flex-col rounded-xl border t-border p-6 shadow-sm">
              <span aria-hidden="true" className="text-4xl font-bold leading-none t-text-accent">
                &ldquo;
              </span>
              <blockquote className="mt-2 flex-1 text-sm leading-relaxed">{item.quote}</blockquote>
              <figcaption className="mt-5 flex items-center gap-3 border-t t-border pt-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-full t-bg-primary text-xs font-bold">
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
    <section className="t-bg-dark relative overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(70%_100%_at_50%_0%,color-mix(in_srgb,var(--c-primary)_55%,transparent),transparent)]"
      />
      <Container className="relative py-16 text-center sm:py-20">
        <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
          {block.heading}
        </h2>
        {block.body && (
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-[var(--c-dark-fg)]/85">
            {block.body}
          </p>
        )}
        <Link
          href={block.buttonHref}
          className="mt-8 inline-flex t-btn t-ring rounded-md px-7 py-3 text-sm font-semibold"
          style={{ backgroundColor: 'var(--c-primary-fg)', color: 'var(--c-dark)' }}
        >
          {block.buttonLabel}
        </Link>
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
            <p className="text-xs font-bold uppercase tracking-[0.18em] t-text-accent">{block.eyebrow}</p>
          )}
          {block.heading && (
            <h2 className="mt-2 text-3xl font-bold tracking-tight">{block.heading}</h2>
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
        <div className="mx-auto max-w-3xl rounded-2xl border t-border t-bg-muted p-8 sm:p-10">
          {block.heading && <h2 className="text-2xl font-bold tracking-tight">{block.heading}</h2>}
          {block.body?.map((paragraph, i) => (
            <p key={i} className="mt-3 leading-relaxed t-text-muted">
              {paragraph}
            </p>
          ))}
          <dl className="mt-8 grid gap-5 sm:grid-cols-2">
            {rows.map((row) => (
              <div key={row.value} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg t-bg-primary">
                  <Icon name={row.icon} className="h-4.5 w-4.5" />
                </span>
                <div>
                  <dt className="sr-only">{row.icon}</dt>
                  <dd className="text-sm font-medium">{row.value}</dd>
                </div>
              </div>
            ))}
          </dl>
        </div>
      </Container>
    </section>
  );
}

/** Render a list of content blocks in the Business visual language. */
export function BusinessBlocks({
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
          case 'features':
            return <Features key={i} block={block} />;
          case 'stats':
            return <Stats key={i} block={block} />;
          case 'intro':
            return <Intro key={i} block={block} />;
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
