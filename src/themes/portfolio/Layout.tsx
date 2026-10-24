import Link from 'next/link';
import { Container } from '@/components/shared/Container';
import { NavLink } from '@/components/shared/NavLink';
import type { ThemeLayoutProps } from '@/platform/types';
import { themeVars } from '../themeVars';

/**
 * Portfolio theme — chrome.
 * Quiet editorial frame: small monogram, uppercase micro-nav, hairline
 * rules, and a whisper-quiet footer. The work is the decoration.
 */

export function PortfolioLayout({ ctx, children }: ThemeLayoutProps) {
  const { identity, nav, footerNav } = ctx.settings;
  return (
    <div style={themeVars(ctx.settings.colors)} className="t-bg-page flex min-h-screen flex-col font-sans">
      <header className="border-b border-[color-mix(in_srgb,var(--c-border)_70%,transparent)]">
        <Container>
          <div className="flex h-20 items-center justify-between gap-6">
            <Link href="/" className="flex items-center gap-2.5 t-ring rounded-sm">
              <span className="border border-[var(--c-fg)] px-2 py-1 text-xs font-bold tracking-[0.2em]">
                {identity.logoInitials}
              </span>
              <span className="font-serif text-lg font-semibold tracking-tight">{identity.logoText}</span>
            </Link>

            <nav className="hidden items-center gap-8 md:flex" aria-label="Main">
              {nav.map((item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  className="text-[11px] font-semibold uppercase tracking-[0.22em] t-text-muted transition-colors hover:text-[var(--c-fg)]"
                  activeClassName="!text-[var(--c-fg)] underline underline-offset-8"
                />
              ))}
            </nav>

            <details className="relative md:hidden">
              <summary
                className="flex h-10 w-10 cursor-pointer list-none items-center justify-center border border-[var(--c-border)] t-ring [&::-webkit-details-marker]:hidden"
                aria-label="Open menu"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M4 8h16M4 16h16" />
                </svg>
              </summary>
              <div className="absolute right-0 top-12 z-50 w-56 border border-[var(--c-border)] bg-[var(--c-bg)] p-2 shadow-xl">
                {nav.map((item) => (
                  <NavLink
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    className="block px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] t-text-muted hover:text-[var(--c-fg)]"
                    activeClassName="!text-[var(--c-fg)]"
                  />
                ))}
              </div>
            </details>
          </div>
        </Container>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-[var(--c-border)]">
        <Container className="py-12">
          <div className="flex flex-col justify-between gap-8 sm:flex-row sm:items-end">
            <div>
              <p className="font-serif text-2xl font-semibold tracking-tight">{identity.logoText}</p>
              <p className="mt-1 max-w-xs text-sm leading-relaxed t-text-muted">{identity.tagline}</p>
            </div>
            <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2">
              {footerNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-[11px] font-semibold uppercase tracking-[0.2em] t-text-muted transition-colors hover:text-[var(--c-fg)]"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="mt-10 flex flex-col justify-between gap-2 border-t border-[color-mix(in_srgb,var(--c-border)_60%,transparent)] pt-5 text-xs t-text-muted sm:flex-row">
            <p>© {new Date().getFullYear()} {identity.name}</p>
            <p>
              Served by the shared platform · theme: <span className="font-medium">Portfolio</span>
            </p>
          </div>
        </Container>
      </footer>
    </div>
  );
}
