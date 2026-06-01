-- Migration 042: Steam revision tracking
-- Date: 2026-06-02
-- Reason: When Steam QC fails, the order needs to re-queue to Penjahit for re-work.
--          Track the revision chain via parent_job_id, revision_round counter, and reason.

ALTER TABLE public.production_jobs
  ADD COLUMN IF NOT EXISTS revision_of UUID REFERENCES public.production_jobs(id) ON DELETE SET NULL;

ALTER TABLE public.production_jobs
  ADD COLUMN IF NOT EXISTS revision_round INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.production_jobs
  ADD COLUMN IF NOT EXISTS revision_reason TEXT;

-- Index for fast lookup of revision chain
CREATE INDEX IF NOT EXISTS idx_production_jobs_revision_of ON public.production_jobs(revision_of);
CREATE INDEX IF NOT EXISTS idx_production_jobs_revision_round ON public.production_jobs(revision_round);
