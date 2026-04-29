-- Migration 008: SEO Settings
-- Adds SEO fields to landing_settings table for meta pixel, GA4, meta tags

-- ============================================================
-- 1. Add SEO columns to landing_settings
-- ============================================================
ALTER TABLE public.landing_settings
  ADD COLUMN IF NOT EXISTS seo_pixel_id TEXT,
  ADD COLUMN IF NOT EXISTS seo_ga4_id TEXT,
  ADD COLUMN IF NOT EXISTS seo_title TEXT,
  ADD COLUMN IF NOT EXISTS seo_description TEXT,
  ADD COLUMN IF NOT EXISTS seo_keywords TEXT,
  ADD COLUMN IF NOT EXISTS seo_og_image TEXT;

-- ============================================================
-- 2. Create robots.txt and sitemap in public if not exists
-- ============================================================
-- Note: Files will be managed via API routes that write to public/

-- ============================================================
-- 3. RLS already allows admin to update landing_settings
-- ============================================================