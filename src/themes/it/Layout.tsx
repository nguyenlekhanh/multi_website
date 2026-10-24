import Link from 'next/link';
import { Container } from '@/components/shared/Container';
import { NavLink } from '@/components/shared/NavLink';
import type { ThemeLayoutProps } from '@/platform/types';
import { themeVars } from '../themeVars';

/**
 * IT / Technology theme — chrome.
 * Dark engineering console: mono labels, glass panels, hairline borders,
 * and a subtle grid backdrop.
 */

export function TechLayout({ ctx, children }: ThemeLayoutProps) {
  const { identity, nav } = ctx.settings;
  return (
    <div
      style={themeVars(ctx.settings.colors)}
      className="t-bg-page relative flex min-h-screen flex-col font-sans"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(var(--c-border)_1px,transparent_1px),linear-gradient(90deg,var(--c-border)_1px,transparent_1px)] bg-[size:56px_56px] opacity-[0.14]"
      />
      <header className="sticky top-0 z-40 border-b border-[var(--c-border)] bg-[color-mix(in_srgb,var(--c-bg)_88%,transparent)] backdrop-blur">
        <Container>
          <div className="flex h-16 items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-2.5 t-ring rounded-md">
              <span className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--c-accent)] font-mono text-xs font-bold t-text-accent">
                {identity.logoInitials}
              </span>
              <span className="font-mono text-sm font-bold tracking-tight">{identity.logoText}</span>
            </Link>

            <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
              {nav.map((item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  className="rounded-md px-3 py-2 font-mono text-xs font-medium t-text-muted transition-colors hover:text-[var(--c-fg)]"
                  activeClassName="!text-[var(--c-accent)]"
                />
              ))}
            </nav>

            <div className="flex items-center gap-3">
              <Link
                href="/contact"
                className="hidden t-ring rounded-md border border-[var(--c-accent)] px-4 py-2 font-mono text-xs font-bold t-text-accent transition hover:bg-[color-mix(in_srgb,var(--c-accent)_12%,transparent)] sm:inline-flex"
              >
                Get in touch
              </Link>
              <details className="relative md:hidden">
                <summary
                  className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-md border border-[var(--c-border)] t-ring [&::-webkit-details-marker]:hidden"
                  aria-label="Open menu"
                >
                  <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                    <path d="M4 8h16M4 16h16" />
                  </svg>
                </summary>
                <div className="absolute right-0 top-11 z-50 w-52 rounded-md border border-[var(--c-border)] bg-[var(--c-bg)] p-1.5 shadow-2xl">
                  {nav.map((item) => (
                    <NavLink
                      key={item.href}
                      href={item.href}
                      label={item.label}
                      className="block rounded px-3 py-2 font-mono text-xs t-text-muted hover:bg-[var(--c-muted)] hover:text-[var(--c-fg)]"
                      activeClassName="!text-[var(--c-accent)]"
                    />
                  ))}
                </div>
              </details>
            </div>
          </div>
        </Container>
      </header>

      <main className="relative flex-1">{children}</main>

      <footer className="relative border-t border-[var(--c-border)]">
        <Container className="py-12">
          <div className="grid gap-10 md:grid-cols-[2fr_1fr]">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--c-accent)] font-mono text-xs font-bold t-text-accent">
                  {identity.logoInitials}
                </span>
                <span className="font-mono text-sm font-bold">{identity.logoText}</span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--c-border)] px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider t-text-muted">
                  <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  all systems operational
                </span>
              </div>
              <p className="mt-4 max-w-md text-sm leading-relaxed t-text-muted">{identity.tagline}</p>
            </div>
            <nav aria-label="Footer">
              <h3 className="font-mono text-[10px] uppercase tracking-[0.24em] t-text-muted">Navigate</h3>
              <ul className="mt-3 space-y-2">
                {nav.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="font-mono text-xs t-text-muted transition-colors hover:t-text-accent">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
          <div className="mt-10 flex flex-col justify-between gap-2 border-t border-[var(--c-border)] pt-5 font-mono text-[11px] t-text-muted sm:flex-row">
            <p>© {new Date().getFullYear()} {identity.name}</p>
            <p>built on the shared platform · theme: <span className="text-[var(--c-fg)]/80">IT</span></p>
          </div>
        </Container>
      </footer>
    </div>
  );
}
