-- ============================================================
-- 072 — Sinkronisasi RLS & schema dengan codebase (audit 2026-08-12)
-- ============================================================
-- Masalah yang diperbaiki (terverifikasi dari pg_policies live):
--   1. Policy permissive lama masih aktif karena DROP memakai nama
--      yang salah (mis. "Authenticated staff (full) access" padahal
--      nama asli tanpa kurung) — hardening 067/071 selama ini no-op.
--   2. users: "Authenticated staff full access" (FOR ALL) masih ada →
--      semua staff bisa UPDATE users (ubah role sendiri).
--   3. tiktok_shop_*: "Authenticated staff access" masih ada →
--      semua staff baca/tulis app_secret & access_token.
--   4. accounts/account_mappings/hutang/piutang/cash_accounts:
--      "Authenticated staff access" masih ada → hardening tak aktif.
--   5. survey_logs: policy lama pakai fungsi legacy is_admin_or_owner()
--      (tidak ada di schema reference) — ganti ke is_admin_or_owner_sd().
--   6. order_logs.action: daftar CHECK = union codebase + data live.
-- Pola: DROP IF EXISTS + CREATE — idempotent, aman dijalankan ulang.
-- ============================================================

-- ---------- 1. Kolom yang dipakai codebase (no-op jika sudah ada) ----------
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_date TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_address TEXT;
ALTER TABLE public.tiktok_shop_orders ADD COLUMN IF NOT EXISTS order_date TIMESTAMPTZ;
ALTER TABLE public.tiktok_shop_orders ADD COLUMN IF NOT EXISTS shipping_address TEXT;
ALTER TABLE public.install_bookings ADD COLUMN IF NOT EXISTS actual_date TIMESTAMPTZ;
ALTER TABLE public.piutang ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS normal_side TEXT;
ALTER TABLE public.hutang ADD COLUMN IF NOT EXISTS remaining NUMERIC DEFAULT 0;
ALTER TABLE public.landing_settings ADD COLUMN IF NOT EXISTS key TEXT;
UPDATE public.landing_settings SET key = 'hero' WHERE key IS NULL;

-- ---------- 2. order_logs.action: union codebase + data live ----------
ALTER TABLE public.order_logs DROP CONSTRAINT IF EXISTS order_logs_action_check;
ALTER TABLE public.order_logs ADD CONSTRAINT order_logs_action_check CHECK (action IN (
  'created','sorted','payment_approved','payment_verified','payment_input','payment_added','refund_issued',
  'production_started','production_completed','production_done',
  'qc_pass','qc_fail','ready','packed','shipped','installed','done',
  'return_initiated','return_stock_in','return_disposed','cancelled',
  'penjahit_assigned','install_started','install_done','install_revision',
  'steam_qc_pass','steam_revision_requeue','order_deleted','status_changed'
));

-- ---------- 3. users ----------
DROP POLICY IF EXISTS "Authenticated staff full access" ON public.users;
DROP POLICY IF EXISTS "Authenticated staff (full) access" ON public.users;
DROP POLICY IF EXISTS "Authenticated staff access" ON public.users;
DROP POLICY IF EXISTS "Admin manage users" ON public.users;
DROP POLICY IF EXISTS "All staff read users" ON public.users;
CREATE POLICY "All staff read users" ON public.users
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin manage users" ON public.users
  FOR ALL USING (public.is_admin_or_owner_sd()) WITH CHECK (public.is_admin_or_owner_sd());

-- ---------- 4. payments / journal_entries / journal_lines ----------
DROP POLICY IF EXISTS "Authenticated staff full access" ON public.payments;
DROP POLICY IF EXISTS "Authenticated staff (full) access" ON public.payments;
DROP POLICY IF EXISTS "Authenticated staff access" ON public.payments;
DROP POLICY IF EXISTS "All staff read payments" ON public.payments;
DROP POLICY IF EXISTS "Finance can manage payments" ON public.payments;
CREATE POLICY "All staff read payments" ON public.payments
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Finance can manage payments" ON public.payments
  FOR ALL USING (public.is_finance_role()) WITH CHECK (public.is_finance_role());

DROP POLICY IF EXISTS "Authenticated users can manage journals" ON public.journal_entries;
DROP POLICY IF EXISTS "Authenticated staff full access" ON public.journal_entries;
DROP POLICY IF EXISTS "Authenticated staff (full) access" ON public.journal_entries;
DROP POLICY IF EXISTS "Authenticated staff access" ON public.journal_entries;
DROP POLICY IF EXISTS "All staff read journal_entries" ON public.journal_entries;
DROP POLICY IF EXISTS "Finance can manage journal_entries" ON public.journal_entries;
CREATE POLICY "All staff read journal_entries" ON public.journal_entries
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Finance can manage journal_entries" ON public.journal_entries
  FOR ALL USING (public.is_finance_role()) WITH CHECK (public.is_finance_role());

