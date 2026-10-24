import { NextResponse } from 'next/server';
import { schedulingSweep, publishSweep, recoverStaleJobs } from '@/lib/ai/content-automation';
import { isDataUnavailableError } from '@/platform/data/errors';

/**
 * Vercel Cron endpoint: bounded sweeps that enqueue due generation jobs and
 * publish due scheduled drafts. NO model inference happens here — the local
 * worker performs actual generation against local Ollama.
 *
 * Authenticated with the CRON_SECRET environment variable via
 *   Authorization: Bearer <CRON_SECRET>
 * Configure in vercel.json (crons) or an external scheduler. If CRON_SECRET
 * is unset, the endpoint refuses all requests (safe default).
 */

export const dynamic = 'force-dynamic';

const MAX_SWEEP_WORK = Number(process.env.AI_CRON_MAX_SWEEP ?? 10);

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}

async function handle(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET is not configured — cron is disabled.' }, { status: 403 });
  }
  const auth = request.headers.get('authorization') ?? '';
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const recovered = await recoverStaleJobs(30);
    const enqueued = Math.min(await schedulingSweep(), MAX_SWEEP_WORK);
    const published = Math.min(await publishSweep(), MAX_SWEEP_WORK);
    return NextResponse.json({
      ok: true,
      recovered,
      enqueued,
      published,
      note: 'Sweeps only enqueue/publish — generation runs on the local AI worker.',
    });
  } catch (error) {
    if (isDataUnavailableError(error)) {
      return NextResponse.json({ error: 'Database unavailable.' }, { status: 503 });
    }
    console.error('[ai-cron]', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Cron sweep failed.' }, { status: 500 });
  }
}
