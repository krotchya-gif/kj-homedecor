-- Migration 053: Fix landing_settings RLS policies
-- Fixes Critical #7 & High #10
-- 
-- Issues:
-- 1. Migration 004: FOR UPDATE USING (true) — allows ANY authenticated user to update
-- 2. Migration 005: FOR UPDATE USING (auth.role() = 'service_role' OR true) — OR true defeats the policy
--
-- This migration recreates both UPDATE and INSERT policies to properly restrict
-- writes to admin/owner roles only, while keeping SELECT open to everyone.

BEGIN;

-- ============================================================
-- Fix UPDATE policy (broken by both 004 and 005)
-- ============================================================
DROP POLICY IF EXISTS "Only admin can update landing_settings" ON public.landing_settings;
CREATE POLICY "Only admin can update landing_settings" ON public.landing_settings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND role IN ('admin', 'owner')
    )
  );

-- ============================================================
-- Fix INSERT policy (missing/also broken)
-- ============================================================
DROP POLICY IF EXISTS "Only admin can insert landing_settings" ON public.landing_settings;
CREATE POLICY "Only admin can insert landing_settings" ON public.landing_settings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND role IN ('admin', 'owner')
    )
  );

-- ============================================================
-- Ensure DELETE is also restricted (safety net)
-- ============================================================
DROP POLICY IF EXISTS "Only admin can delete landing_settings" ON public.landing_settings;
CREATE POLICY "Only admin can delete landing_settings" ON public.landing_settings
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND role IN ('admin', 'owner')
    )
  );

-- ============================================================
-- Verify: keep SELECT open for everyone (public read)
-- ============================================================
-- Migration 004 already created "Anyone can read landing settings" FOR SELECT USING (true)
-- This is correct for a landing page — no change needed.

COMMIT;
