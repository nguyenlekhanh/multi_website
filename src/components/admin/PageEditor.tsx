'use client';

import { useActionState, useState } from 'react';
import {
  createPageAction,
  deletePageAction,
  setPageStatusAction,
  updatePageAction,
  type ActionState,
} from '@/app/admin/content-actions';
import { Field, FormFeedback, SubmitButton, inputClass } from '@/components/admin/form';
import { BlockEditor } from '@/components/admin/BlockEditor';
import { slugify } from '@/lib/admin/slug';
import type { AdminPageDetail } from '@/lib/admin/content-service';

const initial: ActionState = {};

function MediaRefInput({
  name,
  defaultValue,
  label,
  hint,
  media,
}: {
  name: string;
  defaultValue: string;
  label: string;
  hint?: string;
  media: { src: string; alt: string }[];
}) {
  return (
    <Field label={label} hint={hint ?? 'Pick from the media library or enter an https:// URL. Missing images render a graceful placeholder.'}>
      <input type="text" name={name} defaultValue={defaultValue} list={`${name}-options`} className={inputClass} />
      <datalist id={`${name}-options`}>
        {media.map((m) => (
          <option key={m.src} value={m.src}>{m.alt || m.src}</option>
        ))}
      </datalist>
    </Field>
  );
}

export function PageEditor({
  siteId,
  page,
  media,
  canDelete,
}: {
  siteId: string;
  /** Present in edit mode. */
  page?: AdminPageDetail;
  media: { src: string; alt: string }[];
  canDelete: boolean;
}) {
  const editMode = Boolean(page);
  const [state, formAction] = useActionState(editMode ? updatePageAction : createPageAction, initial);
  const [statusState, statusFormAction] = useActionState(setPageStatusAction, initial);
  const [deleteState, deleteFormAction] = useActionState(deletePageAction, initial);
  const [title, setTitle] = useState(page?.title ?? '');
  const [slug, setSlug] = useState(page?.slug ?? '');

  const status = page?.status ?? 'DRAFT';

  return (
    <div className="space-y-6">
      <FormFeedback state={state} />

      <form action={formAction} className="space-y-6">
        <input type="hidden" name="siteId" value={siteId} />
        {page && <input type="hidden" name="pageId" value={page.id} />}
        <input type="hidden" name="status" value={status} />

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-slate-900">Page details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title">
              <input
                type="text"
                name="title"
                required
                maxLength={200}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Slug" hint={`Public URL: /${slug || '…'} — editable; titles never change it automatically.`}>
              <div className="flex gap-1.5">
                <input type="text" name="slug" required value={slug} onChange={(e) => setSlug(e.target.value)} className={inputClass} />
                <button
                  type="button"
                  onClick={() => setSlug(slugify(title))}
                  disabled={!title || editMode}
                  title={editMode ? 'Slugs are kept stable while editing to preserve URLs' : 'Generate from title'}
                  className="shrink-0 rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                >
                  Generate
                </button>
              </div>
            </Field>
            <Field label="Eyebrow (small label above the title)">
              <input type="text" name="eyebrow" defaultValue={page?.eyebrow ?? ''} maxLength={80} className={inputClass} />
            </Field>
            <label className="flex items-end pb-2">
              <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input type="checkbox" name="isHomepage" defaultChecked={page?.isHomepage} className="h-4 w-4 rounded border-slate-300" />
                Use as the website homepage
              </span>
            </label>
          </div>
        </section>

        <BlockEditor name="blocks" initialBlocks={page?.blocks ?? []} />

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-slate-900">SEO</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="SEO title" hint="Overrides the page title in search results and link previews.">
              <input type="text" name="seoTitle" defaultValue={page?.seoTitle ?? ''} maxLength={200} className={inputClass} />
            </Field>
            <MediaRefInput name="ogImage" defaultValue={page?.ogImage ?? ''} label="Social image" media={media} />
            <Field label="Meta description" className="sm:col-span-2">
              <textarea name="seoDescription" defaultValue={page?.seoDescription ?? ''} rows={2} maxLength={300} className={inputClass} />
            </Field>
          </div>
        </section>

        <div className="sticky bottom-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur">
          <div className="text-xs text-slate-400">
            {page ? (
              <>
                {status === 'PUBLISHED' ? 'Published' : 'Draft'} · created {page.createdAt.slice(0, 10)} · updated {page.updatedAt.slice(0, 10)}
              </>
            ) : (
              'New pages start as drafts.'
            )}
          </div>
          <SubmitButton pendingLabel="Saving…">
            {editMode ? 'Save page' : 'Create draft page'}
          </SubmitButton>
        </div>
      </form>

      {editMode && page && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-slate-900">Publication</h2>
          <FormFeedback state={statusState} />
          <FormFeedback state={deleteState} />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <form action={statusFormAction} className="flex items-center gap-2">
              <input type="hidden" name="siteId" value={siteId} />
              <input type="hidden" name="pageId" value={page.id} />
              <input type="hidden" name="status" value={status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED'} />
              <SubmitButton variant="outline" pendingLabel="…">
                {status === 'PUBLISHED' ? 'Unpublish (back to draft)' : 'Publish'}
              </SubmitButton>
            </form>
            <a
              href={`/admin/sites/${siteId}/preview/page/${page.id}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Preview ↗
            </a>
            {canDelete && (
              <form action={deleteFormAction}>
                <input type="hidden" name="siteId" value={siteId} />
                <input type="hidden" name="pageId" value={page.id} />
                <SubmitButton
                  variant="danger"
                  pendingLabel="Deleting…"
                  confirm={`Delete the page "${page.title}"? This cannot be undone.`}
                >
                  Delete page
                </SubmitButton>
              </form>
            )}
          </div>
          {page.isHomepage && (
            <p className="mt-3 text-xs text-slate-400">
              This is the homepage — it cannot be deleted until another page becomes the homepage.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
