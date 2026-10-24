'use client';

import { useActionState, useState } from 'react';
import {
  createPostAction,
  deletePostAction,
  setPostStatusAction,
  updatePostAction,
  type ActionState,
} from '@/app/admin/content-actions';
import { Field, FormFeedback, SubmitButton, inputClass } from '@/components/admin/form';
import { slugify } from '@/lib/admin/slug';
import type { AdminPostDetail } from '@/lib/admin/content-service';

const initial: ActionState = {};

interface PickerOption {
  id: string;
  name: string;
}

export function PostEditor({
  siteId,
  post,
  authors,
  categories,
  media,
}: {
  siteId: string;
  /** Present in edit mode. */
  post?: AdminPostDetail;
  authors: PickerOption[];
  categories: PickerOption[];
  media: { src: string; alt: string }[];
}) {
  const editMode = Boolean(post);
  const [state, formAction] = useActionState(editMode ? updatePostAction : createPostAction, initial);
  const [statusState, statusFormAction] = useActionState(setPostStatusAction, initial);
  const [deleteState, deleteFormAction] = useActionState(deletePostAction, initial);
  const [title, setTitle] = useState(post?.title ?? '');
  const [slug, setSlug] = useState(post?.slug ?? '');
  const [paragraphs, setParagraphs] = useState<string[]>(post?.body ?? ['']);
  const [coverImage, setCoverImage] = useState(post?.coverImage ?? '');

  const status = post?.status ?? 'DRAFT';

  return (
    <div className="space-y-6">
      <FormFeedback state={state} />

      <form action={formAction} className="space-y-6">
        <input type="hidden" name="siteId" value={siteId} />
        {post && <input type="hidden" name="postId" value={post.id} />}
        <input type="hidden" name="body" value={JSON.stringify(paragraphs.filter((p) => p.trim() !== ''))} />
        <input type="hidden" name="status" value={status} />

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-slate-900">Post details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title">
              <input type="text" name="title" required maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Slug" hint={`Public URL: /posts/${slug || '…'} — editable; titles never change it automatically.`}>
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
            <Field label="Author" hint="Only authors of this website are listed.">
              <select name="authorId" required defaultValue={post?.authorId ?? ''} className={inputClass}>
                <option value="" disabled>
                  Select an author…
                </option>
                {authors.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Category" hint="Optional.">
              <select name="categoryId" defaultValue={post?.categoryId ?? ''} className={inputClass}>
                <option value="">None</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="mt-4">
            <Field label="Excerpt" hint="Shown in lists and used as the default meta description.">
              <textarea name="excerpt" defaultValue={post?.excerpt ?? ''} rows={2} maxLength={500} className={inputClass} />
            </Field>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Body paragraphs</h2>
            <button
              type="button"
              onClick={() => setParagraphs((prev) => [...prev, ''])}
              className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              + Add paragraph
            </button>
          </div>
          <div className="space-y-2">
            {paragraphs.map((text, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <textarea
                  value={text}
                  onChange={(e) => setParagraphs((prev) => prev.map((p, idx) => (idx === i ? e.target.value : p)))}
                  rows={3}
                  aria-label={`Paragraph ${i + 1}`}
                  placeholder={`Paragraph ${i + 1}…`}
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => setParagraphs((prev) => prev.filter((_, idx) => idx !== i))}
                  className="px-1.5 py-2 text-slate-400 hover:text-rose-600"
                  aria-label={`Remove paragraph ${i + 1}`}
                >
                  ✕
                </button>
              </div>
            ))}
            {paragraphs.length === 0 && (
              <p className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-sm text-slate-400">
                No paragraphs yet.
              </p>
            )}
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Plain paragraphs only — the theme controls typography. Posts render as articles, not as block pages.
          </p>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-slate-900">Featured image &amp; SEO</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Cover image" hint="Media library path or https:// URL. Missing images fall back gracefully.">
              <div className="flex gap-2">
                <input type="text" name="coverImage" value={coverImage} onChange={(e) => setCoverImage(e.target.value)} list="cover-image-options" className={inputClass} />
                {coverImage && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={coverImage}
                    alt="Cover preview"
                    className="h-10 w-14 rounded border border-slate-200 object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.opacity = '0.25';
                    }}
                  />
                )}
              </div>
              <datalist id="cover-image-options">
                {media.map((m) => (
                  <option key={m.src} value={m.src}>{m.alt || m.src}</option>
                ))}
              </datalist>
            </Field>
            <Field label="Cover image alt text">
              <input type="text" name="coverAlt" defaultValue={post?.coverAlt ?? ''} maxLength={300} className={inputClass} />
            </Field>
            <Field label="SEO title" hint="Overrides the post title in search results.">
              <input type="text" name="seoTitle" defaultValue={post?.seoTitle ?? ''} maxLength={200} className={inputClass} />
            </Field>
            <Field label="SEO description" hint="Overrides the excerpt in search results.">
              <textarea name="seoDescription" defaultValue={post?.seoDescription ?? ''} rows={2} maxLength={300} className={inputClass} />
            </Field>
            <Field label="Tags" hint="Comma-separated, up to 10.">
              <input type="text" name="tags" defaultValue={(post?.tags ?? []).join(', ')} className={inputClass} />
            </Field>
            <label className="flex items-end pb-2">
              <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input type="checkbox" name="featured" defaultChecked={post?.featured} className="h-4 w-4 rounded border-slate-300" />
                Featured post
              </span>
            </label>
          </div>
        </section>

        <div className="sticky bottom-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur">
          <div className="text-xs text-slate-400">
            {post ? (
              <>
                {status === 'PUBLISHED' ? 'Published' : 'Draft'}
                {post.publishedAt ? ` · published ${post.publishedAt.slice(0, 10)}` : ''} · updated {post.updatedAt.slice(0, 10)}
              </>
            ) : (
              'New posts start as drafts.'
            )}
          </div>
          <SubmitButton pendingLabel="Saving…">{editMode ? 'Save post' : 'Create draft post'}</SubmitButton>
        </div>
      </form>

      {editMode && post && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-slate-900">Publication</h2>
          <FormFeedback state={statusState} />
          <FormFeedback state={deleteState} />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <form action={statusFormAction} className="flex items-center gap-2">
              <input type="hidden" name="siteId" value={siteId} />
              <input type="hidden" name="postId" value={post.id} />
              <input type="hidden" name="status" value={status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED'} />
              <SubmitButton variant="outline" pendingLabel="…">
                {status === 'PUBLISHED' ? 'Unpublish (back to draft)' : 'Publish'}
              </SubmitButton>
            </form>
            <a
              href={`/admin/sites/${siteId}/preview/post/${post.id}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Preview ↗
            </a>
            <form action={deleteFormAction}>
              <input type="hidden" name="siteId" value={siteId} />
              <input type="hidden" name="postId" value={post.id} />
              <SubmitButton variant="danger" pendingLabel="Deleting…" confirm={`Delete the post "${post.title}"? This cannot be undone.`}>
                Delete post
              </SubmitButton>
            </form>
          </div>
        </section>
      )}
    </div>
  );
}
