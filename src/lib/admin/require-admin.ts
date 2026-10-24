import { auth } from './auth';
import type { AdminSessionUser } from './types';

/** Thrown by requireAdmin/requireSuperAdmin when unauthenticated. */
export class UnauthenticatedError extends Error {
  constructor() {
    super('Authentication required.');
    this.name = 'UnauthenticatedError';
  }
}

/**
 * Server-side session gate for admin pages and mutations. Always re-derives
 * the session from the signed cookie — never trusts client-provided identity.
 * Redirects to the login page when unauthenticated (safe for server
 * components); server actions should catch UnauthenticatedError and return a
 * result object instead.
 */
export async function requireAdmin(): Promise<AdminSessionUser> {
  const session = await auth();
  const user = session?.user;
  if (!user?.id || !user.email || (user.role !== 'SUPER_ADMIN' && user.role !== 'SITE_ADMIN')) {
    throw new UnauthenticatedError();
  }
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}