DROP POLICY IF EXISTS "Authenticated users can manage journal lines" ON public.journal_lines;
DROP POLICY IF EXISTS "Authenticated staff full access" ON public.journal_lines;
DROP POLICY IF EXISTS "Authenticated staff (full) access" ON public.journal_lines;
DROP POLICY IF EXISTS "Authenticated staff access" ON public.journal_lines;
DROP POLICY IF EXISTS "All staff read journal_lines" ON public.journal_lines;
DROP POLICY IF EXISTS "Finance can manage journal_lines" ON public.journal_lines;
CREATE POLICY "All staff read journal_lines" ON public.journal_lines
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Finance can manage journal_lines" ON public.journal_lines
  FOR ALL USING (public.is_finance_role()) WITH CHECK (public.is_finance_role());

-- ---------- 5. Accounting: accounts / account_mappings / hutang / piutang / cash_accounts ----------
DROP POLICY IF EXISTS "Authenticated users can manage accounts" ON public.accounts;
DROP POLICY IF EXISTS "Authenticated staff access" ON public.accounts;
DROP POLICY IF EXISTS "All staff read accounts" ON public.accounts;
DROP POLICY IF EXISTS "Finance can manage accounts" ON public.accounts;
CREATE POLICY "All staff read accounts" ON public.accounts
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Finance can manage accounts" ON public.accounts
  FOR ALL USING (public.is_finance_role()) WITH CHECK (public.is_finance_role());

DROP POLICY IF EXISTS "Authenticated users can manage mappings" ON public.account_mappings;
DROP POLICY IF EXISTS "Authenticated staff access" ON public.account_mappings;
DROP POLICY IF EXISTS "All staff read account_mappings" ON public.account_mappings;
DROP POLICY IF EXISTS "Finance can manage account_mappings" ON public.account_mappings;
CREATE POLICY "All staff read account_mappings" ON public.account_mappings
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Finance can manage account_mappings" ON public.account_mappings
  FOR ALL USING (public.is_finance_role()) WITH CHECK (public.is_finance_role());

DROP POLICY IF EXISTS "Authenticated users can manage hutang" ON public.hutang;
DROP POLICY IF EXISTS "Authenticated staff access" ON public.hutang;
DROP POLICY IF EXISTS "All staff read hutang" ON public.hutang;
DROP POLICY IF EXISTS "Finance can manage hutang" ON public.hutang;
CREATE POLICY "All staff read hutang" ON public.hutang
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Finance can manage hutang" ON public.hutang
  FOR ALL USING (public.is_finance_role()) WITH CHECK (public.is_finance_role());

DROP POLICY IF EXISTS "Authenticated users can manage piutang" ON public.piutang;
DROP POLICY IF EXISTS "Authenticated staff access" ON public.piutang;
DROP POLICY IF EXISTS "All staff read piutang" ON public.piutang;
DROP POLICY IF EXISTS "Finance can manage piutang" ON public.piutang;
CREATE POLICY "All staff read piutang" ON public.piutang
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Finance can manage piutang" ON public.piutang
  FOR ALL USING (public.is_finance_role()) WITH CHECK (public.is_finance_role());

DROP POLICY IF EXISTS "Authenticated users can manage cash accounts" ON public.cash_accounts;
DROP POLICY IF EXISTS "Authenticated staff access" ON public.cash_accounts;
DROP POLICY IF EXISTS "All staff read cash_accounts" ON public.cash_accounts;
DROP POLICY IF EXISTS "Finance can manage cash_accounts" ON public.cash_accounts;
CREATE POLICY "All staff read cash_accounts" ON public.cash_accounts
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Finance can manage cash_accounts" ON public.cash_accounts
  FOR ALL USING (public.is_finance_role()) WITH CHECK (public.is_finance_role());

-- ---------- 6. assets / account_categories / laundry_payroll / laundry_rates / style_rates ----------
DROP POLICY IF EXISTS "Authenticated users can manage assets" ON public.assets;
DROP POLICY IF EXISTS "Authenticated staff full access" ON public.assets;
DROP POLICY IF EXISTS "Authenticated staff (full) access" ON public.assets;
DROP POLICY IF EXISTS "Authenticated staff access" ON public.assets;
DROP POLICY IF EXISTS "All staff read assets" ON public.assets;
DROP POLICY IF EXISTS "Finance can manage assets" ON public.assets;
CREATE POLICY "All staff read assets" ON public.assets
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Finance can manage assets" ON public.assets
  FOR ALL USING (public.is_finance_role()) WITH CHECK (public.is_finance_role());

