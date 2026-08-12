-- ============================================================
-- 078 — BUG-059 RLS hardening inti (orders/customers/materials/suppliers/install_bookings)
-- ============================================================
-- Latar: kelima tabel ini masih `FOR ALL (auth.role()='authenticated')` —
-- siapa pun yang login (termasuk penjahit = role terendah) bisa baca+tulis semua.
--
-- Pendekatan (bertahap, tidak memutus pipeline — verifikasi matriks write client):
--   orders            : INSERT dipakai admin/orders (admin), /api/orders POST (admin/owner),
--                       dan sync-to-main-orders (finance/admin/owner) → INSERT finance/admin/owner.
--                       UPDATE dipakai GUDANG/steam/qc/production, penjahit auto-transition,
--                       surveyor (survey_id), finance payments, admin → semua staff aktif.
--                       DELETE tidak ada caller client → admin/owner.
--   customers         : SELECT semua staff aktif; tulis hanya admin/owner.
--   materials         : SELECT semua staff aktif; tulis hanya admin/owner.
--   suppliers         : SELECT semua staff aktif; tulis hanya admin/owner.
--   install_bookings  : SELECT & INSERT PUBLIK (halaman /booking anon) DI-PERTAHANKAN;
--                       UPDATE installer/admin/owner; DELETE admin/owner.
-- Plus: REVOKE grant anon dari materials/suppliers (bocor — tidak dipakai publik).
--
-- Pola helper SECURITY DEFINER (aturan AGENTS.md — jangan subquery ke tabel yang sama).
-- ============================================================

-- ---------- Helper role ----------
CREATE OR REPLACE FUNCTION public.is_staff_active_sd()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND status = 'active'
  );
$$;
REVOKE ALL ON FUNCTION public.is_staff_active_sd() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_staff_active_sd() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_staff_active_sd() TO authenticated;

CREATE OR REPLACE FUNCTION public.is_installer_sd()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND status = 'active' AND role = 'installer'
  );
$$;
REVOKE ALL ON FUNCTION public.is_installer_sd() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_installer_sd() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_installer_sd() TO authenticated;

-- ---------- ORDERS ----------
DROP POLICY IF EXISTS "Authenticated staff access" ON public.orders;
DROP POLICY IF EXISTS "All staff read orders" ON public.orders;
DROP POLICY IF EXISTS "Admin manage orders" ON public.orders;

CREATE POLICY "All staff read orders" ON public.orders
  FOR SELECT USING (public.is_staff_active_sd());
CREATE POLICY "Finance admin owner insert orders" ON public.orders
  FOR INSERT WITH CHECK (public.is_finance_role());
CREATE POLICY "All staff update orders" ON public.orders
  FOR UPDATE USING (public.is_staff_active_sd()) WITH CHECK (public.is_staff_active_sd());
CREATE POLICY "Admin owner delete orders" ON public.orders
  FOR DELETE USING (public.is_admin_or_owner_sd());

-- ---------- CUSTOMERS ----------
DROP POLICY IF EXISTS "Authenticated staff full access" ON public.customers;
DROP POLICY IF EXISTS "All staff read customers" ON public.customers;
DROP POLICY IF EXISTS "Admin manage customers" ON public.customers;

CREATE POLICY "All staff read customers" ON public.customers
  FOR SELECT USING (public.is_staff_active_sd());
CREATE POLICY "Admin manage customers" ON public.customers
  FOR ALL USING (public.is_admin_or_owner_sd()) WITH CHECK (public.is_admin_or_owner_sd());

-- ---------- MATERIALS ----------
DROP POLICY IF EXISTS "Authenticated staff access" ON public.materials;
DROP POLICY IF EXISTS "All staff read materials" ON public.materials;
DROP POLICY IF EXISTS "Admin manage materials" ON public.materials;

CREATE POLICY "All staff read materials" ON public.materials
  FOR SELECT USING (public.is_staff_active_sd());
CREATE POLICY "Admin manage materials" ON public.materials
  FOR ALL USING (public.is_admin_or_owner_sd()) WITH CHECK (public.is_admin_or_owner_sd());

REVOKE ALL ON public.materials FROM anon;

-- ---------- SUPPLIERS ----------
DROP POLICY IF EXISTS "Authenticated staff access" ON public.suppliers;
DROP POLICY IF EXISTS "All staff read suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Admin manage suppliers" ON public.suppliers;

CREATE POLICY "All staff read suppliers" ON public.suppliers
  FOR SELECT USING (public.is_staff_active_sd());
CREATE POLICY "Admin manage suppliers" ON public.suppliers
  FOR ALL USING (public.is_admin_or_owner_sd()) WITH CHECK (public.is_admin_or_owner_sd());

REVOKE ALL ON public.suppliers FROM anon;

-- ---------- INSTALL BOOKINGS ----------
-- SELECT & INSERT publik tetap (halaman /booking anon). UPDATE dikelola staff.
DROP POLICY IF EXISTS "Authenticated staff access" ON public.install_bookings;
DROP POLICY IF EXISTS "All staff read install_bookings" ON public.install_bookings;
DROP POLICY IF EXISTS "Admin manage install_bookings" ON public.install_bookings;
DROP POLICY IF EXISTS "Installer update install_bookings" ON public.install_bookings;

CREATE POLICY "All staff read install_bookings" ON public.install_bookings
  FOR SELECT USING (public.is_staff_active_sd());
CREATE POLICY "Admin manage install_bookings" ON public.install_bookings
  FOR ALL USING (public.is_admin_or_owner_sd()) WITH CHECK (public.is_admin_or_owner_sd());
CREATE POLICY "Installer update install_bookings" ON public.install_bookings
  FOR UPDATE USING (public.is_installer_sd()) WITH CHECK (public.is_installer_sd());

NOTIFY pgrst, 'reload schema';
