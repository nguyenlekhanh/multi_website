import { getPrisma } from '@/platform/data/prisma';
import { isDataUnavailableError } from '@/platform/data/errors';
import { assertSiteAccess } from '@/lib/admin/authz';
import { fail, ok, type ServiceResult } from '@/lib/admin/types';
import type { AdminSessionUser } from '@/lib/admin/types';

/**
 * Read + lifecycle helpers for the AI job history UI. Listing is site-scoped;
 * retry/cancel re-assert authorization before touching the queue.
 */

export interface AiJobRow {
  id: string;
  topicTitle: string;
  status: 'PENDING' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';
  attempts: number;
  maxAttempts: number;
  error: string | null;
  postId: number | null;
  scheduledAt: string;
  finishedAt: string | null;
}

export async function listAiJobsForAdmin(
  actor: AdminSessionUser,
  siteId: string,
  options?: { limit?: number },
): Promise<ServiceResult<AiJobRow[]>> {
  try {
    await assertSiteAccess(actor, siteId);
    const rows = await getPrisma().aiJob.findMany({
      where: { siteId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(options?.limit ?? 50, 100),
    });
    return ok(
      rows.map((r) => ({
        id: r.id,
        topicTitle: r.topicTitle,
        status: r.status,
        attempts: r.attempts,
        maxAttempts: r.maxAttempts,
        error: r.error,
        postId: r.postId,
        scheduledAt: r.scheduledAt.toISOString(),
        finishedAt: r.finishedAt?.toISOString() ?? null,
      })),
    );
  } catch (error) {
    if (isDataUnavailableError(error)) {
      return fail('The database is temporarily unavailable.', 'UNAVAILABLE');
    }
    if (error instanceof Error && error.name === 'ForbiddenError') {
      return fail(error.message, 'FORBIDDEN');
    }
    console.error('[ai-jobs] list failed:', error instanceof Error ? error.message : error);
    return fail('Could not load AI jobs.', 'UNAVAILABLE');
  }
}

export async function retryAiJob(
  actor: AdminSessionUser,
  siteId: string,
  jobId: string,
): Promise<ServiceResult<{ requeued: true }>> {
  try {
    await assertSiteAccess(actor, siteId);
    const job = await getPrisma().aiJob.findFirst({ where: { id: jobId, siteId } });
    if (!job) return fail('Job not found on this website.', 'NOT_FOUND');
    if (job.status !== 'FAILED' && job.status !== 'CANCELLED') {
      return fail('Only failed or cancelled jobs can be retried.', 'VALIDATION');
    }
    await getPrisma().aiJob.update({
      where: { id: jobId },
      data: {
        status: 'PENDING',
        attempts: 0,
        error: null,
        scheduledAt: new Date(),
        startedAt: null,
        finishedAt: null,
        workerId: null,
      },
    });
    await getPrisma().auditLog.create({
      data: {
        actorId: actor.id, actorEmail: actor.email, action: 'ai.job_retry',
        targetSiteId: siteId, summary: `Retried AI job for topic "${job.topicTitle}".`,
      },
    });
    return ok({ requeued: true });
  } catch (error) {
    if (isDataUnavailableError(error)) return fail('Database unavailable.', 'UNAVAILABLE');
    if (error instanceof Error && error.name === 'ForbiddenError') return fail(error.message, 'FORBIDDEN');
    return fail('Could not retry the job.', 'UNAVAILABLE');
  }
}

export async function cancelAiJob(
  actor: AdminSessionUser,
  siteId: string,
  jobId: string,
): Promise<ServiceResult<{ cancelled: true }>> {
  try {
    await assertSiteAccess(actor, siteId);
    const job = await getPrisma().aiJob.findFirst({ where: { id: jobId, siteId } });
    if (!job) return fail('Job not found on this website.', 'NOT_FOUND');
    if (job.status !== 'PENDING' && job.status !== 'PROCESSING') {
      return fail('Only pending or processing jobs can be cancelled.', 'VALIDATION');
    }
    await getPrisma().aiJob.update({
      where: { id: jobId },
      data: { status: 'CANCELLED', finishedAt: new Date(), error: 'Cancelled by an administrator.' },
    });
    await getPrisma().auditLog.create({
      data: {
        actorId: actor.id, actorEmail: actor.email, action: 'ai.job_cancel',
        targetSiteId: siteId, summary: `Cancelled AI job for topic "${job.topicTitle}".`,
      },
    });
    return ok({ cancelled: true });
  } catch (error) {
    if (isDataUnavailableError(error)) return fail('Database unavailable.', 'UNAVAILABLE');
    if (error instanceof Error && error.name === 'ForbiddenError') return fail(error.message, 'FORBIDDEN');
    return fail('Could not cancel the job.', 'UNAVAILABLE');
  }
}