DROP POLICY IF EXISTS "Authenticated users can manage categories" ON public.account_categories;
DROP POLICY IF EXISTS "Authenticated users can manage account categories" ON public.account_categories;
DROP POLICY IF EXISTS "Authenticated staff full access" ON public.account_categories;
DROP POLICY IF EXISTS "Authenticated staff (full) access" ON public.account_categories;
DROP POLICY IF EXISTS "Authenticated staff access" ON public.account_categories;
DROP POLICY IF EXISTS "All staff read account_categories" ON public.account_categories;
DROP POLICY IF EXISTS "Finance can manage account_categories" ON public.account_categories;
CREATE POLICY "All staff read account_categories" ON public.account_categories
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Finance can manage account_categories" ON public.account_categories
  FOR ALL USING (public.is_finance_role()) WITH CHECK (public.is_finance_role());

DROP POLICY IF EXISTS "laundry_payroll_select" ON public.laundry_payroll;
DROP POLICY IF EXISTS "laundry_payroll_insert" ON public.laundry_payroll;
DROP POLICY IF EXISTS "laundry_payroll_update" ON public.laundry_payroll;
DROP POLICY IF EXISTS "laundry_payroll_delete" ON public.laundry_payroll;
DROP POLICY IF EXISTS "Authenticated users can manage laundry payroll" ON public.laundry_payroll;
DROP POLICY IF EXISTS "Authenticated staff access" ON public.laundry_payroll;
DROP POLICY IF EXISTS "All staff read laundry_payroll" ON public.laundry_payroll;
DROP POLICY IF EXISTS "Finance can manage laundry_payroll" ON public.laundry_payroll;
CREATE POLICY "All staff read laundry_payroll" ON public.laundry_payroll
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Finance can manage laundry_payroll" ON public.laundry_payroll
  FOR ALL USING (public.is_finance_role()) WITH CHECK (public.is_finance_role());

DROP POLICY IF EXISTS "laundry_rates_select" ON public.laundry_rates;
DROP POLICY IF EXISTS "laundry_rates_insert" ON public.laundry_rates;
DROP POLICY IF EXISTS "laundry_rates_update" ON public.laundry_rates;
DROP POLICY IF EXISTS "laundry_rates_delete" ON public.laundry_rates;
DROP POLICY IF EXISTS "Authenticated users can manage laundry rates" ON public.laundry_rates;
DROP POLICY IF EXISTS "Authenticated staff access" ON public.laundry_rates;
DROP POLICY IF EXISTS "All staff read laundry_rates" ON public.laundry_rates;
DROP POLICY IF EXISTS "Finance can manage laundry_rates" ON public.laundry_rates;
CREATE POLICY "All staff read laundry_rates" ON public.laundry_rates
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Finance can manage laundry_rates" ON public.laundry_rates
  FOR ALL USING (public.is_finance_role()) WITH CHECK (public.is_finance_role());

DROP POLICY IF EXISTS "style_rates_select" ON public.style_rates;
DROP POLICY IF EXISTS "style_rates_insert" ON public.style_rates;
DROP POLICY IF EXISTS "style_rates_update" ON public.style_rates;
DROP POLICY IF EXISTS "style_rates_delete" ON public.style_rates;
DROP POLICY IF EXISTS "Authenticated users can manage style rates" ON public.style_rates;
DROP POLICY IF EXISTS "Authenticated staff access" ON public.style_rates;
DROP POLICY IF EXISTS "All staff read style_rates" ON public.style_rates;
DROP POLICY IF EXISTS "Finance can manage style_rates" ON public.style_rates;
CREATE POLICY "All staff read style_rates" ON public.style_rates
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Finance can manage style_rates" ON public.style_rates
  FOR ALL USING (public.is_finance_role()) WITH CHECK (public.is_finance_role());

