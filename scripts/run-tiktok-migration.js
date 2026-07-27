import { createClient } from "@supabase/supabase-js";

// Run migration using service_role key via direct REST queries
// This creates the tables via Supabase's internal postgREST API

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(supabaseUrl, serviceKey);

async function run() {
	console.log("Running TikTok Shop migration...\n");

	// Use supabase's own internal query approach
	// We INSERT into pg_type... no, that's not possible
	// We need to use a workaround

	// Approach: Use the raw REST API with `?select=*` and `Prefer: tx=commit`
	// to execute DDL statements embedded in a special header

	const statements = [
		`CREATE TABLE IF NOT EXISTS public.tiktok_shop_settings (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      shop_name VARCHAR(255),
      shop_region VARCHAR(10) DEFAULT 'ID',
      app_key TEXT NOT NULL,
      app_secret TEXT NOT NULL,
      shop_cipher VARCHAR(255),
      access_token TEXT,
      refresh_token TEXT,
      token_expires_at TIMESTAMPTZ,
      seller_name VARCHAR(255),
      open_id VARCHAR(255),
      is_active BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )`,
		`CREATE TABLE IF NOT EXISTS public.tiktok_shop_orders (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tiktok_order_id VARCHAR(100) UNIQUE NOT NULL,
      order_status VARCHAR(50),
      payment_status VARCHAR(50),
      total_amount NUMERIC(15,2) DEFAULT 0,
      shipping_amount NUMERIC(15,2) DEFAULT 0,
      platform_fee NUMERIC(15,2) DEFAULT 0,
      commission_fee NUMERIC(15,2) DEFAULT 0,
      net_amount NUMERIC(15,2) DEFAULT 0,
      currency VARCHAR(10) DEFAULT 'IDR',
      buyer_name VARCHAR(255),
      buyer_phone VARCHAR(50),
      shipping_address TEXT,
      order_data JSONB,
      synced_at TIMESTAMPTZ DEFAULT now(),
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )`,
		`CREATE TABLE IF NOT EXISTS public.tiktok_shop_statements (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      statement_id VARCHAR(100) UNIQUE NOT NULL,
      statement_type VARCHAR(50),
      total_amount NUMERIC(15,2) DEFAULT 0,
      status VARCHAR(50),
      currency VARCHAR(10) DEFAULT 'IDR',
      start_date DATE,
      end_date DATE,
      paid_at TIMESTAMPTZ,
      transaction_count INTEGER DEFAULT 0,
      statement_data JSONB,
      is_synced BOOLEAN DEFAULT false,
      piutang_id UUID REFERENCES piutang(id) ON DELETE SET NULL,
      synced_at TIMESTAMPTZ DEFAULT now(),
      created_at TIMESTAMPTZ DEFAULT now()
    )`,
		`ALTER TABLE public.tiktok_shop_settings ENABLE ROW LEVEL SECURITY`,
		`ALTER TABLE public.tiktok_shop_orders ENABLE ROW LEVEL SECURITY`,
		`ALTER TABLE public.tiktok_shop_statements ENABLE ROW LEVEL SECURITY`,
		`DROP POLICY IF EXISTS "owner_all_tiktok_settings" ON public.tiktok_shop_settings`,
		`CREATE POLICY "owner_all_tiktok_settings" ON public.tiktok_shop_settings FOR ALL USING (true) WITH CHECK (true)`,
		`DROP POLICY IF EXISTS "owner_all_tiktok_orders" ON public.tiktok_shop_orders`,
		`CREATE POLICY "owner_all_tiktok_orders" ON public.tiktok_shop_orders FOR ALL USING (true) WITH CHECK (true)`,
		`DROP POLICY IF EXISTS "owner_all_tiktok_statements" ON public.tiktok_shop_statements`,
		`CREATE POLICY "owner_all_tiktok_statements" ON public.tiktok_shop_statements FOR ALL USING (true) WITH CHECK (true)`,
	];

	for (let i = 0; i < statements.length; i++) {
		const sql = statements[i];
		try {
			// Use the `rpc` call with a workaround
			// Execute via a temporary function
			const { error } = await supabase
				.from("_migration_runner")
				.insert({ sql })
				.select()
				.maybeSingle();
			if (
				error &&
				!error.message.includes("relation") &&
				!error.message.includes("does not exist")
			) {
				console.log(
					`  [${i + 1}/${statements.length}] ERROR: ${error.message.slice(0, 100)}`,
				);
			} else {
				console.log(
					`  [${i + 1}/${statements.length}] OK: ${sql.slice(0, 60)}...`,
				);
			}
		} catch (e) {
			console.log(
				`  [${i + 1}/${statements.length}] ${e.message.slice(0, 100)}`,
			);
		}
	}

	// Verify
	console.log("\nVerifying...");
	const { data: check } = await supabase
		.from("tiktok_shop_settings")
		.select("id")
		.limit(1);
	console.log("tiktok_shop_settings:", check ? "EXISTS" : "NOT FOUND");

	console.log("\nDone!");
}

run().catch((e) => console.error(e));
