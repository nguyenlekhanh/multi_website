import Link from 'next/link';
import { Container } from '@/components/shared/Container';
import { NavLink } from '@/components/shared/NavLink';
import type { ThemeLayoutProps } from '@/platform/types';
import { themeVars } from '../themeVars';

/**
 * Agency theme — chrome.
 * Print-brutalist frame: thick borders, hard offset shadows, uppercase
 * display type, and an accent-striped top bar.
 */

export function AgencyLayout({ ctx, children }: ThemeLayoutProps) {
  const { identity, nav, footerNav } = ctx.settings;
  return (
    <div style={themeVars(ctx.settings.colors)} className="t-bg-page flex min-h-screen flex-col font-sans">
      <div aria-hidden="true" className="h-2.5 w-full t-bg-accent" />
      <header className="border-b-2 border-b-[var(--c-fg)]">
        <Container>
          <div className="flex h-[76px] items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-3 t-ring">
              <span className="t-bg-primary px-2.5 py-1.5 text-sm font-black text-[var(--c-primary-fg)]">
                {identity.logoInitials}
              </span>
              <span className="text-xl font-black uppercase tracking-tight">{identity.logoText}</span>
            </Link>

            <nav className="hidden items-center gap-6 lg:flex" aria-label="Main">
              {nav.map((item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  className="text-sm font-bold uppercase tracking-wide t-text-muted transition-colors hover:text-[var(--c-fg)]"
                  activeClassName="!text-[var(--c-fg)] underline decoration-[var(--c-accent)] decoration-4 underline-offset-8"
                />
              ))}
            </nav>

            <Link
              href="/contact"
              className="hidden t-ring t-bg-primary border-2 border-[var(--c-fg)] px-4 py-2 text-sm font-black uppercase tracking-wide text-[var(--c-primary-fg)] shadow-[4px_4px_0_var(--c-fg)] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_var(--c-fg)] lg:inline-flex"
            >
              Start a project
            </Link>

            <details className="relative lg:hidden">
              <summary
                className="flex h-10 w-10 cursor-pointer list-none items-center justify-center border-2 border-[var(--c-fg)] t-ring shadow-[3px_3px_0_var(--c-fg)] [&::-webkit-details-marker]:hidden"
                aria-label="Open menu"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M4 7h16M4 12h16M4 17h16" />
                </svg>
              </summary>
              <div className="absolute right-0 top-13 z-50 w-60 border-2 border-[var(--c-fg)] bg-[var(--c-bg)] p-2 shadow-[6px_6px_0_var(--c-fg)]">
                {nav.map((item) => (
                  <NavLink
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    className="block px-3 py-2.5 text-sm font-bold uppercase tracking-wide t-text-muted hover:bg-[var(--c-muted)] hover:text-[var(--c-fg)]"
                    activeClassName="!text-[var(--c-fg)]"
                  />
                ))}
                <div className="border-t-2 border-[var(--c-fg)] p-2">
                  <Link href="/contact" className="block text-sm font-black uppercase t-text-accent">
                    Start a project →
                  </Link>
                </div>
              </div>
            </details>
          </div>
        </Container>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t-2 border-t-[var(--c-fg)] t-bg-dark">
        <Container className="py-14">
          <p className="text-5xl font-black uppercase leading-none tracking-tight text-white sm:text-6xl">
            {identity.logoText}
            <span className="t-text-accent">.</span>
          </p>
          <div className="mt-8 grid gap-8 sm:grid-cols-2">
            <div>
              <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--c-dark-fg)]/55">Work with us</h3>
              <ul className="mt-3 space-y-2">
                {footerNav.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-sm font-bold uppercase tracking-wide text-[var(--c-dark-fg)]/90 transition-colors hover:text-white"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--c-dark-fg)]/55">The studio</h3>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-[var(--c-dark-fg)]/75">{identity.tagline}</p>
            </div>
          </div>
          <div className="mt-12 flex flex-col justify-between gap-2 border-t-2 border-[var(--c-dark-fg)]/20 pt-5 text-xs font-bold uppercase tracking-wide text-[var(--c-dark-fg)]/60 sm:flex-row">
            <p>© {new Date().getFullYear()} {identity.name}</p>
            <p>Served by the shared platform · theme: Agency</p>
          </div>
        </Container>
      </footer>
    </div>
  );
}
