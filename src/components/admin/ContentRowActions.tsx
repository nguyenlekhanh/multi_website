'use client';

import {
  deletePageAction,
  deletePostAction,
  setPageStatusAction,
  setPostStatusAction,
  type ActionState,
} from '@/app/admin/content-actions';
import { useActionState } from 'react';
import { SubmitButton } from './form';

const initial: ActionState = {};

/** Inline publish/unpublish + delete controls for content list rows. */
export function PageRowActions({
  siteId,
  pageId,
  status,
  isHomepage,
}: {
  siteId: string;
  pageId: number;
  status: 'DRAFT' | 'PUBLISHED';
  isHomepage: boolean;
}) {
  const [statusState, statusFormAction] = useActionState(setPageStatusAction, initial);
  const [deleteState, deleteFormAction] = useActionState(deletePageAction, initial);
  void statusState;
  void deleteState;

  return (
    <div className="flex justify-end gap-1.5">
      <form action={statusFormAction}>
        <input type="hidden" name="siteId" value={siteId} />
        <input type="hidden" name="pageId" value={pageId} />
        <input type="hidden" name="status" value={status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED'} />
        <SubmitButton variant="outline" className="px-2.5 py-1 text-xs" pendingLabel="…">
          {status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
        </SubmitButton>
      </form>
      {!isHomepage && (
        <form action={deleteFormAction}>
          <input type="hidden" name="siteId" value={siteId} />
          <input type="hidden" name="pageId" value={pageId} />
          <SubmitButton variant="danger" className="px-2.5 py-1 text-xs" pendingLabel="…" confirm="Delete this page? This cannot be undone.">
            Delete
          </SubmitButton>
        </form>
      )}
    </div>
  );
}

export function PostRowActions({
  siteId,
  postId,
  status,
}: {
  siteId: string;
  postId: number;
  status: 'DRAFT' | 'PUBLISHED';
}) {
  const [statusState, statusFormAction] = useActionState(setPostStatusAction, initial);
  const [deleteState, deleteFormAction] = useActionState(deletePostAction, initial);
  void statusState;
  void deleteState;

  return (
    <div className="flex justify-end gap-1.5">
      <form action={statusFormAction}>
        <input type="hidden" name="siteId" value={siteId} />
        <input type="hidden" name="postId" value={postId} />
        <input type="hidden" name="status" value={status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED'} />
        <SubmitButton variant="outline" className="px-2.5 py-1 text-xs" pendingLabel="…">
          {status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
        </SubmitButton>
      </form>
      <form action={deleteFormAction}>
        <input type="hidden" name="siteId" value={siteId} />
        <input type="hidden" name="postId" value={postId} />
        <SubmitButton variant="danger" className="px-2.5 py-1 text-xs" pendingLabel="…" confirm="Delete this post? This cannot be undone.">
          Delete
        </SubmitButton>
      </form>
    </div>
  );
}
