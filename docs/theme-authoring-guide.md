# Authoring an MSP Theme Package (v1)

A step-by-step guide for creating a new theme with ZCode (or any editor),
validating it, packing it, and activating it on a website. The official
specification lives in [theme-package-v1.md](theme-package-v1.md); the sample
theme in [theme-packages/real-estate-modern](../theme-packages/real-estate-modern)
is the reference implementation.

## The mental model

You are not writing code. You are **configuring a composition**: the platform
runtime already contains every component; your package declares *which*
layout chrome, *which* block variants, and *what* static sections make up
each route. Branding (colors, logo, nav, SEO) always comes from the website's
own settings — a good package works unchanged on any tenant.

## Step 1 — scaffold

```bash
cp -r theme-packages/real-estate-modern theme-packages/<your-theme-id>
cd theme-packages/<your-theme-id>
```

`<your-theme-id>` must match `^[a-z][a-z0-9-]{1,48}$` and must not equal any
native theme id (`business`, `travel`, `blog`, `portfolio`, `news`, `it`,
`agency`) or an installed package id.

## Step 2 — the manifest

Edit `theme.json`:

- `id`, `name`, `version` (semver), `description`, `author`.
- `supportedBlocks`: list only the blocks your composition actually uses —
  static sections using an unlisted block are validation errors (explicit,
  not silent).
- `entry.templates`: keep the four paths (they must exist).
- `layout`: pick header/footer variants, fonts, and (optionally) a header CTA.

## Step 3 — templates

Each of the four templates needs **exactly one** `{ "type": "content" }`
slot. Around it you may:

- Choose `contentHeader` (`none` / `band` / `split`) for page titles.
- Add **static sections** — fixed blocks the package ships, e.g. a closing
  CTA on every page:

  ```json
  { "type": "static", "variant": "panel",
    "block": { "type": "cta", "heading": "Ready when you are",
               "buttonLabel": "Talk to us", "buttonHref": "/contact" } }
  ```

  Static blocks are validated with the same rules the CMS applies — a
  malformed block is a build-time error with a field-level message.

- Set route options: `postListLayout` (grid/list), `postListFeaturedFirst`,
  `postShowCover`, `postShowAuthorCard`, `containerWidth`.

Variants per block are listed in the spec (§4). If you need a look no variant
provides, prefer CSS hints (Step 4); requesting a new variant is a platform
change, not a package change.

**Images in static blocks** must reference `assets/<file>.png|jpg|webp` inside
the package. Never point at external URLs — offline-first, no remote
dependencies.

## Step 4 — CSS hints (`styles/theme.css`)

Write plain CSS selectors as if unscoped; the platform prefixes every rule
with `.msp-theme-<id>` at validation time. Forbidden (validation errors):
`@import`, any `url()`, `expression()`, `behavior`, `-moz-binding`,
`javascript:`, HTML tags, `position: fixed`. Use it for rhythm and polish
(section padding, hover lifts) — layout structure comes from the renderer.

## Step 5 — preview image

Replace `assets/preview.png` (any png/jpg/webp ≤ 400 KB) — it shows in the
admin library and picker. A flat mock screenshot is fine.

## Step 6 — validate, pack, install

```bash
npm run theme:validate -- theme-packages/<id>
#   → field-level errors until clean

npm run theme:pack -- theme-packages/<id>
#   → <id>.zip next to the directory (round-trip validated automatically)

npm run theme:install -- theme-packages/<id>   # local DB, for development
```

## Step 7 — upload and activate (production)

1. Super Admin → **Admin → Theme library** → upload the ZIP. Validation runs
   server-side; errors are listed field-by-field, nothing is stored on
   failure.
2. Open any website you manage → **Theme** → your package appears alongside
   the built-ins → **Apply theme** (audited).
3. Preview via the site's existing authenticated preview; the public site
   renders through the package on its next request.
4. Updates: upload a higher semver (old versions are archived); **Roll back**
   from the library if needed.

## Common validation errors

| Error | Fix |
| --- | --- |
| `formatVersion` unsupported | Use `1`. |
| Unknown block type | Check spelling against the 11 platform blocks. |
| Block not declared in `supportedBlocks` | Add it to the manifest list. |
| Unknown variant | See the variant table in the spec. |
| File is not part of the package format | Remove `.js`/`.html`/unexpected files; only the allowlist passes. |
| Referenced asset does not exist | Add the file under `assets/` or fix the path. |
| CSS rejected: url()… | Remove external references; package CSS is self-contained. |
| Version X already installed | Bump semver, or roll back instead of downgrading. |

## Testing your theme without installing

The renderer suite in `tests/theme-package-runtime.test.tsx` renders the
sample package across all routes with fixture data — copy it, point it at
your directory, and check your markers render. Empty states, missing images,
and unassigned posts are covered by the platform contract.
