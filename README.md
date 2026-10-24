# MultiSite Platform — MVP

One shared Next.js codebase serves multiple websites. Each website has its own
hostname(s), theme, branding, navigation, content, and SEO metadata. Themes are
pluggable implementations of a `ThemeDefinition` contract; sites are data.

**Demo websites**

| Site                 | Hostname                | Theme       |
| -------------------- | ----------------------- | ----------- |
| Meridian Consulting  | `business.demo.local`   | `business`  |
| Wayfare Travel Co.   | `travel.demo.local`     | `travel`    |
| The Margin           | `blog.demo.local`       | `blog`      |
| Atelier Nord         | `portfolio.demo.local`  | `portfolio` |
| The Daily Signal     | `news.demo.local`       | `news`      |
| Northbeam Systems    | `tech.demo.local`       | `it`        |
| Bold & Co            | `agency.demo.local`     | `agency`    |

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
    business/ travel/ blog/      # the original three themes
    portfolio/ news/ it/ agency/ # the Phase 5 theme library
                                 # each: Layout, Blocks, Views, index.ts
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

The full production deployment runbook lives in
[docs/deploy-vercel.md](docs/deploy-vercel.md): Supabase PostgreSQL setup
(pooled vs direct URLs), the exact environment-variable matrix for Vercel
Preview and Production, the migration workflow, Super Admin provisioning,
custom-domain configuration, the shipped production smoke test
(`node scripts/smoke-test.mjs <url>`), rollback considerations, and
troubleshooting. Status: **deployment prepared and locally verified — no live
deployment has been performed yet** (no Vercel/Supabase credentials in this
environment); the runbook is the exact remaining manual procedure.


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

## Theme library (Phase 5)

The registry ships seven production themes. All of them run on the same core:
they receive a `SiteContext` + resolved content as props, render the typed
block union in their own visual language, and never query the database.

| Theme | id | Identity | Block treatment |
| --- | --- | --- | --- |
| Portfolio | `portfolio` | Minimalist editorial, serif display, warm paper | Numbered sections, hairline rules, image-forward gallery |
| News / Magazine | `news` | Newspaper masthead, oxblood accents | Double-rule masthead, kicker rows, lead-story front, drop-cap articles |
| IT / Tech | `it` | Dark engineering console, mono type | Blueprint grid backdrop, glass panels, `[ok]` lists, big stat band |
| Agency | `agency` | Print-brutalist, uppercase black display | Thick borders, hard offset shadows, accent stripes, numbered process |
| Business | `business` | Corporate navy/gold | Split hero, service cards, dark stat band |
| Travel | `travel` | Immersive warm editorial | Full-bleed hero, rounded image cards, teal footer |
| Blog | `blog` | Classic editorial serif | Masthead, ruled article rows, drop caps |

Notes:

- **Projects in the Portfolio/Agency themes are regular CMS pages and cards**
  built from the existing `cards`/`intro`/`features` blocks — no separate
  project database or content type was introduced.
- **The News theme derives everything from real posts**: the featured "lead
  story" is the first `postlist` block (limit 4), sections filter by real
  category slugs, and dates/authors come from the records. Nothing is
  fabricated.
- **Post detail views receive categories** (`ThemeDefinition.post` now accepts
  an optional `categories` prop, supplied by the dispatcher) — used for
  kicker labels and related-story context.
- Theme changes through the admin persist in PostgreSQL and are audited; the
  safe fallback for unknown theme ids remains the Business theme.

## Content management (Phase 3B)

Each website has a Content section in the admin dashboard
(`/admin/sites/[siteId]/content`) with tabs for Overview, Pages, Posts,
Categories, and Authors. All operations are authenticated, site-scoped
(server-side), and audit-logged.

### Pages and the block editor

- Pages render publicly at `/<slug>`; the page marked as homepage renders at
  `/`. Homepage assignment moves atomically; the homepage cannot be deleted
  until another page takes over.
- Pages are built from the platform's typed **content blocks** — the same
  union the themes render. The editor supports adding, editing, reordering
  (move up/down), and removing blocks for: Hero, Intro/About, Features,
  Cards, Statistics, Testimonials, Rich text, Logo strip, Call to action,
  Contact details, and Post list. There is **no free-form HTML input** —
  block payloads are structured forms serialized to JSON and re-validated
  server-side against the `Block` model before storage. Themes render each
  block in their own visual style; unsupported optional blocks degrade to
  nothing rather than crashing.
- New pages start as **drafts**. Publishing requires at least one block and
  stamps `publishedAt`; unpublishing hides the page without deleting it and
  never resets the original publication date. Editing a published page does
  not expose incomplete work — changes go live only on save.
- Slugs: an initial slug is generated from the title ("Generate" button);
  slugs are unique per website (DB constraint + friendly conflict errors),
  reserved platform slugs are rejected, and **editing a title never changes
  an existing slug** — public URLs stay stable.
- Preview: the editor's Preview button opens
  `/admin/sites/[siteId]/preview/(page|post)/<id>` — authenticated,
  site-scoped, `noindex`, rendered through the site's active theme, and
  never cached. Draft content is unreachable any other way: there are no
  public preview query parameters.

### Posts

