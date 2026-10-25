# Real Estate Modern — MSP Theme Package v1

A sample theme package demonstrating the official MSP theme format. It is
**declarative data only**: a manifest, four route templates, scoped CSS, and a
preview image. The platform's runtime renderer turns it into a working theme —
no code inside the package is ever executed.

## What it looks like

A modern premium real-estate identity: serif display headings, a full-bleed
overlay hero, overlay property cards with price badges, dark stat bands, and a
clean editorial journal. All colors, the logo, navigation, SEO, and content
come from the website's own configuration — nothing about a specific tenant
is hardcoded.

## Layout composition

- **Header** (`nav-cta`): logo left, navigation center-right, a sticky bar
  with a "Book a viewing" CTA (label/href configurable in the manifest).
- **Footer** (`columns`): brand + tagline left, navigation right.
- **Typography**: serif headings, sans body.
- **Home/page**: the website's CMS blocks render through the package's
  variants; inner pages get a title band and a closing CTA panel.

## Files

```
theme.json             manifest (id, version, entry points, layout config)
assets/preview.png     admin preview image (≤ 400 KB)
styles/theme.css       scoped, sanitized styling hints
templates/home.json    homepage composition
templates/page.json    CMS page composition (+ static CTA panel)
templates/post-list.json  journal grid, featured-first
templates/post.json    article layout (cover + author card)
```

## Validate / pack / install

```bash
npm run theme:validate -- theme-packages/real-estate-modern
npm run theme:pack -- theme-packages/real-estate-modern
# → real-estate-modern.zip (root = package root)

# local install into the configured database (Super Admin account required):
npm run theme:install -- theme-packages/real-estate-modern
```

Then in the admin: open a website → Theme → "Real Estate Modern" appears
alongside the built-in themes → Apply. The website's branding palette drives
all colors automatically.

## Authoring notes

- Property listings are represented with the existing `cards` block
  (variant `overlay`): image, title, description, `meta: ["$ 1.2 M · 4 bd"]`,
  and a `tag` badge — no new database entities are involved.
- The full specification: [docs/theme-package-v1.md](../../docs/theme-package-v1.md).
  Step-by-step authoring guide: [docs/theme-authoring-guide.md](../../docs/theme-authoring-guide.md).
