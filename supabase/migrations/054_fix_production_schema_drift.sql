-- ============================================================
-- FIX SCHEMA DRIFT: DB production vs migration 004/005/006/008
-- Project: kjhomedecor (Supabase glblgsfenarnztawtpmu)
-- Cara pakai: Supabase Dashboard > SQL Editor > New query > paste > Run
-- Aman dijalankan ulang (semua IF NOT EXISTS / DROP IF EXISTS)
-- ============================================================

-- ------------------------------------------------------------
-- 1. install_bookings: kolom yang kode harapkan (migration 006)
--    Kode pakai scheduled_date/scheduled_time/source,
--    production cuma punya date/time (schema lama)
-- ------------------------------------------------------------
ALTER TABLE public.install_bookings
  ADD COLUMN IF NOT EXISTS scheduled_date DATE,
  ADD COLUMN IF NOT EXISTS scheduled_time TIME,
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'website'
    CHECK (source IN ('website', 'manual', 'whatsapp'));

-- address boleh NULL (booking survey tanpa alamat) — migration 006
ALTER TABLE public.install_bookings ALTER COLUMN address DROP NOT NULL;

-- Backfill data lama: salin date/time ke scheduled_date/scheduled_time
UPDATE public.install_bookings
SET scheduled_date = date,
    scheduled_time = time
WHERE scheduled_date IS NULL AND date IS NOT NULL;

-- ------------------------------------------------------------
-- 2. landing_settings: kolom langsung (migration 004, 005, 008, 009)
--    Production pakai EAV (key/value JSON) — kolom ini tidak pernah ada
-- ------------------------------------------------------------
ALTER TABLE public.landing_settings
  ADD COLUMN IF NOT EXISTS whatsapp_number TEXT DEFAULT '6281234567890',
  ADD COLUMN IF NOT EXISTS whatsapp_message TEXT DEFAULT 'Halo KJ Homedecor, saya ingin konsultasi gorden',
  ADD COLUMN IF NOT EXISTS hero_title TEXT,
  ADD COLUMN IF NOT EXISTS hero_subtitle TEXT,
  ADD COLUMN IF NOT EXISTS hero_cta_text TEXT,
  ADD COLUMN IF NOT EXISTS hero_cta_link TEXT,
  ADD COLUMN IF NOT EXISTS hero_image_url TEXT,
  ADD COLUMN IF NOT EXISTS trust_badges JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS instagram TEXT,
  ADD COLUMN IF NOT EXISTS facebook TEXT,
  ADD COLUMN IF NOT EXISTS tiktok TEXT,
  ADD COLUMN IF NOT EXISTS shopee TEXT,
  ADD COLUMN IF NOT EXISTS tokopedia TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS seo_pixel_id TEXT,
  ADD COLUMN IF NOT EXISTS seo_ga4_id TEXT,
  ADD COLUMN IF NOT EXISTS seo_title TEXT,
  ADD COLUMN IF NOT EXISTS seo_description TEXT,
  ADD COLUMN IF NOT EXISTS seo_keywords TEXT,
  ADD COLUMN IF NOT EXISTS seo_og_image TEXT;

-- ------------------------------------------------------------
-- 3. Backfill: salin data EAV (value JSON) ke kolom langsung
--    baris key='hero' = data hero; key='contact' = whatsapp/phone
-- ------------------------------------------------------------
UPDATE public.landing_settings SET
  hero_title    = COALESCE(value->>'hero_title', hero_title),
  hero_subtitle = COALESCE(value->>'hero_subtitle', hero_subtitle),
  hero_cta_text = COALESCE(value->>'hero_cta_text', hero_cta_text),
  hero_cta_link = COALESCE(value->>'hero_cta_link', hero_cta_link),
  hero_image_url = COALESCE(value->>'hero_image_url', hero_image_url)
WHERE key = 'hero';

-- whatsapp_number & phone dari key='contact' -> value.phone
UPDATE public.landing_settings SET
  whatsapp_number = COALESCE(
    (SELECT value->>'phone' FROM public.landing_settings WHERE key = 'contact' LIMIT 1),
    whatsapp_number
  ),
  phone = COALESCE(
    (SELECT value->>'phone' FROM public.landing_settings WHERE key = 'contact' LIMIT 1),
    phone
  )
WHERE key = 'hero';

-- social media dari key='social_media'
UPDATE public.landing_settings SET
  instagram = COALESCE((SELECT value->>'instagram' FROM public.landing_settings WHERE key = 'social_media' LIMIT 1), instagram),
  facebook  = COALESCE((SELECT value->>'facebook'  FROM public.landing_settings WHERE key = 'social_media' LIMIT 1), facebook),
  tiktok    = COALESCE((SELECT value->>'tiktok'    FROM public.landing_settings WHERE key = 'social_media' LIMIT 1), tiktok)
WHERE key = 'hero';

-- ------------------------------------------------------------
-- 4. RLS: public boleh INSERT + SELECT install_bookings
--    (form booking website pakai anon key — saat ini diblokir RLS)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Public can insert install_bookings" ON public.install_bookings;
CREATE POLICY "Public can insert install_bookings" ON public.install_bookings
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public can read install_bookings" ON public.install_bookings;
CREATE POLICY "Public can read install_bookings" ON public.install_bookings
  FOR SELECT USING (true);

-- ------------------------------------------------------------
-- 5. VERIFIKASI (jalankan setelah semua statement di atas)
-- ------------------------------------------------------------
SELECT 'install_bookings' AS tbl,
       COUNT(*) FILTER (WHERE column_name = 'scheduled_date') AS has_scheduled_date,
       COUNT(*) FILTER (WHERE column_name = 'source')        AS has_source
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'install_bookings';

SELECT 'landing_settings' AS tbl,
       COUNT(*) FILTER (WHERE column_name = 'whatsapp_number') AS has_whatsapp,
       COUNT(*) FILTER (WHERE column_name = 'seo_pixel_id')    AS has_seo
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'landing_settings';

SELECT key, whatsapp_number, hero_title, instagram
FROM public.landing_settings WHERE key = 'hero';
