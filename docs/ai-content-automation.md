# AI Content Automation — local Ollama, multi-provider, scheduled publishing

This document covers the complete AI content pipeline: provider configuration,
per-site topics and writing settings, the persistent job queue, the local
worker (essential for local Ollama + Vercel), scheduling, security, and
troubleshooting. **AI configuration is entirely optional** — every website
renders normally without it.

## Architecture

```
Admin UI (/admin/sites/{siteId}/ai)          (authenticated, site-scoped)
   └─ settings + topics + "Generate now" ──► ai_jobs (PostgreSQL queue)
                                                ▲
Vercel Cron (/api/ai/cron, CRON_SECRET) ────────┘  (bounded enqueue/publish
   sweeps only — NO model inference on Vercel)     sweeps; local worker does
                                                │  the generation)
Local worker (npm run ai:worker) ─────────────┘
   claims job (FOR UPDATE SKIP LOCKED) → calls provider (Ollama/OpenAI/
   compatible) → validates structured output → saves DRAFT via the existing
   CMS post service → audit trail → scheduled/autopilot publishing
```

Providers (`src/lib/ai/providers.ts`): `ollama` (local), `openai`,
`openai-compatible` (any /chat/completions endpoint). API keys live ONLY in
server environment variables; the database stores provider type + model name
per site, never secrets. The URL guard (`url-guard.ts`) blocks SSRF: only
http/https, no credentials-in-URL, no private ranges or cloud metadata
endpoints — loopback is allowed exclusively for the Ollama provider.

## 1. Local Ollama setup

```bash
# Windows: installer from https://ollama.com/download
# Linux/macOS:
curl -fsSL https://ollama.com/install.sh | sh

# download a model (3–8B instruct models work well; ~4 GB disk each):
ollama pull qwen2.5vl:3b        # verified in this project
# ollama pull qwen3:8b          # stronger, slower

# quick test:
ollama run qwen2.5vl:3b "Say hi in JSON: {\"hi\": true}"

# Ollama serves http://127.0.0.1:11434 — keep it local. NEVER expose Ollama
# to the public Internet; the worker reaches it over loopback/LAN only.
```

Then in `.env` (dev) or server env (prod worker host):

```
OLLAMA_BASE_URL="http://127.0.0.1:11434"
OLLAMA_MODEL="qwen2.5vl:3b"      # default hint; per-site model set in UI
DATABASE_URL="postgresql://..."  # the SAME database the website uses
```

## 2. Configure a website

1. Sign in to `/admin` → open a website → **AI** tab.
2. Pick the provider (availability shown from server env), enter the model
   (e.g. `qwen2.5vl:3b`), set language/tone/audience/word-count/format.
3. Choose an author and allowed categories — cross-site ids are rejected
   server-side.
4. Add topics with keywords and excluded angles. The generator picks the
   least-recently-used active topic; topics used in the last 14 days are
   skipped (duplicate prevention), and near-duplicate titles are rejected.
5. Publication mode:
   - **Draft** (default): every generation lands as a private draft for
     editor review. Nothing publishes automatically.
   - **Scheduled**: draft is published by the sweep after ~24 h
     (`publishAt` persisted on the job).
   - **Autopilot**: publishes immediately after validation. Opt-in per site,
     bounded by `maxArticlesPerDay` and weekly `postsPerWeek`, pausable
     globally per site. Never enabled silently.
6. **Generate an article now** queues a job (rate-limited: 3 per 10 min per
   admin+site).

## 3. Run the worker

The worker is a separate Node process that needs only `DATABASE_URL` and the
provider env — it does NOT need the web app running, and the web app never
runs model inference.

```bash
# foreground (Windows/Linux/macOS alike):
npm run ai:worker

# env overrides:
AI_WORKER_POLL_INTERVAL_MS=15000   # poll cadence (default 15 s)
AI_WORKER_CONCURRENCY=1            # jobs per cycle
AI_GENERATION_TIMEOUT_MS=120000    # per-request timeout
```

Each cycle: recover stale jobs (leases > 30 min) → scheduling sweep (enqueue
due jobs for enabled sites, once per local day, respecting weekly caps) →
publish sweep (due SCHEDULED/AUTOPILOT drafts) → claim & process up to
CONCURRENCY jobs. If the machine is offline, jobs simply stay PENDING and
resume when the worker returns.

**Continuous operation** — use a process manager:

```bash
# Linux (systemd unit, /etc/systemd/system/ai-worker.service):
[Unit]
Description=MultiSite AI worker
After=network.target postgresql.service
[Service]
WorkingDirectory=/opt/multisite
Environment=DATABASE_URL=postgresql://...
Environment=OLLAMA_BASE_URL=http://127.0.0.1:11434
ExecStart=/usr/bin/npm run ai:worker
Restart=always
User=aiworker
[Install]
WantedBy=multi-user.target

# Windows: Task Scheduler at startup, or
npx pm2 start npm --name ai-worker -- run ai:worker
```

## 4. Vercel + local worker

