-- Phase 3B: post-level SEO overrides (pages already have their own columns).
ALTER TABLE "posts" ADD COLUMN "seo_title" TEXT;
ALTER TABLE "posts" ADD COLUMN "seo_description" TEXT;
