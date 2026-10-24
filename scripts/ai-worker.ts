/**
 * Local AI worker — processes queued generation jobs against local Ollama
 * (or any configured provider) for a Vercel-hosted web application.
 *
 *   npm run ai:worker
 *
 * The worker polls PostgreSQL for eligible jobs, calls the configured
 * provider, validates output, saves drafts through the shared content
 * service, and records audit entries. It never exposes Ollama publicly and
 * never touches Vercel — it only needs DATABASE_URL and the provider env.
 *
 * If the local machine is offline, jobs remain PENDING and resume later.
 */

// Minimal .env loader (self-contained; no dependency on Next.js).
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

for (const envPath of ['.env', '.env.local']) {
  const full = resolve(process.cwd(), envPath);
  if (!existsSync(full)) continue;
  for (const line of readFileSync(full, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*"?([^"\n]*)"?\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}

import { claimNextJob, recoverStaleJobs, processJob, schedulingSweep, publishSweep, ensureAiWorkerAccount } from '../src/lib/ai/content-automation';

const POLL_INTERVAL_MS = Number(process.env.AI_WORKER_POLL_INTERVAL_MS ?? 15_000);
const CONCURRENCY = Number(process.env.AI_WORKER_CONCURRENCY ?? 1);
const WORKER_ID = `worker-${process.pid}-${Math.random().toString(36).slice(2, 8)}`;
const STALE_LEASE_MINUTES = Number(process.env.AI_WORKER_STALE_LEASE_MINUTES ?? 30);

let running = true;

async function processOneCycle(): Promise<void> {
  // 1. Recover jobs whose lease expired (crash recovery).
  const recovered = await recoverStaleJobs(STALE_LEASE_MINUTES);
  if (recovered > 0) console.log(`[worker] recovered ${recovered} stale job(s)`);

  // 2. Scheduling sweep: enqueue due generation jobs for enabled sites.
  const enqueued = await schedulingSweep();
  if (enqueued > 0) console.log(`[worker] scheduled ${enqueued} new job(s)`);

  // 3. Publish due scheduled drafts.
  const published = await publishSweep();
  if (published > 0) console.log(`[worker] published ${published} scheduled draft(s)`);

  // 4. Claim and process up to CONCURRENCY jobs (sequentially per cycle).
  for (let i = 0; i < CONCURRENCY; i += 1) {
    const job = await claimNextJob(WORKER_ID);
    if (!job) break;
    console.log(`[worker] processing job ${job.id.slice(0, 8)} — topic: "${job.topicTitle}" (attempt ${job.attempts}/${job.maxAttempts})`);
    const started = Date.now();
    await processJob(job);
    console.log(`[worker] job ${job.id.slice(0, 8)} finished in ${Math.round((Date.now() - started) / 1000)}s`);
  }
}

async function main() {
  console.log(`[worker] AI worker starting (id=${WORKER_ID}, poll=${POLL_INTERVAL_MS}ms, concurrency=${CONCURRENCY})`);
  console.log(`[worker] provider env: OLLAMA_BASE_URL=${process.env.OLLAMA_BASE_URL ?? '(unset)'}, OPENAI_API_KEY=${process.env.OPENAI_API_KEY ? '(set)' : '(unset)'}, OPENAI_COMPAT=${process.env.OPENAI_COMPAT_BASE_URL ? '(set)' : '(unset)'}`);
  if (!process.env.DATABASE_URL) {
    console.error('[worker] DATABASE_URL is required. Exiting.');
    process.exit(1);
  }
  await ensureAiWorkerAccount(); // provision the non-loginable audit-attribution account

  process.on('SIGINT', () => {
    console.log('[worker] SIGINT — finishing current cycle, then exiting.');
    running = false;
  });
  process.on('SIGTERM', () => {
    running = false;
  });

  while (running) {
    try {
      await processOneCycle();
    } catch (error) {
      console.error('[worker] cycle failed:', error instanceof Error ? error.message : error);
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  console.log('[worker] stopped cleanly.');
  process.exit(0);
}

void main();
