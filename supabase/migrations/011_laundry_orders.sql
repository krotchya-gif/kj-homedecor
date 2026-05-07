-- 011_laundry_orders.sql
-- Laundry service order workflow: separate from production orders
-- Customer walk-in laundry service with staff assignment and monthly payroll

CREATE TABLE IF NOT EXISTS public.laundry_orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name   TEXT NOT NULL,
  customer_phone  TEXT,
  kg              NUMERIC NOT NULL,
  meter           NUMERIC DEFAULT 0,
  description     TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'in_progress', 'done')),
  assigned_to     UUID REFERENCES public.users(id),
  received_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  created_by      UUID REFERENCES public.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.laundry_rates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  rate_per_kg      NUMERIC NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.laundry_payroll (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id        UUID NOT NULL REFERENCES public.users(id),
  period_month    INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year     INTEGER NOT NULL,
  total_kg        NUMERIC NOT NULL DEFAULT 0,
  total_rate      NUMERIC NOT NULL DEFAULT 0,
  total_amount    NUMERIC NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'paid')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (staff_id, period_month, period_year)
);

-- Insert default rate
INSERT INTO public.laundry_rates (name, rate_per_kg) VALUES ('Rate per kg', 5000);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_laundry_orders_status ON public.laundry_orders(status);
CREATE INDEX IF NOT EXISTS idx_laundry_orders_assigned_to ON public.laundry_orders(assigned_to);
CREATE INDEX IF NOT EXISTS idx_laundry_orders_received_at ON public.laundry_orders(received_at);
CREATE INDEX IF NOT EXISTS idx_laundry_payroll_staff_id ON public.laundry_payroll(staff_id);
CREATE INDEX IF NOT EXISTS idx_laundry_payroll_period ON public.laundry_payroll(period_year, period_month);