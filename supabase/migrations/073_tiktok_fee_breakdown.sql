-- ============================================================
-- 073 — TikTok settlement fee breakdown + piutang fee
-- ============================================================
-- Opsi B + jurnal penuh (tidak main net):
--   - Kolom breakdown fee di tiktok_shop_statements (revenue/fee/shipping/net/adjustment).
--   - piutang.fee_amount agar sisa piutang = amount − paid − return − fee.
--   - Unique index piutang channel tiktok → anti-double piutang (1 invoice = 1 piutang).
--   - Backfill statement lama dari statement_data (raw payload TikTok).
-- Idempotent: IF NOT EXISTS / ON CONFLICT.
-- ============================================================

ALTER TABLE public.tiktok_shop_statements
  ADD COLUMN IF NOT EXISTS revenue_amount NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fee_amount NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shipping_cost_amount NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_sales_amount NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS adjustment_amount NUMERIC(15,2) DEFAULT 0;

ALTER TABLE public.piutang ADD COLUMN IF NOT EXISTS fee_amount NUMERIC DEFAULT 0;

-- Backfill statement lama dari raw payload (TikTok snake_case, fallback camelCase)
UPDATE public.tiktok_shop_statements
SET revenue_amount       = COALESCE(NULLIF((statement_data ->> 'revenue_amount')::numeric, 0), NULLIF((statement_data ->> 'revenueAmount')::numeric, 0), total_amount),
    fee_amount           = COALESCE(NULLIF((statement_data ->> 'fee_amount')::numeric, 0), NULLIF((statement_data ->> 'feeAmount')::numeric, 0), 0),
    shipping_cost_amount = COALESCE(NULLIF((statement_data ->> 'shipping_cost_amount')::numeric, 0), NULLIF((statement_data ->> 'shippingCostAmount')::numeric, 0), 0),
    net_sales_amount     = COALESCE(NULLIF((statement_data ->> 'net_sales_amount')::numeric, 0), NULLIF((statement_data ->> 'netSalesAmount')::numeric, 0), 0),
    adjustment_amount    = COALESCE(NULLIF((statement_data ->> 'adjustment_amount')::numeric, 0), NULLIF((statement_data ->> 'adjustmentAmount')::numeric, 0), 0)
WHERE statement_data IS NOT NULL AND statement_data::text <> '{}';

-- Anti-double: 1 invoice TikTok = 1 piutang (verified: tidak ada duplikat saat ini)
CREATE UNIQUE INDEX IF NOT EXISTS piutang_tiktok_invoice_unique
  ON public.piutang (invoice_number)
  WHERE channel = 'tiktok' AND invoice_number IS NOT NULL;

NOTIFY pgrst, 'reload schema';
