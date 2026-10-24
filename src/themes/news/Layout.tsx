import Link from 'next/link';
import { Container } from '@/components/shared/Container';
import { NavLink } from '@/components/shared/NavLink';
import type { ThemeLayoutProps } from '@/platform/types';
import { themeVars } from '../themeVars';

/**
 * News / Magazine theme — chrome.
 * Newspaper masthead: dateline bar, centered serif logotype between double
 * rules, small-caps section navigation, and a dense ink footer.
 */

function todayLine() {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date());
}

export function NewsLayout({ ctx, children }: ThemeLayoutProps) {
  const { identity, nav, footerNav } = ctx.settings;
  return (
    <div style={themeVars(ctx.settings.colors)} className="t-bg-page flex min-h-screen flex-col font-sans">
      <header className="border-t-4 border-t-[var(--c-dark)]">
        <Container className="py-4">
          <div className="flex items-center justify-between border-b border-[var(--c-border)] pb-2 text-[11px] font-semibold uppercase tracking-[0.18em] t-text-muted">
            <span>{todayLine()}</span>
            <span className="hidden sm:block">{identity.tagline}</span>
            <Link href="/about" className="hover:text-[var(--c-fg)]">About</Link>
          </div>

          <div className="py-5 text-center">
            <Link href="/" className="inline-block t-ring rounded-sm">
              <span className="font-serif text-4xl font-black tracking-tight sm:text-5xl">
                {identity.logoText}
              </span>
            </Link>
            <p className="mt-1 text-[11px] uppercase tracking-[0.3em] t-text-muted">{identity.name}</p>
          </div>

          <nav
            aria-label="Sections"
            className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1.5 border-y-2 border-[var(--c-fg)] py-2.5"
          >
            {nav.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                className="text-xs font-bold uppercase tracking-[0.14em] t-text-muted transition-colors hover:text-[var(--c-fg)]"
                activeClassName="!text-[var(--c-primary)]"
              />
            ))}
          </nav>
        </Container>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="t-bg-dark mt-auto">
        <Container className="py-12">
          <div className="grid gap-10 md:grid-cols-[2fr_1fr_1fr]">
            <div>
              <p className="font-serif text-3xl font-black tracking-tight text-white">{identity.logoText}</p>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-[var(--c-dark-fg)]/75">
                {identity.tagline}
              </p>
            </div>
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--c-dark-fg)]/55">Sections</h3>
              <ul className="mt-3 space-y-2">
                {nav.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="text-sm text-[var(--c-dark-fg)]/85 hover:text-white">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--c-dark-fg)]/55">More</h3>
              <ul className="mt-3 space-y-2">
                {footerNav.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="text-sm text-[var(--c-dark-fg)]/85 hover:text-white">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-10 border-t border-white/10 pt-5 text-xs text-[var(--c-dark-fg)]/55">
            <p>© {new Date().getFullYear()} {identity.name}. All rights reserved.</p>
            <p className="mt-1">
              Served by the shared platform · theme: <span className="text-[var(--c-dark-fg)]/85">News</span>
            </p>
          </div>
        </Container>
      </footer>
    </div>
  );
}
