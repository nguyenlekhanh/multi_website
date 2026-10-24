import { Prisma } from '@prisma/client';
import { getPrisma } from '@/platform/data/prisma';
import { isDataUnavailableError } from '@/platform/data/errors';
import { createProvider } from './providers';
import { parseArticleResponse } from './output-schema';
import { buildSystemPrompt, buildUserPrompt, PROMPT_VERSION } from './prompts';
import { AiProviderError, type AiProvider, type AiSiteConfig } from './types';
import type { AdminSessionUser } from '@/lib/admin/types';
import { assertSiteAccess } from '@/lib/admin/authz';
import { createPost, setPostStatus } from '@/lib/admin/content-service';
import { checkRateLimit } from '@/lib/admin/rate-limit';
import { fail, ok, type ServiceResult } from '@/lib/admin/types';

/**
 * AI content service: settings, topics, job enqueue, generation, and the
 * publish sweep. All site operations enforce the established authorization
 * (assertSiteAccess). Provider calls happen OUTSIDE any database transaction.
 *
 * The AI never writes to PostgreSQL directly — generated articles are saved
 * through the existing content service (createPage), which re-validates
 * everything site-scoped and writes its own audit entry.
 */

export const GENERATION_TIMEOUT_MS = Number(process.env.AI_GENERATION_TIMEOUT_MS ?? 120_000);

/** The worker's system actor. Audit rows reference admin_users via FK, so the
 *  account is provisioned (once) with an unguessable bcrypt hash and
 *  active=false — it exists for attribution, never for login. */
export const AI_WORKER_ACTOR: AdminSessionUser = {
  id: 'ai-worker',
  email: 'ai-worker@system',
  name: 'AI Content Worker',
  role: 'SUPER_ADMIN',
};

export async function ensureAiWorkerAccount(): Promise<void> {
  // createRequire keeps this working from every loader (Next.js, tsx, vitest).
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  const bcrypt = require('bcryptjs') as typeof import('bcryptjs');
  const unguessable = await bcrypt.hash(crypto.randomUUID() + crypto.randomUUID(), 12);
  await getPrisma().adminUser.upsert({
    where: { id: AI_WORKER_ACTOR.id },
    create: {
      id: AI_WORKER_ACTOR.id,
      email: AI_WORKER_ACTOR.email,
      name: AI_WORKER_ACTOR.name,
      role: 'SUPER_ADMIN',
      passwordHash: unguessable,
      active: false, // attribution only — can never sign in
    },
    update: {}, // keep as provisioned
  });
}
/* ------------------------------- settings --------------------------------- */

export type AiSettingsResult = ServiceResult<AiSiteConfig>;

function mapSettings(row: {
  siteId: string; enabled: boolean; provider: string; model: string; language: string;
  tone: string; audience: string; wordCountTarget: number; format: string;
  authorId: string | null; categoryIds: string[]; publishMode: string;
  postsPerWeek: number; publishTimes: string[]; timezone: string;
  maxAttempts: number; maxArticlesPerDay: number; customInstructions: string | null;
  paused: boolean;
}): AiSiteConfig {
  return {
    siteId: row.siteId, enabled: row.enabled, provider: row.provider as AiSiteConfig['provider'],
    model: row.model, language: row.language, tone: row.tone, audience: row.audience,
    wordCountTarget: row.wordCountTarget, format: row.format, authorId: row.authorId,
    categoryIds: row.categoryIds, publishMode: row.publishMode as AiSiteConfig['publishMode'],
    postsPerWeek: row.postsPerWeek, publishTimes: row.publishTimes, timezone: row.timezone,
    maxAttempts: row.maxAttempts, maxArticlesPerDay: row.maxArticlesPerDay,
    customInstructions: row.customInstructions, paused: row.paused,
  };
}

export async function getAiSettings(actor: AdminSessionUser, siteId: string): Promise<AiSettingsResult> {
  try {
    await assertSiteAccess(actor, siteId);
    const row = await getPrisma().aiSettings.findUnique({ where: { siteId } });
    return ok(row ? mapSettings(row) : defaultConfig(siteId));
  } catch (error) {
    return aiError(error, 'load AI settings');
  }
}

