import Link from 'next/link';
import { Container } from '@/components/shared/Container';
import { NavLink } from '@/components/shared/NavLink';
import type { SiteContext, ThemeLayoutProps } from '@/platform/types';
import { themeVars } from '../themeVars';

/**
 * Business theme — chrome (header/footer).
 * Professional corporate layout: sticky light header, dark footer.
 */

function Logo({ ctx }: { ctx: SiteContext }) {
  const { identity } = ctx.settings;
  return (
    <Link href="/" className="flex items-center gap-2.5 t-ring rounded-md">
      <span className="flex h-9 w-9 items-center justify-center rounded-md t-bg-primary text-sm font-bold tracking-tight">
        {identity.logoInitials}
      </span>
      <span className="text-lg font-bold tracking-tight">{identity.logoText}</span>
    </Link>
  );
}

function Header({ ctx }: { ctx: SiteContext }) {
  const { nav } = ctx.settings;
  return (
    <header className="sticky top-0 z-40 border-b t-border bg-[var(--c-bg)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--c-bg)]/85">
      <Container>
        <div className="flex h-16 items-center justify-between gap-4">
          <Logo ctx={ctx} />

          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            {nav.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                className="rounded-md px-3 py-2 text-sm font-medium t-text-muted transition-colors hover:text-[var(--c-fg)] hover:bg-[var(--c-muted)]"
                activeClassName="text-[var(--c-primary)] bg-[var(--c-muted)]"
              />
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/contact"
              className="hidden t-btn t-bg-primary t-ring rounded-md px-4 py-2 text-sm font-semibold sm:inline-flex"
            >
              Book a consultation
            </Link>

            {/* Mobile navigation: no JS needed */}
            <details className="relative md:hidden">
              <summary
                className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-md border t-border [&::-webkit-details-marker]:hidden"
                aria-label="Open menu"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M4 7h16M4 12h16M4 17h16" />
                </svg>
              </summary>
              <div className="absolute right-0 top-12 z-50 w-60 rounded-xl border t-border bg-[var(--c-bg)] p-2 shadow-xl">
                {nav.map((item) => (
                  <NavLink
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    className="block rounded-lg px-3 py-2.5 text-sm font-medium t-text-muted hover:bg-[var(--c-muted)] hover:text-[var(--c-fg)]"
                    activeClassName="text-[var(--c-primary)] bg-[var(--c-muted)]"
                  />
                ))}
              </div>
            </details>
          </div>
        </div>
      </Container>
    </header>
  );
}

function Footer({ ctx }: { ctx: SiteContext }) {
  const { identity, footerNav, colors } = ctx.settings;
  return (
    <footer className="t-bg-dark mt-auto">
      <Container className="py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-md text-sm font-bold" style={{ backgroundColor: colors.primary, color: colors.primaryForeground }}>
                {identity.logoInitials}
              </span>
              <span className="text-lg font-bold tracking-tight text-white">{identity.logoText}</span>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-[var(--c-dark-fg)]/80">
              {identity.tagline}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--c-dark-fg)]/60">Company</h3>
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
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--c-dark-fg)]/60">Contact</h3>
            <ul className="mt-4 space-y-2.5 text-sm text-[var(--c-dark-fg)]/90">
              <li>hello@meridian-consulting.example</li>
              <li>+1 (555) 014-2280</li>
              <li>San Francisco · Austin · Toronto</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-[var(--c-dark-fg)]/60 sm:flex-row">
          <p>© {new Date().getFullYear()} {identity.name}. All rights reserved.</p>
          <p>
            Served by the shared platform · theme: <span className="text-[var(--c-dark-fg)]/85">Business</span>
          </p>
        </div>
      </Container>
    </footer>
  );
}

export function BusinessLayout({ ctx, children }: ThemeLayoutProps) {
  return (
    <div style={themeVars(ctx.settings.colors)} className="t-bg-page flex min-h-screen flex-col font-sans">
      <Header ctx={ctx} />
      <main className="flex-1">{children}</main>
      <Footer ctx={ctx} />
    </div>
  );
}
