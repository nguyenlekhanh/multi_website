# MSP Theme Package v1 — Official Specification

Status: **v1 (format `msp-theme`, formatVersion 1)** · Runtime: shipped in
this repository · Sample: [theme-packages/real-estate-modern](../theme-packages/real-estate-modern)

## 1. Purpose and hard boundaries

An MSP Theme Package is a **declarative theme** for the Multi-Website Theme
Platform: a ZIP of a manifest, JSON templates, scoped CSS, and image assets.
It lets new themes be authored (e.g. with ZCode), validated, packed, uploaded
in the admin, previewed, and activated for any website — without deploying
new code.

**What a package is NOT:**

- It contains **no JavaScript, TypeScript, TSX, HTML, or executable code**.
  The runtime never `eval`s, `Function()`s, or dynamic-imports anything from a
  package. Next.js/Vercel cannot compile uploaded source — so the format
  forbids it entirely; the platform's **runtime renderer** interprets the
  package using platform-approved components only.
- A package never queries PostgreSQL, reads the filesystem or environment
  variables, or accesses another tenant's data. All data arrives via the
  existing `SiteContext`/content props with site isolation intact.
- Packages cannot override or unregister the native theme registry.

Native React themes (Business, Travel, Blog, Portfolio, News, IT, Agency)
remain the built-ins; packages live beside them (`package:<id>` references)
behind the same `ThemeDefinition` contract.

## 2. Package structure (final, v1)

```
<theme-id>/
  theme.json               # manifest — required, at the root
  README.md                # optional human documentation
  assets/
    preview.png            # optional preview image (png/jpg/webp, ≤ 400 KB)
  styles/
    theme.css              # optional scoped CSS (≤ 64 KB)
  templates/
    home.json              # required — homepage composition
    page.json              # required — CMS page composition
    post-list.json         # required — post list composition
    post.json              # required — post detail composition
```

Roles:

| File | Required | Role |
| --- | --- | --- |
| `theme.json` | yes | Identity, version, compatibility, entry points, layout chrome. |
| `templates/home.json` | yes | Homepage: header band + sections around the CMS content slot. |
| `templates/page.json` | yes | CMS pages; may add static sections (e.g. closing CTA). |
| `templates/post-list.json` | yes | Journal grid/list options (layout, featured-first). |
| `templates/post.json` | yes | Article options (cover, author card). |
| `styles/theme.css` | no | Styling hints; sanitized and auto-scoped to `.msp-theme-<id>`. |
| `assets/preview.png` | no | Admin preview image. |
| `README.md` | no | Author notes. |

No other files or directories are allowed (`sections/` is reserved for a
future revision and rejected in v1). ZIP archives produced by the packager
have **exactly this root** — no wrapper directory.

## 3. Manifest (`theme.json`)

```jsonc
{
  "format": "msp-theme",          // required, literal
  "formatVersion": 1,             // required; this runtime accepts 1 only
  "id": "real-estate-modern",     // ^[a-z][a-z0-9-]{1,48}$; must not collide
                                  //   with a native theme id or an installed package
  "name": "Real Estate Modern",   // 2–80 chars
  "version": "1.0.0",             // semver; updates must be newer; same version = conflict
  "description": "…",             // 10–400 chars
  "author": { "name": "…", "url": "https://…" },  // url optional, https only
  "preview": "assets/preview.png", // optional path inside the package
  "compatibility": { "platform": "1" },           // platform generation "1"
  "features": ["responsive", "post-list"],        // free-form strings, ≤ 40 chars each
  "supportedBlocks": ["hero", "cards", "…"],      // ⊆ the 11 platform blocks
  "entry": {
    "templates": { "home": "…", "page": "…", "postList": "…", "post": "…" },
    "styles": "styles/theme.css"                  // optional
  },
  "layout": {
    "header": { "variant": "nav-cta", "sticky": true, "ctaLabel": "…", "ctaHref": "…" },
    "footer": { "variant": "columns", "showTagline": true },
    "typography": { "headingFont": "serif", "bodyFont": "sans", "displayScale": 1.1 },
    "colors": { "mode": "brand" }                 // v1: brand colors only
  }
}
```

Enums (v1):