function defaultConfig(siteId: string): AiSiteConfig {
  return {
    siteId, enabled: false, provider: 'ollama', model: '', language: 'English',
    tone: 'professional', audience: '', wordCountTarget: 800, format: 'article',
    authorId: null, categoryIds: [], publishMode: 'DRAFT', postsPerWeek: 3,
    publishTimes: ['09:00'], timezone: 'UTC', maxAttempts: 3, maxArticlesPerDay: 2,
    customInstructions: null, paused: false,
  };
}

export interface AiSettingsInput {
  enabled?: boolean;
  provider?: string;
  model?: string;
  language?: string;
  tone?: string;
  audience?: string;
  wordCountTarget?: number;
  format?: string;
  authorId?: string;
  categoryIds?: string[];
  publishMode?: string;
  postsPerWeek?: number;
  publishTimes?: string[];
  timezone?: string;
  maxAttempts?: number;
  maxArticlesPerDay?: number;
  customInstructions?: string;
  paused?: boolean;
}

const PROVIDER_TYPES = ['ollama', 'openai', 'openai-compatible'];
const FORMATS = ['article', 'listicle', 'howto'];
const PUBLISH_MODES = ['DRAFT', 'SCHEDULED', 'AUTOPILOT'];

export async function saveAiSettings(
  actor: AdminSessionUser,
  siteId: string,
  input: AiSettingsInput,
): Promise<AiSettingsResult> {
  try {
    await assertSiteAccess(actor, siteId);
    const current = await getAiSettings(actor, siteId);
    if (!current.ok) return current;

    const merged: AiSiteConfig = {
      ...current.data,
      ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
      ...(input.provider !== undefined
        ? PROVIDER_TYPES.includes(input.provider)
          ? { provider: input.provider as AiSiteConfig['provider'] }
          : (() => { throw new ValidationError('Unknown provider type.'); })()
        : {}),
      ...(input.model !== undefined ? { model: input.model.trim().slice(0, 120) } : {}),
      ...(input.language !== undefined ? { language: input.language.trim().slice(0, 60) || 'English' } : {}),
      ...(input.tone !== undefined ? { tone: input.tone.trim().slice(0, 60) || 'professional' } : {}),
      ...(input.audience !== undefined ? { audience: input.audience.trim().slice(0, 300) } : {}),
      ...(input.wordCountTarget !== undefined
        ? {
            wordCountTarget: Math.min(Math.max(Math.round(input.wordCountTarget) || 800, 300), 2000),
          }
        : {}),
      ...(input.format !== undefined
        ? FORMATS.includes(input.format)
          ? { format: input.format }
          : (() => { throw new ValidationError('Unknown article format.'); })()
        : {}),
      ...(input.authorId !== undefined ? { authorId: input.authorId || null } : {}),
      ...(input.categoryIds !== undefined ? { categoryIds: input.categoryIds.slice(0, 10) } : {}),
      ...(input.publishMode !== undefined
        ? PUBLISH_MODES.includes(input.publishMode)
          ? { publishMode: input.publishMode as AiSiteConfig['publishMode'] }
          : (() => { throw new ValidationError('Unknown publication mode.'); })()
        : {}),
      ...(input.postsPerWeek !== undefined
        ? { postsPerWeek: Math.min(Math.max(Math.round(input.postsPerWeek) || 0, 0), 30) }
        : {}),
      ...(input.publishTimes !== undefined
        ? {
            publishTimes: input.publishTimes
              .filter((t) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t))
              .slice(0, 6),
          }
        : {}),
      ...(input.timezone !== undefined ? { timezone: input.timezone.trim().slice(0, 60) || 'UTC' } : {}),
      ...(input.maxAttempts !== undefined
        ? { maxAttempts: Math.min(Math.max(Math.round(input.maxAttempts) || 3, 1), 10) }
        : {}),
      ...(input.maxArticlesPerDay !== undefined
        ? { maxArticlesPerDay: Math.min(Math.max(Math.round(input.maxArticlesPerDay) || 2, 0), 20) }
        : {}),
      ...(input.customInstructions !== undefined
        ? { customInstructions: input.customInstructions.trim().slice(0, 2000) || null }
        : {}),
      ...(input.paused !== undefined ? { paused: input.paused } : {}),
    };

    // Validate category + author ownership for this site.
    if (merged.categoryIds.length > 0) {
      const valid = await getPrisma().category.findMany({
        where: { siteId, id: { in: merged.categoryIds } },
        select: { id: true },
      });
      merged.categoryIds = valid.map((v) => v.id);
    }
    if (merged.authorId) {
      const author = await getPrisma().author.findFirst({
        where: { id: merged.authorId, siteId },
        select: { id: true },
      });
      if (!author) {
        throw new ValidationError('The selected author does not belong to this website.');
      }
    }

    const data = {
      enabled: merged.enabled,
      provider: merged.provider,
      model: merged.model,
      language: merged.language,
      tone: merged.tone,
      audience: merged.audience,
      wordCountTarget: merged.wordCountTarget,
      format: merged.format,
      authorId: merged.authorId,
      categoryIds: merged.categoryIds,
      publishMode: merged.publishMode,
      postsPerWeek: merged.postsPerWeek,
      publishTimes: merged.publishTimes,
      timezone: merged.timezone,
      maxAttempts: merged.maxAttempts,
      maxArticlesPerDay: merged.maxArticlesPerDay,
      customInstructions: merged.customInstructions,
      paused: merged.paused,
    };
    const row = await getPrisma().aiSettings.upsert({
      where: { siteId },
      create: { siteId, ...data },
      update: data,
    });
    await getPrisma().auditLog.create({
      data: {
        actorId: actor.id,
        actorEmail: actor.email,
        action: 'ai.settings_update',
        targetSiteId: siteId,
        summary: `AI automation settings updated (enabled=${String(merged.enabled)}, provider=${merged.provider}, model="${merged.model || 'none'}", mode=${merged.publishMode}, paused=${String(merged.paused)}).`,
      },
    });
    return ok(mapSettings(row));
  } catch (error) {
    return aiError(error, 'save AI settings');
  }
}

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

