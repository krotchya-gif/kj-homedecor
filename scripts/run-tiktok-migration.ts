import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(url, key);

async function run() {
	const sql = fs.readFileSync(
		"supabase/migrations/053_tiktok_shop_integration.sql",
		"utf8",
	);

	// Check if tables exist
	const { data: existingSettings } = await supabase
		.from("tiktok_shop_settings")
		.select("id")
		.limit(1)
		.maybeSingle();
	if (existingSettings) {
		console.log("✅ Tables already exist!");
		return;
	}

	// Split into statements and run
	const statements = sql
		.split(";")
		.map((s) => s.trim())
		.filter((s) => s.length > 0);
	console.log(`Running ${statements.length} statements...\n`);

	for (let i = 0; i < statements.length; i++) {
		const stmt = statements[i] + ";";
		try {
			// Try via postgREST params
			const res = await fetch(url + "/rest/v1/", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					apikey: key,
					Authorization: `Bearer ${key}`,
					Prefer: "params=single-object",
				},
				body: JSON.stringify({ query: stmt }),
			});

			if (res.ok || res.status === 201) {
				console.log(
					`  [${i + 1}/${statements.length}] ✅ ${stmt.slice(0, 60)}...`,
				);
			} else {
				const txt = await res.text().catch(() => "");
				if (txt.includes("already exists")) {
					console.log(
						`  [${i + 1}/${statements.length}] 🔄 ${stmt.slice(0, 60)}... (exists)`,
					);
				} else {
					console.log(
						`  [${i + 1}/${statements.length}] ❌ ${res.status}: ${txt.slice(0, 80)}`,
					);
				}
			}
		} catch (e: any) {
			console.log(
				`  [${i + 1}/${statements.length}] ❌ ${e.message.slice(0, 80)}`,
			);
		}
	}

	// Verify
	const { data: check } = await supabase
		.from("tiktok_shop_settings")
		.select("id")
		.limit(1)
		.maybeSingle();
	console.log(
		`\n${check ? "✅ Migration berhasil! Tabel siap." : "❌ Migration gagal."}`,
	);
}

run().catch((e) => console.error(e));
