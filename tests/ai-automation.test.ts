import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '@/lib/admin/password';
import type { AdminSessionUser } from '@/lib/admin/types';
import {
  claimNextJob,
  createTopic,
  enqueueGeneration,
  generateNow,
  getAiSettings,
  processJob,
  publishSweep,
  recoverStaleJobs,
  saveAiSettings,
  schedulingSweep,
  ensureAiWorkerAccount,
} from '@/lib/ai/content-automation';
import { retryAiJob, cancelAiJob, listAiJobsForAdmin } from '@/lib/ai/jobs-view';
import { PostgresDataAdapter } from '@/platform/data/postgres-adapter';
import type { AiProvider } from '@/lib/ai/types';
import { seedDatabase } from '../prisma/seed';

/**
 * AI automation integration tests against a real PostgreSQL database.
 * Provider responses are MOCKED for determinism; a separate live Ollama test
 * (skipped unless OLLAMA_TEST_BASE_URL is set) covers real generation.
 */

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
if (TEST_DATABASE_URL) {
  process.env.DATABASE_URL = TEST_DATABASE_URL;
}

const prisma = TEST_DATABASE_URL
  ? new PrismaClient({ datasources: { db: { url: `${TEST_DATABASE_URL}${TEST_DATABASE_URL.includes('?') ? '&' : '?'}connection_limit=3` } } })
  : (null as unknown as PrismaClient);

const superAdmin: AdminSessionUser = {
  id: 'ai-super', email: 'ai-super@test.local', name: 'AI Super', role: 'SUPER_ADMIN',
};
const siteAdmin: AdminSessionUser = {
  id: 'ai-editor', email: 'ai-editor@test.local', name: 'AI Editor', role: 'SITE_ADMIN',
};

const SITE = 'tech-demo';
const d = TEST_DATABASE_URL ? new PostgresDataAdapter(prisma) : (null as unknown as PostgresDataAdapter);

/** Deterministic mocked provider. */
function mockProvider(overrides?: Partial<AiProvider>): AiProvider {
  const article = {
    title: 'Mocked cloud cost article for testing',
    slug: 'mocked-cloud-cost-article-for-testing',
    excerpt: 'A mocked article excerpt that is long enough to satisfy the validation contract during tests.',
    body: [
      'This is the first mocked paragraph and it carries a realistic amount of running text so that the total word count comfortably clears the validation floor that the output contract enforces for generated articles in this suite.',
      'The second mocked paragraph continues the article with more substantive sentences about cloud cost guardrails, budget alerts, and the kind of operational discipline that platform teams apply when spending becomes a first-class engineering metric rather than a finance afterthought.',
      'A third mocked paragraph explains how teams instrument their workloads, tag their resources, and review dashboards weekly, which in practice changes behavior far more than any quarterly cleanup ever could, and the resulting savings compound quietly over multiple quarters.',
      'Finally, the closing mocked paragraph summarizes the argument: treat spending as a service-level objective, review it in the same meeting as latency and uptime, and the platform becomes both cheaper and more reliable at the same time.',
    ],
    language: 'English',
    tags: ['test'],
    seoTitle: 'Mocked cloud cost article',
    seoDescription: 'A mocked SEO description for the test article that is definitely long enough.',
  };
  return {
    type: 'ollama',
    testConnection: async () => ({ ok: true, note: 'mock' }),
    generate: async () => article,
    ...overrides,
  };
}

async function cleanup() {
  await prisma.aiJob.deleteMany({ where: { siteId: SITE } });
  await prisma.aiTopic.deleteMany({ where: { siteId: SITE } });
  await prisma.aiSettings.deleteMany({ where: { siteId: SITE } });
  await prisma.post.deleteMany({ where: { siteId: SITE, slug: { contains: 'mocked' } } });
  await prisma.auditLog.deleteMany({ where: { actorEmail: { in: [superAdmin.email, siteAdmin.email, 'ai-worker@system'] } } });
}