function aiError(error: unknown, context: string): ServiceResult<never> {
  if (error instanceof ValidationError) return fail(error.message, 'VALIDATION');
  if (error instanceof AiProviderError) return fail(error.message, 'UNAVAILABLE');
  if (isDataUnavailableError(error)) {
    return fail('The database is temporarily unavailable. Try again shortly.', 'UNAVAILABLE');
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    return fail('That value already exists.', 'CONFLICT');
  }
  if (error instanceof Error && error.name === 'ForbiddenError') {
    return fail(error.message, 'FORBIDDEN');
  }
  console.error(`[ai] failed to ${context}:`, error instanceof Error ? error.message : error);
  return fail(`Could not ${context}. Please try again.`, 'UNAVAILABLE');
}

/* -------------------------------- topics ---------------------------------- */

export interface AiTopicInput {
  title: string;
  keywords?: string[];
  excluded?: string[];
  notes?: string;
  active?: boolean;
}

export async function listTopics(actor: AdminSessionUser, siteId: string) {
  try {
    await assertSiteAccess(actor, siteId);
    const rows = await getPrisma().aiTopic.findMany({
      where: { siteId },
      orderBy: { createdAt: 'desc' },
    });
    return ok(rows);
  } catch (error) {
    return aiError(error, 'list AI topics');
  }
}

export async function createTopic(actor: AdminSessionUser, siteId: string, input: AiTopicInput) {
  try {
    await assertSiteAccess(actor, siteId);
    const title = (input.title ?? '').trim();
    if (title.length < 3 || title.length > 200) {
      return fail('Topic must be 3-200 characters.', 'VALIDATION');
    }
    const row = await getPrisma().aiTopic.create({
      data: {
        siteId,
        title,
        keywords: (input.keywords ?? []).map((k) => k.trim()).filter(Boolean).slice(0, 12),
        excluded: (input.excluded ?? []).map((k) => k.trim()).filter(Boolean).slice(0, 12),
        notes: input.notes?.trim().slice(0, 1000) || null,
        active: input.active ?? true,
      },
    });
    await getPrisma().auditLog.create({
      data: {
        actorId: actor.id, actorEmail: actor.email, action: 'ai.topic_create',
        targetSiteId: siteId, summary: `Created AI topic "${title}".`,
      },
    });
    return ok(row);
  } catch (error) {
    return aiError(error, 'create AI topic');
  }
}

