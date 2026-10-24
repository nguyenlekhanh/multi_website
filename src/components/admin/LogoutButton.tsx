'use client';

import { logoutAction } from '@/app/admin/actions';
import { SubmitButton } from './form';

export function LogoutButton() {
  return (
    <form action={logoutAction} className="mt-3">
      <SubmitButton
        variant="outline"
        className="w-full border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white"
        pendingLabel="Signing out…"
      >
        Sign out
      </SubmitButton>
    </form>
  );
}
