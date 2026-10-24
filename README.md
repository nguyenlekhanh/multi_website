# MultiSite Platform — MVP

One shared Next.js codebase serves multiple websites. Each website has its own
hostname(s), theme, branding, navigation, content, and SEO metadata. Themes are
pluggable implementations of a `ThemeDefinition` contract; sites are data.

**Demo websites**

| Site                 | Hostname              | Theme       |
| -------------------- | --------------------- | ----------- |
| Meridian Consulting  | `business.demo.local` | `business`  |
| Wayfare Travel Co.   | `travel.demo.local`   | `travel`    |
| The Margin           | `blog.demo.local`     | `blog`      |

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
```

`localhost` (or any unmapped hostname) shows the **platform landing page**,
which lists the three demo sites and acts as the dev preview selector.

### Option A — preview routes (no setup)

- Open `http://localhost:3000` and click a site card, or go directly to
  `http://localhost:3000/preview/business-demo` (also `/preview/travel-demo`,
  `/preview/blog-demo`).
- A floating **dev bar** (bottom-right, dev builds only) lets you switch the
  active theme of the current site and hop between sites. `Exit preview`
  clears the cookie (`/preview/clear`).

### Option B — real hostnames

Add to your hosts file (`C:\Windows\System32\drivers\etc\hosts` on Windows,
`/etc/hosts` elsewhere), then visit with the dev port, e.g.
`http://business.demo.local:3000`:

```
127.0.0.1 business.demo.local
127.0.0.1 travel.demo.local
127.0.0.1 blog.demo.local
```

Hostname resolution is the same code path production uses — middleware stamps
`x-site-host`, and the resolver maps it through the site's domain list.

## Project structure

```
src/
  middleware.ts                  # hostname stamping + dev preview cookie
  app/
    layout.tsx                   # HTML shell only
    globals.css                  # Tailwind + t-* theme utilities (brand CSS vars)
    [[...slug]]/page.tsx         # dispatcher: resolve site → route → theme view
    not-found.tsx                # theme-aware 404
  platform/                      # core (theme-agnostic, no UI)
    types.ts                     # Site, Page, Post, Block, ThemeDefinition...
    constants.ts                 # header/cookie names
    resolve.ts                   # request → SiteContext (the only resolver)
    registry.ts                  # theme registry + safe fallback
    routing.ts                   # route table + site-scoped content loading
    seo.ts                       # per-site metadata (title/canonical/OG)
    blocks.ts                    # postlist resolution + date formatting
    actions.ts                   # dev-only theme switch server action
    data/
      adapter.ts                 # DataAdapter interface (future PostgreSQL)
      seed.ts                    # typed seed dataset (3 sites, full content)
      seed-adapter.ts            # site-scoped lookups, never leaks across sites
      store.ts                   # in-memory runtime overrides (dev theme switch)
      index.ts                   # adapter selection (DATABASE_URL aware)
  themes/
    themeVars.ts                 # brand config → CSS variables
    business/ travel/ blog/      # each: Layout, Home, PageView, PostViews,
                                 #       CategoriesView, NotFound, index.ts
  components/
    shared/                      # Container, SmartImage, Icon, NavLink, cn
    preview/                     # DevBar, PlatformLanding
docs/schema.sql                  # proposed PostgreSQL schema
```

Themes never resolve hostnames, never touch the data layer, and never read
route params — the dispatcher hands them a `SiteContext` plus resolved content.

## Add a new theme

1. Create `src/themes/mytheme/` implementing `ThemeDefinition`
   (`layout`, `home`, `page`, `notFound`, optionally `postList`, `post`,
   `categories`) — copy `src/themes/business/` as the starting point and
   restyle every section; keep the block switch but change the markup.
2. Wrap your root with `themeVars(ctx.settings.colors)` so brand colors from
   site config apply, and use the `t-*` utilities for brand-colored elements.
3. Register it in `src/platform/registry.ts`.
4. Any site can now activate it (site config `themeId`, or the dev bar).

Unknown `themeId`s fall back to the `business` theme with a console warning —
invalid theme identifiers never break rendering.

## Add a new website

1. Add a `Site` entry to `seedSites` in `src/platform/data/seed.ts`:
   `id`, primary `domain`, `domains`, `themeId`, and full `settings`
   (identity, brand colors, nav, footer nav, SEO).
2. Add its `Page`s (one with `isHomepage: true`), `Category`s, `Author`s and
   `Post`s — every record carries the site's `id`.
3. That's it: resolution, routing, theming, and SEO are shared. No new
   codebase, no deployment.

With a database later, these become rows in the tables described in
`docs/schema.sql`, managed by a future admin dashboard.

## Deploy on Vercel

1. Push the repo to GitHub and import it at vercel.com (framework auto-detected,
   build command `next build`). **One deployment serves all sites.**
2. Add custom domains: Project → Settings → Domains → add e.g.
   `meridian-consulting.com` and `www.meridian-consulting.com`. Vercel shows
   the DNS records to create at your registrar (A/ALIAS/CNAME). DNS must
   propagate and the domain must verify before traffic routes — custom domains
   never work automatically without this step.
3. Map each domain to a site: insert the hostname into that site's `domains`
   table (the demo import does this for the three demo domains). Production
   resolution is hostname-based and needs no wildcard rewrites.
4. Environment variables (Project → Settings → Environment Variables) — set
   separately for Preview and Production:
   - `DATA_SOURCE=postgres` — required in production, selects the database.
   - `DATABASE_URL` — your provider's **pooled** connection string.
   - `DIRECT_URL` — only for providers that separate pooled/direct URLs;
     used by `prisma migrate deploy`.
   - `NEXT_PUBLIC_SITE_URL` — canonical origin for metadata (recommended).
