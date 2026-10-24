'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin, UnauthenticatedError } from '@/lib/admin/require-admin';
import {
  createTopic,
  deleteTopic,
  generateNow,
  listTopics,
  saveAiSettings,
  type AiSettingsInput,
  type AiTopicInput,
} from '@/lib/ai/content-automation';
import { retryAiJob, cancelAiJob } from '@/lib/ai/jobs-view';
/** Mirrors the shared action-state shape (type-only re-exports are not
 *  allowed out of "use server" modules). */
export interface ActionState {
  ok?: boolean;
  error?: string;
  message?: string;
}

async function actorOrNull() {
  try {
    return await requireAdmin();
  } catch (error) {
    if (error instanceof UnauthenticatedError) return null;
    throw error;
  }
}

function toState<T extends { ok: true; data: unknown } | { ok: false; error: string }>(result: T): ActionState {
  if (result.ok) return { ok: true, message: 'Saved.' };
  return { error: result.error };
}

export async function saveAiSettingsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await actorOrNull();
  if (!actor) return { error: 'Please sign in again.' };
  const siteId = String(formData.get('siteId') ?? '');
  const times = String(formData.get('publishTimes') ?? '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  const input: AiSettingsInput = {
    enabled: formData.get('enabled') === 'on',
    provider: String(formData.get('provider') ?? 'ollama'),
    model: String(formData.get('model') ?? ''),
    language: String(formData.get('language') ?? ''),
    tone: String(formData.get('tone') ?? ''),
    audience: String(formData.get('audience') ?? ''),
    wordCountTarget: Number(formData.get('wordCountTarget') ?? '800'),
    format: String(formData.get('format') ?? 'article'),
    authorId: String(formData.get('authorId') ?? ''),
    categoryIds: formData.getAll('categoryIds').map(String),
    publishMode: String(formData.get('publishMode') ?? 'DRAFT'),
    postsPerWeek: Number(formData.get('postsPerWeek') ?? '3'),
    publishTimes: times,
    timezone: String(formData.get('timezone') ?? 'UTC'),
    maxAttempts: Number(formData.get('maxAttempts') ?? '3'),
    maxArticlesPerDay: Number(formData.get('maxArticlesPerDay') ?? '2'),
    customInstructions: String(formData.get('customInstructions') ?? ''),
    paused: formData.get('paused') === 'on',
  };
  const result = await saveAiSettings(actor, siteId, input);
  if (result.ok) revalidatePath(`/admin/sites/${siteId}/ai`);
  return toState(result);
}

export async function togglePauseAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await actorOrNull();
  if (!actor) return { error: 'Please sign in again.' };
  const siteId = String(formData.get('siteId') ?? '');
  const paused = String(formData.get('paused') ?? '') === 'true';
  const result = await saveAiSettings(actor, siteId, { paused });
  if (result.ok) {
    revalidatePath(`/admin/sites/${siteId}/ai`);
    return { ok: true, message: paused ? 'AI automation paused.' : 'AI automation resumed.' };
  }
  return toState(result);
}

export async function createTopicAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await actorOrNull();
  if (!actor) return { error: 'Please sign in again.' };
  const siteId = String(formData.get('siteId') ?? '');
  const input: AiTopicInput = {
    title: String(formData.get('title') ?? ''),
    keywords: String(formData.get('keywords') ?? '').split(',').map((k) => k.trim()).filter(Boolean),
    excluded: String(formData.get('excluded') ?? '').split(',').map((k) => k.trim()).filter(Boolean),
    notes: String(formData.get('notes') ?? ''),
  };
  const result = await createTopic(actor, siteId, input);
  if (result.ok) revalidatePath(`/admin/sites/${siteId}/ai`);
  return toState(result);
}

export async function deleteTopicAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await actorOrNull();
  if (!actor) return { error: 'Please sign in again.' };
  const siteId = String(formData.get('siteId') ?? '');
  const result = await deleteTopic(actor, siteId, String(formData.get('topicId') ?? ''));
  if (result.ok) revalidatePath(`/admin/sites/${siteId}/ai`);
  return toState(result);
}

export async function generateNowAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await actorOrNull();
  if (!actor) return { error: 'Please sign in again.' };
  const siteId = String(formData.get('siteId') ?? '');
  const topicId = String(formData.get('topicId') ?? '') || undefined;
  const result = await generateNow(actor, siteId, topicId);
  if (result.ok) {
    revalidatePath(`/admin/sites/${siteId}/ai`);
    revalidatePath(`/admin/sites/${siteId}/ai/jobs`);
    return { ok: true, message: 'Generation job queued. The worker will process it (job history updates automatically).' };
  }
  return toState(result);
}

export async function retryJobAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await actorOrNull();
  if (!actor) return { error: 'Please sign in again.' };
  const siteId = String(formData.get('siteId') ?? '');
  const result = await retryAiJob(actor, siteId, String(formData.get('jobId') ?? ''));
  if (result.ok) revalidatePath(`/admin/sites/${siteId}/ai/jobs`);
  return toState(result);
}

export async function cancelJobAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await actorOrNull();
  if (!actor) return { error: 'Please sign in again.' };
  const siteId = String(formData.get('siteId') ?? '');
  const result = await cancelAiJob(actor, siteId, String(formData.get('jobId') ?? ''));
  if (result.ok) revalidatePath(`/admin/sites/${siteId}/ai/jobs`);
  return toState(result);
}

export async function listTopicsForSite(siteId: string) {
  const actor = await actorOrNull();
  if (!actor) return null;
  const result = await listTopics(actor, siteId);
  return result.ok ? result.data : [];
}
