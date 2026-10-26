import Link from 'next/link';
import { Container } from '@/components/shared/Container';
import { SmartImage } from '@/components/shared/SmartImage';
import { Icon } from '@/components/shared/Icon';
import { NavLink } from '@/components/shared/NavLink';
import { formatDate } from '@/platform/blocks';
import { themeVars } from '@/themes/themeVars';
import type {
  Block,
  CategoryWithCount,
  Page,
  Post,
  SiteContext,
  ThemeDefinition,
} from '@/platform/types';
import type { PackageTemplate, RequiredTemplate, ValidatedThemePackage } from './spec';

/**
 * Runtime renderer for MSP theme packages (v1).
 *
 * Packages are declarative data; this module is the ONLY executor. It maps
 * manifest layout + template sections + block variants onto platform-approved
 * components. No package-provided code is ever imported, evaluated, or
 * executed; all content flows through the existing SiteContext props with
 * site isolation intact.
 */

const FONT_CLASS: Record<string, string> = {
  sans: 'font-sans',
  serif: 'font-serif',
  mono: 'font-mono',
};

type VariantBlockRenderer = (
  block: Block,
  variant: string,
  pkg: ValidatedThemePackage,
  ctx: SiteContext,
  assetBasePath?: string,
) => React.ReactNode;

/* --------------------------------- header ---------------------------------- */

function PackageHeader({ ctx, pkg }: { ctx: SiteContext; pkg: ValidatedThemePackage }) {
  const { identity, nav } = ctx.settings;
  const { header } = pkg.manifest.layout;
  const heading = FONT_CLASS[pkg.manifest.layout.typography.headingFont] ?? 'font-sans';

  const brand = (
    <Link href="/" className="flex items-center gap-2.5 t-ring rounded-md">
      <span className="flex h-9 w-9 items-center justify-center rounded-md t-bg-primary text-sm font-bold">
        {identity.logoInitials}
      </span>
      <span className={`text-lg font-bold tracking-tight ${heading}`}>{identity.logoText}</span>
    </Link>
  );

  const navLinks = (className: string, activeClass: string) =>
    nav.map((item) => (
      <NavLink key={item.href} href={item.href} label={item.label} className={className} activeClassName={activeClass} />
    ));

  const cta =
    header.ctaLabel && header.ctaHref ? (
      <Link
        href={header.ctaHref}
        className="t-btn t-bg-primary t-ring hidden rounded-lg px-4 py-2 text-sm font-semibold lg:inline-flex"
      >
        {header.ctaLabel}
      </Link>
    ) : null;

  const mobileMenu = (
    <details className="relative md:hidden">
      <summary
        className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-md border t-border t-ring [&::-webkit-details-marker]:hidden"
        aria-label="Open menu"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </summary>
      <div className="absolute right-0 top-12 z-50 w-60 rounded-xl border t-border bg-[var(--c-bg)] p-2 shadow-2xl">
        {nav.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            label={item.label}
            className="block rounded-lg px-3 py-2.5 text-sm font-medium t-text-muted hover:bg-[var(--c-muted)] hover:text-[var(--c-fg)]"
            activeClassName="!text-[var(--c-primary)] bg-[var(--c-muted)]"
          />
        ))}
      </div>
    </details>
  );

  return (
    <header
      className={`z-40 border-b t-border bg-[var(--c-bg)]/95 backdrop-blur ${header.sticky ? 'sticky top-0' : ''}`}
    >
      <Container>
        {header.variant === 'centered' ? (
          <div className="flex flex-col items-center gap-3 py-4">
            {brand}
            <nav className="flex flex-wrap items-center justify-center gap-1" aria-label="Main">
              {navLinks('rounded-md px-3 py-2 text-sm font-medium t-text-muted hover:text-[var(--c-fg)]', '!text-[var(--c-primary)]')}
            </nav>
          </div>
        ) : (
          <div className="flex h-16 items-center justify-between gap-4">
            {brand}
            <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
              {navLinks('rounded-md px-3 py-2 text-sm font-medium t-text-muted hover:text-[var(--c-fg)]', '!text-[var(--c-primary)]')}
            </nav>
            <div className="flex items-center gap-3">
              {cta}
              {mobileMenu}
            </div>
          </div>
        )}
      </Container>
    </header>
  );
}

/* --------------------------------- footer ---------------------------------- */