export async function deleteTopic(actor: AdminSessionUser, siteId: string, topicId: string) {
  try {
    await assertSiteAccess(actor, siteId);
    const existing = await getPrisma().aiTopic.findFirst({ where: { id: topicId, siteId } });
    if (!existing) return fail('Topic not found on this website.', 'NOT_FOUND');
    // Jobs keep a snapshot title (topicId is SetNull) — safe to delete.
    await getPrisma().aiTopic.delete({ where: { id: topicId } });
    await getPrisma().auditLog.create({
      data: {
        actorId: actor.id, actorEmail: actor.email, action: 'ai.topic_delete',
        targetSiteId: siteId, summary: `Deleted AI topic "${existing.title}".`,
      },
    });
    return ok({ deleted: existing.title });
  } catch (error) {
    return aiError(error, 'delete AI topic');
  }
}

/* ------------------------------ job enqueue ------------------------------- */

export async function enqueueGeneration(
  actor: AdminSessionUser,
  siteId: string,
  options?: { topicId?: string; scheduledAt?: Date; idempotencyKey?: string },
): Promise<ServiceResult<{ jobId: string }>> {
  try {
    await assertSiteAccess(actor, siteId);
    const settings = await getAiSettings(actor, siteId);
    if (!settings.ok) return settings;
    const config = settings.data;

    if (config.paused) return fail('AI automation is paused for this website. Resume it first.', 'CONFLICT');
    if (!config.enabled) {
      return fail('Enable AI automation in the settings before generating articles.', 'CONFLICT');
    }
    if (!config.model) return fail('Select a model in the AI settings first.', 'CONFLICT');

    // Daily limit: succeeded generations for this site today (UTC day).
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const todayCount = await getPrisma().aiJob.count({
      where: { siteId, status: 'SUCCEEDED', finishedAt: { gte: startOfDay } },
    });
    if (todayCount >= config.maxArticlesPerDay) {
      return fail(
        `Daily limit reached (${config.maxArticlesPerDay} articles/day). Try again tomorrow.`,
        'CONFLICT',
      );
    }

    // Pick an eligible topic (active, not recently used) unless one was given.
    let topic: { id: string; title: string; keywords: string[]; excluded: string[] } | null = null;
    if (options?.topicId) {
      const t = await getPrisma().aiTopic.findFirst({ where: { id: options.topicId, siteId } });
      if (!t) return fail('Topic not found on this website.', 'NOT_FOUND');
      topic = t;
    } else {
      const candidates = await getPrisma().aiTopic.findMany({
        where: { siteId, active: true },
        orderBy: [{ lastUsedAt: 'asc' }, { usageCount: 'asc' }],
        take: 5,
      });
      topic = candidates[0] ?? null;
    }
    if (!topic) {
      return fail('No active topics configured. Add a topic first.', 'CONFLICT');
    }

    const idempotencyKey =
      options?.idempotencyKey ?? `gen:${siteId}:${topic.id}:${new Date().toISOString().slice(0, 13)}`;
    const job = await getPrisma().aiJob.create({
      data: {
        siteId,
        topicId: topic.id,
        topicTitle: topic.title,
        scheduledAt: options?.scheduledAt ?? new Date(),
        maxAttempts: config.maxAttempts,
        idempotencyKey,
        metadata: {
          provider: config.provider,
          model: config.model,
          mode: config.publishMode,
          promptVersion: 1,
        },
      },
      select: { id: true },
    });
    await getPrisma().auditLog.create({
      data: {
        actorId: actor.id, actorEmail: actor.email, action: 'ai.job_enqueue',
        targetSiteId: siteId,
        summary: `Queued AI generation for topic "${topic.title}" (job ${job.id.slice(0, 8)}).`,
      },
    });
    return ok({ jobId: job.id });
  } catch (error) {
    return aiError(error, 'queue AI generation');
  }
}

/* ------------------------- manual generate (action) ------------------------ */

