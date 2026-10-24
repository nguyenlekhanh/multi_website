import Link from 'next/link';
import { Container } from '@/components/shared/Container';
import { NavLink } from '@/components/shared/NavLink';
import type { SiteContext, ThemeLayoutProps } from '@/platform/types';
import { themeVars } from '../themeVars';

/**
 * Blog theme — chrome.
 * Editorial masthead: thin top rule, centered serif logotype, small-caps
 * navigation, generous whitespace. Static (non-sticky) like a newspaper.
 */

function Masthead({ ctx }: { ctx: SiteContext }) {
  const { identity, nav } = ctx.settings;
  return (
    <header className="border-t-4 border-t-[var(--c-fg)] bg-[var(--c-bg)]">
      <Container className="pt-6 pb-5">
        <p className="text-center text-xs uppercase tracking-[0.22em] t-text-muted">{identity.tagline}</p>
        <div className="mt-3 text-center">
          <Link href="/" className="font-serif text-4xl font-bold tracking-tight sm:text-5xl t-ring rounded-sm">
            {identity.logoText}
            <span className="t-text-primary">.</span>
          </Link>
        </div>
        <nav className="mt-5 flex flex-wrap items-center justify-center gap-x-7 gap-y-2 border-y t-border py-3" aria-label="Main">
          {nav.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              className="text-xs font-semibold uppercase tracking-[0.18em] t-text-muted transition-colors hover:text-[var(--c-fg)]"
              activeClassName="!text-[var(--c-primary)]"
            />
          ))}
        </nav>
      </Container>
    </header>
  );
}

function Footer({ ctx }: { ctx: SiteContext }) {
  const { identity, footerNav } = ctx.settings;
  return (
    <footer className="t-bg-dark mt-auto">
      <Container className="py-12 text-center">
        <p className="font-serif text-2xl font-bold tracking-tight text-white">
          {identity.logoText}
          <span className="t-text-accent">.</span>
        </p>
        <p className="mt-2 text-sm italic text-[var(--c-dark-fg)]/70">{identity.tagline}</p>
        <nav className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2" aria-label="Footer">
          {footerNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--c-dark-fg)]/80 transition-colors hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-8 border-t border-white/10 pt-5 text-xs text-[var(--c-dark-fg)]/55">
          <p>© {new Date().getFullYear()} {identity.name}. All essays remain the property of their authors.</p>
          <p className="mt-1">
            Served by the shared platform · theme: <span className="text-[var(--c-dark-fg)]/85">Blog</span>
          </p>
        </div>
      </Container>
    </footer>
  );
}

export function BlogLayout({ ctx, children }: ThemeLayoutProps) {
  return (
    <div style={themeVars(ctx.settings.colors)} className="t-bg-page flex min-h-screen flex-col">
      <Masthead ctx={ctx} />
      <main className="flex-1">{children}</main>
      <Footer ctx={ctx} />
    </div>
  );
}
