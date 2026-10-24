'use client';

import { useActionState, useEffect, useState } from 'react';
import {
  createCategoryAction,
  createAuthorAction,
  deleteCategoryAction,
  deleteAuthorAction,
  updateCategoryAction,
  updateAuthorAction,
  type ActionState,
} from '@/app/admin/content-actions';
import { Field, FormFeedback, SubmitButton, inputClass } from '@/components/admin/form';

const initial: ActionState = {};

/* ------------------------------- categories ------------------------------- */

export interface CategoryRow {
  id: string;
  slug: string;
  name: string;
  description?: string;
  postCount: number;
}

export function CategoryManager({ siteId, categories }: { siteId: string; categories: CategoryRow[] }) {
  const [createState, createFormAction] = useActionState(createCategoryAction, initial);
  const [updateState, updateFormAction] = useActionState(updateCategoryAction, initial);
  const [deleteState, deleteFormAction] = useActionState(deleteCategoryAction, initial);
  const [editing, setEditing] = useState<{ id: string; name: string; description: string } | null>(null);

  useEffect(() => setEditing(null), [categories]);

  return (
    <div className="space-y-6">
      <form action={createFormAction} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <input type="hidden" name="siteId" value={siteId} />
        <h2 className="mb-1 font-semibold text-slate-900">Add a category</h2>
        <p className="mb-4 text-sm text-slate-500">Slugs must be unique within the website and are used in public URLs.</p>
        <FormFeedback state={createState} />
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_2fr_auto] sm:items-end">
          <Field label="Name">
            <input type="text" name="name" required maxLength={80} className={inputClass} />
          </Field>
          <Field label="Slug (optional)" hint="Generated from the name if empty.">
            <input type="text" name="slug" maxLength={80} className={inputClass} />
          </Field>
          <Field label="Description (optional)">
            <input type="text" name="description" maxLength={300} className={inputClass} />
          </Field>
          <div className="pb-0.5">
            <SubmitButton pendingLabel="Adding…">Add</SubmitButton>
          </div>
        </div>
      </form>

      <FormFeedback state={updateState} />
      <FormFeedback state={deleteState} />

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
            <tr>
              <th scope="col" className="px-4 py-3">Category</th>
              <th scope="col" className="px-4 py-3">Slug</th>
              <th scope="col" className="px-4 py-3">Posts</th>
              <th scope="col" className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {categories.map((category) => (
              <tr key={category.id}>
                <td className="px-4 py-3">
                  {editing?.id === category.id ? (
                    <input
                      type="text"
                      form={`edit-category-${category.id}`}
                      name="name"
                      defaultValue={category.name}
                      required
                      maxLength={80}
                      className={inputClass}
                    />
                  ) : (
                    <span className="font-medium text-slate-900">{category.name}</span>
                  )}
                  {editing?.id === category.id && (
                    <input type="hidden" form={`edit-category-${category.id}`} name="description" defaultValue={category.description ?? ''} />
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{category.slug}</td>
                <td className="px-4 py-3 text-slate-600">{category.postCount}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1.5">
                    {editing?.id === category.id ? (
                      <>
                        <SubmitButton form={`edit-category-${category.id}`} variant="outline" className="px-2.5 py-1 text-xs" pendingLabel="…">
                          Save
                        </SubmitButton>
                        <button type="button" onClick={() => setEditing(null)} className="rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-100">
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setEditing({ id: category.id, name: category.name, description: category.description ?? '' })}
                          className="rounded-lg px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50"
                        >
                          Edit
                        </button>
                        <form action={deleteFormAction}>
                          <input type="hidden" name="siteId" value={siteId} />
                          <input type="hidden" name="categoryId" value={category.id} />
                          <SubmitButton
                            variant="danger"
                            className="px-2.5 py-1 text-xs"
                            pendingLabel="…"
                            confirm={
                              category.postCount > 0
                                ? `"${category.name}" still has ${category.postCount} post(s) and cannot be deleted. Try anyway to see the error?`
                                : `Delete category "${category.name}"?`
                            }
                          >
                            Delete
                          </SubmitButton>
                        </form>
                      </>
                    )}
                  </div>
                  {editing?.id === category.id && (
                    <form id={`edit-category-${category.id}`} action={updateFormAction}>
                      <input type="hidden" name="siteId" value={siteId} />
                      <input type="hidden" name="categoryId" value={category.id} />
                    </form>
                  )}
                </td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-400">
                  No categories yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* --------------------------------- authors -------------------------------- */

export interface AuthorRow {
  id: string;
  slug: string;
  name: string;
  role?: string;
  bio?: string;
  postCount: number;
}

export function AuthorManager({ siteId, authors }: { siteId: string; authors: AuthorRow[] }) {
  const [createState, createFormAction] = useActionState(createAuthorAction, initial);
  const [updateState, updateFormAction] = useActionState(updateAuthorAction, initial);
  const [deleteState, deleteFormAction] = useActionState(deleteAuthorAction, initial);
  const [editing, setEditing] = useState<{ id: string; name: string; role: string; bio: string } | null>(null);

  useEffect(() => setEditing(null), [authors]);

  return (
    <div className="space-y-6">
      <form action={createFormAction} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <input type="hidden" name="siteId" value={siteId} />
        <h2 className="mb-1 font-semibold text-slate-900">Add an author</h2>
        <p className="mb-4 text-sm text-slate-500">Authors are scoped to this website and selectable in the post editor.</p>
        <FormFeedback state={createState} />
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_2fr_auto] sm:items-end">
          <Field label="Name">
            <input type="text" name="name" required maxLength={80} className={inputClass} />
          </Field>
          <Field label="Role (optional)">
            <input type="text" name="role" maxLength={120} placeholder="Senior Editor" className={inputClass} />
          </Field>
          <Field label="Bio (optional)">
            <input type="text" name="bio" maxLength={500} className={inputClass} />
          </Field>
          <div className="pb-0.5">
            <SubmitButton pendingLabel="Adding…">Add</SubmitButton>
          </div>
        </div>
      </form>

      <FormFeedback state={updateState} />
      <FormFeedback state={deleteState} />

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
            <tr>
              <th scope="col" className="px-4 py-3">Author</th>
              <th scope="col" className="px-4 py-3">Role</th>
              <th scope="col" className="px-4 py-3">Posts</th>
              <th scope="col" className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {authors.map((author) => (
              <tr key={author.id}>
                <td className="px-4 py-3">
                  {editing?.id === author.id ? (
                    <input
                      type="text"
                      form={`edit-author-${author.id}`}
                      name="name"
                      defaultValue={author.name}
                      required
                      maxLength={80}
                      className={inputClass}
                    />
                  ) : (
                    <span className="font-medium text-slate-900">{author.name}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {editing?.id === author.id ? (
                    <input type="text" form={`edit-author-${author.id}`} name="role" defaultValue={author.role ?? ''} maxLength={120} className={inputClass} />
                  ) : (
                    <span className="text-slate-600">{author.role ?? '—'}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">{author.postCount}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1.5">
                    {editing?.id === author.id ? (
                      <>
                        <SubmitButton form={`edit-author-${author.id}`} variant="outline" className="px-2.5 py-1 text-xs" pendingLabel="…">
                          Save
                        </SubmitButton>
                        <button type="button" onClick={() => setEditing(null)} className="rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-100">
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setEditing({ id: author.id, name: author.name, role: author.role ?? '', bio: author.bio ?? '' })}
                          className="rounded-lg px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50"
                        >
                          Edit
                        </button>
                        <form action={deleteFormAction}>
                          <input type="hidden" name="siteId" value={siteId} />
                          <input type="hidden" name="authorId" value={author.id} />
                          <SubmitButton
                            variant="danger"
                            className="px-2.5 py-1 text-xs"
                            pendingLabel="…"
                            confirm={
                              author.postCount > 0
                                ? `"${author.name}" still has ${author.postCount} post(s) and cannot be deleted.`
                                : `Delete author "${author.name}"?`
                            }
                          >
                            Delete
                          </SubmitButton>
                        </form>
                      </>
                    )}
                  </div>
                  {editing?.id === author.id && (
                    <form id={`edit-author-${author.id}`} action={updateFormAction}>
                      <input type="hidden" name="siteId" value={siteId} />
                      <input type="hidden" name="authorId" value={author.id} />
                    </form>
                  )}
                </td>
              </tr>
            ))}
            {authors.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-400">
                  No authors yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
