#!/usr/bin/env node
/**
 * Production smoke test for the deployed Multi-Website Platform.
 *
 *   node scripts/smoke-test.mjs https://your-app.vercel.app
 *
 * Works against the raw *.vercel.app URL (before custom domains): every demo
 * site is reachable through its /preview/{siteId} route on any hostname.
 *
 * Preview semantics: GET /preview/{siteId} redirects to / and sets an
 * HttpOnly preview cookie; nested navigation then renders that site. This
 * script implements a minimal cookie jar to follow the same flow a browser
 * performs.
 *
 * All checks are non-destructive and read-only. Exit 0 = all passed.
 */

const BASE = process.argv[2];
if (!BASE) {
  console.error('Usage: node scripts/smoke-test.mjs <deployed-url>');
  console.error('Example: node scripts/smoke-test.mjs https://my-platform.vercel.app');
  process.exit(1);
}

const base = BASE.replace(/\/+$/, '');

const SITES = [
  { id: 'business-demo', markers: ['Meridian Consulting'] },
  { id: 'travel-demo', markers: ['Wayfare Travel Co.'] },
  { id: 'blog-demo', markers: ['The Margin'] },
  { id: 'portfolio-demo', markers: ['Atelier Nord'] },
  { id: 'news-demo', markers: ['The Daily Signal'] },
  { id: 'tech-demo', markers: ['Northbeam', 'Boring'] },
  { id: 'agency-demo', markers: ['Bold &amp; Co', 'Loud ideas'] },
];

const SECRET_PATTERNS = [
  /postgres(ql)?:\/\/[^\s"']+/i,
  /AUTH_SECRET/i,
  /STRIPE_SECRET/i,
  /service_role/i,
  /supabase_service/i,
];

let failures = 0;
let checks = 0;

function report(ok, label, detail = '') {
  checks += 1;
  if (ok) console.log(`  ✓ ${label}`);
  else {
    failures += 1;
    console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

async function get(path, { cookie, manual = false } = {}) {
  const res = await fetch(base + path, {
    redirect: manual ? 'manual' : 'follow',
    headers: cookie ? { cookie } : undefined,
  });
  const setCookie = res.headers.getSetCookie?.() ?? [];
  const body = res.headers.get('content-type')?.includes('text/html') ? await res.text() : '';
  return { res, body, setCookie };
}

function cookieFrom(setCookie) {
  const pair = setCookie
    .map((c) => c.split(';')[0])
    .find((c) => c.startsWith('preview_site='));
  return pair ?? null;
}

/** Enter preview for a site: returns the preview cookie or null. */
async function enterPreview(siteId) {
  const first = await get(`/preview/${siteId}`, { manual: true });
  const cookie = cookieFrom(first.setCookie);
  if (!cookie) return null;
  // Landing request with the cookie establishes the site context.
  const home = await get('/', { cookie });
  return { cookie, home };
}

async function main() {
  console.log(`\nSmoke test against: ${base}\n`);

  // 1. Landing page for the deployment hostname (unassigned host fallback).
  {
    const { res, body } = await get('/');
    report(
      res.status === 200 && /MultiSite Platform|Choose a website/i.test(body),
      'Landing page renders for the deployment hostname (safe fallback)',
    );
    report(
      SITES.every((s) => body.includes(`landing-card-${s.id}`)),
      'Landing lists all 7 demo site cards',
    );
  }

  // 2. Every demo site renders through the preview flow.
  const siteCookies = {};
  for (const site of SITES) {
    try {
      const session = await enterPreview(site.id);
      if (!session) {
        report(false, `Preview entry for "${site.id}"`, 'no preview cookie was set');
        continue;
      }
      siteCookies[site.id] = session.cookie;
      const ok = site.markers.some((m) => session.home.body.includes(m));
      report(ok && session.home.res.status === 200, `Site "${site.id}" renders its theme`);
    } catch (error) {
      report(false, `Preview entry for "${site.id}"`, error.message);
    }
  }

  // 3. Page + post content renders inside site contexts.
  const contentChecks = [
    { site: 'travel-demo', path: '/destinations', marker: 'Wayfare' },
    { site: 'blog-demo', path: '/posts/the-attention-economy-is-running-out-of-attention', marker: 'The Margin' },
    { site: 'news-demo', path: '/posts/signal-briefing-platform-consolidation', marker: 'The Daily Signal' },
    { site: 'tech-demo', path: '/services', marker: 'Northbeam' },
  ];
  for (const check of contentChecks) {
    const cookie = siteCookies[check.site];
    if (!cookie) {
      report(false, `Content renders: ${check.site}${check.path}`, 'no preview session');
      continue;
    }
    const { res, body } = await get(check.path, { cookie });
    report(res.status === 200 && body.includes(check.marker), `Content renders: ${check.site}${check.path}`);
  }

  // 4. Site isolation: cross-site content and unknown routes are 404s.
  {
    const cookie = siteCookies['travel-demo'];
    if (!cookie) {
      report(false, 'Site isolation checks', 'no travel-demo session');
    } else {
      const cross = await get('/posts/what-a-good-strategy-review-actually-changes', { cookie });
      report(cross.res.status === 404, 'Cross-site post request returns 404 (site isolation)');
      const unknown = await get('/this-route-does-not-exist-xyz', { cookie });
      report(unknown.res.status === 404, 'Unknown route inside a site context returns 404');
    }
  }

  // 5. Admin is gated for anonymous visitors.
  {
    const { res } = await get('/admin', { manual: true });
    report(
      [307, 302, 303].includes(res.status) && (res.headers.get('location') ?? '').includes('/admin/login'),
      'Unauthenticated /admin redirects to login',
    );
    const login = await get('/admin/login');
    report(login.res.status === 200 && login.body.includes('Platform Admin'), 'Login page renders');
    report(
      !(login.body.includes('data-source') && login.body.includes('postgres://')),
      'Login page leaks no database details',
    );
  }

  // 6. Secret-leak scan across all collected site home pages.
  {
    let leaked = null;
    for (const [siteId, cookie] of Object.entries(siteCookies)) {
      const { body } = await get('/', { cookie });
      const hit = SECRET_PATTERNS.find((p) => p.test(body));
      if (hit) {
        leaked = `${siteId} matched ${hit}`;
        break;
      }
    }
    report(!leaked, 'No secrets in rendered HTML', leaked ?? undefined);
  }

  console.log(`\n${checks - failures}/${checks} checks passed.`);
  if (failures > 0) {
    console.log('FAILURES DETECTED — see the ✗ lines above.');
    process.exit(1);
  }
  console.log('All smoke checks passed.');
}

main().catch((error) => {
  console.error('Smoke test crashed:', error.message);
  process.exit(1);
});
