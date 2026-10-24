import Link from 'next/link';
import { ServiceUnavailable } from '@/components/preview/ServiceUnavailable';
import { db, isDataUnavailableError } from '@/platform/data';
import { getTheme } from '@/platform/registry';

/**
 * Platform landing page.
 *
 * Shown when the request hostname does not match any configured site — this
 * is the explicit fallback required for unknown hostnames, and it doubles as
 * the development preview selector for the demo sites. Site cards come from
 * the active data source.
 */
export async function PlatformLanding({ host }: { host: string | null }) {
  let sites: Awaited<ReturnType<typeof db.listSites>>;
  try {
    sites = await db.listSites();
  } catch (error) {
    if (isDataUnavailableError(error)) {
      const cause = error instanceof Error && error.cause instanceof Error ? error.cause.message : undefined;
      console.error('[platform] landing page: data source unavailable.' + (cause ? ` Cause: ${cause}` : ''));
      return <ServiceUnavailable />;
    }
    throw error;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(56,189,248,0.15),transparent)]" />

      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-sky-400 to-indigo-500 text-sm font-bold text-slate-950">
            M
          </span>
          <div>
            <p className="text-sm font-semibold">MultiSite Platform</p>
            <p className="text-xs text-slate-400">One codebase · many websites</p>
          </div>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
          {host ? `Host: ${host}` : 'Local development'}
        </span>
      </header>

      <main className="relative mx-auto max-w-6xl px-6 pb-24">
        <section className="max-w-2xl pt-10 pb-14">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Choose a website to preview
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-slate-400">
            This hostname isn&apos;t mapped to a website, so you&apos;re seeing the platform index.
            Each site below runs on the same codebase with its own theme, branding, content, and
            configuration.
          </p>
        </section>

        <section className="grid gap-6 md:grid-cols-3" data-testid="landing-sites">
          {sites.map((site) => {
            const theme = getTheme(site.themeId);
            return (
              <Link
                key={site.id}
                href={`/preview/${site.id}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition hover:border-white/25 hover:bg-white/[0.06]"
                data-testid={`landing-card-${site.id}`}
              >
                <div
                  className="h-28 w-full"
                  style={{
                    background: `linear-gradient(135deg, ${site.settings.colors.primary}, ${site.settings.colors.dark})`,
                  }}
                />
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: site.settings.colors.accent }}
                    />
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      {theme.name} theme
                    </span>
                  </div>
                  <h2 className="mt-2 text-lg font-semibold text-white">{site.name}</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    {site.settings.identity.tagline}
                  </p>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-500">
                    {site.settings.landingBlurb}
                  </p>
                  <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
                    <code className="text-xs text-slate-500">{site.domain}</code>
                    <span className="text-sm font-semibold text-sky-400 transition group-hover:translate-x-0.5">
                      Preview →
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </section>

        <section className="mt-16 grid gap-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8 md:grid-cols-2">
          <div>
            <h3 className="font-semibold text-white">Using real hostnames locally</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Add these lines to your hosts file, then visit each domain with the port your dev
              server prints (for example <code className="text-slate-300">http://business.demo.local:3000</code>):
            </p>
            <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs leading-relaxed text-slate-300">
              {`127.0.0.1 business.demo.local
127.0.0.1 travel.demo.local
127.0.0.1 blog.demo.local`}
            </pre>
          </div>
          <div>
            <h3 className="font-semibold text-white">Production domains</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              On Vercel, add each custom domain to the project and map it to a site through the
              domain configuration — one deployment serves all websites. See the README for the
              full walkthrough, including PostgreSQL setup.
            </p>
          </div>
        </section>
      </main>

      <footer className="relative border-t border-white/10 py-6 text-center text-xs text-slate-500">
        Platform MVP · Next.js App Router · themes are pluggable, sites are data
      </footer>
    </div>
  );
}
