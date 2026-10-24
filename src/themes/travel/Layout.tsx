import Link from 'next/link';
import { Container } from '@/components/shared/Container';
import { NavLink } from '@/components/shared/NavLink';
import { getRequestPath } from '@/platform/resolve';
import type { SiteContext, ThemeLayoutProps } from '@/platform/types';
import { themeVars } from '../themeVars';

/**
 * Travel theme — chrome.
 * On the homepage the header floats transparently over the full-bleed hero;
 * on inner pages it is a solid sticky warm-cream bar. Footer is deep teal.
 */

function Logo({ ctx, overlay }: { ctx: SiteContext; overlay?: boolean }) {
  const { identity } = ctx.settings;
  return (
    <Link href="/" className={`flex items-center gap-2.5 t-ring rounded-full ${overlay ? 'text-white' : ''}`}>
      <span
        className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold"
        style={{ backgroundColor: 'var(--c-primary)', color: 'var(--c-primary-fg)' }}
      >
        {identity.logoInitials}
      </span>
      <span className="font-serif text-xl font-bold tracking-tight">{identity.logoText}</span>
    </Link>
  );
}

function HeaderContent({ ctx, overlay }: { ctx: SiteContext; overlay: boolean }) {
  const { nav } = ctx.settings;
  return (
    <Container>
      <div className="flex h-20 items-center justify-between gap-4">
        <Logo ctx={ctx} overlay={overlay} />

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {nav.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              className={
                overlay
                  ? 'rounded-full px-4 py-2 text-sm font-medium text-white/85 transition hover:bg-white/15 hover:text-white'
                  : 'rounded-full px-4 py-2 text-sm font-medium t-text-muted transition hover:bg-[var(--c-muted)] hover:text-[var(--c-fg)]'
              }
              activeClassName={
                overlay
                  ? '!bg-white/20 !text-white'
                  : '!bg-[var(--c-muted)] !text-[var(--c-primary)]'
              }
            />
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/contact"
            className="hidden t-btn t-bg-primary t-ring rounded-full px-5 py-2.5 text-sm font-semibold sm:inline-flex"
          >
            Plan my trip
          </Link>

          <details className="relative md:hidden">
            <summary
              className={`flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-full border [&::-webkit-details-marker]:hidden ${
                overlay ? 'border-white/40 text-white' : 't-border'
              }`}
              aria-label="Open menu"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </summary>
            <div className="absolute right-0 top-12 z-50 w-60 rounded-2xl border t-border bg-[var(--c-bg)] p-2 shadow-2xl">
              {nav.map((item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  className="block rounded-xl px-3 py-2.5 text-sm font-medium t-text-muted hover:bg-[var(--c-muted)] hover:text-[var(--c-fg)]"
                  activeClassName="!bg-[var(--c-muted)] !text-[var(--c-primary)]"
                />
              ))}
            </div>
          </details>
        </div>
      </div>
    </Container>
  );
}

function Footer({ ctx }: { ctx: SiteContext }) {
  const { identity, footerNav } = ctx.settings;
  return (
    <footer className="t-bg-dark mt-auto">
      <Container className="py-16">
        <div className="grid gap-12 md:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <p className="font-serif text-3xl font-bold tracking-tight text-white">{identity.logoText}</p>
            <p className="mt-1 text-sm italic text-[var(--c-dark-fg)]/70">{identity.tagline}</p>
            <p className="mt-6 max-w-sm text-sm leading-relaxed text-[var(--c-dark-fg)]/75">
              Hand-built routes, trusted local guides, and groups of twelve travelers max. Scout-first,
              always.
            </p>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--c-dark-fg)]/55">Explore</h3>
            <ul className="mt-4 space-y-2.5">
              {footerNav.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-sm text-[var(--c-dark-fg)]/90 transition-colors hover:text-white">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--c-dark-fg)]/55">Say hello</h3>
            <ul className="mt-4 space-y-2.5 text-sm text-[var(--c-dark-fg)]/90">
              <li>hello@wayfare-travel.example</li>
              <li>Portland, Maine</li>
              <li>Mon–Sat, 9:00–17:00 ET</li>
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-[var(--c-dark-fg)]/55 sm:flex-row">
          <p>© {new Date().getFullYear()} {identity.name}. Travel changes people.</p>
          <p>
            Served by the shared platform · theme: <span className="text-[var(--c-dark-fg)]/85">Travel</span>
          </p>
        </div>
      </Container>
    </footer>
  );
}

export async function TravelLayout({ ctx, children }: ThemeLayoutProps) {
  const path = await getRequestPath();
  const overlayHeader = path === '/';

  return (
    <div style={themeVars(ctx.settings.colors)} className="t-bg-page relative flex min-h-screen flex-col font-sans">
      {overlayHeader ? (
        // Soft scrim keeps the white header text readable even when the
        // homepage below it has no full-bleed hero (e.g. after theme switch).
        <header className="absolute inset-x-0 top-0 z-40 bg-gradient-to-b from-black/45 to-transparent">
          <HeaderContent ctx={ctx} overlay />
        </header>
      ) : (
        <header className="sticky top-0 z-40 border-b t-border bg-[var(--c-bg)]/95 backdrop-blur">
          <HeaderContent ctx={ctx} overlay={false} />
        </header>
      )}
      <main className="flex-1">{children}</main>
      <Footer ctx={ctx} />
    </div>
  );
}