- `header.variant`: `logo-left-nav` | `centered` | `nav-cta`
- `footer.variant`: `columns` | `minimal` | `large-brand`
- `typography.headingFont`/`bodyFont`: `sans` | `serif` | `mono`
- `supportedBlocks` (the platform's 11 typed blocks): `hero`, `intro`,
  `features`, `cards`, `stats`, `testimonials`, `richtext`, `logos`, `cta`,
  `contact`, `postlist`

`colors.mode: "brand"` means the website's configured palette (site settings)
drives all colors through the platform's `--c-*` variables — packages cannot
ship fixed palettes in v1.

## 4. Templates

A template composes one route. It must contain **exactly one `content`
slot**, which renders the website's own CMS blocks (pages) or post list /
post (as appropriate for the route). Static sections around the slot are
blocks validated with the **same validator the CMS uses**.

```jsonc
{
  "route": "page",                       // must match the file's slot
  "contentHeader": { "style": "band", "showEyebrow": true },  // none | band | split
  "sections": [
    { "type": "content" },               // exactly one per template
    {
      "type": "static",                  // a fixed block shipped by the package
      "variant": "panel",                // optional presentation variant
      "block": { "type": "cta", "heading": "…", "buttonLabel": "…", "buttonHref": "/contact" }
    }
  ],
  "options": {
    "postListLayout": "grid",            // grid | list (post-list)
    "postListFeaturedFirst": true,        // promote the newest post
    "postShowCover": true,               // post
    "postShowAuthorCard": true,          // post
    "containerWidth": "normal"           // narrow | normal | wide
  }
}
```

### Block variants (v1)

| Block | Variants |
| --- | --- |
| hero | `split`, `overlay`, `centered` |
| intro | `media-text`, `stacked` |
| features | `cards`, `numbered`, `side-icon` |
| cards | `stacked`, `overlay`, `minimal` |
| stats | `band`, `columns` |
| testimonials | `grid`, `carousel-quiet` |
| richtext | `prose`, `lead` |
| logos | `row`, `wrapped` |
| cta | `panel`, `banner`, `split` |
| contact | `cards`, `rows` |
| postlist | `cards`, `rows`, `featured-first` |

Unknown variants are **validation errors**, not silent fallbacks.

### Static-block images

Static blocks may reference package images with `assets/...` paths; the
validator checks existence, extension (png/jpg/jpeg/webp), and per-file size.
At render time they resolve to `/api/theme-assets/<themeId>/<asset>`.

## 5. CSS rules (`styles/theme.css`)

- Standard CSS only. **Rejected**: `@import`, `@charset`, `@namespace`,
  `url()` (any form), `expression()`, `behavior`, `-moz-binding`,
  `javascript:` URIs, HTML tags, `position: fixed`.
- The runtime **scopes every rule** to `.msp-theme-<id>` before storage, so
  package CSS can only affect its own themed subtree.
- Limits: ≤ 64 KB source (96 KB after scoping).

## 6. Validation rules (exhaustive)

`validatePackage(files)` (CLI, tests, installer — one implementation) rejects:

1. Missing/invalid `theme.json`; wrong `format`/`formatVersion`; bad id/name/
   version/description/author/compatibility shapes.
2. Missing or unknown template slots; missing entry files; paths outside the
   package; `..`/absolute/backslash paths anywhere (files and manifest).
3. Templates that are not valid JSON, wrong `route`, missing or multiple
   content slots, unknown section shapes.
4. Static sections with unknown block types, blocks not declared in
   `supportedBlocks`, blocks failing the platform block validator, or unknown
   variants.
5. Files outside the allowlist (any `.js`/`.ts`/`.tsx`/`.html`, arbitrary
   extensions, unexpected directories); duplicate normalized names; directory
   entries.
6. Assets: missing referenced files, wrong extensions, size overruns.
7. Limits: > 64 files, > 8 MB uncompressed, manifest/template/CSS/preview
   overruns.
8. CSS containing any forbidden construct (list in §5).

Every error carries `{ path, field?, message }` — field-level where possible.

ZIP-level guards (installer + reader): non-ZIP bytes, truncated/corrupt
archives, unsupported compression methods, size/ratio inconsistencies,
classic bomb signatures (extreme expansion from tiny payloads), > 512
entries, path-traversal entry names, and a single-wrapper-directory strip
(for archives packed with an extra root folder).

## 7. Install / activate / rollback / uninstall

Super Admin only (platform-wide asset), all audited transactionally:

- **Install**: upload ZIP ≤ 2 MB → full validation → native-id collision
  check → same-version conflict / downgrade rejection → stored in
  PostgreSQL (`theme_packages`: manifest + templates JSON, scoped CSS,
  preview bytes) — never on the filesystem, so Vercel's ephemeral disks are
  fine. New versions archive the old (rollback keeps them).
- **Activate**: any admin with site access selects the package in the
  website's theme picker (it appears beside native themes automatically);
  `sites.theme_id` stores `package:<id>`; activation reuses the existing
  audited `setSiteTheme` service (cross-site authorization intact).
- **Rollback**: Super Admin picks an archived version; the CURRENT pointer
  moves back; renderers pick it up on the next request.
- **Uninstall**: refused while any website references the package; otherwise
  deletes all versions + audit entry.
- Missing/stale `package:` references at render time fall back to a native
  theme (never a crash, logged).

## 8. Vercel runtime constraints (documented reality)

- Uploaded TSX/JS **cannot** be compiled by a deployed Next.js app — hence
  the declarative-only format and the platform runtime renderer.
- Package bytes live in PostgreSQL (2 MB ZIP cap), so no object storage is
  required in v1; when packages grow (more/larger assets), move blobs to
  Supabase Storage and keep only metadata in PostgreSQL.
- The theme-asset route serves **only the stored preview image** — it is not
  a general file server.
- Server-action uploads are bounded by `bodySizeLimit: 3mb` in
  `next.config.ts` plus the validator's 2 MB ZIP cap.

## 9. Creating a theme with ZCode (summary)

1. Copy `theme-packages/real-estate-modern` as a starting point.
2. Edit `theme.json` (unique id, name, version, layout) and the four
   templates (sections + options + variants).
3. Add `styles/theme.css` hints and an `assets/preview.png`.
4. `npm run theme:validate -- theme-packages/<id>` until clean.
5. `npm run theme:pack -- theme-packages/<id>` → `<id>.zip`
   (validate → zip → re-read → re-validate automatically).
6. Upload in **Admin → Theme library** (Super Admin), then activate on a
   website in **Theme**.

See [theme-authoring-guide.md](theme-authoring-guide.md) for the full
walkthrough and [theme-security.md](theme-security.md) for the threat model.
