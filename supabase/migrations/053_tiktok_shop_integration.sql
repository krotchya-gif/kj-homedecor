-- TikTok Shop Integration
-- Store TikTok Shop API credentials and tokens

CREATE TABLE IF NOT EXISTS public.tiktok_shop_settings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_name       VARCHAR(255),
  shop_region     VARCHAR(10) DEFAULT 'ID',
  app_key         TEXT NOT NULL,
  app_secret      TEXT NOT NULL,
  shop_cipher     VARCHAR(255),
  access_token    TEXT,
  refresh_token   TEXT,
  token_expires_at TIMESTAMPTZ,
  seller_name     VARCHAR(255),
  open_id         VARCHAR(255),
  is_active       BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Store synced TikTok Shop orders
CREATE TABLE IF NOT EXISTS public.tiktok_shop_orders (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tiktok_order_id VARCHAR(100) UNIQUE NOT NULL,
  order_status    VARCHAR(50),
  payment_status  VARCHAR(50),
  total_amount    NUMERIC(15,2) DEFAULT 0,
  shipping_amount NUMERIC(15,2) DEFAULT 0,
  platform_fee    NUMERIC(15,2) DEFAULT 0,
  commission_fee  NUMERIC(15,2) DEFAULT 0,
  net_amount      NUMERIC(15,2) DEFAULT 0,
  currency        VARCHAR(10) DEFAULT 'IDR',
  buyer_name      VARCHAR(255),
  buyer_phone     VARCHAR(50),
  shipping_address TEXT,
  order_data      JSONB,
  synced_at       TIMESTAMPTZ DEFAULT now(),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Store TikTok Shop settlement statements
CREATE TABLE IF NOT EXISTS public.tiktok_shop_statements (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  statement_id    VARCHAR(100) UNIQUE NOT NULL,
  statement_type  VARCHAR(50),
  total_amount    NUMERIC(15,2) DEFAULT 0,
  status          VARCHAR(50),
  currency        VARCHAR(10) DEFAULT 'IDR',
  start_date      DATE,
  end_date        DATE,
  paid_at         TIMESTAMPTZ,
  transaction_count INTEGER DEFAULT 0,
  statement_data  JSONB,
  is_synced       BOOLEAN DEFAULT false,
  piutang_id      UUID REFERENCES piutang(id) ON DELETE SET NULL,
  synced_at       TIMESTAMPTZ DEFAULT now(),
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tiktok_shop_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tiktok_shop_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tiktok_shop_statements ENABLE ROW LEVEL SECURITY;

-- Only owner role can read/write
CREATE POLICY "owner_all_tiktok_settings" ON public.tiktok_shop_settings
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "owner_all_tiktok_orders" ON public.tiktok_shop_orders
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "owner_all_tiktok_statements" ON public.tiktok_shop_statements
  FOR ALL USING (true) WITH CHECK (true);