5. Apply migrations once from your machine or a CI step:
   `DATABASE_URL=... npx prisma migrate deploy` — never during request handling.
6. Import the demo sites if wanted: `DATABASE_URL=... npm run db:seed`
   (refuses to run in production unless ALLOW_DEMO_SEED_IN_PROD=1).
7. Serverless compatibility: the Prisma client is a single pooled instance per
   server; middleware stays on the Edge and never touches the database.

## PostgreSQL

The platform has two data sources behind one `DataAdapter` interface
(`src/platform/data/adapter.ts`):

- `DATA_SOURCE=seed` — typed demo fixtures (`src/platform/data/seed.ts`).
  Default in development; no database required.
- `DATA_SOURCE=postgres` — real PostgreSQL via Prisma
  (`src/platform/data/postgres-adapter.ts`). Every query is site-scoped and
  parameterized. Production **requires** an explicit `DATA_SOURCE` — the app
  refuses to start guessing, and a database failure renders a branded
  "temporarily unavailable" page, never seed content and never a raw error.

### Create a database

Any PostgreSQL 14+ works (Vercel Postgres, Neon, Supabase, RDS, or a local
install). Locally: `createdb platform_dev` — then point `DATABASE_URL` at it.

### Apply migrations

Migrations live in `prisma/migrations/` (source of truth: `prisma/schema.prisma`;
`docs/schema.sql` is a readable reference only). They are version-controlled
and non-destructive to apply:

```bash
DATABASE_URL="postgresql://user:password@host:5432/db" npm run db:deploy
```

Development iteration uses `npm run db:migrate` (prisma migrate dev). Never
run schema migrations during app startup or request handling.

### Import the demo data

```bash
DATABASE_URL="postgresql://user:password@host:5432/db" npm run db:seed
```

The import is **idempotent** — every row is upserted on a stable key (site ids,
domain hosts, category/author ids, (site, slug) pairs), so running it twice
converges to the same state and never duplicates records. It refreshes the
three demo sites' rows with fixture data, so never point it at a database
holding real content: the script refuses to run when `NODE_ENV=production`
unless `ALLOW_DEMO_SEED_IN_PROD=1`.

### Start the application

- Seed mode (default in dev): `npm run dev`
- PostgreSQL mode: `DATA_SOURCE=postgres DATABASE_URL=... npm run dev`
  (or set both in `.env` — see `.env.example`).

### Verify production queries use PostgreSQL

- Startup logs print `[platform] Data source: PostgreSQL (Prisma).`
- Change a row (e.g. rename a page in SQL) and reload — the change appears;
  in seed mode it never would.
- Stop the database: pages render the branded availability page, and server
  logs print an actionable error — no fake content is served.

### Connection pooling

The Prisma client is created once per server process
(`src/platform/data/prisma.ts`). On serverless hosts, use your provider's
pooled connection string in `DATABASE_URL` (e.g. Supabase/Neon pooler or
Prisma Accelerate with `pgbouncer=true&connection_limit=10`) and put the
direct string in `DIRECT_URL` for migrations. Keep pool sizes modest;
connections are reused across requests.

### Troubleshooting

| Symptom | Likely cause / fix |
| --- | --- |
| `P1001 Can't reach database server` | Wrong host/port, DB stopped, or firewall. Check `DATABASE_URL` and connectivity. |
| `P1009 / authentication failed` | Credentials in `DATABASE_URL`. |
| `P2002 unique constraint` on import | Rows exist with the same host/slug under another site id — hosts and (site, slug) pairs are globally unique by design. |
| `relation "sites" does not exist` | Migrations not applied: run `npm run db:deploy`. |
| Prisma client out of date | `npm run db:generate` (runs automatically on `npm install`). |
| Works locally, fails on Vercel | Use the provider's pooled URL for runtime queries; keep the direct URL in `DIRECT_URL` for migrations. |

## Modes, mock data & current limitations

- **Seed mode** (`DATA_SOURCE=seed`) serves typed demo fixtures from
  `src/platform/data/seed.ts`. **Postgres mode** serves the same content from
  PostgreSQL via the Prisma adapter. Images are local files under
  `public/images/` (downloaded from Unsplash) with graceful fallbacks.
- **Theme switching** is a dev-only control. In seed mode it flips an
  in-memory override (resets on restart); in postgres mode it writes the
  real `sites.theme_id` column. Either way it is disabled in production
  builds — an authenticated admin dashboard is still future work.
- **No admin dashboard**, no auth, no search, no comments — out of scope.
- Forms (newsletter/contact) render as CTA links; submission handling comes
  with the admin phase.
- **Caching posture (correctness-first):** every page renders dynamically
  (host-dependent), so no response can be cached for one domain and served
  to another; the database is the source of truth and domain changes take
  effect on the next request. If ISR/caching is added later, it must key on
  the hostname.

## Environment variables

| Variable               | Required now | Purpose                                   |
| ---------------------- | ------------ | ----------------------------------------- |
| `DATABASE_URL`         | no           | Future PostgreSQL connection              |
| `NEXT_PUBLIC_SITE_URL` | no           | Canonical origin for SEO in production    |

See `.env.example`.

## Commands

```bash
npm run dev        # dev server (http://localhost:3000)
npm run build      # production build
npm run start      # serve the production build
npm run lint       # eslint
npx tsc --noEmit   # type check
```
