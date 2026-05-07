-- 010_steam_jobs.sql
-- Steam/QC jobs table: auto-created after penjahit finishes production

CREATE TABLE IF NOT EXISTS public.steam_jobs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  production_job_id UUID REFERENCES public.production_jobs(id) ON DELETE SET NULL,
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'done', 'revision')),
  result            TEXT
                    CHECK (result IN ('pass', 'fail')),
  fail_reason      TEXT,
  notes             TEXT,
  checked_by        UUID REFERENCES public.users(id),
  completed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check
    CHECK (status IN (
      'new', 'sorted', 'payment_ok', 'production',
      'steam', 'ready', 'packed', 'shipped', 'done',
      'returned', 'cancelled'
    ));

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_steam_jobs_order_id ON public.steam_jobs(order_id);
CREATE INDEX IF NOT EXISTS idx_steam_jobs_status ON public.steam_jobs(status);
