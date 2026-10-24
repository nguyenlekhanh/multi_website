'use client';

import { useActionState } from 'react';
import { loginAction, type ActionState } from '@/app/admin/actions';
import { Field, FormFeedback, SubmitButton, inputClass } from '@/components/admin/form';

const initial: ActionState = {};

export function LoginForm() {
  const [state, formAction] = useActionState(loginAction, initial);

  return (
    <form action={formAction} className="space-y-5" data-testid="login-form">
      <FormFeedback state={state} />
      <Field label="Email">
        <input
          type="email"
          name="email"
          required
          autoComplete="username"
          placeholder="admin@example.com"
          className={inputClass}
        />
      </Field>
      <Field label="Password">
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          placeholder="••••••••••••"
          className={inputClass}
        />
      </Field>
      <SubmitButton className="w-full" pendingLabel="Signing in…">
        Sign in
      </SubmitButton>
    </form>
  );
}
