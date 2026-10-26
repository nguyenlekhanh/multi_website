# Theme Library

The platform ships **7 native themes** (registered React/TypeScript) and
supports **MSP Theme Packages** — declarative ZIP themes validated and
rendered by the runtime renderer. Manage packages in **Admin → Theme
library**; activate any theme (native or package) per website in its
**Theme** picker. Before committing to a theme, try it in the
**[Preview Lab](preview-lab.md)** — including uninstalled ZIPs, with no
database writes. New packages start from the
**[Theme Starter Kit](theme-starter-kit.md)** (`npm run theme:new`).

## Available theme packages

| Package | id | Design identity | ZIP |
| --- | --- | --- | --- |
| Real Estate Modern | `real-estate-modern` | Premium real-estate: overlay hero, property cards with price badges, serif display. | 6.3 KB |
| Blog Editorial | `blog-editorial` | Personal blog: centered masthead, serif reading type, featured-essay list, narrow comfortable widths. | 4.0 KB |
| Travel Explorer | `travel-explorer` | Adventure travel: wide immersive hero, overlay destination cards, featured-first journal, large-brand footer. | 5.9 KB |
| Restaurant Bistro | `restaurant-bistro` | Modern bistro: candlelit hero, menu-style dish cards, reservations contact (call/write only — no booking system). | 10.4 KB |
| Hotel Luxury | `hotel-luxury` | Quiet luxury: full-bleed imagery, suite cards, hairline dividers, dark stat band, concierge CTA. | 4.1 KB |
| Education Academy | `education-academy` | Training academy: enrolment-CTA header, course cards, benefit features, outcome stats, cohort CTA. | 4.1 KB |
| SaaS Startup | `saas-startup` | Product design: gradient-split hero, capability features, metric band, plan-style cards, start-free CTA. | 4.5 KB |

Each package lives in `theme-packages/<id>/` with the same structure
(manifest, 4 templates, scoped CSS, preview image, README) and the same
guarantees: declarative data only, site-driven branding, graceful empty and
missing-image states, no cross-tenant access.

## Working with packages

```bash
# validate one package
npm run theme:validate -- theme-packages/<id>

# pack (ZIP is round-trip validated automatically)
npm run theme:pack -- theme-packages/<id>

# install one package into the configured DATABASE_URL
npm run theme:install -- theme-packages/<id>

# install every package under theme-packages/
npm run themes:install-all
```

All installs run through the standard installer service: full validation,
native-id collision checks, version rules (same version = conflict,
downgrade = rejected), transactional audit entries.

## Admin flows (real backend, audited)

- **Install / update** — Super Admin uploads a ZIP in Admin → Theme library
  (or uses the CLI above); errors are listed field-by-field; nothing is
  stored unless validation passes. Updates archive the previous version.
- **Activate** — open a website → Theme; installed packages appear beside
  the seven native themes. Activation uses the existing audited
  site-authorization path (SITE_ADMIN for assigned sites only).
- **Rollback** — Super Admin picks an archived version in the Theme library.
- **Uninstall** — refused while any website uses the package; otherwise
  removes all versions. Audited.
- **Preview** — the website's existing authenticated preview renders the
  active package exactly as the public site will.

## Adding a new package to the library

Author it (see [theme-authoring-guide.md](theme-authoring-guide.md)), then
drop the directory into `theme-packages/` and run
`npm run themes:install-all` — the list above is the only place to add a
description row. Specification: [theme-package-v1.md](theme-package-v1.md);
security model: [theme-security.md](theme-security.md).
