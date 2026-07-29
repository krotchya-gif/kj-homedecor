import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import {
	getTikTokSettings,
	getValidToken,
	signTikTokRequest,
} from "@/lib/tiktok";

export async function POST(req: NextRequest) {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const body = await req.json();
	const { shop_id, start_date, end_date } = body;

	const settings = await getTikTokSettings(shop_id);
	if (!settings) {
		return NextResponse.json(
			{ error: "TikTok Shop not configured" },
			{ status: 400 },
		);
	}

	const token = await getValidToken(settings);
	if (!token) {
		return NextResponse.json(
			{ error: "Access token not available" },
			{ status: 400 },
		);
	}

	try {
		// Call TikTok Shop API to get orders with signed request
		// page_size goes in query params (required by TikTok API)
		const reqBody: Record<string, unknown> = {};
		if (start_date) {
			reqBody.create_time_ge = Math.floor(
				new Date(start_date).getTime() / 1000,
			);
		}
		if (end_date) {
			reqBody.create_time_lt = Math.floor(new Date(end_date).getTime() / 1000);
		}

		const url = signTikTokRequest(
			"/order/202309/orders/search",
			settings.app_key,
			settings.app_secret,
			reqBody,
			{ page_size: "100" },
		);

		const orderListRes = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-tts-access-token": token,
			},
			body: JSON.stringify(reqBody),
		});

		const orderData = await orderListRes.json();

		// Check for TikTok API errors
		if (orderData.code && orderData.code !== 0) {
			return NextResponse.json(
				{
					error: `TikTok API error (${orderData.code}): ${orderData.message || "Unknown error"}`,
				},
				{ status: 400 },
			);
		}

		if (!orderData.data?.orders) {
			return NextResponse.json({ synced: 0, message: "No orders found" });
		}

		let synced = 0;
		for (const order of orderListRes.ok ? orderData.data.orders : []) {
			const { data: existing } = await supabase
				.from("tiktok_shop_orders")
				.select("id")
				.eq("tiktok_order_id", order.id)
				.maybeSingle();

			if (!existing) {
				await supabase.from("tiktok_shop_orders").insert({
					tiktok_order_id: order.id,
					order_status: order.order_status,
					payment_status: order.payment_status,
					total_amount: order.total_amount ?? 0,
					shipping_amount: order.shipping_amount ?? 0,
					platform_fee: 0,
					commission_fee: 0,
					net_amount: order.total_amount ?? 0,
					currency: order.currency || "IDR",
					buyer_name: order.buyer_user_name || order.recipient_address?.name,
					buyer_phone: order.recipient_address?.phone,
					shipping_address: order.recipient_address?.full_address,
					order_data: order,
				});
				synced++;
			}
		}

		return NextResponse.json({
			synced,
			total: orderData.data.orders.length,
			message: `Synced ${synced} new orders`,
		});
	} catch (err: any) {
		return NextResponse.json({ error: err.message }, { status: 500 });
	}
}
