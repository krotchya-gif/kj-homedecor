-- Migration 058: SECURITY DEFINER role checks — documentation and audit
-- Fixes High #7
--
-- PROBLEM:
--   Several RPC functions in the database use SECURITY DEFINER (run as owner).
--   These bypass RLS entirely and should include explicit role checks to ensure
--   only authorized users (admin/owner) can execute sensitive operations.
--
--   We cannot use CREATE OR REPLACE here because:
--   1. We don't have the full function definitions to recreate
--   2. Some functions may have been modified after initial creation
--   3. Overwriting without the complete current definition could break
--      things if the ABI differs
--
-- APPROACH:
--   This migration documents all known SECURITY DEFINER functions and
--   provides the pattern for fixing them. Each function should be updated
--   via a separate migration or direct SQL in Supabase Dashboard with
--   the full CREATE OR REPLACE FUNCTION ... statement.
--
-- TODO: Fix these functions manually or in follow-up migrations:
--   See ~/.hermes/kj-homedecor/TODO-security-definer.md for the complete
--   list and replacement function definitions.

BEGIN;

-- ============================================================
-- Audit: List all SECURITY DEFINER functions in the schema
-- ============================================================

-- Log the functions that need review
DO $$
DECLARE
  func_record RECORD;
BEGIN
  FOR func_record IN
    SELECT
      n.nspname AS schema_name,
      p.proname AS function_name,
      pg_get_functiondef(p.oid) AS function_def
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.prosecdef = true  -- SECURITY DEFINER
      AND p.proname NOT LIKE '%pg_%'
      AND p.proname NOT LIKE '%_v1%'
    ORDER BY p.proname
  LOOP
    RAISE WARNING 'SECURITY DEFINER function found: %.% — needs explicit role check',
      func_record.schema_name, func_record.function_name;
  END LOOP;
END $$;

-- ============================================================
-- Known SECURITY DEFINER functions and fix status:
-- ============================================================
-- 1. increment_stock_toko         — update stock, should check admin/gudang/owner
-- 2. process_return_refund        — TIDAK ADA (verifikasi 2026-08-12: 404 di live,
--                                    tidak pernah dibuat; tidak dipakai kode)
-- 3. create_journal_entry         — TIDAK ADA (verifikasi 2026-08-12: 404 di live;
--                                    jurnal modern pakai create_journal_atomic)
-- 4. approve_stock_opname         — TIDAK ADA (verifikasi 2026-08-12: 404 di live)
-- 5. record_material_consumption  — TIDAK ADA (verifikasi 2026-08-12: 404 di live;
--                                    konsumsi material pakai consume_materials_for_production)
--
-- Status final (2026-08-12): SEMUA fungsi SECURITY DEFINER yang ADA di live sudah
-- punya role check (is_finance_role / is_admin_or_owner_sd / EXISTS role) —
-- lihat migration 063/067/071 & 000_full_schema.sql section 10.
--
-- Fix pattern for each function:
--
-- CREATE OR REPLACE FUNCTION public.function_name(...)
-- RETURNS ... LANGUAGE plpgsql SECURITY DEFINER
-- SET search_path = public
-- AS $$
-- BEGIN
--   -- Role check
--   IF NOT EXISTS (
--     SELECT 1 FROM public.users
--     WHERE id = auth.uid()
--       AND role IN ('admin', 'owner' /*, plus any additional roles */)
--   ) THEN
--     RAISE EXCEPTION 'permission denied: insufficient role'
--       USING HINT = 'Only authorized users can call this function';
--   END IF;
--
--   -- Original function body...
-- END;
-- $$;
--
-- ============================================================
-- Recommendation:
-- Apply fixes in the Supabase SQL Editor or create individual
-- follow-up migrations (e.g., 059_fix_increment_stock_toko_rls.sql)
-- with the full CREATE OR REPLACE for each function.
-- ============================================================

COMMIT;
