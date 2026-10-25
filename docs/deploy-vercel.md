# Deploy to Vercel — runbook

Status (2026-10-24): **live on Vercel.** The repo is connected to GitHub
(`nguyenlekhanh/multi_website`) and imported as the Vercel project
`multi-website` (team `stella-orions-projects`). A first deployment is live
at **https://multi-website-jet.vercel.app** running in `DATA_SOURCE=seed`
mode (demo fixtures) — the shipped smoke test passes 19/19 against it,
including all seven themes, site isolation, the admin login gate, and
secret-leak scans; browser-verified login error handling and theme previews
over HTTPS.

**PostgreSQL production is not yet connected.** The Supabase project
`zbcgvnxdaivbrhtsrywk` exists (API keys are in local `.env`), but the
Postgres connection password is not available to the tooling, so migrations
have NOT been run and production env vars have not been set. Provide the
Supabase database password (or a `DATABASE_URL`), then follow §1 and §5
below. The remaining manual procedure:

## 0. What is already deployment-ready (verified locally)

- Production build passes (`npm run build`, Turbopack) and the app is
  production-tested locally in `DATA_SOURCE=postgres` mode.
- **Fail-fast configuration**: a production build/runtime without an explicit
  `DATA_SOURCE` intentionally fails with an actionable error — verified by
  building with `NODE_ENV=production` and no env file. It never silently
  falls back to seed data.
- Edge middleware does **not** touch PostgreSQL or Prisma (verified imports:
  `next/server` + two pure-TS platform modules) — fully Edge-compatible.
- `.env*` is gitignored and no `.env` file is tracked in git; secrets live
  only in Vercel's environment settings.
- `npm install` runs `prisma generate` automatically (postinstall) — no extra
  Vercel build step needed.
- A validated production smoke test ships with the repo (step 7).

## 1. Create the production database (Supabase)

1. Create a Supabase project (any region close to your users).
2. Note **two** connection strings from Project Settings → Database:
   - **Pooled** (port `6543`, Transaction pooler) → this is `DATABASE_URL`
     for the application. Append `?pgbouncer=true&connection_limit=10`.
   - **Direct** (port `5432`) → this is `DIRECT_URL` for Prisma migrations.
3. SSL is enforced by Supabase by default — Prisma connects over TLS with no
   extra configuration. Supabase requires no network allow-listing for
   Vercel (public egress is accepted).
4. Do **not** reuse the local disposable test database
   (`127.0.0.1:5544/mspp_test`) — it is development-only and unreachable
   from Vercel.

Any managed PostgreSQL works; the only Supabase-specific part is the
pooled/direct URL split and the connection-string shapes.

## 2. Push the repository

```bash
git remote add origin <your-github-url>
git push -u origin main
```

## 3. Create the Vercel project

1. Vercel dashboard → Add New → Project → import the repository.
2. Framework preset: **Next.js** (auto-detected). Build command
   `npm run build`, install `npm install` — leave defaults.
3. Do **not** deploy yet — configure environment variables first (the
   production build intentionally fails without them, with an actionable
   error).

## 4. Environment variables (Vercel → Settings → Environment Variables)

Configure **separately for Production and Preview**:

| Variable | Production | Preview |
| --- | --- | --- |
| `DATA_SOURCE` | `postgres` | `postgres` (or `seed` for a content-free preview) |
| `DATABASE_URL` | Supabase **pooled** URL | Preview-database pooled URL (recommended: separate Supabase project/branch DB) |
| `DIRECT_URL` | Supabase **direct** URL | Preview-database direct URL |
| `AUTH_SECRET` | `openssl rand -base64 32` (unique per environment) | separate value |
| `NEXT_PUBLIC_SITE_URL` | your primary production domain | the preview URL root (optional) |

Not used in production: `TEST_DATABASE_URL` (tests only),
`ADMIN_PROVISION_PASSWORD` (CLI only), `ALLOW_ADMIN_PROVISION_IN_PROD`
(safety valve, keep unset). **Stripe variables are placeholders for a future
billing phase — the platform has no billing code; do not set them.**
`NEXT_PUBLIC_*` must never carry database URLs or secrets.

## 5. Apply migrations (once, before first traffic)

From your machine, against the production database:

```bash
DATABASE_URL="<direct-url>" npx prisma migrate deploy
```

Rules (already enforced by the workflow):

- Uses the version-controlled migrations in `prisma/migrations/` — inspected,
  non-destructive `ALTER`/`CREATE` statements only.
- `prisma migrate deploy` is the only production command. **Never**
  `prisma migrate reset`, `db:push`, or the seed script against production.
- Verify afterwards: `npx prisma migrate status` shows no pending
  migrations, and the Supabase table editor lists
  `sites, domains, site_settings, pages, posts, categories, authors, media,
  admin_users, site_memberships, audit_logs`.
