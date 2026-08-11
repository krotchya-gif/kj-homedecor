-- 058: DROP NOT NULL kolom legacy/opsional yang tidak diisi kode saat insert (anti error 23502)
-- Pola: kode sudah pakai skema baru (scheduled_date, entry_date, account_id, notes, bank_name), kolom lama dipertahankan tapi dilonggarkan.

-- install_bookings: kode pakai scheduled_date (kolom lama date tidak diisi)
ALTER TABLE public.install_bookings ALTER COLUMN date DROP NOT NULL;

-- journal_entries: kode pakai entry_date + account_id (kolom lama date + account tidak diisi)
ALTER TABLE public.journal_entries ALTER COLUMN date DROP NOT NULL;
ALTER TABLE public.journal_entries ALTER COLUMN account DROP NOT NULL;

-- hutang: kode pakai notes (description tidak diisi)
ALTER TABLE public.hutang ALTER COLUMN description DROP NOT NULL;

-- accounts: normal_side tidak dipakai kode sama sekali (kolom mati, diisi manual jika perlu)
ALTER TABLE public.accounts ALTER COLUMN normal_side DROP NOT NULL;

-- laundry_orders: form tidak punya field item
ALTER TABLE public.laundry_orders ALTER COLUMN item DROP NOT NULL;

-- piutang: kode pakai notes (description tidak diisi)
ALTER TABLE public.piutang ALTER COLUMN description DROP NOT NULL;

-- cash_accounts: UI pakai bank_name + join accounts(code,name) — name/code legacy
ALTER TABLE public.cash_accounts ALTER COLUMN name DROP NOT NULL;
ALTER TABLE public.cash_accounts ALTER COLUMN code DROP NOT NULL;

-- steam_jobs: item tidak dipakai (halaman steam tidak baca item)
ALTER TABLE public.steam_jobs ALTER COLUMN item DROP NOT NULL;

-- production_reports: kode isi penjahit_id/month/year dari session user, tapi biarkan null-safe
ALTER TABLE public.production_reports ALTER COLUMN penjahit_id DROP NOT NULL;
ALTER TABLE public.production_reports ALTER COLUMN month DROP NOT NULL;
ALTER TABLE public.production_reports ALTER COLUMN year DROP NOT NULL;
