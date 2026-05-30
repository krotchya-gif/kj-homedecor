-- 037_enable_steam_jobs_rls.sql
-- Enable RLS on steam_jobs table (missing since migration 010)

ALTER TABLE public.steam_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated staff access" ON public.steam_jobs
  FOR ALL USING (auth.role() = 'authenticated');