- Posts render at `/posts/<slug>` with author, category, cover image
  (media-library path or https URL), tags, featured flag, and plain
  paragraph body. Post-level SEO title/description overrides feed the
  public metadata layer (OpenGraph/Twitter included).
- Same draft/publish semantics as pages: publish requires at least one
  paragraph; editing a published post never resets its published date.

### Categories and authors

- Categories: create/edit/delete with per-site unique slugs (immutable after
  creation — they appear in public `/posts?category=…` URLs). Deleting a
  category that still has posts is refused.
- Authors: create/edit/delete per site; deleting an author with posts is
  refused. Cross-site author/category assignments are rejected server-side.

### Media references

The editors integrate with the existing `media` metadata table: image
fields offer a picker of the site's media rows plus manual https:// URL
entry, with ownership validated server-side (a site-relative path must exist
in that site's media library). **File uploads are not supported yet** — no
local-disk or object-storage upload workflow exists; external images must be
hosted elsewhere. Missing images render graceful placeholders everywhere.

## AI content automation (Phase 6)

Optional AI article generation with local **Ollama**, **OpenAI**, or any
**OpenAI-compatible** provider. Fully integrated with the existing CMS:
per-site topics/writing settings in the admin (`/admin/sites/{siteId}/ai`),
a PostgreSQL-backed job queue, a **local worker** (`npm run ai:worker`) that
runs inference where Ollama lives (required for Vercel deployments — Vercel
Functions cannot reach your localhost), draft-first publishing with opt-in
SCHEDULED/AUTOPILOT modes, duplicate prevention, bounded retries, and full
audit trails. Verified end-to-end against a real local Ollama model
(qwen2.5vl:3b). Setup, scheduling, security, and troubleshooting:
[docs/ai-content-automation.md](docs/ai-content-automation.md).

## Admin dashboard (Phase 3A)

`/admin` is a real, database-backed administration area for websites, domains,
themes, and branding.

### Authentication

- **Auth.js / NextAuth v5** with a **Credentials provider** (no public
  registration, no OAuth) and **JWT sessions** — signed, HttpOnly, SameSite
  cookies with `Secure` in production, 8-hour expiry. Sessions are re-validated
  server-side on every page and every server action via `auth()`.
- Passwords are bcrypt-hashed (`bcryptjs`, 12 rounds); unknown-account lookups
  are timing-equalized; login errors are generic (no account-existence leaks).
- Login is rate-limited to 5 attempts / 15 min per IP+email. The counter is
  in-process and resets on restart — a mitigation speed bump, **not** a
  globally reliable control; front the app with a WAF/Redis limiter for
  hard production use.
- Next.js server actions carry built-in Origin/Host CSRF verification.
- Session secret: `AUTH_SECRET` (required; generate with `openssl rand -base64 32`).

### Provision the first admin (no public bootstrap route exists)

```bash
# password via env var — never a CLI argument, never logged
ADMIN_PROVISION_PASSWORD="..." npm run admin:provision -- --email ops@yourcompany.com --name "Ops"
# optional: create a Site Admin instead (grant sites in the DB)
ADMIN_PROVISION_PASSWORD="..." npm run admin:provision -- --role SITE_ADMIN --email manager@yourcompany.com
```

The script refuses to run under `NODE_ENV=production` unless
`ALLOW_ADMIN_PROVISION_IN_PROD=1` is set, and requires an explicit password.

### Roles

| Capability | SUPER_ADMIN | SITE_ADMIN |
| --- | --- | --- |
| View/manage all sites | ✅ | only assigned sites (`site_memberships`) |
| Create / activate / deactivate sites | ✅ | ❌ |
| Update branding, SEO, navigation, theme, domains of assigned sites | ✅ | ✅ |
| See membership lists & full audit log | ✅ | scoped to assigned sites |
| Change roles or grant themselves sites | ❌ (no self-service exists) | ❌ |

All authorization is enforced in the server-side service layer
(`src/lib/admin/authz.ts` + `sites-service.ts`) — never in the UI. A forged
site id simply resolves to "no grant" (404). No mass assignment: every form
field is explicitly selected and validated server-side.

### What you can do today

- Create websites (stable id + name + registered theme + optional primary
  domain, created atomically with default settings) and edit their metadata.
- Change a site's active theme (registry-validated, persisted, reflected on
  the next public request; audit-logged).
- Edit branding & SEO: identity, logo/favicon references (validated paths or
  https URLs), all ten brand colors, main/footer navigation (validated
  label+path rows), SEO defaults, and typography from an explicit allowlist
  (stored forward-compatibly in settings `extras`).
- Manage domains per site: add (normalized via the shared hostname rules),
  promote to primary (single-primary invariant in a transaction), remove
  (last remaining domain is protected; removing the primary auto-promotes the
  oldest remaining). Domains are saved **unverified** — DNS records, domain
  registration, and Vercel project configuration remain separate manual steps.
- Deactivate sites (Super Admin): an inactive site stops resolving on every
  hostname (the public adapter only serves ACTIVE sites) while all data is
  retained.
- Audit log: site create/update/status, theme changes, settings updates, and
  domain operations are recorded in the same transaction as the change, with
  actor, target site, timestamp, and a safe summary — never secrets.

Future work (not in this phase): a membership-management UI, content (page/
post) editors, media uploads, DNS/Vercel domain automation, distributed rate
limiting.

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
