# Theme Preview Lab

Admin → **Preview lab** (`/admin/themes/lab`) renders any theme against
representative demo content — before choosing it for a website, and before
installing it at all. Previews never activate a theme, never read or write
site content, and are visible only to authenticated administrators.

## What it does

| Feature | Details |
| --- | --- |
| **All four template routes** | Home, generic Page, Post list and Post, each rendered with demo pages, six demo posts and three categories. |
| **Block showcase** | One of each of the 11 platform content blocks rendered through the theme's own page view. |
| **Variant gallery** (packages) | A synthetic package rendering every per-section variant the runtime renderer ships (hero ×3, cards ×3, CTA ×3, … 27 presentations). |
| **Desktop / mobile toggle** | Client-side width toggle (full width vs. 420 px constrained column). |
| **Uninstalled packages** | Upload a ZIP: the same validator as installation runs first, then the package is staged **in memory only** and rendered — nothing touches the database. |
| **Clear errors** | Field-level validation errors on upload; a dedicated rendering-error boundary if a theme throws; explicit notices for expired/unknown packages. |

## Sources (`src` param on the preview URL)

- `u_<token>` — a staged uninstalled package (from upload).
- `p_<themeId>` — an installed package, rendered **exactly as production
  renders it** (same store, same asset route).
- `n_<themeId>` — a native registry theme.

The lab entry page lists installed packages (read-only DB query) and native
themes with one-click preview links.

## Security model

- **Auth**: preview pages and the staged-asset API both call `requireAdmin()`;
  unauthenticated requests redirect (pages) or get 401 (assets).
- **No activation**: the preview never mutates `site.themeId` or any site
  setting; there is no "apply from preview" path.
- **No install**: uploaded packages go to the in-memory store, never to
  `theme_packages`. The database layer isn't even imported by the store
  module (asserted by a test).
- **Same validation as install**: uploaded ZIPs pass through
  `validatePackage` — file allowlist, size limits, traversal guards, block
  validation, CSS sanitizer/scoper. Rejections return the installer's
  field-level errors.
- **Asset serving**: `/api/theme-preview-assets/<token>/<asset>` serves only
  exact-key image files from the staged package (`private, no-store`).
  Uninstalled-package hero/section images resolve through this route; the
  renderer is given an `assetBasePath` override for that purpose. Installed
  packages keep the production asset route unchanged.
- **No secrets**: staged packages contain what was uploaded; no environment
  values, DB rows or site content are involved in a preview render.

## Honest limitations (by design, documented for Phase 10)

1. **The mobile toggle is a width approximation.** Tailwind responsive
   breakpoints react to the viewport, not the container, so the 420 px
   column shows the desktop layout narrowed — not a true mobile render.
   A faithful mobile preview needs an iframe or container-query-based
   themes (Phase 10 candidate).
2. **The staged store is per-process.** Uploads are kept in one server
   instance's memory for 30 minutes (max 8 packages, oldest evicted). Fine
   for single-instance dev and small deployments; a multi-instance
   production rollout would need a signed-upload flow or a scoped DB row.
3. **Postlist variants are template options, not section variants.** The
   renderer maps `postlist` presentations via template `options`
   (`grid` / `list`, `postListFeaturedFirst`), so the gallery shows the grid
   form and the Post list tab shows each theme's configured variant.
4. **Demo fixtures are generic.** They are representative (hero, features,
   cards, testimonials, logos, CTA, contact, richtext, postlist + three
   categories of posts) but deliberately not your content.

## Testing

`tests/preview-lab.test.tsx` (DB-free) covers: staging/expiry/capacity of
the store, asset lookup rules (including traversal attempts), staging all
seven shipped packages, malformed-ZIP rejection, the gallery's full variant
matrix, fixtures rendering every route for installed packages, and an
end-to-end uninstalled render with preview-scoped asset URLs.
