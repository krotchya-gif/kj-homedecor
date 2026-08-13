-- Landing settings: write hanya admin/owner (sebelumnya semua staff authenticated bisa ubah
-- konten landing & SEO). SELECT publik tetap (landing page).
DROP POLICY IF EXISTS "Auth can write landing_settings" ON public.landing_settings;
CREATE POLICY "Admin manage landing_settings" ON public.landing_settings
  FOR ALL USING (public.is_admin_or_owner_sd()) WITH CHECK (public.is_admin_or_owner_sd());

-- SEO file content disimpan di DB (bukan filesystem) agar persist saat redeploy.
-- Route /robots.txt & /sitemap.xml membaca dari kolom ini.
ALTER TABLE public.landing_settings ADD COLUMN IF NOT EXISTS robots_content TEXT;
ALTER TABLE public.landing_settings ADD COLUMN IF NOT EXISTS sitemap_content TEXT;