function PackageFooter({ ctx, pkg }: { ctx: SiteContext; pkg: ValidatedThemePackage }) {
  const { identity, footerNav } = ctx.settings;
  const { footer } = pkg.manifest.layout;
  const heading = FONT_CLASS[pkg.manifest.layout.typography.headingFont] ?? 'font-sans';

  if (footer.variant === 'minimal') {
    return (
      <footer className="border-t t-border py-8">
        <Container className="flex flex-col items-center justify-between gap-3 text-sm t-text-muted sm:flex-row">
          <span>© {new Date().getFullYear()} {identity.name}</span>
          <nav className="flex gap-5" aria-label="Footer">
            {footerNav.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-[var(--c-fg)]">{item.label}</Link>
            ))}
          </nav>
        </Container>
      </footer>
    );
  }

  if (footer.variant === 'large-brand') {
    return (
      <footer className="t-bg-dark">
        <Container className="py-14">
          <p className={`text-4xl font-bold tracking-tight text-white sm:text-5xl ${heading}`}>
            {identity.logoText}
          </p>
          {footer.showTagline && <p className="mt-3 max-w-md text-[var(--c-dark-fg)]/75">{identity.tagline}</p>}
          <nav className="mt-8 flex flex-wrap gap-x-6 gap-y-2" aria-label="Footer">
            {footerNav.map((item) => (
              <Link key={item.href} href={item.href} className="text-sm font-semibold uppercase tracking-wide text-[var(--c-dark-fg)]/85 hover:text-white">
                {item.label}
              </Link>
            ))}
          </nav>
          <p className="mt-10 border-t border-white/10 pt-5 text-xs text-[var(--c-dark-fg)]/55">
            © {new Date().getFullYear()} {identity.name} · served by the shared platform (package theme)
          </p>
        </Container>
      </footer>
    );
  }

  return (
    <footer className="t-bg-dark">
      <Container className="grid gap-10 py-14 md:grid-cols-[2fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-md t-bg-primary text-sm font-bold">{identity.logoInitials}</span>
            <span className={`text-lg font-bold text-white ${heading}`}>{identity.logoText}</span>
          </div>
          {footer.showTagline && (
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-[var(--c-dark-fg)]/75">{identity.tagline}</p>
          )}
        </div>
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--c-dark-fg)]/55">Navigate</h3>
          <ul className="mt-3 space-y-2">
            {footerNav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-sm text-[var(--c-dark-fg)]/90 hover:text-white">{item.label}</Link>
              </li>
            ))}
          </ul>
        </div>
      </Container>
      <div className="border-t border-white/10 py-5 text-center text-xs text-[var(--c-dark-fg)]/55">
        © {new Date().getFullYear()} {identity.name} · package theme “{pkg.manifest.name}”
      </div>
    </footer>
  );
}

/* ------------------------------ block rendering ----------------------------- */

function assetSrc(pkg: ValidatedThemePackage, image: string | undefined, assetBasePath?: string): string | undefined {
  if (!image) return undefined;
  if (!image.startsWith('assets/')) return image;
  // Installed packages are served by the install store; the Preview Lab
  // overrides the base so uninstalled packages resolve from its own
  // authenticated, in-memory asset endpoint.
  const base = assetBasePath ?? `/api/theme-assets/${pkg.manifest.id}`;
  return `${base}/${encodeURIComponent(image)}`;
}