export async function generateNow(
  actor: AdminSessionUser,
  siteId: string,
  topicId?: string,
): Promise<ServiceResult<{ jobId: string }>> {
  try {
    await assertSiteAccess(actor, siteId);
    const rate = checkRateLimit(`${actor.id}:${siteId}`, { limit: 3, windowMs: 10 * 60_000, scope: 'ai-generate' });
    if (!rate.allowed) {
      return fail(
        `Too many generation requests. Try again in about ${Math.ceil(rate.retryAfterSeconds / 60)} minute(s).`,
        'CONFLICT',
      );
    }
  } catch (error) {
    return aiError(error, 'check generation limits');
  }
  return enqueueGeneration(actor, siteId, { topicId });
}

/* ----------------------------- job processing ----------------------------- */

export interface ClaimedJob {
  id: string;
  siteId: string;
  topicId: string | null;
  topicTitle: string;
  attempts: number;
  maxAttempts: number;
  metadata: { provider?: string; model?: string; mode?: string; promptVersion?: number };
}

/**
 * Atomically claim the next eligible job (FOR UPDATE SKIP LOCKED). The claim
 * transaction is short — provider calls happen after it commits.
 */
export async function claimNextJob(workerId: string): Promise<ClaimedJob | null> {
  const claimed = await getPrisma().$transaction(async (tx) => {
    const rows = await tx.$queryRaw<
      { id: string; site_id: string; topic_id: string | null; topic_title: string; attempts: number; max_attempts: number; metadata: unknown }[]
    >(Prisma.sql`
      UPDATE ai_jobs SET status = 'PROCESSING', worker_id = ${workerId}, started_at = now(), attempts = attempts + 1
      WHERE id = (
        SELECT j.id FROM ai_jobs j
        WHERE j.status = 'PENDING' AND j.scheduled_at <= (now() AT TIME ZONE 'UTC')
        ORDER BY j.scheduled_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      )
      RETURNING id, site_id, topic_id, topic_title, attempts, max_attempts, metadata;
    `);
    return rows[0] ?? null;
  });
  if (!claimed) return null;
  const meta = (claimed.metadata ?? {}) as ClaimedJob['metadata'];
  return {
    id: claimed.id,
    siteId: claimed.site_id,
    topicId: claimed.topic_id,
    topicTitle: claimed.topic_title,
    attempts: claimed.attempts,
    maxAttempts: claimed.max_attempts,
    metadata: meta,
  };
}

/** Recover stale PROCESSING jobs whose lease expired. */
export async function recoverStaleJobs(leaseMinutes = 30): Promise<number> {
  const cutoff = new Date(Date.now() - leaseMinutes * 60_000);
  const result = await getPrisma().aiJob.updateMany({
    where: { status: 'PROCESSING', startedAt: { lt: cutoff } },
    data: { status: 'PENDING', startedAt: null, workerId: null },
  });
  return result.count;
}

/** Mark a finished job and its topic usage. */
async function completeJob(jobId: string, status: 'SUCCEEDED' | 'FAILED', patch: { error?: string; postId?: number }) {
  await getPrisma().aiJob.update({
    where: { id: jobId },
    data: {
      status,
      finishedAt: new Date(),
      error: patch.error ?? null,
      postId: patch.postId ?? undefined,
    },
  });
}

function rethrowDelay(attempts: number): number {
  // Bounded exponential backoff: 1min, 4min, 16min…
  return Math.min(60_000 * 4 ** Math.max(attempts - 1, 0), 30 * 60_000);
}

async function failJob(job: ClaimedJob, message: string): Promise<void> {
  if (job.attempts >= job.maxAttempts) {
    await completeJob(job.id, 'FAILED', { error: message });
    await getPrisma().auditLog.create({
      data: {
        actorEmail: 'ai-worker@system', action: 'ai.generate_failed',
        targetSiteId: job.siteId, summary: `AI generation failed permanently for topic "${job.topicTitle}": ${message}`,
      },
    });
  } else {
    const retryAt = new Date(Date.now() + rethrowDelay(job.attempts));
    await getPrisma().aiJob.update({
      where: { id: job.id },
      data: { status: 'PENDING', error: message, scheduledAt: retryAt, startedAt: null, workerId: null },
    });
  }
}

/**
 * Process a claimed job: build the prompt, call the provider, validate, and
 * save a draft through the existing content service (which audits itself).
 * The provider is injectable for deterministic tests.
 */
