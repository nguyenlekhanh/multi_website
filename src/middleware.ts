import { NextResponse, type NextRequest } from 'next/server';
import { normalizeHost } from '@/platform/domain';
import { PREVIEW_COOKIE, SITE_HOST_HEADER, SITE_ID_HEADER } from '@/platform/constants';

/**
 * Request middleware (Edge Runtime — no database access from here).
 *
 * It only stamps headers; every site/domain decision is made server-side by
 * the resolver against the active data source (PostgreSQL in production):
 *
 *   - `x-site-host` : normalized request hostname (always set)
 *   - `x-site-id`   : preview site id from the dev preview cookie (format-
 *                     checked only; validity is verified against the data
 *                     source by the resolver)
 *   - `x-pathname`  : current path (layout variants)
 *
 * `/preview/{siteId}` and `/preview/clear` manage the dev preview cookie.
 */

const SITE_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;

function requestHost(req: NextRequest): string | null {
  const forwarded = req.headers.get('x-forwarded-host');
  return normalizeHost(forwarded ?? req.headers.get('host'));
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Dev preview entry points.
  const previewMatch = pathname.match(/^\/preview\/([^/]+)\/?$/);
  if (previewMatch) {
    const target = previewMatch[1];
    const res = NextResponse.redirect(new URL('/', req.nextUrl));
    if (target === 'clear') {
      res.cookies.delete(PREVIEW_COOKIE);
    } else if (SITE_ID_PATTERN.test(target)) {
      // Validity (does this site exist?) is checked by the resolver against
      // the data source; an unknown id simply lands on the platform page.
      res.cookies.set(PREVIEW_COOKIE, target, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
      });
    }
    return res;
  }

  const host = requestHost(req);
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set(SITE_HOST_HEADER, host ?? '');
  // Themes (e.g. layout chrome variants) may need the current path server-side.
  requestHeaders.set('x-pathname', pathname);

  // Preview cookie → explicit site id header. The resolver only honors it
  // when the hostname itself is not a configured domain.
  const cookieValue = req.cookies.get(PREVIEW_COOKIE)?.value ?? null;
  if (cookieValue && SITE_ID_PATTERN.test(cookieValue)) {
    requestHeaders.set(SITE_ID_HEADER, cookieValue);
  }

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set('x-site-resolution', cookieValue ? `cookie:${cookieValue}` : `host:${host ?? 'unknown'}`);
  return res;
}

export const config = {
  matcher: [
    // Everything except Next internals, static assets, and files with extensions.
    '/((?!_next/static|_next/image|images/|favicon.ico|.*\\.[\\w]+$).*)',
  ],
};
