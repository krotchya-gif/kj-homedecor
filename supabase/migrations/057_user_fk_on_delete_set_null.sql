-- Migration 057: Add ON DELETE SET NULL for user foreign keys
-- Fixes Critical #11
--
-- PROBLEM:
--   Many columns reference public.users(id) without ON DELETE SET NULL.
--   When a user is deleted from auth.users (e.g., staff leaves), the FK
--   constraint blocks deletion or causes integrity errors.
--
--   PostgreSQL cannot ALTER an existing FK constraint — it must be dropped
--   and recreated. This migration:
--     1. Identifies all FK constraints referencing users(id) that lack ON DELETE SET NULL
--     2. Safely drops and recreates each one with ON DELETE SET NULL
--     3. Updates orphaned records to NULL before recreating constraints
--
-- NOTE: Columns with NOT NULL + FK (like production_jobs.penjahit_id) cannot
--   use ON DELETE SET NULL. Those are handled by a separate approach:
--   a soft-delete / deactivation strategy for user records instead.

BEGIN;

-- ============================================================
-- 1. Helper: Clean orphaned records before constraint changes
-- ============================================================

-- Set orphaned rows to NULL for nullable user FKs
UPDATE public.order_logs           SET staff_id = NULL     WHERE staff_id IS NOT NULL     AND staff_id NOT IN (SELECT id FROM public.users);
UPDATE public.orders                SET shipped_by = NULL   WHERE shipped_by IS NOT NULL   AND shipped_by NOT IN (SELECT id FROM public.users);
UPDATE public.orders                SET installed_by = NULL WHERE installed_by IS NOT NULL AND installed_by NOT IN (SELECT id FROM public.users);
UPDATE public.orders                SET packed_by = NULL    WHERE packed_by IS NOT NULL    AND packed_by NOT IN (SELECT id FROM public.users);
UPDATE public.laundry_orders        SET assigned_to = NULL  WHERE assigned_to IS NOT NULL  AND assigned_to NOT IN (SELECT id FROM public.users);
UPDATE public.laundry_orders        SET created_by = NULL   WHERE created_by IS NOT NULL   AND created_by NOT IN (SELECT id FROM public.users);
UPDATE public.order_material_consumption SET consumed_by = NULL WHERE consumed_by IS NOT NULL AND consumed_by NOT IN (SELECT id FROM public.users);
UPDATE public.order_progress_photos SET uploaded_by = NULL  WHERE uploaded_by IS NOT NULL  AND uploaded_by NOT IN (SELECT id FROM public.users);
UPDATE public.steam_jobs            SET checked_by = NULL   WHERE checked_by IS NOT NULL   AND checked_by NOT IN (SELECT id FROM public.users);
UPDATE public.returns_refunds       SET approved_by = NULL  WHERE approved_by IS NOT NULL  AND approved_by NOT IN (SELECT id FROM public.users);
UPDATE public.returns_refunds       SET created_by = NULL   WHERE created_by IS NOT NULL   AND created_by NOT IN (SELECT id FROM public.users);
UPDATE public.stock_opname_sessions SET created_by = NULL   WHERE created_by IS NOT NULL   AND created_by NOT IN (SELECT id FROM public.users);
UPDATE public.stock_opname_sessions SET approved_by = NULL  WHERE approved_by IS NOT NULL  AND approved_by NOT IN (SELECT id FROM public.users);
UPDATE public.install_bookings      SET installer_id = NULL WHERE installer_id IS NOT NULL AND installer_id NOT IN (SELECT id FROM public.users);
UPDATE public.install_bookings      SET verified_by = NULL  WHERE verified_by IS NOT NULL  AND verified_by NOT IN (SELECT id FROM public.users);
UPDATE public.journal_entries       SET created_by = NULL   WHERE created_by IS NOT NULL   AND created_by NOT IN (SELECT id FROM public.users);
UPDATE public.payments              SET paid_by = NULL      WHERE paid_by IS NOT NULL      AND paid_by NOT IN (SELECT id FROM public.users);
UPDATE public.inventory_movements   SET created_by = NULL   WHERE created_by IS NOT NULL   AND created_by NOT IN (SELECT id FROM public.users);
UPDATE public.inventory_movements   SET checked_by = NULL   WHERE checked_by IS NOT NULL   AND checked_by NOT IN (SELECT id FROM public.users);
UPDATE public.qc_records            SET checked_by = NULL   WHERE checked_by IS NOT NULL   AND checked_by NOT IN (SELECT id FROM public.users);
UPDATE public.order_logs            SET created_by = NULL   WHERE created_by IS NOT NULL   AND created_by NOT IN (SELECT id FROM public.users);

-- ============================================================
-- 2. Drop and recreate FK constraints with ON DELETE SET NULL
-- ============================================================
-- We need the exact FK constraint names. PostgreSQL auto-generates names
-- like "table_column_fkey" unless explicitly named in CREATE TABLE.
-- We use DO blocks with dynamic SQL to discover and recreate them safely.
-- ============================================================

DO $$
DECLARE
  fk RECORD;
BEGIN
  FOR fk IN
    SELECT
      tc.table_schema,
      tc.table_name,
      tc.constraint_name,
      kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name
      AND tc.table_schema = ccu.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_name = 'users'
      AND ccu.column_name = 'id'
      AND tc.table_schema = 'public'
      -- Exclude NOT NULL columns (can't SET NULL on those)
      AND kcu.column_name NOT IN (
        SELECT c.column_name
        FROM information_schema.columns c
        WHERE c.table_schema = tc.table_schema
          AND c.table_name = tc.table_name
          AND c.column_name = kcu.column_name
          AND c.is_nullable = 'NO'
      )
  LOOP
    -- Drop the existing FK
    EXECUTE format(
      'ALTER TABLE %I.%I DROP CONSTRAINT %I',
      fk.table_schema, fk.table_name, fk.constraint_name
    );

    -- Recreate with ON DELETE SET NULL
    EXECUTE format(
      'ALTER TABLE %I.%I ADD CONSTRAINT %I
       FOREIGN KEY (%I) REFERENCES public.users(id)
       ON DELETE SET NULL',
      fk.table_schema, fk.table_name, fk.constraint_name, fk.column_name
    );

    RAISE NOTICE 'Recreated FK: %.% (%) → users(id) ON DELETE SET NULL',
      fk.table_schema, fk.table_name, fk.column_name;
  END LOOP;
END $$;

-- ============================================================
-- 3. Handle NOT NULL FKs separately
--    These columns have NOT NULL + FK references to users(id).
--    Cannot use ON DELETE SET NULL. Instead, we add a note:
-- ============================================================

-- The following FKs are NOT NULL and cannot use ON DELETE SET NULL:
-- - production_jobs.penjahit_id (NOT NULL) references public.users(id)
-- - laundry_payroll.staff_id (NOT NULL) references public.users(id)
--
-- Strategy: Before deleting a user, reassign their records to another user
-- or handle via application-level soft-delete. These are safe because
-- a penjahit/staff record shouldn't exist without a valid user reference.

COMMIT;