function Section({
  eyebrow,
  heading,
  intro,
  align = 'center',
  children,
}: {
  eyebrow?: string;
  heading?: string;
  intro?: string;
  align?: 'center' | 'left';
  children?: React.ReactNode;
}) {
  return (
    <section className="py-14 sm:py-20">
      <Container>
        {(eyebrow || heading) && (
          <div className={align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
            {eyebrow && <p className="text-xs font-bold uppercase tracking-[0.18em] t-text-accent">{eyebrow}</p>}
            {heading && <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{heading}</h2>}
            {intro && <p className="mt-3 leading-relaxed t-text-muted">{intro}</p>}
          </div>
        )}
        {children}
      </Container>
    </section>
  );
}

const renderBlockByVariant: VariantBlockRenderer = (block, variant, pkg, ctx, assetBasePath) => {
  const image = assetSrc(pkg, 'image' in block ? block.image : undefined, assetBasePath);
  switch (block.type) {
    case 'hero':
      if (variant === 'overlay') {
        return (
          <section className="relative flex min-h-[70vh] items-end overflow-hidden">
            <SmartImage src={image} alt={block.imageAlt ?? ''} eager className="absolute inset-0 h-full w-full" />
            <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/20" />
            <Container className="relative pb-16 pt-40">
              <div className="max-w-2xl">
                {block.eyebrow && (
                  <span className="rounded-full border border-white/40 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white backdrop-blur">
                    {block.eyebrow}
                  </span>
                )}
                <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight text-white sm:text-6xl">{block.title}</h1>
                {block.subtitle && <p className="mt-4 max-w-xl text-lg text-white/85">{block.subtitle}</p>}
                <div className="mt-8 flex flex-wrap gap-3">
                  {block.primaryCta && (
                    <Link href={block.primaryCta.href} className="t-btn t-bg-primary t-ring rounded-lg px-6 py-3 text-sm font-semibold">{block.primaryCta.label}</Link>
                  )}
                  {block.secondaryCta && (
                    <Link href={block.secondaryCta.href} className="t-ring rounded-lg border border-white/50 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10">{block.secondaryCta.label}</Link>
                  )}
                </div>
              </div>
            </Container>
          </section>
        );
      }
      if (variant === 'centered') {
        return (
          <Section>
            <div className="mx-auto max-w-3xl text-center">
              {block.eyebrow && <p className="text-xs font-bold uppercase tracking-[0.18em] t-text-accent">{block.eyebrow}</p>}
              <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-6xl">{block.title}</h1>
              {block.subtitle && <p className="mx-auto mt-5 max-w-xl text-lg t-text-muted">{block.subtitle}</p>}
              <div className="mt-8 flex justify-center gap-3">
                {block.primaryCta && <Link href={block.primaryCta.href} className="t-btn t-bg-primary t-ring rounded-lg px-6 py-3 text-sm font-semibold">{block.primaryCta.label}</Link>}
                {block.secondaryCta && <Link href={block.secondaryCta.href} className="t-btn t-btn-outline t-ring rounded-lg px-6 py-3 text-sm font-semibold">{block.secondaryCta.label}</Link>}
              </div>
              {image && <SmartImage src={image} alt={block.imageAlt ?? ''} eager className="mt-10 aspect-[16/7] w-full rounded-2xl" />}
            </div>
          </Section>
        );
      }
      // 'split' (default)
      return (
        <section className="py-16 sm:py-24">
          <Container>
            <div className="grid items-center gap-10 lg:grid-cols-2">
              <div>
                {block.eyebrow && <p className="text-xs font-bold uppercase tracking-[0.18em] t-text-accent">{block.eyebrow}</p>}
                <h1 className="mt-3 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">{block.title}</h1>
                {block.subtitle && <p className="mt-5 max-w-lg text-lg t-text-muted">{block.subtitle}</p>}
                <div className="mt-8 flex flex-wrap gap-3">
                  {block.primaryCta && <Link href={block.primaryCta.href} className="t-btn t-bg-primary t-ring rounded-lg px-6 py-3 text-sm font-semibold">{block.primaryCta.label}</Link>}
                  {block.secondaryCta && <Link href={block.secondaryCta.href} className="t-btn t-btn-outline t-ring rounded-lg px-6 py-3 text-sm font-semibold">{block.secondaryCta.label}</Link>}
                </div>
              </div>
              {image && (
                <SmartImage src={image} alt={block.imageAlt ?? ''} eager className="aspect-[4/3] w-full rounded-2xl shadow-xl" />
              )}
            </div>
          </Container>
        </section>
      );

    case 'intro':
      return (
        <Section>
          <div className="grid items-center gap-10 lg:grid-cols-2">
            {image && (
              <SmartImage src={image} alt={block.imageAlt ?? ''} className={`aspect-[4/3] w-full rounded-2xl ${block.reversed ? 'lg:order-2' : ''}`} />
            )}
            <div>
              {block.eyebrow && <p className="text-xs font-bold uppercase tracking-[0.18em] t-text-accent">{block.eyebrow}</p>}
              <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{block.heading}</h2>
              {block.body.map((p, i) => <p key={i} className="mt-4 leading-relaxed t-text-muted">{p}</p>)}
              {block.bullets && block.bullets.length > 0 && (
                <ul className="mt-6 space-y-2.5">
                  {block.bullets.map((b, i) => (
                    <li key={i} className="flex gap-2.5 text-sm">
                      <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 t-text-accent" strokeWidth={2.4} />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Section>
      );

    case 'features':
      if (variant === 'numbered') {
        return (
          <Section eyebrow={block.eyebrow} heading={block.heading} intro={block.intro}>
            <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {block.items.map((item, i) => (
                <div key={item.title} className="border-t-2 t-border-accent pt-5">
                  <span className="text-4xl font-bold t-text-accent">{String(i + 1).padStart(2, '0')}</span>
                  <h3 className="mt-3 text-lg font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed t-text-muted">{item.description}</p>
                </div>
              ))}
            </div>
          </Section>
        );
      }
      return (
        <Section eyebrow={block.eyebrow} heading={block.heading} intro={block.intro}>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {block.items.map((item) => (
              <div key={item.title} className="rounded-2xl border t-border p-6 transition hover:shadow-md">
                {item.icon && (
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl t-bg-primary">
                    <Icon name={item.icon} className="h-5 w-5" />
                  </span>
                )}
                <h3 className="mt-4 font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed t-text-muted">{item.description}</p>
              </div>
            ))}
          </div>
        </Section>
      );

    case 'cards':
      if (variant === 'overlay') {
        return (
          <Section eyebrow={block.eyebrow} heading={block.heading} intro={block.intro}>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {block.items.map((item) => {
                const inner = (
                  <>
                    <SmartImage src={assetSrc(pkg, item.image, assetBasePath)} alt={item.imageAlt ?? item.title} className="absolute inset-0 h-full w-full transition-transform duration-700 group-hover:scale-105" />
                    <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
                    {item.tag && <span className="absolute right-4 top-4 rounded-full t-bg-primary px-3 py-1 text-xs font-bold">{item.tag}</span>}
                    <div className="relative mt-auto p-5 text-white">
                      <h3 className="text-lg font-bold">{item.title}</h3>
                      {item.description && <p className="mt-1 line-clamp-2 text-sm text-white/85">{item.description}</p>}
                      {item.meta && item.meta.length > 0 && <p className="mt-2 text-xs uppercase tracking-wider text-white/75">{item.meta.join(' · ')}</p>}
                    </div>
                  </>
                );
                return item.href ? (
                  <Link key={item.title} href={item.href} className="group relative flex aspect-[3/4] flex-col overflow-hidden rounded-2xl t-ring">{inner}</Link>
                ) : (
                  <div key={item.title} className="group relative flex aspect-[3/4] flex-col overflow-hidden rounded-2xl">{inner}</div>
                );
              })}
            </div>
          </Section>
        );
      }
      if (variant === 'minimal') {
        return (
          <Section eyebrow={block.eyebrow} heading={block.heading} intro={block.intro}>
            <div className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {block.items.map((item) => (
                <div key={item.title} className="border-b t-border pb-6">
                  {item.image && <SmartImage src={assetSrc(pkg, item.image, assetBasePath)} alt={item.imageAlt ?? item.title} className="aspect-[4/3] w-full rounded-lg" />}
                  <h3 className="mt-3 text-lg font-semibold">{item.title}</h3>
                  {item.description && <p className="mt-1.5 text-sm t-text-muted">{item.description}</p>}
                </div>
              ))}
            </div>
          </Section>
        );
      }
      // 'stacked' default
      return (
        <Section eyebrow={block.eyebrow} heading={block.heading} intro={block.intro}>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {block.items.map((item) => {
              const inner = (
                <>
                  {item.image && <SmartImage src={assetSrc(pkg, item.image, assetBasePath)} alt={item.imageAlt ?? item.title} className="aspect-[4/3] w-full" />}
                  <div className="p-5">
                    {item.tag && <span className="t-bg-accent-soft t-text-accent rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide">{item.tag}</span>}
                    <h3 className="mt-2 text-lg font-semibold">{item.title}</h3>
                    {item.description && <p className="mt-1.5 text-sm t-text-muted">{item.description}</p>}
                    {item.meta && item.meta.length > 0 && <p className="mt-2.5 text-xs font-semibold uppercase tracking-wider t-text-muted">{item.meta.join(' · ')}</p>}
                  </div>
                </>
              );
              const cls = 'group block overflow-hidden rounded-2xl border t-border bg-[var(--c-bg)] transition hover:shadow-lg t-ring';
              return item.href ? <Link key={item.title} href={item.href} className={cls}>{inner}</Link> : <div key={item.title} className={cls}>{inner}</div>;
            })}
          </div>
        </Section>
      );

    case 'stats':
      if (variant === 'columns') {
        return (
          <Section>
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {block.items.map((item) => (
                <div key={item.label} className="border-l-2 t-border-accent pl-4">
                  <p className="text-4xl font-bold tracking-tight t-text-primary">{item.value}</p>
                  <p className="mt-1 text-sm t-text-muted">{item.label}</p>
                </div>
              ))}
            </div>
          </Section>
        );
      }
      // 'band'
      return (
        <section className="t-bg-dark">
          <Container className="grid grid-cols-2 gap-8 py-14 lg:grid-cols-4">
            {block.items.map((item) => (
              <div key={item.label} className="text-center">
                <p className="text-4xl font-bold tracking-tight text-white">{item.value}</p>
                <p className="mt-1.5 text-sm text-[var(--c-dark-fg)]/75">{item.label}</p>
              </div>
            ))}
          </Container>
        </section>
      );

    case 'testimonials':
      return (
        <Section eyebrow={block.eyebrow} heading={block.heading}>
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {block.items.map((item) => (
              <figure key={item.author} className="flex flex-col rounded-2xl border t-border bg-[var(--c-bg)] p-6 shadow-sm">
                <span aria-hidden="true" className="text-4xl font-bold leading-none t-text-accent">&ldquo;</span>
                <blockquote className="mt-3 flex-1 leading-relaxed">{item.quote}</blockquote>
                <figcaption className="mt-5 flex items-center gap-3 border-t t-border pt-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full t-bg-primary text-xs font-bold">{item.initials}</span>
                  <div>
                    <p className="text-sm font-semibold">{item.author}</p>
                    {item.role && <p className="text-xs t-text-muted">{item.role}</p>}
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </Section>
      );

    case 'richtext':
      return (
        <Section>
          <div className="mx-auto max-w-2xl">
            {block.eyebrow && <p className="text-xs font-bold uppercase tracking-[0.18em] t-text-accent">{block.eyebrow}</p>}
            {block.heading && <h2 className="mt-2 text-3xl font-bold tracking-tight">{block.heading}</h2>}
            <div className="mt-5 space-y-5">
              {block.paragraphs.map((p, i) => <p key={i} className="leading-relaxed t-text-muted">{p}</p>)}
            </div>
          </div>
        </Section>
      );

    case 'logos':
      return (
        <section className="border-y t-border">
          <Container className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 py-8">
            {block.heading && <p className="text-xs font-semibold uppercase tracking-[0.18em] t-text-muted">{block.heading}</p>}
            {block.items.map((item) => <span key={item} className="text-lg font-bold text-[var(--c-fg)]/35">{item}</span>)}
          </Container>
        </section>
      );

    case 'cta':
      if (variant === 'banner') {
        return (
          <section className="t-bg-primary">
            <Container className="flex flex-wrap items-center justify-between gap-4 py-10">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">{block.heading}</h2>
                {block.body && <p className="mt-1 t-text-muted" style={{ color: 'var(--c-primary-fg)', opacity: 0.85 }}>{block.body}</p>}
              </div>
              <Link href={block.buttonHref} className="t-ring rounded-lg px-6 py-3 text-sm font-bold" style={{ backgroundColor: 'var(--c-bg)', color: 'var(--c-fg)' }}>
                {block.buttonLabel}
              </Link>
            </Container>
          </section>
        );
      }
      // 'panel' default
      return (
        <Section>
          <div className="t-bg-primary rounded-2xl p-8 text-center sm:p-14">
            <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight">{block.heading}</h2>
            {block.body && <p className="mx-auto mt-4 max-w-lg" style={{ color: 'var(--c-primary-fg)', opacity: 0.9 }}>{block.body}</p>}
            <Link href={block.buttonHref} className="t-ring mt-8 inline-flex rounded-lg px-7 py-3 text-sm font-bold" style={{ backgroundColor: 'var(--c-bg)', color: 'var(--c-fg)' }}>
              {block.buttonLabel}
            </Link>
          </div>
        </Section>
      );

    case 'contact':
      return (
        <Section>
          <div className="mx-auto grid max-w-3xl gap-8 rounded-2xl border t-border p-8 sm:grid-cols-2 sm:p-10">
            <div>
              {block.heading && <h2 className="text-2xl font-bold tracking-tight">{block.heading}</h2>}
              {block.body?.map((p, i) => <p key={i} className="mt-3 leading-relaxed t-text-muted">{p}</p>)}
            </div>
            <dl className="space-y-3">
              {[block.email, block.phone, block.address, block.hours].filter(Boolean).map((value) => (
                <div key={value} className="rounded-lg t-bg-muted px-4 py-3 text-sm font-medium">{value}</div>
              ))}
            </dl>
          </div>
        </Section>
      );

    case 'postlist': {
      // Dynamic slot: renders the site's own posts through the variant style.
      void ctx;
      return null; // handled by the template renderer (needs posts prop)
    }
  }
};

/* ------------------------------ template renderer ---------------------------- */

function renderSections(
  template: PackageTemplate,
  pkg: ValidatedThemePackage,
  ctx: SiteContext,
  cmsBlocks: Block[],
  posts?: Post[],
  categories?: CategoryWithCount[],
  page?: Page,
  assetBasePath?: string,
): React.ReactNode {
  const width = template.options.containerWidth === 'narrow' ? 'max-w-3xl' : template.options.containerWidth === 'wide' ? 'max-w-7xl' : 'max-w-6xl';

  return template.sections.map((section, index) => {
    if (section.type === 'content') {
      return (
        <div key={`content-${index}`}>
          {page && template.contentHeader?.style !== 'none' && (
            <section className="border-b t-border t-bg-muted">
              <Container className="py-12">
                {template.contentHeader?.showEyebrow && page.eyebrow && (
                  <p className="text-xs font-bold uppercase tracking-[0.18em] t-text-accent">{page.eyebrow}</p>
                )}
                <h1 className="mt-2 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">{page.title}</h1>
              </Container>
            </section>
          )}
          <Container className={`${width} py-10`}>
            {cmsBlocks.length === 0 ? (
              <p className="py-12 text-center t-text-muted">No content has been published here yet.</p>
            ) : (
              cmsBlocks.map((block, i) =>
                block.type === 'postlist' ? (
                  <PostListView key={i} block={block} posts={posts} template={template} />
                ) : (
                  <div key={i}>{renderBlockByVariant(block, 'split', pkg, ctx, assetBasePath)}</div>
                ),
              )
            )}
          </Container>
        </div>
      );
    }

    const block = section.block as Block;
    if (block.type === 'postlist') {
      return <div key={`s-${index}`}><PostListView block={block} posts={posts} template={template} /></div>;
    }
    return <div key={`s-${index}`}>{renderBlockByVariant(block, section.variant ?? 'split', pkg, ctx, assetBasePath)}</div>;
  });
}

function PostListView({
  block,
  posts,
  template,
}: {
  block: Extract<Block, { type: 'postlist' }>;
  posts?: Post[];
  pkg?: ValidatedThemePackage;
  template: PackageTemplate;
}) {
  const resolved = (posts ?? []).slice(0, block.limit ?? posts?.length ?? 0);
  const featuredFirst = template.options.postListFeaturedFirst && resolved.length > 0;
  const ordered = featuredFirst ? [resolved[0]!, ...resolved.slice(1)] : resolved;

  if (resolved.length === 0) {
    return <p className="py-10 text-center t-text-muted">No articles yet.</p>;
  }

  return (
    <section className="py-6">
      <div className="flex items-baseline justify-between border-b-2 t-border pb-3">
        <h2 className="text-2xl font-bold tracking-tight">{block.heading}</h2>
        <Link href="/posts" className="text-sm font-semibold t-text-primary hover:underline">View all →</Link>
      </div>
      <div className={template.options.postListLayout === 'list' ? 'divide-y t-border' : 'mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3'}>
        {ordered.map((post, index) => {
          const featured = featuredFirst && index === 0;
          return (
            <Link
              key={post.slug}
              href={`/posts/${post.slug}`}
              className={`group t-ring rounded-xl ${template.options.postListLayout === 'list' ? 'grid gap-4 py-6 sm:grid-cols-[1fr_auto]' : featured ? 'sm:col-span-2 lg:col-span-3 lg:grid-cols-2 lg:items-center' : 'flex flex-col'}`}
            >
              {post.coverImage && (
                <SmartImage
                  src={post.coverImage}
                  alt={post.coverAlt ?? post.title}
                  className={`rounded-xl ${template.options.postListLayout === 'list' ? 'hidden aspect-[16/10] w-56 sm:block' : featured ? 'aspect-[16/9] w-full' : 'aspect-[16/10] w-full'}`}
                />
              )}
              <div className={template.options.postListLayout === 'list' || featured ? '' : 'pt-4'}>
                <p className="text-xs font-semibold uppercase tracking-wider t-text-muted">
                  {formatDate(post.publishedAt)} · {post.readingMinutes} min read
                </p>
                <h3 className={`mt-1.5 font-bold leading-snug tracking-tight group-hover:t-text-primary ${featured ? 'text-3xl' : 'text-xl'}`}>
                  {post.title}
                </h3>
                <p className="mt-2 line-clamp-2 text-sm t-text-muted">{post.excerpt}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

/* --------------------------- ThemeDefinition bridge ------------------------- */

function ThemeScopedStyle({ pkg }: { pkg: ValidatedThemePackage }) {
  if (!pkg.css) return null;
  return <style dangerouslySetInnerHTML={{ __html: pkg.css }} />;
}

export interface PackageThemeOptions {
  /** Base URL that resolves `assets/…` references (defaults to the installed-package route). */
  assetBasePath?: string;
}

export function packageThemeDefinition(pkg: ValidatedThemePackage, options?: PackageThemeOptions): ThemeDefinition {
  const { manifest, templates } = pkg;
  const assetBasePath = options?.assetBasePath;
  const layout = manifest.layout;
  const headingClass = FONT_CLASS[layout.typography.headingFont] ?? 'font-sans';
  const bodyClass = FONT_CLASS[layout.typography.bodyFont] ?? 'font-sans';
  const scopeClass = `msp-theme-${manifest.id}`;

  const shell = (ctx: SiteContext, children: React.ReactNode) => (
    <div style={themeVars(ctx.settings.colors)} className={`t-bg-page flex min-h-screen flex-col ${bodyClass} ${scopeClass}`}>
      <ThemeScopedStyle pkg={pkg} />
      <PackageHeader ctx={ctx} pkg={pkg} />
      <main className={`flex-1 ${headingClass}`}>{children}</main>
      <PackageFooter ctx={ctx} pkg={pkg} />
    </div>
  );

  const withSections = (
    route: RequiredTemplate,
    ctx: SiteContext,
    cmsBlocks: Block[],
    posts?: Post[],
    categories?: CategoryWithCount[],
    page?: Page,
  ) => shell(ctx, renderSections(templates[route], pkg, ctx, cmsBlocks, posts, categories, page, assetBasePath));

  return {
    id: `${manifest.id}`,
    name: manifest.name,
    description: manifest.description,
    version: manifest.version,
    supportsPosts: true,

    layout: ({ ctx, children }) => shell(ctx, children),

    home: ({ ctx, page, posts, categories }) =>
      withSections('home', ctx, page.blocks, posts, categories, page),

    page: ({ ctx, page, posts, categories }) =>
      withSections('page', ctx, page.blocks, posts, categories, page),

    postList: ({ ctx, posts, categories, activeCategory }) =>
      shell(
        ctx,
        <>
          <section className="border-b t-border t-bg-muted">
            <Container className="py-14">
              <p className="text-xs font-bold uppercase tracking-[0.18em] t-text-accent">
                {activeCategory ? `Category · ${activeCategory}` : 'All articles'}
              </p>
              <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">
                {activeCategory ? categories.find((c) => c.slug === activeCategory)?.name ?? activeCategory : 'Latest articles'}
              </h1>
              {categories.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-2">
                  <Link href="/posts" className={`t-ring rounded-full border px-4 py-1.5 text-sm ${!activeCategory ? 't-bg-primary' : 't-btn-outline'}`}>All</Link>
                  {categories.map((category) => (
                    <Link
                      key={category.id}
                      href={`/posts?category=${category.slug}`}
                      className={`t-ring rounded-full border px-4 py-1.5 text-sm ${activeCategory === category.slug ? 't-bg-primary' : 't-btn-outline'}`}
                    >
                      {category.name} <span className="opacity-60">{category.postCount}</span>
                    </Link>
                  ))}
                </div>
              )}
            </Container>
          </section>
          <Container className="py-12">
            {posts.length === 0 ? (
              <p className="py-12 text-center t-text-muted">Nothing published here yet.</p>
            ) : (
              <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {posts.map((post) => (
                  <Link key={post.slug} href={`/posts/${post.slug}`} className="group t-ring rounded-xl">
                    {post.coverImage && (
                      <SmartImage src={post.coverImage} alt={post.coverAlt ?? post.title} className="aspect-[16/10] w-full rounded-xl" />
                    )}
                    <div className="pt-4">
                      <p className="text-xs font-semibold uppercase tracking-wider t-text-muted">
                        {formatDate(post.publishedAt)} · {post.readingMinutes} min
                      </p>
                      <h2 className="mt-1.5 text-xl font-bold tracking-tight group-hover:t-text-primary">{post.title}</h2>
                      <p className="mt-2 line-clamp-2 text-sm t-text-muted">{post.excerpt}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Container>
        </>,
      ),

    post: ({ ctx, post, related }) =>
      shell(
        ctx,
        <article className="py-14">
          <Container>
            <div className="mx-auto max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] t-text-accent">Article</p>
              <h1 className="mt-3 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">{post.title}</h1>
              <p className="mt-4 text-lg t-text-muted">{post.excerpt}</p>
              <div className="mt-6 flex items-center gap-3 border-y t-border py-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full t-bg-dark text-xs font-bold">{post.author.initials}</span>
                <div>
                  <p className="text-sm font-semibold">{post.author.name}</p>
                  <p className="text-xs t-text-muted">{post.author.role ? `${post.author.role} · ` : ''}{formatDate(post.publishedAt)} · {post.readingMinutes} min read</p>
                </div>
              </div>
            </div>
            {templates.post.options.postShowCover !== false && post.coverImage && (
              <SmartImage src={post.coverImage} alt={post.coverAlt ?? post.title} eager className="mx-auto mt-8 aspect-[16/8] w-full max-w-4xl rounded-2xl" />
            )}
            <div className="mx-auto mt-10 max-w-2xl space-y-6">
              {post.body.map((p, i) => <p key={i} className="text-[17px] leading-8">{p}</p>)}
            </div>
            {templates.post.options.postShowAuthorCard && (
              <div className="mx-auto mt-10 max-w-2xl border t-border rounded-xl p-5">
                <p className="text-xs font-bold uppercase tracking-wider t-text-muted">About the author</p>
                <div className="mt-3 flex items-start gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full t-bg-dark text-sm font-bold">{post.author.initials}</span>
                  <div>
                    <p className="font-semibold">{post.author.name}</p>
                    {post.author.role && <p className="text-xs uppercase tracking-wide t-text-muted">{post.author.role}</p>}
                    {post.author.bio && <p className="mt-2 text-sm t-text-muted">{post.author.bio}</p>}
                  </div>
                </div>
              </div>
            )}
          </Container>
          {related.length > 0 && (
            <Container className="mt-8">
              <div className="mx-auto max-w-4xl">
                <h2 className="border-b-2 t-border pb-3 text-2xl font-bold tracking-tight">More articles</h2>
                <div className="mt-6 grid gap-8 sm:grid-cols-3">
                  {related.map((rel) => (
                    <Link key={rel.slug} href={`/posts/${rel.slug}`} className="group t-ring rounded-lg">
                      <p className="text-xs t-text-muted">{formatDate(rel.publishedAt)}</p>
                      <h3 className="mt-1 font-semibold leading-snug group-hover:t-text-primary">{rel.title}</h3>
                    </Link>
                  ))}
                </div>
              </div>
            </Container>
          )}
        </article>,
      ),

    categories: ({ ctx, categories: cats }) =>
      shell(
        ctx,
        <Container className="py-16">
          <p className="text-xs font-bold uppercase tracking-[0.18em] t-text-accent">Browse</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight">Categories</h1>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cats.map((category) => (
              <Link key={category.id} href={`/posts?category=${category.slug}`} className="t-ring rounded-xl border t-border p-5 transition hover:shadow-md">
                <h2 className="text-xl font-semibold group-hover:t-text-primary">{category.name}</h2>
                <p className="mt-1 text-sm t-text-muted">{category.postCount} {category.postCount === 1 ? 'article' : 'articles'}</p>
              </Link>
            ))}
          </div>
        </Container>,
      ),

    notFound: ({ ctx }) =>
      shell(
        ctx,
        <Container className="py-28 text-center">
          <p className="text-sm font-bold uppercase tracking-[0.18em] t-text-accent">404</p>
          <h1 className="mt-3 text-5xl font-bold tracking-tight">Page not found</h1>
          <p className="mx-auto mt-4 max-w-md t-text-muted">The page you are looking for does not exist or has been moved.</p>
          <Link href="/" className="t-btn t-bg-primary t-ring mt-8 inline-flex rounded-lg px-6 py-3 text-sm font-semibold">Back to home</Link>
        </Container>,
      ),
  };
}
