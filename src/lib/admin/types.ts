export type AdminRole = 'SUPER_ADMIN' | 'SITE_ADMIN';

export interface AdminSessionUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
}

/** Typed result for server actions and service calls. */
export type ServiceErrorCode = 'VALIDATION' | 'FORBIDDEN' | 'NOT_FOUND' | 'CONFLICT' | 'UNAVAILABLE';

export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code: ServiceErrorCode };

export function ok<T>(data: T): ServiceResult<T> {
  return { ok: true, data };
}

export function fail(error: string, code: ServiceErrorCode = 'VALIDATION'): ServiceResult<never> {
  return { ok: false, error, code };
}

export const SITE_ADMIN_PERMISSIONS = {
  updateSettings: true,
  updateTheme: true,
  manageDomains: true,
  createSite: false,
  changeSiteStatus: false,
  manageUsers: false,
} as const;
