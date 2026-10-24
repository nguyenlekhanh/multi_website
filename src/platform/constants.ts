/**
 * Header/cookie names shared by middleware, the site resolver, and dev tooling.
 * Kept dependency-free so the middleware bundle stays small.
 */

/** Set by middleware: the raw request hostname (lowercased, port stripped). */
export const SITE_HOST_HEADER = 'x-site-host';

/** Set by middleware: an explicit site id (dev preview / preview cookie). */
export const SITE_ID_HEADER = 'x-site-id';

/** Cookie that keeps a dev preview active across navigation. */
export const PREVIEW_COOKIE = 'preview_site';