-- ---------- 7. TikTok: buang policy permissive + ENABLE RLS + policy FINAL ----------
DROP POLICY IF EXISTS "owner_all_tiktok_settings" ON public.tiktok_shop_settings;
DROP POLICY IF EXISTS "owner_all_tiktok_orders" ON public.tiktok_shop_orders;
DROP POLICY IF EXISTS "owner_all_tiktok_statements" ON public.tiktok_shop_statements;
DROP POLICY IF EXISTS "TikTok owner manage settings" ON public.tiktok_shop_settings;
DROP POLICY IF EXISTS "TikTok owner manage orders" ON public.tiktok_shop_orders;
DROP POLICY IF EXISTS "TikTok owner manage statements" ON public.tiktok_shop_statements;
DROP POLICY IF EXISTS "TikTok manage settings" ON public.tiktok_shop_settings;
DROP POLICY IF EXISTS "TikTok manage orders" ON public.tiktok_shop_orders;
DROP POLICY IF EXISTS "TikTok manage statements" ON public.tiktok_shop_statements;
DROP POLICY IF EXISTS "Authenticated staff access" ON public.tiktok_shop_settings;
DROP POLICY IF EXISTS "Authenticated staff access" ON public.tiktok_shop_orders;
DROP POLICY IF EXISTS "Authenticated staff access" ON public.tiktok_shop_statements;
DROP POLICY IF EXISTS "TikTok staff read settings" ON public.tiktok_shop_settings;
DROP POLICY IF EXISTS "TikTok staff read orders" ON public.tiktok_shop_orders;
DROP POLICY IF EXISTS "TikTok staff read statements" ON public.tiktok_shop_statements;
REVOKE ALL ON public.tiktok_shop_settings FROM anon;
REVOKE ALL ON public.tiktok_shop_orders FROM anon;
REVOKE ALL ON public.tiktok_shop_statements FROM anon;
ALTER TABLE public.tiktok_shop_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tiktok_shop_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tiktok_shop_statements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "TikTok staff read settings" ON public.tiktok_shop_settings
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND status = 'active' AND role IN ('owner','admin','finance')));
CREATE POLICY "TikTok manage settings" ON public.tiktok_shop_settings
  FOR ALL USING (public.is_finance_role()) WITH CHECK (public.is_finance_role());
CREATE POLICY "TikTok staff read orders" ON public.tiktok_shop_orders
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND status = 'active' AND role IN ('owner','admin','finance')));
CREATE POLICY "TikTok manage orders" ON public.tiktok_shop_orders
  FOR ALL USING (public.is_finance_role()) WITH CHECK (public.is_finance_role());
CREATE POLICY "TikTok staff read statements" ON public.tiktok_shop_statements
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND status = 'active' AND role IN ('owner','admin','finance')));
CREATE POLICY "TikTok manage statements" ON public.tiktok_shop_statements
  FOR ALL USING (public.is_finance_role()) WITH CHECK (public.is_finance_role());

-- ---------- 8. Survey: policy admin_owner pakai helper standar (bukan is_admin_or_owner legacy) ----------
DROP POLICY IF EXISTS "surveys_admin_owner" ON public.surveys;
DROP POLICY IF EXISTS "survey_rooms_admin_owner" ON public.survey_rooms;
DROP POLICY IF EXISTS "survey_photos_admin_owner" ON public.survey_room_photos;
CREATE POLICY "surveys_admin_owner" ON public.surveys
  FOR ALL USING (public.is_admin_or_owner_sd());
CREATE POLICY "survey_rooms_admin_owner" ON public.survey_rooms
  FOR ALL USING (public.is_admin_or_owner_sd());
CREATE POLICY "survey_photos_admin_owner" ON public.survey_room_photos
  FOR ALL USING (public.is_admin_or_owner_sd());

-- survey_logs: RLS + policy pakai helper standar
ALTER TABLE public.survey_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "survey_logs_admin_all" ON public.survey_logs;
DROP POLICY IF EXISTS "survey_logs_surveyor_insert" ON public.survey_logs;
DROP POLICY IF EXISTS "survey_logs_surveyor_read" ON public.survey_logs;
CREATE POLICY "survey_logs_admin_all" ON public.survey_logs
  FOR ALL USING (public.is_admin_or_owner_sd());
CREATE POLICY "survey_logs_surveyor_insert" ON public.survey_logs
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.surveys s WHERE s.id = survey_id AND s.surveyor_id = auth.uid())
  );
CREATE POLICY "survey_logs_surveyor_read" ON public.survey_logs
  FOR SELECT USING (
    (EXISTS (SELECT 1 FROM public.surveys s WHERE s.id = survey_id AND s.surveyor_id = auth.uid()))
    OR public.is_admin_or_owner_sd()
  );

-- Helper legacy is_admin_or_owner() sudah tidak dipakai policy manapun
DROP FUNCTION IF EXISTS public.is_admin_or_owner();

-- ============================================================
-- SELESAI — NOTIFY: Refresh PostgREST schema cache
-- ============================================================
NOTIFY pgrst, 'reload schema';
