# Wanderlust Signature — MSP Theme Package v1

A premium editorial travel theme: full-bleed dusk hero, overlay destination
cards with honest pricing, curated-tour cards, a trust stat band and a serif
reading experience. Generated from the Theme Starter Kit (`npm run theme:new`)
and then designed — every section renders through the platform runtime.
Imagery uses availability-verified Unsplash URLs in the templates (Unsplash
license permits free use — swap in your own photography any time), and
`assets/preview.png` is locally generated artwork for the library thumbnail.

## Structure

```
wanderlust-signature/
├── theme.json           # Manifest: identity, layout chrome, entry points
├── templates/
│   ├── home.json        # Hero, destination + tour cards, stat band, booking CTA
│   ├── page.json        # Generic page route
│   ├── post-list.json   # Journal index (airy list layout)
│   └── post.json        # Article detail (cover, author card, drop cap)
├── styles/theme.css     # Editorial polish, scoped to .msp-theme-wanderlust-signature
├── assets/preview.png   # Library thumbnail (locally generated dusk artwork)
└── README.md
```

## How rendering works

Templates compose **static sections** (the platform's typed content blocks)
around exactly **one `{ "type": "content" }` slot**, which renders the
website's own CMS content:

- `home` / `page`: the CMS blocks of the homepage / inner page.
- `postList` / `post`: the journal index / a single article (shaped by the
  template `options`).

Packages are declarative data only — no JavaScript, no code execution. The
platform runtime renders everything through approved components, and
`styles/theme.css` is sanitized and namespaced to this theme.

## Workflow

```bash
npm run theme:validate -- theme-packages/wanderlust-signature   # structural check
npm run theme:pack     -- theme-packages/wanderlust-signature   # build wanderlust-signature.zip
```

Then either upload the ZIP in **Admin → Theme library** (Super Admin) to
install it, or open **Admin → Preview lab** to render it with demo content
*without installing anything*. `npm run theme:install -- theme-packages/wanderlust-signature.zip`
installs from the CLI.

## Rules of the road

- Keep `id` stable across versions (it is the install identity).
- Bump `version` (semver) for every re-upload; downgrades are rejected.
- Declare every block you use in `supportedBlocks`.
- CSS limits: no `@import`, no `url()`, no `position: fixed`; ≤ 64 KB.
- Docs: docs/theme-package-v1.md · docs/theme-authoring-guide.md
