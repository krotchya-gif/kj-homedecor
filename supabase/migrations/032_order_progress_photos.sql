-- Migration: 032_order_progress_photos
-- Purpose: Store photo evidence per order progress stage

CREATE TABLE IF NOT EXISTS public.order_progress_photos (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id    UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  stage       TEXT NOT NULL,  -- 'created', 'sorted', 'payment_ok', 'production', 'steam', 'ready', 'packed', 'shipped', 'done'
  photo_url   TEXT NOT NULL,
  notes       TEXT,
  uploaded_by UUID REFERENCES public.users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookup by order_id
CREATE INDEX IF NOT EXISTS idx_order_progress_photos_order_id ON public.order_progress_photos(order_id);

-- Index for stage filtering
CREATE INDEX IF NOT EXISTS idx_order_progress_photos_stage ON public.order_progress_photos(stage);

-- Allow null for uploaded_by (system actions may not have a user)
ALTER TABLE public.order_progress_photos ALTER COLUMN uploaded_by DROP NOT NULL;