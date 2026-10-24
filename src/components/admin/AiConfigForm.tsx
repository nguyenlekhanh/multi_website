'use client';

import { useActionState } from 'react';
import {
  createTopicAction,
  deleteTopicAction,
  generateNowAction,
  saveAiSettingsAction,
  type ActionState,
} from '@/app/admin/ai-actions';
import { Field, FormFeedback, SubmitButton, inputClass } from '@/components/admin/form';

const initial: ActionState = {};

const inputCls = inputClass;

export interface AiConfig {
  siteId: string;
  enabled: boolean;
  provider: string;
  model: string;
  language: string;
  tone: string;
  audience: string;
  wordCountTarget: number;
  format: string;
  authorId: string | null;
  categoryIds: string[];
  publishMode: string;
  postsPerWeek: number;
  publishTimes: string[];
  timezone: string;
  maxAttempts: number;
  maxArticlesPerDay: number;
  customInstructions: string | null;
  paused: boolean;
}

export function AiConfigForm({
  siteId,
  config,
  categories,
  authors,
}: {
  siteId: string;
  config: AiConfig;
  categories: { id: string; name: string }[];
  authors: { id: string; name: string }[];
}) {
  const [state, formAction] = useActionState(saveAiSettingsAction, initial);
  const [pauseState, pauseFormAction] = useActionState(
    async (_prev: ActionState, fd: FormData) => {
      const { togglePauseAction } = await import('@/app/admin/ai-actions');
      return togglePauseAction(_prev, fd);
    },
    initial,
  );

  return (
    <>
      <FormFeedback state={pauseState} />
      <form action={formAction} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <input type="hidden" name="siteId" value={siteId} />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Automation settings</h2>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input type="checkbox" name="enabled" defaultChecked={config.enabled} className="h-4 w-4 rounded border-slate-300" />
              Enabled
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input type="checkbox" name="paused" defaultChecked={config.paused} className="h-4 w-4 rounded border-slate-300" />
              Paused
            </label>
          </div>
        </div>
        <FormFeedback state={state} />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Provider">
            <select name="provider" defaultValue={config.provider} className={inputCls}>
              <option value="ollama">Ollama (local)</option>
              <option value="openai">OpenAI</option>
              <option value="openai-compatible">OpenAI-compatible endpoint</option>
            </select>
          </Field>
          <Field label="Model" hint='e.g. "qwen2.5vl:3b" for local Ollama, "gpt-4o-mini" for OpenAI.'>
            <input type="text" name="model" defaultValue={config.model} maxLength={120} className={inputCls} />
          </Field>
          <Field label="Language">
            <input type="text" name="language" defaultValue={config.language} maxLength={60} className={inputCls} />
          </Field>
          <Field label="Tone">
            <input type="text" name="tone" defaultValue={config.tone} maxLength={60} className={inputCls} />
          </Field>
          <Field label="Target audience" className="sm:col-span-2">
            <input type="text" name="audience" defaultValue={config.audience} maxLength={300} className={inputCls} />
          </Field>
          <Field label="Target word count" hint="300–2000; enforced server-side.">
            <input type="number" name="wordCountTarget" defaultValue={config.wordCountTarget} min={300} max={2000} className={inputCls} />
          </Field>
          <Field label="Format">
            <select name="format" defaultValue={config.format} className={inputCls}>
              <option value="article">Article</option>
              <option value="listicle">Listicle</option>
              <option value="howto">How-to guide</option>
            </select>
          </Field>
          <Field label="Author" hint="Must belong to this website.">
            <select name="authorId" defaultValue={config.authorId ?? ''} className={inputCls}>
              <option value="">First available author</option>
              {authors.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Allowed categories" hint="Ctrl/Cmd-click for multiple. Cross-site categories are rejected.">
            <select name="categoryIds" multiple defaultValue={config.categoryIds} className={`${inputCls} h-auto`} size={4}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
        </div>

        <h3 className="mb-3 mt-6 border-t border-slate-100 pt-4 font-semibold text-slate-900">Publishing</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Publication mode" hint="Draft: review every piece manually. Scheduled: worker publishes after 24h. Autopilot: publish immediately when generated.">
            <select name="publishMode" defaultValue={config.publishMode} className={inputCls}>
              <option value="DRAFT">Draft only (manual review)</option>
              <option value="SCHEDULED">Scheduled (publish after ~24h)</option>
              <option value="AUTOPILOT">Autopilot (publish on generation)</option>
            </select>
          </Field>
          <Field label="Timezone" hint="IANA name, e.g. Europe/Berlin.">
            <input type="text" name="timezone" defaultValue={config.timezone} maxLength={60} className={inputCls} />
          </Field>
          <Field label="Posts per week">
            <input type="number" name="postsPerWeek" defaultValue={config.postsPerWeek} min={0} max={30} className={inputCls} />
          </Field>
          <Field label="Max articles per day" hint="Hard cap enforced at enqueue time.">
            <input type="number" name="maxArticlesPerDay" defaultValue={config.maxArticlesPerDay} min={0} max={20} className={inputCls} />
          </Field>
          <Field label="Publish times" hint='Comma-separated "HH:mm" local times.'>
            <input type="text" name="publishTimes" defaultValue={config.publishTimes.join(', ')} placeholder="09:00, 17:00" className={inputCls} />
          </Field>
          <Field label="Max attempts per job">
            <input type="number" name="maxAttempts" defaultValue={config.maxAttempts} min={1} max={10} className={inputCls} />
          </Field>
          <Field label="Extra writing instructions" className="sm:col-span-2" hint="Optional; included verbatim in the prompt (treated as data, never as system rules).">
            <textarea name="customInstructions" defaultValue={config.customInstructions ?? ''} rows={2} maxLength={2000} className={inputCls} />
          </Field>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <SubmitButton pendingLabel="Saving…">Save settings</SubmitButton>
          <span className="text-xs text-slate-400">
            Generated content is always saved through the site-scoped CMS and audit-logged.
          </span>
        </div>
      </form>
      <form action={pauseFormAction} className="mt-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <input type="hidden" name="siteId" value={siteId} />
        <input type="hidden" name="paused" value={String(!config.paused)} />
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm t-text-muted">
            {config.paused ? 'Automation is currently paused.' : 'Pause all AI automation for this website (jobs stay queued).'}
          </p>
          <SubmitButton variant="outline" pendingLabel="…">
            {config.paused ? 'Resume' : 'Pause now'}
          </SubmitButton>
        </div>
      </form>
    </>
  );
}

export interface TopicRow {
  id: string;
  title: string;
  keywords: string[];
  excluded: string[];
  active: boolean;
  lastUsedAt: string | null;
}

export function TopicManager({ siteId, topics }: { siteId: string; topics: TopicRow[] }) {
  const [createState, createFormAction] = useActionState(createTopicAction, initial);
  const [deleteState, deleteFormAction] = useActionState(deleteTopicAction, initial);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-1 font-semibold text-slate-900">Topics</h2>
      <p className="mb-4 text-sm text-slate-500">
        The generator picks the least-recently-used active topic. Topics used in the last 14 days are skipped.
      </p>
      <FormFeedback state={createState} />
      <FormFeedback state={deleteState} />

      <form action={createFormAction} className="mt-3 grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end">
        <input type="hidden" name="siteId" value={siteId} />
        <Field label="Topic">
          <input type="text" name="title" required minLength={3} maxLength={200} placeholder="AI cost control in cloud platforms" className={inputCls} />
        </Field>
        <Field label="Keywords (comma-separated)">
          <input type="text" name="keywords" maxLength={300} className={inputCls} />
        </Field>
        <Field label="Excluded (comma-separated)">
          <input type="text" name="excluded" maxLength={300} className={inputCls} />
        </Field>
        <div className="pb-0.5">
          <SubmitButton pendingLabel="Adding…">Add topic</SubmitButton>
        </div>
      </form>

      <div className="mt-5 divide-y divide-slate-100 border border-slate-200 rounded-lg">
        {topics.map((topic) => (
          <div key={topic.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-900">
                {topic.title}
                {!topic.active && <span className="ml-2 text-xs text-slate-400">(paused)</span>}
              </p>
              {topic.keywords.length > 0 && (
                <p className="truncate text-xs text-slate-400">keywords: {topic.keywords.join(', ')}</p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2 text-xs text-slate-400">
              {topic.lastUsedAt && <span>used {topic.lastUsedAt.slice(0, 10)}</span>}
              <form action={deleteFormAction}>
                <input type="hidden" name="siteId" value={siteId} />
                <input type="hidden" name="topicId" value={topic.id} />
                <SubmitButton variant="danger" className="px-2.5 py-1 text-xs" pendingLabel="…" confirm={`Delete topic "${topic.title}"?`}>
                  Delete
                </SubmitButton>
              </form>
            </div>
          </div>
        ))}
        {topics.length === 0 && <p className="px-4 py-6 text-center text-sm text-slate-400">No topics yet — add one above.</p>}
      </div>
    </div>
  );
}

export function GenerateNowForm({
  siteId,
  topics,
}: {
  siteId: string;
  topics: { id: string; title: string }[];
}) {
  const [state, formAction] = useActionState(generateNowAction, initial);

  return (
    <form action={formAction} className="rounded-xl border-2 border-indigo-200 bg-indigo-50/40 p-6">
      <input type="hidden" name="siteId" value={siteId} />
      <h2 className="font-semibold text-slate-900">Generate an article now</h2>
      <p className="mb-4 mt-1 text-sm text-slate-500">
        Queues a generation job. The configured worker (e.g. your local Ollama worker) picks it up and saves a draft — the
        web server never runs the model. Rate-limited to 3 per 10 minutes.
      </p>
      <FormFeedback state={state} />
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <Field label="Topic (optional — least-recently-used is chosen when empty)" className="min-w-0 flex-1">
          <select name="topicId" className={inputCls}>
            <option value="">Automatic (least recently used)</option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>
        </Field>
        <div className="pb-0.5">
          <SubmitButton pendingLabel="Queueing…">Queue generation</SubmitButton>
        </div>
      </div>
    </form>
  );
}