A Vercel Function cannot reach `127.0.0.1` on your machine — by design the
**worker runs where Ollama runs** (your machine/server) and talks to the same
PostgreSQL. Two scheduling strategies, both supported:

1. **Worker-driven (default)**: the worker's scheduling sweep enqueues due
   jobs itself. No Vercel involvement needed.
2. **Vercel Cron** (optional): set `CRON_SECRET` in Vercel, add to
   `vercel.json`:

   ```json
   { "crons": [{ "path": "/api/ai/cron", "schedule": "*/30 * * * *" }] }
   ```

   The endpoint authenticates `Authorization: Bearer <CRON_SECRET>` and only
   performs bounded enqueue/publish sweeps (never inference). Note Hobby
   plans allow limited cron frequency — the worker-driven strategy avoids
   this entirely.

Scheduled publishing uses persisted timestamps + the site's IANA timezone
(`Intl`-based); there are no in-memory timers, and jobs survive restarts.

## 5. Reliability guarantees

- **Claiming**: `FOR UPDATE SKIP LOCKED` — multiple workers never take the
  same job; the claim transaction is short and provider calls happen after
  it commits.
- **Retries**: bounded attempts (per-site `maxAttempts`) with exponential
  backoff (1 → 4 → 16 min). Terminal failures are audited.
- **Stale recovery**: PROCESSING jobs with expired leases (> 30 min, e.g.
  crashed worker) return to PENDING automatically.
- **Idempotency**: every job carries a unique `idempotency_key`
  (`gen:{site}:{topic}:{hour}` for manual, `sched:{site}:{topic}:{date}` for
  scheduled) — duplicate enqueues are impossible.
- **Duplicate publication**: near-duplicate titles are rejected before
  saving; slugs are uniquified; the publish sweep marks `published: true`
  in job metadata so it never re-publishes.
- **Drafts stay private**: generated posts are created through the existing
  post service as DRAFT and are invisible to public queries until published
  through the existing publication service (also in AUTOPILOT — it calls the
  same audited `setPostStatus`).

## 6. Security

- All admin routes/actions require Auth.js sessions + site membership
  (`assertSiteAccess` on every service call).
- Provider API keys: server env only; never in the DB, UI, logs, or client
  bundles. Error messages are sanitized (no keys, no auth headers, no full
  secret-bearing URLs).
- SSRF guard on all provider base URLs (see above); no arbitrary URL
  fetching anywhere; the cron endpoint is secret-gated and refuses all
  requests when `CRON_SECRET` is unset.
- Prompts: system instructions are separate from user topics; topics and
  site data are treated as untrusted content and cannot override system
  rules. No credentials, audit data, or cross-site data ever enters a
  prompt — prompts carry only the target site's own public identity.
- Model output is validated against a strict schema (title/slug/excerpt/
  body/language/tags/SEO bounds, word-count floors, slug normalization) and
  saved through the CMS's own validation — no HTML, no executable content,
  no SQL/shell/JS from model output.
- The worker's system account (`ai-worker@system`) is provisioned with an
  unguessable bcrypt hash and `active: false` — attribution-only, it can
  never sign in. Worker DB credentials should be a scoped role with access
  to the platform schema only.
- Manual generation is rate-limited (3/10 min per admin+site, in-process —
  same limitation as login rate limiting: add a shared backend before
  high-traffic use).
- No fabricated citations: the model is instructed never to invent quotes,
  statistics, sources, or dates; `sources` are only persisted when a real
  retrieval feature (future phase) supplies them.

## 7. Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| Job FAILED: "provider did not respond within Ns" | Slow model — raise `AI_GENERATION_TIMEOUT_MS` or use a smaller model. |
| Job FAILED: "model ... not pulled" / status 404 | `ollama pull <model>` on the worker machine. |
| Job stuck PROCESSING | Worker crashed mid-run; recovered automatically after 30 min (or run `recoverStaleJobs` via a worker cycle). |
| "This topic was used within the last 14 days" | Duplicate prevention — add new topics. |
| "A very similar article already exists" | Title-collision guard — edit/remove the old piece or pick another topic. |
| "Daily limit reached" | Per-site `maxArticlesPerDay` (UTC day) — raise it or wait. |
| UI: "Too many generation requests" | Manual rate limit (3/10 min per admin+site). |
| Worker: "DATABASE_URL is required" | Set env or `.env` in the worker's working directory. |
| Ollama unreachable from worker | `curl http://127.0.0.1:11434/api/tags` on the worker host; check the service is running and `OLLAMA_BASE_URL` matches. |
| Cron endpoint 403 | `CRON_SECRET` unset (endpoint disabled) — set it in Vercel if you use cron. |
| Verify a live setup end to end | `npm run ai:test-live` — one real generation through the full output contract. |

## 8. What is NOT implemented (honest scope)

- **No web research / retrieval**: local Ollama has no current-events
  knowledge; nothing fetches the web. A future research phase can add a
  separate search-provider abstraction behind the same job pipeline.
- **No Supabase Storage / media uploads** (unchanged from earlier phases).
- **No billing/Stripe** integration.
- In-process rate limiting (documented above).