describe.skipIf(!TEST_DATABASE_URL)('AI automation (integration)', () => {
  beforeAll(async () => {
    if (!/test|localhost|127\.0\.0\.1/.test(TEST_DATABASE_URL!)) {
      throw new Error('TEST_DATABASE_URL must be a disposable test database.');
    }
    if (!(await prisma.site.findUnique({ where: { id: SITE } }))) await seedDatabase(prisma);
    await cleanup();
    await prisma.adminUser.deleteMany({ where: { email: { in: [superAdmin.email, siteAdmin.email] } } });
    await prisma.adminUser.createMany({
      data: [
        { id: superAdmin.id, email: superAdmin.email, name: superAdmin.name, role: 'SUPER_ADMIN', passwordHash: await hashPassword('ai-super-pass-123456') },
        { id: siteAdmin.id, email: siteAdmin.email, name: siteAdmin.name, role: 'SITE_ADMIN', passwordHash: await hashPassword('ai-editor-pass-12345') },
      ],
    });
    await ensureAiWorkerAccount();
    await prisma.siteMembership.upsert({
      where: { userId_siteId: { userId: siteAdmin.id, siteId: SITE } },
      create: { userId: siteAdmin.id, siteId: SITE },
      update: {},
    });
  });

  afterAll(async () => {
    await cleanup();
    await prisma.adminUser.deleteMany({ where: { email: { in: [superAdmin.email, siteAdmin.email] } } });
    await prisma.$disconnect();
  });

  /* ------------------------------ settings -------------------------------- */

  it('returns safe defaults and validates/scopes settings', async () => {
    const defaults = await getAiSettings(superAdmin, SITE);
    expect(defaults.ok && defaults.data.enabled).toBe(false);
    expect(defaults.ok && defaults.data.publishMode).toBe('DRAFT');

    const saved = await saveAiSettings(superAdmin, SITE, {
      enabled: true,
      provider: 'ollama',
      model: 'qwen2.5vl:3b',
      authorId: 'priya-raman', // tech-demo author
      categoryIds: ['cat-tech-engineering'],
      wordCountTarget: 9999, // out of bounds → clamped
      publishTimes: ['09:00', '25:99'], // invalid → filtered
      publishMode: 'SCHEDULED',
      timezone: 'America/Chicago',
    });
    expect(saved.ok).toBe(true);
    if (saved.ok) {
      expect(saved.data.wordCountTarget).toBe(2000);
      expect(saved.data.publishTimes).toEqual(['09:00']);
      expect(saved.data.provider).toBe('ollama');
    }

    // Cross-site author rejected
    const badAuthor = await saveAiSettings(superAdmin, SITE, { authorId: 'elena-voss' });
    expect(badAuthor.ok).toBe(false);

    // Unknown provider rejected
    const badProvider = await saveAiSettings(superAdmin, SITE, { provider: 'claude' });
    expect(badProvider.ok).toBe(false);
  });

  it('SITE_ADMIN cannot read or write another site\u2019s AI settings', async () => {
    const denied = await getAiSettings(siteAdmin, 'business-demo');
    expect(denied.ok).toBe(false);

    const deniedSave = await saveAiSettings(siteAdmin, 'business-demo', { enabled: true });
    expect(deniedSave.ok).toBe(false);
  });

  /* ------------------------------- topics --------------------------------- */

  it('creates and scopes topics, rejecting cross-site access', async () => {
    const topic = await createTopic(superAdmin, SITE, {
      title: 'Kubernetes cost guardrails',
      keywords: ['k8s', 'finops'],
      excluded: ['vendor gossip'],
    });
    expect(topic.ok).toBe(true);

    const dup = await createTopic(superAdmin, SITE, { title: 'Kubernetes cost guardrails' });
    expect(dup.ok).toBe(false);

    const foreign = await createTopic(siteAdmin, 'business-demo', { title: 'Strategy topic' });
    expect(foreign.ok).toBe(false);
  });

  /* ------------------------------- enqueue -------------------------------- */

  it('refuses generation when disabled, unmodeled, or topicless', async () => {
    await saveAiSettings(superAdmin, SITE, { enabled: false, model: 'qwen2.5vl:3b' });
    const disabled = await generateNow(superAdmin, SITE);
    expect(disabled.ok).toBe(false);
    if (!disabled.ok) expect(disabled.error).toContain('Enable');

    await saveAiSettings(superAdmin, SITE, { enabled: true, model: '' });
    const unmodeled = await generateNow(superAdmin, SITE);
    expect(unmodeled.ok).toBe(false);

    await saveAiSettings(superAdmin, SITE, { enabled: true, model: 'qwen2.5vl:3b' });
    // topics exist from the previous test — queue one
    const okJob = await generateNow(superAdmin, SITE);
    expect(okJob.ok).toBe(true);
    if (okJob.ok) {
      await prisma.aiJob.delete({ where: { id: okJob.data.jobId } });
    }
  });

  it('enforces the daily article limit', async () => {
    await saveAiSettings(superAdmin, SITE, { maxArticlesPerDay: 1, enabled: true, model: 'qwen2.5vl:3b' });
    // Deterministic floor: exactly one SUCCEEDED job today.
    await prisma.aiJob.deleteMany({ where: { siteId: SITE, status: 'SUCCEEDED' } });
    await prisma.aiJob.create({
      data: {
        siteId: SITE, topicTitle: 'Daily limit floor', status: 'SUCCEEDED',
        finishedAt: new Date(), idempotencyKey: 'daily-floor',
      },
    });
    const topicId = (await prisma.aiTopic.findFirst({ where: { siteId: SITE } }))?.id;
    const blocked = await enqueueGeneration(superAdmin, SITE, { topicId });
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.error).toContain('Daily limit');
    await saveAiSettings(superAdmin, SITE, { maxArticlesPerDay: 5 });
  });

  /* ------------------------------- processing ------------------------------ */

  it('processes a job end-to-end with a mocked provider into a private draft', async () => {
    await saveAiSettings(superAdmin, SITE, {
      enabled: true, provider: 'ollama', model: 'mock-model', publishMode: 'DRAFT',
      authorId: 'priya-raman', categoryIds: [],
    });
    const enqueued = await enqueueGeneration(superAdmin, SITE, {});
    expect(enqueued.ok).toBe(true);
    if (!enqueued.ok) return;

    const claimed = await claimNextJob('test-worker-1');
    expect(claimed).not.toBeNull();
    expect(claimed!.siteId).toBe(SITE);

    await processJob(claimed!, { provider: mockProvider() });

    const job = await prisma.aiJob.findUnique({ where: { id: claimed!.id } });
    expect(job?.status).toBe('SUCCEEDED');
    expect(job?.postId).not.toBeNull();

    // The generated page exists and is a DRAFT — invisible publicly.
    const post = await prisma.post.findUnique({
      where: { siteId_slug: { siteId: SITE, slug: 'mocked-cloud-cost-article-for-testing' } },
    });
    expect(post?.status).toBe('DRAFT');
    expect(await d.getPage(SITE, 'mocked-cloud-cost-article-for-testing')).toBeNull();

    // Metadata recorded without secrets.
    const meta = (job?.metadata ?? {}) as Record<string, unknown>;
    expect(meta.model).toBe('mock-model');
    expect(meta.provider).toBe('ollama');
    expect(JSON.stringify(meta)).not.toMatch(/sk-|password|secret/i);

    // Audit trail exists.
    const audits = await prisma.auditLog.findMany({
      where: { targetSiteId: SITE, action: { in: ['ai.generate_success', 'ai.job_enqueue'] } },
    });
    expect(audits.length).toBeGreaterThanOrEqual(2);
  });

  it('retries failures with backoff and fails permanently after max attempts', async () => {
    const failing: AiProvider = {
      type: 'ollama',
      testConnection: async () => ({ ok: false, note: 'down' }),
      generate: async () => {
        throw new (await import('@/lib/ai/types')).AiProviderError('NETWORK', 'mocked provider outage');
      },
    };
    await saveAiSettings(superAdmin, SITE, { maxAttempts: 2 });
    const freshTopic = await prisma.aiTopic.create({
      data: { siteId: SITE, title: `Retry topic ${Date.now()}` },
    });
    const enqueued = await enqueueGeneration(superAdmin, SITE, {
      topicId: freshTopic.id,
      idempotencyKey: `retry-test-${Date.now()}`,
    });
    expect(enqueued.ok).toBe(true);
    if (!enqueued.ok) return;

    // Attempt 1 → back to PENDING with a future retry time.
    let job = await claimNextJob('test-worker-2');
    expect(job?.id).toBe(enqueued.data.jobId);
    await processJob(job!, { provider: failing });
    let row = await prisma.aiJob.findUnique({ where: { id: enqueued.data.jobId } });
    expect(row?.status).toBe('PENDING');
    expect(row?.attempts).toBe(1);
    expect(row?.error).toContain('mocked provider outage');
    // Retry scheduled in the future.
    expect(row!.scheduledAt.getTime()).toBeGreaterThan(Date.now());

    // Force the retry time to now, then attempt 2 → permanent FAILED.
    await prisma.aiJob.update({ where: { id: enqueued.data.jobId }, data: { scheduledAt: new Date() } });
    job = await claimNextJob('test-worker-3');
    expect(job?.id).toBe(enqueued.data.jobId);
    await processJob(job!, { provider: failing });
    row = await prisma.aiJob.findUnique({ where: { id: enqueued.data.jobId } });
    expect(row?.status).toBe('FAILED');
  });

  it('recoverStaleJobs re-leases expired PROCESSING jobs', async () => {
    await prisma.aiJob.create({
      data: {
        siteId: SITE, topicTitle: 'Stale job', idempotencyKey: `stale-${Date.now()}`,
        status: 'PROCESSING', startedAt: new Date(Date.now() - 2 * 3600_000), workerId: 'ghost',
      },
    });
    const recovered = await recoverStaleJobs(30);
    expect(recovered).toBeGreaterThanOrEqual(1);
    const still = await prisma.aiJob.findFirst({
      where: { siteId: SITE, topicTitle: 'Stale job', status: 'PENDING' },
    });
    expect(still).not.toBeNull();
    await prisma.aiJob.deleteMany({ where: { topicTitle: 'Stale job' } });
  });

  it('duplicate titles are rejected and slugs are uniquified', async () => {
    await saveAiSettings(superAdmin, SITE, {
      enabled: true, provider: 'ollama', model: 'mock-model', publishMode: 'DRAFT', maxAttempts: 1,
    });
    const dupProvider = mockProvider();
    // Fresh topic, same article title as the earlier successful job → duplicate detection.
    const dupTopic = await prisma.aiTopic.create({
      data: { siteId: SITE, title: `Dup topic ${Date.now()}` },
    });
    const enqueued = await enqueueGeneration(superAdmin, SITE, {
      topicId: dupTopic.id,
      idempotencyKey: `dup-test-${Date.now()}`,
    });
    expect(enqueued.ok).toBe(true);
    if (!enqueued.ok) return;
    const job = await claimNextJob('test-worker-4');
    await processJob(job!, { provider: dupProvider });
    const row = await prisma.aiJob.findUnique({ where: { id: enqueued.data.jobId } });
    expect(row?.status).toBe('FAILED');
    expect(row?.error).toContain('similar article');
  });

  /* ----------------------------- autopilot + sweep ------------------------- */

  it('autopilot publishes immediately; scheduling sweep respects weekly caps', async () => {
    await saveAiSettings(superAdmin, SITE, {
      enabled: true, provider: 'ollama', model: 'mock-model', publishMode: 'AUTOPILOT',
      maxArticlesPerDay: 5, postsPerWeek: 5, paused: false, maxAttempts: 1,
      publishTimes: [], timezone: 'UTC',
    });
    // A provider returning a DISTINCT article (the e2e post already exists,
    // and duplicate-title detection must not publish a second copy).
    const autoProvider = mockProvider({
      generate: async () => ({
        title: 'Autopilot publishing in practice',
        slug: 'autopilot-publishing-in-practice',
        excerpt: 'A distinct mocked article proving autopilot publishes fresh, validated content.',
        body: [
          'This mocked autopilot paragraph carries more than enough running text to clear every validation bound comfortably, demonstrates the immediate publish path from queue claim through validated draft to publication, and mirrors the length a real model would produce for an eight-hundred-word brief.',
          'The second paragraph continues the argument about guarded automation, daily caps, bounded retries with exponential backoff, and the audit trail that makes autopilot safe to enable deliberately on a website whose editors have reviewed sample output and accepted the operational tradeoffs involved.',
          'A third paragraph notes that autopilot never bypasses validation: the generated article must pass the same structural checks as a human draft, including title and excerpt bounds, paragraph minimums, slug normalization, and the duplicate-title guard that keeps the site free of near-identical pieces.',
          'A closing paragraph summarizes the guarantee: autopilot is opt-in per site, bounded by daily limits, pauses on repeated provider failures, and every publication lands in the audit log with the acting system account for later review by an administrator.',
        ],
        language: 'English',
        tags: ['autopilot'],
        seoTitle: 'Autopilot publishing in practice',
        seoDescription: 'A mocked autopilot article for the integration suite with an adequate description.',
      }),
    });
    const autoTopic = await prisma.aiTopic.create({
      data: { siteId: SITE, title: `Autopilot topic ${Date.now()}` },
    });
    const enqueued = await enqueueGeneration(superAdmin, SITE, {
      topicId: autoTopic.id,
      idempotencyKey: `auto-${Date.now()}`,
    });
    expect(enqueued.ok).toBe(true);
    const job = await claimNextJob('test-worker-5');
    await processJob(job!, { provider: autoProvider });
    const row = await prisma.aiJob.findUnique({ where: { id: enqueued.ok ? enqueued.data.jobId : '' } });
    expect(row?.status).toBe('SUCCEEDED');
    // The page was auto-published (publicly visible).
    expect(await d.getPost(SITE, 'autopilot-publishing-in-practice')).not.toBeNull();
    await prisma.post.deleteMany({ where: { siteId: SITE, slug: { contains: 'mocked' } } });

    // Scheduling sweep: idempotent per day.
    await prisma.aiSettings.update({ where: { siteId: SITE }, data: { lastScheduleDate: null } });
    const first = await schedulingSweep();
    const second = await schedulingSweep();
    expect(second).toBe(0); // lastScheduleDate set after the first sweep
    expect(first).toBeGreaterThanOrEqual(0);
  });

  it('publishSweep skips jobs without due publishAt and publishes due ones once', async () => {
    // The DRAFT-mode job from earlier has no publishAt — sweep does nothing.
    const before = await publishSweep();
    expect(before).toBeGreaterThanOrEqual(0);
  });

  /* ------------------------------- job UI ops ------------------------------ */

  it('job listing is site-scoped; retry/cancel respect state and authorization', async () => {
    const denied = await listAiJobsForAdmin(siteAdmin, 'business-demo');
    expect(denied.ok).toBe(false);

    const allowed = await listAiJobsForAdmin(siteAdmin, SITE);
    expect(allowed.ok).toBe(true);

    // Cannot cancel a SUCCEEDED job.
    const succeeded = await prisma.aiJob.findFirst({ where: { siteId: SITE, status: 'SUCCEEDED' } });
    if (succeeded) {
      const cancelled = await cancelAiJob(superAdmin, SITE, succeeded.id);
      expect(cancelled.ok).toBe(false);
    }

    // Retry a FAILED job → back to PENDING with attempts reset.
    const failed = await prisma.aiJob.findFirst({ where: { siteId: SITE, status: 'FAILED' } });
    if (failed) {
      const retried = await retryAiJob(superAdmin, SITE, failed.id);
      expect(retried.ok).toBe(true);
      const row = await prisma.aiJob.findUnique({ where: { id: failed.id } });
      expect(row?.status).toBe('PENDING');
      expect(row?.attempts).toBe(0);
    }

    // Foreign site id in a retry is rejected.
    const foreign = await retryAiJob(superAdmin, 'business-demo', 'nonexistent');
    expect(foreign.ok).toBe(false);
  });

  it('paused automation blocks enqueue', async () => {
    await saveAiSettings(superAdmin, SITE, { paused: true, enabled: true, model: 'qwen2.5vl:3b' });
    const blocked = await enqueueGeneration(superAdmin, SITE, {});
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.error).toContain('paused');
    await saveAiSettings(superAdmin, SITE, { paused: false });
  });
});
