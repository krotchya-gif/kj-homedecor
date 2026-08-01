-- 057_add_missing_columns_from_code_audit.sql
-- Temuan QA menyeluruh 2026-08-01: audit arah-balik (semua .from('tabel') di kode
--   vs information_schema production) menemukan 10 kolom yang DIPAKAI KODE tapi
--   TIDAK ADA di DB. Semua halaman terkait akan error 400 saat fitur dijalankan.
--   (kolom seperti orders.updated_at sudah di-fix di 056)

-- 1. payments.notes — insert/update di admin/orders & admin/orders/[id] (auto-verified, void)
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2. suppliers.contact_person/phone/email/notes — form owner/suppliers (schema lama cuma name/contact/address)
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS contact_person TEXT;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS notes TEXT;

-- 3. lembur_records.staff_id/jam/keterangan — insert gudang/lembur (schema lama pakai staff_name/time_start/time_end)
ALTER TABLE public.lembur_records ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.lembur_records ADD COLUMN IF NOT EXISTS jam NUMERIC;
ALTER TABLE public.lembur_records ADD COLUMN IF NOT EXISTS keterangan TEXT;
-- kolom lama NOT NULL tanpa default → insert kode (staff_id/jam/keterangan) tetap 400; drop NOT NULL
ALTER TABLE public.lembur_records ALTER COLUMN staff_name DROP NOT NULL;
ALTER TABLE public.lembur_records ALTER COLUMN time_start DROP NOT NULL;
ALTER TABLE public.lembur_records ALTER COLUMN time_end DROP NOT NULL;
ALTER TABLE public.lembur_records ALTER COLUMN total_hours DROP NOT NULL;

-- 4. steam_jobs.checked_by — update gudang/steam (pass/fail QC steam)
ALTER TABLE public.steam_jobs ADD COLUMN IF NOT EXISTS checked_by UUID;

-- 5. hutang.return_reason/return_date — update finance/hutang/proses (retur hutang)
ALTER TABLE public.hutang ADD COLUMN IF NOT EXISTS return_reason TEXT;
ALTER TABLE public.hutang ADD COLUMN IF NOT EXISTS return_date TIMESTAMPTZ;

-- 6. orders.source_tag — select finance/laporan/performa-tag (tag sumber order)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS source_tag TEXT;

-- 7. install_bookings.actual_date — update installer/checklist (tanggal aktual pasang)
ALTER TABLE public.install_bookings ADD COLUMN IF NOT EXISTS actual_date TIMESTAMPTZ;

-- 8. orders.scheduled_installation_date — select api/orders/[id] & type Order (V3 jadwal pasang)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS scheduled_installation_date DATE;

-- 9. inventory_movements.notes — insert gudang/stock (mutasi stock manual)
ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS notes TEXT;

-- 10. production_reports.meter_gorden/vitras/roman/kupu_kupu/poni_lurus/poni_gel/notes
--     — insert penjahit/jobs + rekap penjahit/reports (schema lama pakai meter_total_*)
ALTER TABLE public.production_reports ADD COLUMN IF NOT EXISTS meter_gorden NUMERIC DEFAULT 0;
ALTER TABLE public.production_reports ADD COLUMN IF NOT EXISTS meter_vitras NUMERIC DEFAULT 0;
ALTER TABLE public.production_reports ADD COLUMN IF NOT EXISTS meter_roman NUMERIC DEFAULT 0;
ALTER TABLE public.production_reports ADD COLUMN IF NOT EXISTS meter_kupu_kupu NUMERIC DEFAULT 0;
ALTER TABLE public.production_reports ADD COLUMN IF NOT EXISTS poni_lurus NUMERIC DEFAULT 0;
ALTER TABLE public.production_reports ADD COLUMN IF NOT EXISTS poni_gel NUMERIC DEFAULT 0;
ALTER TABLE public.production_reports ADD COLUMN IF NOT EXISTS notes TEXT;

-- 11. customers.email — select api/xendit/create-payment (payer_email invoice; schema lama cuma name/phone/address)
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS email TEXT;
