import { createClient } from "@/utils/supabase/server";
import crypto from "crypto";

export interface TikTokSettings {
	id: string;
	app_key: string;
	app_secret: string;
	access_token: string | null;
	refresh_token: string | null;
	shop_cipher?: string | null;
	seller_name?: string | null;
	open_id?: string | null;
	token_expires_at: string | null;
	is_active: boolean;
}

/**
 * Build a signed TikTok Shop API request URL with the required
 * app_key, timestamp, and signature query parameters.
 */
export function signTikTokRequest(
	path: string,
	appKey: string,
	appSecret: string,
	body?: Record<string, unknown>,
	extraQs?: Record<string, string>,
): string {
	const timestamp = Math.floor(Date.now() / 1000);

	// Build sorted query params (excluding sign which we're generating)
	const params: Record<string, string> = {
		app_key: appKey,
		timestamp: String(timestamp),
		...extraQs,
	};

	const sortedKeys = Object.keys(params).sort();

	// Step 2: concatenate {key}{value} in alphabetical order
	const paramString = sortedKeys.map((k) => `${k}${params[k]}`).join("");

	// Step 3: prepend pathname
	let signString = `${path}${paramString}`;

	// Step 4: append JSON body if present
	if (body && Object.keys(body).length > 0) {
		signString += JSON.stringify(body);
	}

	// Step 5: wrap with app_secret
	signString = `${appSecret}${signString}${appSecret}`;

	// Step 6: HMAC-SHA256
	const hmac = crypto.createHmac("sha256", appSecret);
	hmac.update(signString);
	const sign = hmac.digest("hex");

	// Build final URL
	const qs = new URLSearchParams({ ...params, sign });
	return `https://open-api.tiktokglobalshop.com${path}?${qs}`;
}

export async function getTikTokSettings(
	shopId?: string,
): Promise<TikTokSettings | null> {
	const supabase = await createClient();
	let query = supabase.from("tiktok_shop_settings").select("*").limit(1);
	if (shopId) {
		query = query.eq("id", shopId);
	}

	const { data } = await query;
	const settings = Array.isArray(data) ? data[0] : data;
	return (settings ?? null) as TikTokSettings | null;
}

export async function refreshTikTokToken(
	settings: TikTokSettings,
): Promise<string | null> {
	if (!settings.refresh_token) return null;

	try {
		const qs = new URLSearchParams({
			grant_type: "authorized_code",
			refresh_token: settings.refresh_token,
			app_key: settings.app_key,
			app_secret: settings.app_secret,
		});

		const res = await fetch(
			`https://auth.tiktok-shops.com/api/v2/token/refresh?${qs}`,
		);
		const json = await res.json();

		if (json.data?.access_token) {
			const supabase = await createClient();
			await supabase
				.from("tiktok_shop_settings")
				.update({
					access_token: json.data.access_token,
					refresh_token: json.data.refresh_token ?? settings.refresh_token,
					token_expires_at: json.data.access_token_expire_in
						? new Date(
								Date.now() + json.data.access_token_expire_in * 1000,
							).toISOString()
						: null,
				})
				.eq("id", settings.id);

			return json.data.access_token;
		}
		return null;
	} catch {
		return null;
	}
}

export async function getValidToken(
	settings?: TikTokSettings | null,
): Promise<string | null> {
	if (!settings) {
		settings = await getTikTokSettings();
	}
	if (!settings?.access_token) return null;

	// Check if token is expired and refresh if needed
	if (
		settings.token_expires_at &&
		new Date(settings.token_expires_at) < new Date()
	) {
		return await refreshTikTokToken(settings);
	}

	return settings.access_token;
}
