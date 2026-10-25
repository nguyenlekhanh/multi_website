# Hotel Luxury - MSP Theme Package

Quiet-luxury resort design: non-sticky calm header, full-bleed imagery, suite
cards, hairline dividers, dark stat bands, and a concierge-contact CTA panel.

Like every MSP theme package this is **declarative data only** (manifest +
JSON templates + scoped CSS + preview image); the platform runtime renderer
turns it into a working theme. Branding, navigation, SEO, and all content
come from the website's own configuration.

## Files

```
theme.json             manifest
templates/home.json    homepage composition
templates/page.json    CMS page composition (+ package CTA/contact section)
templates/post-list.json / post.json   journal & article options
styles/theme.css       scoped styling hints
assets/preview.png     admin preview image
```

## Validate / pack / install

```bash
npm run theme:validate -- theme-packages/hotel-luxury
npm run theme:pack     -- theme-packages/hotel-luxury
npm run theme:install  -- theme-packages/hotel-luxury   # local/test DB
```

Specification: [docs/theme-package-v1.md](../../docs/theme-package-v1.md)