export async function processJob(
  job: ClaimedJob,
  options?: { provider?: AiProvider; siteConfig?: AiSiteConfig },
): Promise<void> {
  const prisma = getPrisma();
  try {
    // Load site config + topic (site-scoped by construction).
    const settingsRow = await prisma.aiSettings.findUnique({ where: { siteId: job.siteId } });
    const config: AiSiteConfig = options?.siteConfig ?? (settingsRow
      ? mapSettings(settingsRow)
      : { ...defaultConfig(job.siteId), model: job.metadata.model ?? '' });

    if (config.paused) {
      await failJob(job, 'AI automation is paused for this website.');
      return;
    }

    const provider = options?.provider ?? createProvider(config.provider as AiSiteConfig['provider']);
    const topic = job.topicId
      ? await prisma.aiTopic.findUnique({ where: { id: job.topicId } })
      : null;
    const keywords = topic?.keywords ?? [];
    const excluded = topic?.excluded ?? [];

    // Duplicate prevention: skip topics already used in the last 14 days.
    if (topic) {
      const usedRecently =
        topic.lastUsedAt && Date.now() - topic.lastUsedAt.getTime() < 14 * 24 * 3600 * 1000;
      if (usedRecently && job.attempts === 1) {
        await failJob(job, 'This topic was used within the last 14 days. Add new topics or wait.');
        return;
      }
    }
    const recentTitles = (
      await prisma.post.findMany({
        where: { siteId: job.siteId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { title: true },
      })
    ).map((p) => p.title);

    const site = await prisma.site.findUnique({ where: { id: job.siteId }, select: { name: true } });
    const siteSettings = await prisma.siteSettings.findUnique({ where: { siteId: job.siteId } });
    const siteName = site?.name ?? job.siteId;
    const identity = siteSettings?.identity;
    const siteTagline =
      identity && typeof identity === 'object' && 'tagline' in identity
        ? String((identity as { tagline: unknown }).tagline)
        : '';

    const categoryNames =
      config.categoryIds.length > 0
        ? (
            await prisma.category.findMany({
              where: { siteId: job.siteId, id: { in: config.categoryIds } },
              select: { name: true },
            })
          ).map((c) => c.name)
        : [];

    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt({
      config: {
        language: config.language,
        tone: config.tone,
        audience: config.audience,
        wordCountTarget: config.wordCountTarget,
        format: config.format,
        customInstructions: config.customInstructions,
      },
      siteName,
      siteTagline,
      topicTitle: job.topicTitle,
      keywords,
      excluded,
      categoryNames,
      recentTitles,
    });

    const raw = await provider.generate({
      systemPrompt,
      userPrompt,
      model: config.model || job.metadata.model || '',
      timeoutMs: GENERATION_TIMEOUT_MS,
    });
    const article = parseArticleResponse(raw, config.wordCountTarget);

    // Duplicate title check (normalized).
    const normalizedTitle = article.title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const duplicate = await prisma.post.findFirst({
      where: { siteId: job.siteId, title: { contains: normalizedTitle.split(' ').slice(0, 6).join(' '), mode: 'insensitive' } },
      select: { id: true },
    });
    if (duplicate) {
      await failJob(job, `A very similar article already exists on this website ("${article.title}").`);
      return;
    }

    // Uniquify the slug if needed (worker-side pre-check before createPost).
    let slug = article.slug;
    let suffix = 2;
    while (await prisma.post.findUnique({ where: { siteId_slug: { siteId: job.siteId, slug } }, select: { id: true } })) {
      slug = `${article.slug}-${suffix}`;
      suffix += 1;
      if (suffix > 20) {
        await failJob(job, 'Could not derive a unique slug for the generated article.');
        return;
      }
    }

    // Resolve the site-scoped author (config) or the site's first author.
    let authorId = config.authorId;
    if (!authorId) {
      const firstAuthor = await prisma.author.findFirst({
        where: { siteId: job.siteId },
        orderBy: { name: 'asc' },
        select: { id: true },
      });
      authorId = firstAuthor?.id ?? null;
    }
    if (!authorId) {
      await failJob(job, 'No author configured for this website. Add one in Content → Authors.');
      return;
    }

    // System actor: the worker is a trusted server-side process. Its audit
    // entries are attributed to ai-worker@system (a provisioned account with
    // an unknown password — it cannot be logged into).
    const systemActor = AI_WORKER_ACTOR;

    // Resolve a site-scoped category from the allowlist (first allowed).
    let categoryId: string | undefined;
    if (config.categoryIds.length > 0) {
      const category = await prisma.category.findFirst({
        where: { siteId: job.siteId, id: { in: config.categoryIds } },
        select: { id: true },
      });
      categoryId = category?.id;
    }

    // Articles go through the existing POST service: the post model matches
    // the output contract exactly (excerpt, paragraph body, author,
    // category, SEO, tags) and inherits all its validation + audit.
    const result = await createPost(
      systemActor,
      job.siteId,
      {
        title: article.title,
        slug,
        excerpt: article.excerpt,
        body: article.body,
        authorId,
        categoryId,
        seoTitle: article.seoTitle,
        seoDescription: article.seoDescription,
        tags: article.tags,
        status: 'DRAFT',
      },
    );

    if (!result.ok) {
      await failJob(job, result.error);
      return;
    }

    await prisma.$transaction([
      ...(topic
        ? [
            prisma.aiTopic.update({
              where: { id: topic.id },
              data: { lastUsedAt: new Date(), usageCount: { increment: 1 } },
            }),
          ]
        : []),
      prisma.aiSettings.updateMany({
        where: { siteId: job.siteId },
        data: { lastGenerationAt: new Date() },
      }),
    ]);

    // Metadata update: postId + publishAt for scheduled mode.
    const publishAt =
      config.publishMode === 'SCHEDULED' ? new Date(Date.now() + 24 * 3600 * 1000) : null;
    await prisma.aiJob.update({
      where: { id: job.id },
      data: {
        status: 'SUCCEEDED',
        finishedAt: new Date(),
        postId: result.data.id,
        error: null,
        metadata: {
          ...(job.metadata ?? {}),
          provider: config.provider,
          model: config.model,
          mode: config.publishMode,
          promptVersion: PROMPT_VERSION,
          slug,
          wordCount: article.wordCount,
          language: article.language,
          ...(publishAt ? { publishAt: publishAt.toISOString() } : {}),
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        actorEmail: 'ai-worker@system',
        action: 'ai.generate_success',
        targetSiteId: job.siteId,
        summary: `AI generated a draft from topic "${job.topicTitle}" (provider=${config.provider}, model=${config.model}, ~${article.wordCount} words).`,
      },
    });

    // Autopilot: publish immediately, guarded by the same service.
    if (config.publishMode === 'AUTOPILOT' && !config.paused) {
      const published = await publishPostBySlug(systemActor, job.siteId, slug);
      if (published) {
        await prisma.auditLog.create({
          data: {
            actorEmail: 'ai-worker@system',
            action: 'ai.autopilot_publish',
            targetSiteId: job.siteId,
            summary: `Autopilot published AI-generated article "${article.title}".`,
          },
        });
      }
    }
  } catch (error) {
    if (error instanceof AiProviderError) {
      await failJob(job, error.message);
      return;
    }
    if (isDataUnavailableError(error)) {
      await failJob(job, 'Database unavailable during processing.');
      return;
    }
    console.error('[ai] unexpected job failure:', error instanceof Error ? error.message : error);
    await failJob(job, 'Unexpected processing error.');
  }
}

async function publishPostBySlug(actor: AdminSessionUser, siteId: string, slug: string): Promise<boolean> {
  const post = await getPrisma().post.findUnique({
    where: { siteId_slug: { siteId, slug } },
    select: { id: true },
  });
  if (!post) return false;
  const result = await setPostStatus(actor, siteId, post.id, 'PUBLISHED');
  return result.ok;
}

/* ------------------------------- page creation ---------------------------- */

// createPage is reused for drafts; pages (not posts) are the AI output target
// because the block model matches structured generation. The publish sweep is
// shared with the worker.


/* ------------------------------ publish sweep ----------------------------- */

/** Publish scheduled drafts whose publishAt has arrived. Returns count. */
export async function publishSweep(): Promise<number> {
  const prisma = getPrisma();
  const now = new Date();
  const dueJobs = await prisma.aiJob.findMany({
    where: { status: 'SUCCEEDED', postId: { not: null } },
    take: 20,
    orderBy: { finishedAt: 'asc' },
  });
  let published = 0;
  for (const job of dueJobs) {
    const meta = (job.metadata ?? {}) as { mode?: string; publishAt?: string; published?: boolean };
    if (meta.published || !meta.publishAt) continue;
    if (meta.mode !== 'SCHEDULED' && meta.mode !== 'AUTOPILOT') continue;
    if (new Date(meta.publishAt) > now) continue;
    if (job.postId === null) continue;
    const systemActor: AdminSessionUser = {
      ...AI_WORKER_ACTOR,
    };
    const result = await setPostStatus(systemActor, job.siteId, job.postId, 'PUBLISHED');
    if (result.ok) {
      published += 1;
      const updatedMeta = { ...meta, published: true };
      await prisma.aiJob.update({ where: { id: job.id }, data: { metadata: updatedMeta as never } });
      await prisma.auditLog.create({
        data: {
          actorEmail: 'ai-worker@system', action: 'ai.scheduled_publish',
          targetSiteId: job.siteId,
          summary: `Scheduled AI content published (job ${job.id.slice(0, 8)}).`,
        },
      });
    }
  }
  return published;
}

/* --------------------------- scheduling sweep ----------------------------- */

/** Local date (yyyy-mm-dd) in a timezone, without external deps. */
function localDateIn(timezone: string, at: Date = new Date()): string | null {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(at);
  } catch {
    return null;
  }
}

function localTimeIn(timezone: string, at: Date = new Date()): string | null {
  try {
    return new Intl.DateTimeFormat('en-GB', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: false }).format(at);
  } catch {
    return null;
  }
}

