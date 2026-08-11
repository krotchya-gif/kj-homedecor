-- Migration 071: Fix infinite recursion RLS users
-- Date: 2026-08-12
-- Masalah: policy users "Admin manage users" (migration 067) memakai subquery
--   SELECT 1 FROM public.users  LANGSUNG di dalam policy.
--   PostgreSQL mengevaluasi RLS utk subquery tsb -> policy users dipanggil lagi
--   -> infinite recursion (42P17) -> SEMUA SELECT users dari sisi user login
--   error 500 -> proxy/login page dapat role NULL -> redirect/signout loop.
--
-- Fix: pindahkan pengecekan role ke fungsi SECURITY DEFINER (bypass RLS di
-- dalam fungsi, pola sama seperti is_finance_role() di 063).

BEGIN;

-- ============================================================
-- 1. Helper SECURITY DEFINER utk cek admin/owner
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin_or_owner_sd()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND status = 'active' AND role IN ('admin','owner')
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin_or_owner_sd() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin_or_owner_sd() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_admin_or_owner_sd() TO authenticated;

-- ============================================================
-- 2. Ganti policy users yang rekursif
-- ============================================================
DROP POLICY IF EXISTS "Admin manage users" ON public.users;

CREATE POLICY "Admin manage users" ON public.users
  FOR ALL USING (public.is_admin_or_owner_sd())
  WITH CHECK (public.is_admin_or_owner_sd());

COMMIT;
