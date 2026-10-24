import { getPrisma } from '@/platform/data/prisma';
import type { AdminSessionUser } from './types';

/**
 * Audit trail for security-sensitive administration actions.
 *
 * Written inside the same transaction as the mutation it describes, so an
 * entry can never claim success for a rolled-back change. Summaries are
 * human-readable and must never contain passwords, tokens, or credentials.
 */

export type AuditAction =
  | 'site.create'
  | 'site.update'
  | 'site.status_change'
  | 'site.theme_change'
  | 'site.settings_update'
  | 'domain.add'
  | 'domain.set_primary'
  | 'domain.remove'
  | 'page.create'
  | 'page.update'
  | 'page.publish'
  | 'page.unpublish'
  | 'page.delete'
  | 'post.create'
  | 'post.update'
  | 'post.publish'
  | 'post.unpublish'
  | 'post.delete'
  | 'category.create'
  | 'category.update'
  | 'category.delete'
  | 'author.create'
  | 'author.update'
  | 'author.delete';

export async function writeAudit(
  tx: Parameters<Parameters<ReturnType<typeof getPrisma>['$transaction']>[0]>[0],
  entry: {
    actor: AdminSessionUser;
    action: AuditAction;
    targetSiteId?: string | null;
    summary: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  await tx.auditLog.create({
    data: {
      actorId: entry.actor.id,
      actorEmail: entry.actor.email,
      action: entry.action,
      targetSiteId: entry.targetSiteId ?? null,
      summary: entry.summary.slice(0, 500),
      metadata: (entry.metadata ?? null) as never,
    },
  });
}