/**
 * Scheduling sweep: for each enabled site (not paused, not DRAFT mode),
 * enqueue today's generation jobs once per local day. Bounded. Called by the
 * worker each cycle and by the CRON endpoint.
 */
export async function schedulingSweep(): Promise<number> {
  const prisma = getPrisma();
  const now = new Date();
  let enqueued = 0;

  const settings = await prisma.aiSettings.findMany({
    where: { enabled: true, paused: false, publishMode: { not: 'DRAFT' } },
  });

  for (const cfg of settings) {
    const today = localDateIn(cfg.timezone);
    if (!today) continue;
    if (cfg.lastScheduleDate === today) continue; // already scheduled today

    // Respect weekly cap: succeeded jobs in the last 7 days.
    const weekAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
    const weekCount = await prisma.aiJob.count({
      where: { siteId: cfg.siteId, status: 'SUCCEEDED', finishedAt: { gte: weekAgo } },
    });
    if (weekCount >= cfg.postsPerWeek) {
      await prisma.aiSettings.update({ where: { siteId: cfg.siteId }, data: { lastScheduleDate: today } });
      continue;
    }

    const localTime = localTimeIn(cfg.timezone) ?? '00:00';
    const dueTime = (cfg.publishTimes.length > 0 ? cfg.publishTimes : ['09:00']).some((t) => t <= localTime);
    if (cfg.publishTimes.length > 0 && !dueTime) continue;

    const topics = await prisma.aiTopic.findMany({
      where: { siteId: cfg.siteId, active: true },
      orderBy: [{ lastUsedAt: 'asc' }, { usageCount: 'asc' }],
      take: cfg.maxArticlesPerDay,
    });
    if (topics.length === 0) continue;

    for (const topic of topics.slice(0, Math.min(cfg.maxArticlesPerDay, Math.max(cfg.postsPerWeek - weekCount, 0)))) {
      const key = `sched:${cfg.siteId}:${topic.id}:${today}`;
      const existing = await prisma.aiJob.findUnique({ where: { idempotencyKey: key }, select: { id: true } });
      if (existing) continue;
      await prisma.aiJob.create({
        data: {
          siteId: cfg.siteId,
          topicId: topic.id,
          topicTitle: topic.title,
          maxAttempts: cfg.maxAttempts,
          idempotencyKey: key,
          metadata: { provider: cfg.provider, model: cfg.model, mode: cfg.publishMode, promptVersion: PROMPT_VERSION },
        },
      });
      enqueued += 1;
    }
    await prisma.aiSettings.update({ where: { siteId: cfg.siteId }, data: { lastScheduleDate: today } });
    if (enqueued >= 10) break; // global bound per sweep
  }
  return enqueued;
}
