# Restaurant Bistro - MSP Theme Package

Warm modern bistro: sticky nav with a Reserve-a-table CTA, candlelit hero,
menu-style cards, and a reservations contact section (call/write - no booking
system is claimed or included).

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
npm run theme:validate -- theme-packages/restaurant-bistro
npm run theme:pack     -- theme-packages/restaurant-bistro
npm run theme:install  -- theme-packages/restaurant-bistro   # local/test DB
```

Specification: [docs/theme-package-v1.md](../../docs/theme-package-v1.md)
