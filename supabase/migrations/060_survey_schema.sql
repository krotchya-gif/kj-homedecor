-- ============================================================================
-- 060_survey_schema.sql — Aplikasi Survey Gorden (MVP) — SRS 2026-08-03
-- Referensi: SRS "Aplikasi Survey Gorden KJHOMEDECOR" (grup Project KJ)
-- Aman idempotent: hanya membuat tabel BARU + kolom BARU + RPC BARU.
-- Tidak menyentuh data existing. Bisa dijalankan kapan saja.
-- ============================================================================

-- 1. Role baru: surveyor (SRS: tim survey login khusus, tidak bisa lihat survey orang lain)
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin','gudang','penjahit','finance','installer','owner','surveyor'));

-- 2. Tabel surveys (header survey — 1 survey = 1 kunjungan ke lokasi customer)
CREATE TABLE IF NOT EXISTS public.surveys (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  survey_number  TEXT UNIQUE,                    -- KJ-20260803-001 (RPC generate_survey_number)
  client_name    TEXT NOT NULL,
  client_address TEXT,
  survey_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  surveyor_id    UUID REFERENCES public.users(id), -- otomatis akun login (bisa diedit)
  status         TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','tersimpan','diproses','selesai')),
  gps_lat        NUMERIC,                        -- GPS lokasi survey (otomatis)
  gps_lng        NUMERIC,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Tabel survey_rooms (detail per ruangan — surveyor bisa tambah ruangan tanpa batas)
CREATE TABLE IF NOT EXISTS public.survey_rooms (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  survey_id     UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  room_name     TEXT NOT NULL,                   -- Ruang Tamu, Kamar Utama, Kamar Anak, Dapur, dll
  width_cm      NUMERIC,                         -- Lebar (cm) manual
  height_cm     NUMERIC,                         -- Tinggi (cm) manual
  model_gorden  TEXT,                            -- Smokring/Double Smokring/Rel Kait/Kupu-kupu/Horizontal Blind/Roller Blind/Vertical Blind
  fabric_name   TEXT,                            -- Jenis Kain (input manual)
  fabric_photo  TEXT,                            -- URL foto kain
  vitras_name   TEXT,                            -- Jenis Vitras (input manual)
  vitras_photo  TEXT,
  rel_gorden    TEXT,                            -- Rel Aluminium/Hollow/Premium/Motorized
  rel_vitras    TEXT,
  hook          TEXT,                            -- Hook Plastik/Stainless/Premium
  notes         TEXT,                            -- Catatan: AC, dinding beton, high ceiling, dll
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Foto ruangan (multi foto per ruangan — kamera/galeri)
CREATE TABLE IF NOT EXISTS public.survey_room_photos (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id       UUID NOT NULL REFERENCES public.survey_rooms(id) ON DELETE CASCADE,
  url           TEXT NOT NULL,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Relasi order → survey (permintaan tim: hasil survey "masuk lgsg ke invoice")
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS survey_id UUID REFERENCES public.surveys(id);
CREATE INDEX IF NOT EXISTS idx_orders_survey_id ON public.orders(survey_id);

-- 6. RPC nomor survey otomatis: KJ-20260803-001 (per tanggal, format SRS)
CREATE OR REPLACE FUNCTION generate_survey_number()
RETURNS TEXT AS $$
  SELECT 'KJ-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
    LPAD(CAST(COALESCE(
      (SELECT MAX(SUBSTRING(survey_number FROM 'KJ-\d{8}-(\d+)$')::int)
       FROM public.surveys WHERE survey_number LIKE 'KJ-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-%'),
      0) + 1 AS TEXT), 3, '0');
$$ LANGUAGE SQL;

-- 7. Trigger updated_at (fungsi set_updated_at sudah ada dari migration 056)
DROP TRIGGER IF EXISTS trg_surveys_updated_at ON public.surveys;
CREATE TRIGGER trg_surveys_updated_at BEFORE UPDATE ON public.surveys
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- RLS (SRS section 2): Surveyor hanya punya sendiri; Admin & Owner semua.
-- Role lain (finance/gudang/penjahit/installer) = default deny.
-- ============================================================================
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_room_photos ENABLE ROW LEVEL SECURITY;

-- Helper: apakah user admin/owner
CREATE OR REPLACE FUNCTION is_admin_or_owner()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role IN ('admin','owner')
  );
$$ LANGUAGE SQL STABLE;

-- surveys
DROP POLICY IF EXISTS surveys_admin_owner ON public.surveys;
CREATE POLICY surveys_admin_owner ON public.surveys
  FOR ALL USING (is_admin_or_owner());
DROP POLICY IF EXISTS surveys_surveyor_own ON public.surveys;
CREATE POLICY surveys_surveyor_own ON public.surveys
  FOR ALL USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'surveyor' AND surveyor_id = auth.uid());

-- survey_rooms (lewat survey induk)
DROP POLICY IF EXISTS survey_rooms_admin_owner ON public.survey_rooms;
CREATE POLICY survey_rooms_admin_owner ON public.survey_rooms
  FOR ALL USING (is_admin_or_owner());
DROP POLICY IF EXISTS survey_rooms_surveyor_own ON public.survey_rooms;
CREATE POLICY survey_rooms_surveyor_own ON public.survey_rooms
  FOR ALL USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'surveyor'
    AND EXISTS (SELECT 1 FROM public.surveys s WHERE s.id = survey_id AND s.surveyor_id = auth.uid())
  );

-- survey_room_photos (lewat ruangan → survey induk)
DROP POLICY IF EXISTS survey_photos_admin_owner ON public.survey_room_photos;
CREATE POLICY survey_photos_admin_owner ON public.survey_room_photos
  FOR ALL USING (is_admin_or_owner());
DROP POLICY IF EXISTS survey_photos_surveyor_own ON public.survey_room_photos;
CREATE POLICY survey_photos_surveyor_own ON public.survey_room_photos
  FOR ALL USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'surveyor'
    AND EXISTS (
      SELECT 1 FROM public.survey_rooms r
      JOIN public.surveys s ON s.id = r.survey_id
      WHERE r.id = room_id AND s.surveyor_id = auth.uid()
    )
  );

-- ============================================================================
-- Verifikasi (jalankan setelah migration):
--   SELECT * FROM information_schema.tables WHERE table_name LIKE 'survey%';
--   SELECT generate_survey_number();  -- harus KJ-YYYYMMDD-001
-- ============================================================================
