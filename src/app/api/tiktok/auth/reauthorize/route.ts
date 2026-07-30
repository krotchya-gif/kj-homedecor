import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://kjhomedecor.com";

// POST /api/tiktok/auth/reauthorize — get OAuth URL for an existing shop
export async function POST(req: NextRequest) {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const body = await req.json();
	const { shop_id } = body;

	if (!shop_id) {
		return NextResponse.json({ error: "shop_id is required" }, { status: 400 });
	}

	const { data: settings } = await supabase
		.from("tiktok_shop_settings")
		.select("*")
		.eq("id", shop_id)
		.single();

	if (!settings) {
		return NextResponse.json({ error: "Shop not found" }, { status: 404 });
	}

	// Build OAuth URL with required scopes
	const redirectUri = `${BASE_URL}/api/tiktok/auth`;
	const scope = [
		"seller.order.info",
		"seller.finance.info",
		"seller.authorization.info",
		"seller.shop.info",
	].join(",");
	const oauthUrl = `https://auth.tiktok-shops.com/api/v2/oauth/authorize?app_key=${settings.app_key}&state=${settings.id}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}`;

	return NextResponse.json({
		oauth_url: oauthUrl,
		seller_name: settings.seller_name,
	});
}
