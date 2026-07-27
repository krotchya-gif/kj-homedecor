import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

// POST /api/tiktok/webhook — Receive TikTok Shop event notifications
export async function POST(req: NextRequest) {
	const supabase = await createClient();

	try {
		const body = await req.json();
		const eventType = body.event_type || body.type;
		const data = body.data || body;

		// Log webhook for debugging
		console.log(
			"TikTok webhook received:",
			eventType,
			JSON.stringify(data).slice(0, 200),
		);

		if (eventType === "ORDER_CREATED" || eventType === "ORDER_STATUS_UPDATED") {
			const orderId = data.order_id || data.id;
			if (orderId) {
				await supabase
					.from("tiktok_shop_orders")
					.update({
						order_status: data.order_status,
						payment_status: data.payment_status,
						order_data: data,
						updated_at: new Date().toISOString(),
					})
					.eq("tiktok_order_id", orderId);
			}
		} else if (
			eventType === "PAYMENT_RELEASED" ||
			eventType === "SETTLEMENT_COMPLETED"
		) {
			const statementId = data.statement_id || data.id;
			if (statementId) {
				// Check if already synced
				const { data: existing } = await supabase
					.from("tiktok_shop_statements")
					.select("id")
					.eq("statement_id", statementId)
					.maybeSingle();

				if (!existing && data.total_amount > 0) {
					// Auto-create piutang
					const { data: piutang } = await supabase
						.from("piutang")
						.insert({
							customer_id: null,
							invoice_number: `TTK-WEB-${statementId.slice(0, 8)}`,
							invoice_date: new Date().toISOString().split("T")[0],
							amount: data.total_amount,
							channel: "tiktok",
							description: `TikTok Shop auto settlement ${statementId.slice(0, 8)}`,
						})
						.select()
						.single();

					await supabase.from("tiktok_shop_statements").insert({
						statement_id: statementId,
						statement_type: data.type || "AUTO_SETTLEMENT",
						total_amount: data.total_amount,
						status: "SUCCESS",
						currency: data.currency || "IDR",
						statement_data: data,
						is_synced: true,
						piutang_id: piutang?.id || null,
					});
				}
			}
		} else if (
			eventType === "ORDER_REFUND" ||
			eventType === "REFUND_COMPLETED"
		) {
			const refundOrderId = data.order_id;
			if (refundOrderId) {
				await supabase
					.from("tiktok_shop_orders")
					.update({
						payment_status: "refunded",
						order_data: data,
						updated_at: new Date().toISOString(),
					})
					.eq("tiktok_order_id", refundOrderId);
			}
		} else {
			console.log("Unhandled TikTok event:", eventType);
		}

		return NextResponse.json({ received: true });
	} catch (err: any) {
		console.error("TikTok webhook error:", err.message);
		return NextResponse.json({ error: err.message }, { status: 500 });
	}
}
