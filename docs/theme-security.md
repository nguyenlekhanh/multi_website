# Theme Package Security Model

Scope: MSP Theme Package v1 — upload, validation, storage, and runtime
rendering of theme packages. Native themes are first-party code and out of
scope here.

## Trust boundary

Theme packages are **untrusted input** treated like any other user-supplied
content: they may be uploaded by a Super Admin, but the file itself could
come from anywhere. The platform assumes nothing inside a ZIP is safe until
`validatePackage` says so — and even then, a validated package is only ever
**data**, never code.

## Attack surface and controls

| Threat | Control |
| --- | --- |
| Arbitrary code execution (TSX/JS in the ZIP) | Format allowlist accepts only `theme.json`, `templates/*.json`, `styles/*.css`, `assets/*.{png,jpg,jpeg,webp}`, `README.md`. Anything else is a validation error. The runtime never evals/imports package content; rendering uses platform components exclusively. |
| Server-side request forgery via CSS exfiltration | CSS rejects every `url()` form, `@import`, and `@charset`; after sanitizing, all rules are scoped to `.msp-theme-<id>`. A package cannot fetch anything or leak page content to an external origin. |
| CSS escape / site-wide style hijack | Every selector is prefixed with the theme scope class at validation time; stored CSS is the scoped version only. `position: fixed` is rejected to prevent overlay clickjacking. |
| ZIP bomb / resource exhaustion | Reader caps: ≤ 512 entries, ≤ 8 MB total uncompressed, per-entry size + declared-size consistency, bomb-signature ratio guard (extreme expansion from tiny payloads), unsupported compression methods rejected, corrupt/truncated archives rejected. Validator caps: ≤ 64 files, manifest/template/CSS/preview size limits; upload path caps the ZIP at 2 MB (plus the 3 MB server-action body limit). |
| ZIP Slip / path traversal | Entry names with `..`, absolute paths, backslashes, or NUL bytes are rejected by the reader; the validator re-normalizes every path (files **and** manifest entries) and rejects anything outside the package root. Nothing is ever extracted to the filesystem — parsing is in-memory only. |
| Registry hijack | Package ids are checked against the seven native ids at install; packages are referenced as `package:<id>` and resolved through a separate store — they can never override or unregister native themes. Unknown/missing `package:` refs fall back to a native theme at render time. |
| Cross-tenant data access | Packages receive only `SiteContext` + that site's resolved content (same props as native themes). No Prisma, no filesystem, no env access from the renderer; template data cannot name another site. The theme-asset route serves **only the stored preview image** of the named package — not arbitrary files. |
| Secret exposure | Packages cannot carry configuration that reaches the server environment; API keys are never stored in or read from packages; validation errors and audit entries contain no secret material. |
| Unauthorized install/mutation | Install/rollback/uninstall require SUPER_ADMIN (`assertSuperAdmin` in the service layer — UI checks are cosmetic); activation reuses the per-site `assertSiteAccess` path. Every mutation writes a transactional audit entry (`theme.package_install/update/rollback/uninstall`). |
| Unsafe update/rollback | Same-version installs and version downgrades are rejected; uninstall is refused while any site references the package (no site left rendering a missing theme). |
| Upload storage on serverless | Package bytes live in PostgreSQL (JSON + bytea), not the Vercel function's temp filesystem; the in-process cache is invalidated on every mutation. |

## Residual risks / limitations (honest list)

- The 3 MB action-body / 2 MB ZIP caps suit v1's declarative packages. Larger
  asset libraries should move to object storage (e.g. Supabase Storage with
  signed URLs) before raising caps — not done in this phase.
- Super Admin is a powerful role by design; package installs are bounded by
  validation but ultimately trusted to that role. Install events are audited
  for review.
- The scoped-CSS engine is a conservative prefixing implementation, not a
  full CSS parser; that conservatism (reject-first allowlist) is the security
  property. Exotic-but-benign CSS may be rejected — acceptable for v1.
- Preview images are served with `content-type` from a fixed png/jpg/webp
  allowlist; SVG was deliberately excluded from the format to avoid script
  injection via images.
