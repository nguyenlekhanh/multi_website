-- ============================================================================
-- MultiSite Platform — PostgreSQL schema (readable reference)
--
-- The source of truth is prisma/schema.prisma; the version-controlled
-- migration it generates lives in prisma/migrations/. Apply migrations with:
--
--   DATABASE_URL=... npm run db:deploy     (prisma migrate deploy)
--
-- This file mirrors that model for reading and review. Every site-specific
-- row carries a site_id: the same isolation guarantee the adapters enforce.
-- ============================================================================

CREATE TABLE sites (
  id            TEXT PRIMARY KEY,              -- e.g. 'business-demo'
  name          TEXT NOT NULL,
  theme_id      TEXT NOT NULL,                 -- validated against the theme registry
  settings      JSONB NOT NULL,                -- identity, colors, nav, footer_nav, seo
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE domains (
  id       BIGSERIAL PRIMARY KEY,
  site_id  TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  host     TEXT NOT NULL UNIQUE,               -- lowercased, no port, e.g. 'business.demo.local'
  primary_ BOOLEAN NOT NULL DEFAULT false,
  -- On Vercel, also add each host in the dashboard and point its DNS at the
  -- deployment; this table decides which site the host serves.
  verified BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX idx_domains_site ON domains(site_id);

-- Split from settings when administration begins (per-site overrides).
CREATE TABLE site_settings (
  site_id   TEXT PRIMARY KEY REFERENCES sites(id) ON DELETE CASCADE,
  identity  JSONB NOT NULL,                    -- name, tagline, logo_text, logo_initials
  colors    JSONB NOT NULL,                    -- brand palette (see BrandColors type)
  nav       JSONB NOT NULL,                    -- [{label, href}]
  footer_nav JSONB NOT NULL,
  seo       JSONB NOT NULL,                    -- default_title, title_template, description, ...
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE media (
  id         BIGSERIAL PRIMARY KEY,
  site_id    TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  src        TEXT NOT NULL,                    -- storage path or CDN URL
  alt        TEXT NOT NULL DEFAULT '',
  width      INTEGER,
  height     INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_media_site ON media(site_id);

CREATE TABLE categories (
  id         BIGSERIAL PRIMARY KEY,
  site_id    TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  slug       TEXT NOT NULL,
  name       TEXT NOT NULL,
  description TEXT,
  UNIQUE (site_id, slug)
);
CREATE INDEX idx_categories_site ON categories(site_id);

CREATE TABLE pages (
  id             BIGSERIAL PRIMARY KEY,
  site_id        TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  slug           TEXT NOT NULL,               -- 'home' for the homepage (is_homepage flag)
  title          TEXT NOT NULL,
  eyebrow        TEXT,
  seo_title      TEXT,
  seo_description TEXT,
  og_image       TEXT,
  is_homepage    BOOLEAN NOT NULL DEFAULT false,
  blocks         JSONB NOT NULL DEFAULT '[]', -- typed block list (see Block union)
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (site_id, slug)
);
CREATE INDEX idx_pages_site ON pages(site_id);

CREATE TABLE authors (
  id       BIGSERIAL PRIMARY KEY,
  site_id  TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  slug     TEXT NOT NULL,
  name     TEXT NOT NULL,
  role     TEXT,
  bio      TEXT,
  initials TEXT NOT NULL,
  avatar   TEXT,
  UNIQUE (site_id, slug)
);

CREATE TABLE posts (
  id             BIGSERIAL PRIMARY KEY,
  site_id        TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  slug           TEXT NOT NULL,
  title          TEXT NOT NULL,
  excerpt        TEXT NOT NULL DEFAULT '',
  body           JSONB NOT NULL DEFAULT '[]', -- paragraph list
  cover_image    TEXT,
  cover_alt      TEXT,
  category_id    BIGINT REFERENCES categories(id) ON DELETE SET NULL,
  author_id      BIGINT NOT NULL REFERENCES authors(id) ON DELETE RESTRICT,
  published_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  reading_minutes INTEGER NOT NULL DEFAULT 5,
  featured       BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (site_id, slug)
);
CREATE INDEX idx_posts_site ON posts(site_id, published_at DESC);
CREATE INDEX idx_posts_site_category ON posts(site_id, category_id);

-- ---------------------------------------------------------------------------
-- Notes
-- 1. `blocks` / settings JSONB columns mirror the TypeScript unions in
--    src/platform/types.ts. Validate on write with the same types (zod or a
--    hand-rolled validator) once an admin dashboard exists.
-- 2. Every content table carries site_id; every adapter query filters by it.
-- 3. Swapping the data source: implement PostgresDataAdapter
--    (src/platform/data/adapter.ts) and select it in
--    src/platform/data/index.ts when DATABASE_URL is present.
-- ---------------------------------------------------------------------------
