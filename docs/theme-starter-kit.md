# Theme Starter Kit

The fastest way to begin a new MSP theme package: one command scaffolds a
**complete, validator-clean v1 package** from a theme name. The generated
package renders immediately, passes `theme:validate` without any manual
fixes, and every file is meant to be edited.

```bash
npm run theme:new -- "Coastal Retreat"
# → theme-packages/coastal-retreat/
```

Options:

| Flag | Purpose | Default |
| --- | --- | --- |
| `--slug` | Override the package id | Slugified name |
| `--author` | Author name in the manifest | `Theme Author` |
| `--url` | Author URL (must be `https://`) | — |
| `--description` | Manifest description (10–400 chars) | Generated from the name |
| `--dir` | Parent directory | `theme-packages` |

The generator refuses reserved ids (native themes), invalid slugs, and
existing directories. It validates the scaffold **before** writing anything
to disk, so a half-generated package can never exist.

## What you get

```
coastal-retreat/
├── theme.json           # Manifest: identity, layout chrome, entry points
├── templates/
│   ├── home.json        # Hero + content slot + stats band + CTA panel
│   ├── page.json        # Band header + content slot + CTA banner
│   ├── post-list.json   # Grid layout with featured-first enabled
│   └── post.json        # Cover + author card enabled
├── styles/theme.css     # Safe starter CSS (auto-scoped to .msp-theme-<id>)
├── assets/preview.png   # Deterministic gradient placeholder — replace it
└── README.md            # Structure, workflow and rules, specific to your id
```

Design decisions baked into the scaffold:

- **All 11 platform blocks declared** in `supportedBlocks`, so nothing you
  add later trips the validator.
- **The hero references `assets/preview.png`**, exercising the package asset
  pipeline out of the box (the validator checks referenced assets exist).
- **Boring defaults**: `logo-left-nav` sticky header, `columns` footer,
  sans typography, brand-color mode — all obvious edit points.
- Version starts at `0.1.0`; bump semver for every re-upload (installs are
  same-version-conflict and downgrade protected).

## The recommended workflow

```bash
npm run theme:new -- "My Theme"
npm run theme:validate -- theme-packages/my-theme   # structural check
npm run theme:pack     -- theme-packages/my-theme   # build the ZIP
```

Then preview before you commit:

1. **Admin → Preview lab** — render the ZIP with demo content, including
   without installing it (see [preview-lab.md](preview-lab.md)).
2. **Admin → Theme library** — upload the ZIP to install (Super Admin), then
   assign it to a website.

For a deep dive into each file see
[theme-authoring-guide.md](theme-authoring-guide.md); the full contract is
[theme-package-v1.md](theme-package-v1.md).

## Implementation notes

- The scaffold engine lives in `src/lib/theme-package/starter.ts` — a pure
  function (no filesystem, no Next runtime) so tests and the CLI share one
  implementation: `tests/starter-kit.test.ts` validates generated output,
  round-trips it through the ZIP reader/writer, and renders all four routes.
- The placeholder preview is a dependency-free PNG written by the same
  module (deterministic hue derived from the slug).
