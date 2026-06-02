-- Migration 046: Add production_reports.production_job_id + FK to production_jobs
-- Date: 2026-06-02
-- Reason: Codebase has 3 broken Supabase queries that try to use FK relationships
--          which don't exist in the database:
--          1. production_jobs -> order_items (in /penjahit/jobs, /penjahit/history)
--          2. production_jobs -> production_reports (in /penjahit/history)
--          3. production_reports -> production_jobs (in /penjahit/reports)
--
-- This migration adds the missing FK for production_reports -> production_jobs
-- (and the missing column production_job_id).
--
-- For production_jobs -> order_items: we will fix code to use nested
-- order.order_items[] (already done in /penjahit/jobs).
--
-- The original production_reports table is a MONTHLY aggregate
-- (UNIQUE(penjahit_id, month, year)), but code in /penjahit/jobs/page.tsx:47
-- inserts a per-job report with production_job_id. To support both:
--   1. Add production_job_id column (nullable) for per-job inserts
--   2. Drop UNIQUE(penjahit_id, month, year) constraint (would block multiple
--      per-job inserts per month)
--   3. Add FK to production_jobs with ON DELETE SET NULL

BEGIN;

-- 1. Add production_job_id column
ALTER TABLE public.production_reports
  ADD COLUMN IF NOT EXISTS production_job_id UUID;

-- 2. Add FK constraint
ALTER TABLE public.production_reports
  ADD CONSTRAINT fk_production_reports_job
  FOREIGN KEY (production_job_id) REFERENCES public.production_jobs(id)
  ON DELETE SET NULL;

-- 3. Create index for FK lookups
CREATE INDEX IF NOT EXISTS idx_production_reports_job_id
  ON public.production_reports(production_job_id) WHERE production_job_id IS NOT NULL;

-- 4. Drop UNIQUE constraint on (penjahit_id, month, year)
--    Reason: per-job inserts with production_job_id would conflict with this constraint
--    The monthly aggregate behavior should be enforced in application logic instead
ALTER TABLE public.production_reports
  DROP CONSTRAINT IF EXISTS production_reports_penjahit_id_month_year_key;

COMMIT;
