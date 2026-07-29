"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function RunMigrationPage() {
	const [status, setStatus] = useState<string[]>([]);
	const [running, setRunning] = useState(false);
	const router = useRouter();
	const supabase = createClient();

	useEffect(() => {
		checkAndRun();
	}, []);

	async function checkAndRun() {
		setRunning(true);

		// Check if tables exist
		let existing = null;
		try {
			const result = await supabase
				.from("tiktok_shop_settings")
				.select("id")
				.limit(1)
				.maybeSingle();
			existing = result.data;
		} catch {
			// Table doesn't exist yet, migration needed
		}

		setStatus((s) => [
			...s,
			existing ? "✅ Tables already exist" : "🔄 Migration needed, running...",
		]);

		if (existing) {
			setRunning(false);
			return;
		}

		if (existing !== null) {
			setStatus((s) => [...s, "✅ Tables already exist"]);
			setRunning(false);
			return;
		}

		setStatus((s) => [...s, "🔄 Migration needed, running..."]);

		// Split and run each statement
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

		for (const sql of statements) {
			try {
				const { error } = await supabase.rpc("exec_sql", { query: sql });
				if (error) {
					// If exec_sql doesn't exist, try REST approach
					setStatus((s) => [
						...s,
						`⚠️ exec_sql not available: ${error.message.slice(0, 80)}`,
					]);
					setStatus((s) => [
						...s,
						"ℹ️ Please run migration manually via Supabase SQL Editor (see instructions below)",
					]);
					setRunning(false);
					return;
				}
				setStatus((s) => [...s, `✅ ${sql.slice(0, 60)}...`]);
			} catch (e: any) {
				setStatus((s) => [...s, `❌ ${e.message.slice(0, 80)}`]);
			}
		}

		setStatus((s) => [...s, "🎉 Migration complete!"]);
		setRunning(false);
	}

	return (
		<div style={{ padding: "2rem", maxWidth: 640, margin: "0 auto" }}>
			<h1
				style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "1rem" }}
			>
				TikTok Shop Migration
			</h1>

			{status.length === 0 && !running && <p>Checking migration status...</p>}

			{status.map((msg, i) => (
				<div
					key={i}
					style={{
						padding: "0.25rem 0",
						fontSize: "0.85rem",
						fontFamily: "monospace",
					}}
				>
					{msg}
				</div>
			))}

			{!running &&
				status.some((s) => s.includes("Please run migration manually")) && (
					<div
						style={{
							marginTop: "1.5rem",
							padding: "1rem",
							background: "#f0f9ff",
							border: "1px solid #93c5fd",
							borderRadius: "0.5rem",
							fontSize: "0.85rem",
						}}
					>
						<strong style={{ color: "#1e40af" }}>Cara manual:</strong>
						<ol
							style={{
								margin: "0.5rem 0",
								paddingLeft: "1.25rem",
								lineHeight: 1.8,
							}}
						>
							<li>
								Buka <strong>Supabase Dashboard → SQL Editor</strong>
							</li>
							<li>
								Copy paste SQL dari file{" "}
								<code
									style={{
										background: "#e0e7ff",
										padding: "0.1rem 0.3rem",
										borderRadius: "0.25rem",
									}}
								>
									supabase/migrations/053_tiktok_shop_integration.sql
								</code>
							</li>
							<li>
								Klik <strong>Run</strong>
							</li>
						</ol>
						<button
							onClick={() => router.push("/owner/tiktok")}
							style={{
								padding: "0.5rem 1rem",
								background: "#cc7030",
								color: "#fff",
								border: "none",
								borderRadius: "0.5rem",
								fontSize: "0.85rem",
								fontWeight: 600,
								cursor: "pointer",
							}}
						>
							Back to TikTok Dashboard
						</button>
					</div>
				)}
		</div>
	);
}
