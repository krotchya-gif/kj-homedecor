-- Order Preparation Checklist: tracks items needed for order preparation/shipping
CREATE TABLE IF NOT EXISTS public.order_preparation_checklists (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id      UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  items         JSONB NOT NULL DEFAULT '[]',
  -- Structure: [{key: "besi", label: "Besi", done: false, notes: ""}, ...]
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE order_preparation_checklists ENABLE ROW LEVEL SECURITY;

-- Staff and admin can view and update checklists
CREATE POLICY "Authenticated users can manage own checklist"
  ON order_preparation_checklists FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);