- Rollback consideration: migrations are forward-only. Take a Supabase
  backup/snapshot before the first deploy; a rollback is a point-in-time
  restore plus redeploying the previous git commit.

## 6. Provision the first Super Admin (once)

The password comes from an env var (never argv, never logged):

```bash
DATABASE_URL="<direct-url>" \
ADMIN_PROVISION_PASSWORD="..." \
npm run admin:provision -- --email ops@yourcompany.com --name "Ops"
```

The script is blocked under `NODE_ENV=production` unless
`ALLOW_ADMIN_PROVISION_IN_PROD=1` — set that variable only for this one
command, only if you understand it targets the production database.
There is **no public registration and no bootstrap web endpoint**.

## 7. Deploy and smoke-test

1. Deploy (dashboard Deploy button, or `vercel --prod`).
2. The deployment URL (e.g. `https://<project>.vercel.app`) is an
   **unassigned hostname** — it must render the platform landing page with
   all 7 demo site cards. That is the documented safe fallback.
3. Run the shipped smoke test against it:

```bash
node scripts/smoke-test.mjs https://<project>.vercel.app
```

It verifies (19 checks, all read-only): the landing fallback, unknown-route
404s inside site contexts, **all 7 themes rendering via their preview
routes**, page/post content rendering, cross-site content 404s, the admin
login gate, and that no connection strings or secrets appear in rendered
HTML. Preview environments can be smoke-tested the same way before
promoting to production.

Demo content: production starts **empty** (no seed fallback). To load the
demo sites, run the reviewed import explicitly and deliberately:

```bash
DATABASE_URL="<direct-url>" ALLOW_DEMO_SEED_IN_PROD=1 npm run db:seed
```

It is idempotent (upserts on stable ids) and only ever touches the seven
`*-demo` site ids — never run it against a database holding real content.

## 8. Custom domains (multi-website routing)

1. Vercel → Project → Settings → Domains → add each hostname (e.g.
   `business.demo.net`, `www.business.demo.net`). Vercel displays the DNS
   records to create at the registrar (A/ALIAS/CNAME). Nothing resolves
   until DNS propagates **and** Vercel verifies the domain — this never
   happens automatically.
2. Map each verified hostname to a website: add it to that site's `domains`
   (via the admin → Domains page, or SQL insert into the `domains` table).
   The public resolver matches normalized hostnames against this table;
   preview cookies can never override a configured domain.
3. Unmapped hostnames (including the raw `*.vercel.app` URL) render the
   platform landing page — safe and intentional.
4. Set `NEXT_PUBLIC_SITE_URL` to the primary production domain so canonical
   URLs are stable, or leave it unset to derive per-site canonicals from the
   request hostname (already the default behavior).
5. Re-run `node scripts/smoke-test.mjs https://<custom-domain>` once DNS
   resolves, and additionally curl each custom domain directly.

## 9. Production security notes (carried from Phases 2–3A)

- Auth.js: JWT sessions, HttpOnly + SameSite cookies, `Secure` automatically
  in production; set a unique strong `AUTH_SECRET` per environment.
- Login rate limiting is **in-process** — on serverless it counts per
  instance and resets. Acceptable as a speed bump; add a WAF/Upstash-Redis
  limiter in front of `/admin/login` before relying on it at scale.
- All admin reads/mutations re-validate the session and site scope
  server-side; audit entries are written transactionally.
- Draft content is unreachable publicly (no preview query parameters; the
  authenticated preview route is `noindex` and dynamic).
- Known accepted build-time advisories: `npm audit --omit=dev` flags
  Prisma-CLI (`deepmerge-ts`) and PostCSS advisories. Both are build-time
  tooling, not the runtime request path. Remediation paths: Prisma ≤ 6.12
  (downgrade) or Next 16 (major upgrade) — deliberately deferred.

## 10. Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| Build fails: "DATA_SOURCE is required in production" | Env vars not set on the Vercel project (or not applied to the failing environment). |
| Build fails: Prisma "Environment variable not found: DATABASE_URL" | `DATABASE_URL` missing at build time — set it for all environments. |
| Deployed pages show "temporarily unavailable" | `DATA_SOURCE=postgres` with an unreachable/invalid `DATABASE_URL`. Check Supabase status and the pooled URL. |
| Landing page shows instead of a website | The hostname is not mapped to a site — add the domain in admin → Domains and verify it in Vercel. |
| `P1001`/`P1003` at runtime | Wrong pooled host/port, or migrations not applied — `npx prisma migrate status` with `DIRECT_URL`. |
| Sessions invalidate for everyone | `AUTH_SECRET` changed — rotate deliberately. |
