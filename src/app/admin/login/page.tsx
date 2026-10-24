import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/admin/LoginForm';
import { auth } from '@/lib/admin/auth';

export const metadata = { title: 'Sign in' };

/** Login page. Already-authenticated users go straight to the dashboard. */
export default async function AdminLoginPage() {
  const session = await auth();
  if (session?.user) redirect('/admin');

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-indigo-500 text-lg font-bold text-slate-950">
            M
          </span>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-white">Platform Admin</h1>
          <p className="mt-1.5 text-sm text-slate-400">
            Sign in to manage websites, domains, themes, and branding.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-7 shadow-2xl backdrop-blur">
          <LoginForm />
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          Accounts are provisioned by platform operators — there is no public registration.{' '}
          <Link href="/" className="underline decoration-slate-600 underline-offset-2 hover:text-slate-300">
            Back to websites
          </Link>
        </p>
      </div>
    </div>
  );
}
