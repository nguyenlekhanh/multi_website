import { redirect } from 'next/navigation';
import { auth } from '@/lib/admin/auth';
import { AdminNav } from '@/components/admin/AdminNav';
import { LogoutButton } from '@/components/admin/LogoutButton';
/**
 * Protected admin chrome. `auth()` re-derives the session from the signed
 * cookie server-side on every request; unauthenticated users are redirected
 * to the login page before anything renders.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const user = session?.user;
  if (!user?.id || (user.role !== 'SUPER_ADMIN' && user.role !== 'SITE_ADMIN')) {
    redirect('/admin/login');
  }

  return (
    <div className="min-h-screen bg-slate-100 lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="flex flex-col bg-slate-900 text-slate-300 max-lg:border-b max-lg:border-slate-800 lg:sticky lg:top-0 lg:h-screen">
        <div className="flex items-center gap-3 px-5 py-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-sky-400 to-indigo-500 text-sm font-bold text-slate-950">
            M
          </span>
          <div>
            <p className="text-sm font-semibold text-white">Platform Admin</p>
            <p className="text-xs text-slate-500">MultiSite control center</p>
          </div>
        </div>
        <AdminNav />
        <div className="mt-auto border-t border-slate-800 p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs font-bold text-white">
              {user.name?.slice(0, 2).toUpperCase() || user.email.slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{user.name}</p>
              <p className="truncate text-xs text-slate-500">{user.email}</p>
            </div>
          </div>
          <p className="mt-2 inline-flex rounded-full bg-slate-800 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-300">
            {user.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Site Admin'}
          </p>
          <LogoutButton />
        </div>
      </aside>

      <main className="min-w-0">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-10">{children}</div>
      </main>
    </div>
  );
}
