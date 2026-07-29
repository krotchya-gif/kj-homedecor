import crypto from "crypto";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://kjhomedecor.com";

// GET /api/tiktok/auth?code=xxx&state=shop_id → OAuth callback from TikTok
export async function GET(req: NextRequest) {
	try {
		const { searchParams } = new URL(req.url);
		const code = searchParams.get("code");
		const state = searchParams.get("state"); // shop_id passed during redirect
		const shopCipherFromUrl = searchParams.get("shop_cipher"); // TikTok returns shop_cipher in redirect URL

		const supabase = await createClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		// OAuth callback — exchange code for access token
		if (code && state) {
			const { data: settings } = await supabase
				.from("tiktok_shop_settings")
				.select("*")
				.eq("id", state)
				.single();

			if (!settings) {
				return NextResponse.redirect(
					new URL("/owner/tiktok?error=settings_not_found", BASE_URL),
				);
			}

			try {
				const qs = new URLSearchParams({
					grant_type: "authorized_code",
					auth_code: code,
					app_key: settings.app_key,
					app_secret: settings.app_secret,
				});

				const res = await fetch(
					`https://auth.tiktok-shops.com/api/v2/token/get?${qs}`,
				);
				const json = await res.json();

				if (json.data?.access_token) {
					const updateData: Record<string, unknown> = {
						access_token: json.data.access_token,
						refresh_token: json.data.refresh_token,
						token_expires_at: json.data.access_token_expire_in
							? new Date(
									Date.now() + json.data.access_token_expire_in * 1000,
								).toISOString()
							: null,
						seller_name: json.data.seller_name,
						open_id: json.data.open_id,
						is_active: true,
					};

					// shop_cipher: prefer from redirect URL, then token response, then authorization API
					if (shopCipherFromUrl?.trim()) {
						updateData.shop_cipher = shopCipherFromUrl.trim();
					} else if (json.data.shop_cipher?.trim()) {
						updateData.shop_cipher = json.data.shop_cipher.trim();
					} else {
						// Fallback: query authorization/shops API to get shop_cipher
						// (GET endpoint, no shop_cipher needed)
						try {
							const ts = Math.floor(Date.now() / 1000);
							const authParams = {
								app_key: settings.app_key,
								timestamp: String(ts),
							};
							const bannedKeys = [
								"access_token",
								"sign",
								"app_secret",
								"token",
							];
							const sortedKeys = Object.keys(authParams)
								.filter((k) => !bannedKeys.includes(k))
								.sort();
							const authPath = "/authorization/202309/shops";
							let input = sortedKeys
								.map((k) => `${k}${authParams[k as keyof typeof authParams]}`)
								.join("");
							input = authPath + input;
							const pt =
								settings.app_secret + input + settings.app_secret;
							const hmac = crypto.createHmac(
								"sha256",
								settings.app_secret,
							);
							hmac.update(pt);
							const authSign = hmac.digest("hex");

							const authQs = new URLSearchParams({
								...authParams,
								sign: authSign,
							});
							const authUrl = `https://open-api.tiktokglobalshop.com${authPath}?${authQs}`;

							const authRes = await fetch(authUrl, {
								headers: {
									"x-tts-access-token": json.data.access_token,
								},
							});
							const authJson = await authRes.json();

							if (authJson.data?.shops?.[0]?.cipher) {
								updateData.shop_cipher = authJson.data.shops[0].cipher;
							}
						} catch {
							// authorization/shops API failed silently
						}
					}

					await supabase
						.from("tiktok_shop_settings")
						.update(updateData)
						.eq("id", state);
				}

				return NextResponse.redirect(
					new URL("/owner/tiktok?success=connected", BASE_URL),
				);
			} catch (err: any) {
				return NextResponse.redirect(
					new URL(
						`/owner/tiktok?error=${encodeURIComponent(err.message)}`,
						BASE_URL,
					),
				);
			}
		}

		return NextResponse.json(
			{ error: "Missing code or state parameter" },
			{ status: 400 },
		);
	} catch (err: any) {
		return NextResponse.json(
			{ error: `Invalid request: ${err.message}` },
			{ status: 400 },
		);
	}
}

// POST /api/tiktok/auth — save/update TikTok Shop settings
export async function POST(req: NextRequest) {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const body = await req.json();
	const { shop_name, app_key, app_secret, shop_cipher } = body;

	if (!app_key || !app_secret) {
		return NextResponse.json(
			{ error: "app_key and app_secret are required" },
			{ status: 400 },
		);
	}

	const { data, error } = await supabase
		.from("tiktok_shop_settings")
		.insert({
			shop_name: shop_name || "TikTok Shop",
			app_key,
			app_secret,
			shop_cipher: shop_cipher || null,
		})
		.select()
		.single();

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}

	// Build OAuth URL
	const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL || "https://kjhomedecor.com"}/api/tiktok/auth`;
	const oauthUrl = `https://auth.tiktok-shops.com/api/v2/oauth/authorize?app_key=${app_key}&state=${data.id}&redirect_uri=${encodeURIComponent(redirectUri)}`;

	return NextResponse.json({ settings: data, oauth_url: oauthUrl });
}

// PUT /api/tiktok/auth — update existing settings
export async function PUT(req: NextRequest) {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const body = await req.json();
	const { id, shop_name, app_key, app_secret, shop_cipher } = body;

	if (!id) {
		return NextResponse.json({ error: "id is required" }, { status: 400 });
	}

	const updates: Record<string, any> = {};
	if (shop_name) updates.shop_name = shop_name;
	if (app_key) updates.app_key = app_key;
	if (app_secret) updates.app_secret = app_secret;
	if (shop_cipher !== undefined) updates.shop_cipher = shop_cipher;

	const { error } = await supabase
		.from("tiktok_shop_settings")
		.update(updates)
		.eq("id", id);
	if (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}

	return NextResponse.json({ success: true });
}
