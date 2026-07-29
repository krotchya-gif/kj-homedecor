"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import {
	ShoppingBag,
	DollarSign,
	RefreshCw,
	Link2,
	Loader2,
	Trash2,
	AlertCircle,
	CheckCircle2,
	Clock,
	Info,
} from "lucide-react";

const formatRp = (n: number) =>
	new Intl.NumberFormat("id-ID", {
		style: "currency",
		currency: "IDR",
		maximumFractionDigits: 0,
	}).format(n);

export default function TikTokDashboardPage() {
	const [settings, setSettings] = useState<any[]>([]);
	const [orders, setOrders] = useState<any[]>([]);
	const [statements, setStatements] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [syncing, setSyncing] = useState<string | null>(null);
	const [syncResult, setSyncResult] = useState<{
		type: "success" | "error";
		text: string;
	} | null>(null);
	const [showAddForm, setShowAddForm] = useState(false);
	const [showReauthConfirm, setShowReauthConfirm] = useState<string | null>(
		null,
	);
	const [reauthLoading, setReauthLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [form, setForm] = useState({
		shop_name: "",
		app_key: "",
		app_secret: "",
		shop_cipher: "",
	});
	const [dateRange, setDateRange] = useState({ start: "", end: "" });

	const supabase = createClient();

	const activeShop = settings.find((s) => s.is_active);

	useEffect(() => {
		fetchData();
	}, []);

	async function fetchData() {
		setLoading(true);
		const [settingsRes, ordersRes, statementsRes] = await Promise.all([
			supabase.from("tiktok_shop_settings").select("*"),
			supabase
				.from("tiktok_shop_orders")
				.select("*")
				.order("created_at", { ascending: false })
				.limit(50),
			supabase
				.from("tiktok_shop_statements")
				.select("*")
				.order("created_at", { ascending: false })
				.limit(50),
		]);
		setSettings(settingsRes.data ?? []);
		setOrders(ordersRes.data ?? []);
		setStatements(statementsRes.data ?? []);
		setLoading(false);
	}

	async function handleSave(e: React.FormEvent) {
		e.preventDefault();
		setSaving(true);
		setSyncResult(null);
		try {
			const res = await fetch("/api/tiktok/auth", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(form),
			});
			const json = await res.json();
			if (json.oauth_url) {
				window.location.href = json.oauth_url;
			} else {
				setSyncResult({
					type: "error",
					text: json.error || "Gagal menyimpan settings",
				});
			}
		} catch (err: any) {
			setSyncResult({ type: "error", text: err.message });
		}
		setSaving(false);
	}

	async function handleReauthorize(shopId: string) {
		setReauthLoading(true);
		setSyncResult(null);
		try {
			const res = await fetch("/api/tiktok/auth/reauthorize", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ shop_id: shopId }),
			});
			const json = await res.json();
			if (json.oauth_url) {
				setShowReauthConfirm(null);
				window.location.href = json.oauth_url;
			} else {
				setSyncResult({
					type: "error",
					text: json.error || "Gagal mendapatkan OAuth URL",
				});
			}
		} catch (err: any) {
			setSyncResult({ type: "error", text: err.message });
		}
		setReauthLoading(false);
	}

	async function handleSync(type: "orders" | "finance") {
		setSyncing(type);
		setSyncResult(null);

		const res = await fetch(`/api/tiktok/sync-${type}`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				shop_id: activeShop?.id,
				...(dateRange.start ? { start_date: dateRange.start } : {}),
				...(dateRange.end ? { end_date: dateRange.end } : {}),
				auto_create_piutang: type === "finance",
			}),
		});
		const json = await res.json();
		if (json.error) {
			setSyncResult({ type: "error", text: json.error });
		} else {
			setSyncResult({ type: "success", text: json.message || "Sync selesai" });
		}
		setSyncing(null);
		fetchData();
	}

	async function handleDelete(shopId: string) {
		if (
			!confirm(
				"Hapus TikTok Shop ini? Data orders & statements tetap tersimpan.",
			)
		)
			return;
		await supabase.from("tiktok_shop_settings").delete().eq("id", shopId);
		fetchData();
	}

	function isTokenExpired(shop: any): boolean {
		if (!shop.token_expires_at || !shop.access_token) return true;
		return new Date(shop.token_expires_at) < new Date();
	}

	const totalSales = orders.reduce(
		(s, o) => s + Number(o.total_amount || 0),
		0,
	);
	const totalSettlements = statements.reduce(
		(s, st) => s + Number(st.total_amount || 0),
		0,
	);
	if (loading) {
		return (
			<div className="flex-center" style={{ minHeight: 400 }}>
				<Loader2
					size={32}
					style={{ animation: "spin 1s linear infinite", color: "#cc7030" }}
				/>
			</div>
		);
	}

	return (
		<div>
			<div className="page-header">
				<h1 className="page-title">TikTok Shop</h1>
				<p className="page-subtitle">
					Integrasi TikTok Shop — Order, Settlement, Rekonsiliasi
				</p>
			</div>

			{/* Stats */}
			<div className="stat-grid" style={{ marginBottom: "1.5rem" }}>
				<div className="stat-card">
					<div className="stat-card-label">Total Orders (Synced)</div>
					<div className="stat-card-value" style={{ color: "#cc7030" }}>
						{orders.length}
					</div>
					<div className="stat-card-sub">
						{formatRp(totalSales)} total sales
					</div>
				</div>
				<div className="stat-card">
					<div className="stat-card-label">Total Settlements</div>
					<div className="stat-card-value" style={{ color: "#2563eb" }}>
						{statements.length}
					</div>
					<div className="stat-card-sub">
						{formatRp(totalSettlements)} settled
					</div>
				</div>
				<div className="stat-card">
					<div className="stat-card-label">Shop Terkoneksi</div>
					<div
						className="stat-card-value"
						style={{
							color:
								activeShop && !isTokenExpired(activeShop)
									? "#16a34a"
									: "#ef4444",
						}}
					>
						{activeShop
							? isTokenExpired(activeShop)
								? "Expired"
								: "Aktif"
							: "Tidak Ada"}
					</div>
					<div className="stat-card-sub">
						{activeShop?.seller_name || activeShop?.shop_name || "-"}
					</div>
				</div>
			</div>

			{/* Shop Management */}
			{settings.length > 0 && (
				<div
					style={{
						background: "#fff",
						border: "1px solid #e5e7eb",
						borderRadius: "0.75rem",
						padding: "1rem 1.25rem",
						marginBottom: "1.5rem",
					}}
				>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							marginBottom: "0.75rem",
						}}
					>
						<h2
							style={{
								fontSize: "0.9rem",
								fontWeight: "700",
								color: "#374151",
								margin: 0,
								display: "flex",
								alignItems: "center",
								gap: "0.4rem",
							}}
						>
							<Link2 size={16} />
							Shop Terhubung
						</h2>
						<button
							onClick={() => setShowAddForm(true)}
							style={{
								padding: "0.4rem 0.8rem",
								background: "#cc7030",
								color: "#fff",
								border: "none",
								borderRadius: "0.5rem",
								fontSize: "0.75rem",
								fontWeight: "600",
								cursor: "pointer",
							}}
						>
							+ Add Shop
						</button>
					</div>
					<div
						style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
					>
						{settings.map((s) => {
							const expired = isTokenExpired(s);
							const missingCipher = !s.shop_cipher;
							return (
								<div
									key={s.id}
									style={{
										display: "flex",
										alignItems: "center",
										justifyContent: "space-between",
										padding: "0.6rem 0.75rem",
										background: s.is_active ? "#faf5ef" : "#f9fafb",
										borderRadius: "0.5rem",
										border: s.is_active
											? "1px solid #f0dcc0"
											: "1px solid #e5e7eb",
									}}
								>
									<div
										style={{
											display: "flex",
											alignItems: "center",
											gap: "0.75rem",
											flex: 1,
											minWidth: 0,
										}}
									>
										<div
											style={{
												width: 8,
												height: 8,
												borderRadius: "50%",
												background: expired
													? "#ef4444"
													: s.is_active
														? "#16a34a"
														: "#d1d5db",
												flexShrink: 0,
											}}
										/>
										<div style={{ minWidth: 0 }}>
											<div
												style={{
													fontSize: "0.85rem",
													fontWeight: "600",
													color: "#374151",
													whiteSpace: "nowrap",
													overflow: "hidden",
													textOverflow: "ellipsis",
												}}
											>
												{s.seller_name || s.shop_name || "Unnamed Shop"}
											</div>
											<div
												style={{
													display: "flex",
													gap: "0.5rem",
													alignItems: "center",
													flexWrap: "wrap",
													marginTop: "0.15rem",
												}}
											>
												{expired && (
													<span
														style={{
															fontSize: "0.7rem",
															color: "#ef4444",
															fontWeight: "500",
															background: "#fef2f2",
															padding: "0.1rem 0.4rem",
															borderRadius: "999px",
															display: "flex",
															alignItems: "center",
															gap: "0.2rem",
														}}
													>
														<Clock size={10} /> Token expired
													</span>
												)}
												{missingCipher && (
													<span
														style={{
															fontSize: "0.7rem",
															color: "#d97706",
															fontWeight: "500",
															background: "#fffbeb",
															padding: "0.1rem 0.4rem",
															borderRadius: "999px",
															display: "flex",
															alignItems: "center",
															gap: "0.2rem",
														}}
													>
														<AlertCircle size={10} /> Perlu re-authorize
													</span>
												)}
												{s.shop_cipher && !expired && (
													<span
														style={{
															fontSize: "0.7rem",
															color: "#16a34a",
															fontWeight: "500",
															background: "#f0fdf4",
															padding: "0.1rem 0.4rem",
															borderRadius: "999px",
															display: "flex",
															alignItems: "center",
															gap: "0.2rem",
														}}
													>
														<CheckCircle2 size={10} /> Siap sync
													</span>
												)}
											</div>
										</div>
									</div>
									<div
										style={{ display: "flex", gap: "0.4rem", flexShrink: 0 }}
									>
										<button
											onClick={() => setShowReauthConfirm(s.id)}
											disabled={reauthLoading}
											title="Re-authorize (refresh token & shop_cipher)"
											style={{
												padding: "0.35rem 0.65rem",
												background: "#f3f4f6",
												border: "1px solid #d1d5db",
												borderRadius: "0.375rem",
												fontSize: "0.75rem",
												fontWeight: "500",
												cursor: "pointer",
												display: "flex",
												alignItems: "center",
												gap: "0.3rem",
												color: "#374151",
											}}
										>
											<RefreshCw size={12} />
											Re-authorize
										</button>
										<button
											onClick={() => handleDelete(s.id)}
											title="Hapus shop"
											style={{
												padding: "0.35rem 0.5rem",
												background: "#fef2f2",
												border: "1px solid #fecaca",
												borderRadius: "0.375rem",
												fontSize: "0.75rem",
												cursor: "pointer",
												color: "#ef4444",
												display: "flex",
												alignItems: "center",
											}}
										>
											<Trash2 size={12} />
										</button>
									</div>
								</div>
							);
						})}
					</div>
				</div>
			)}

			{/* Sync Controls */}
			<div
				style={{
					background: "#fff",
					border: "1px solid #e5e7eb",
					borderRadius: "0.75rem",
					padding: "1rem 1.25rem",
					marginBottom: "1.5rem",
				}}
			>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						marginBottom: "0.75rem",
					}}
				>
					<h2
						style={{
							fontSize: "0.9rem",
							fontWeight: "700",
							color: "#374151",
							margin: 0,
						}}
					>
						Sync Controls
					</h2>
					{settings.length === 0 && (
						<button
							onClick={() => setShowAddForm(true)}
							style={{
								padding: "0.4rem 0.8rem",
								background: "#cc7030",
								color: "#fff",
								border: "none",
								borderRadius: "0.5rem",
								fontSize: "0.75rem",
								fontWeight: "600",
								cursor: "pointer",
							}}
						>
							<Link2
								size={14}
								style={{ marginRight: "0.3rem", verticalAlign: "middle" }}
							/>
							Connect TikTok
						</button>
					)}
				</div>

				<div
					style={{
						display: "flex",
						gap: "0.75rem",
						flexWrap: "wrap",
						alignItems: "center",
						marginBottom: "0.75rem",
					}}
				>
					<div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
						<label style={{ fontSize: "0.8rem", color: "#6b7280" }}>
							Start:
						</label>
						<input
							type="date"
							value={dateRange.start}
							onChange={(e) =>
								setDateRange((d) => ({ ...d, start: e.target.value }))
							}
							style={{
								padding: "0.4rem 0.6rem",
								border: "1px solid #d1d5db",
								borderRadius: "0.375rem",
								fontSize: "0.8rem",
							}}
						/>
						<label style={{ fontSize: "0.8rem", color: "#6b7280" }}>End:</label>
						<input
							type="date"
							value={dateRange.end}
							onChange={(e) =>
								setDateRange((d) => ({ ...d, end: e.target.value }))
							}
							style={{
								padding: "0.4rem 0.6rem",
								border: "1px solid #d1d5db",
								borderRadius: "0.375rem",
								fontSize: "0.8rem",
							}}
						/>
					</div>
				</div>

				<div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
					<button
						onClick={() => handleSync("orders")}
						disabled={syncing !== null || !activeShop}
						style={{
							padding: "0.5rem 1rem",
							background:
								syncing === "orders" || !activeShop ? "#e5e7eb" : "#f3f4f6",
							color:
								syncing === "orders" || !activeShop ? "#9ca3af" : "#374151",
							border: "1px solid #d1d5db",
							borderRadius: "0.5rem",
							fontSize: "0.8rem",
							fontWeight: "600",
							cursor:
								syncing !== null || !activeShop ? "not-allowed" : "pointer",
							display: "flex",
							alignItems: "center",
							gap: "0.4rem",
						}}
						title={!activeShop ? "Tidak ada shop aktif" : undefined}
					>
						{syncing === "orders" ? (
							<Loader2
								size={14}
								style={{ animation: "spin 1s linear infinite" }}
							/>
						) : (
							<RefreshCw size={14} />
						)}
						Sync Orders
					</button>
					<button
						onClick={() => handleSync("finance")}
						disabled={syncing !== null || !activeShop}
						style={{
							padding: "0.5rem 1rem",
							background:
								syncing === "finance" || !activeShop ? "#e5e7eb" : "#f3f4f6",
							color:
								syncing === "finance" || !activeShop ? "#9ca3af" : "#374151",
							border: "1px solid #d1d5db",
							borderRadius: "0.5rem",
							fontSize: "0.8rem",
							fontWeight: "600",
							cursor:
								syncing !== null || !activeShop ? "not-allowed" : "pointer",
							display: "flex",
							alignItems: "center",
							gap: "0.4rem",
						}}
						title={!activeShop ? "Tidak ada shop aktif" : undefined}
					>
						{syncing === "finance" ? (
							<Loader2
								size={14}
								style={{ animation: "spin 1s linear infinite" }}
							/>
						) : (
							<DollarSign size={14} />
						)}
						Sync Finance (Settlement)
					</button>
				</div>

				{/* Error/Success Result */}
				{syncResult && (
					<div
						style={{
							marginTop: "0.75rem",
							padding: "0.5rem 0.75rem",
							background: syncResult.type === "success" ? "#f0fdf4" : "#fef2f2",
							border: `1px solid ${syncResult.type === "success" ? "#86efac" : "#fecaca"}`,
							borderRadius: "0.5rem",
							fontSize: "0.8rem",
							color: syncResult.type === "success" ? "#166534" : "#991b1b",
							whiteSpace: "pre-wrap",
							wordBreak: "break-word",
						}}
					>
						{syncResult.type === "error" && (
							<AlertCircle
								size={14}
								style={{ verticalAlign: "middle", marginRight: "0.3rem" }}
							/>
						)}
						{syncResult.text.includes("(36009004)") ? (
							<>
								<strong>Error shop_id invalid</strong> — TikTok butuh
								re-authorization.
								<br />
								Klik tombol <strong>Re-authorize</strong> di atas untuk refresh
								token & dapatkan shop_cipher dari TikTok.
							</>
						) : syncResult.text.includes("(36009004)") ? null : (
							syncResult.text
						)}
					</div>
				)}
			</div>

			{/* Orders Table */}
			<div
				style={{
					background: "#fff",
					border: "1px solid #e5e7eb",
					borderRadius: "0.75rem",
					overflow: "hidden",
					marginBottom: "1.5rem",
				}}
			>
				<div
					style={{
						padding: "1rem 1.25rem",
						borderBottom: "1px solid #e5e7eb",
						background: "#f9fafb",
						display: "flex",
						alignItems: "center",
						gap: "0.5rem",
					}}
				>
					<ShoppingBag size={16} />
					<h2
						style={{
							fontSize: "0.9rem",
							fontWeight: "700",
							color: "#374151",
							margin: 0,
						}}
					>
						Synced Orders
					</h2>
				</div>
				{orders.length === 0 ? (
					<div
						style={{ padding: "2rem", textAlign: "center", color: "#9ca3af" }}
					>
						<ShoppingBag
							size={24}
							style={{ opacity: 0.3, margin: "0 auto 0.5rem" }}
						/>
						<p style={{ fontSize: "0.85rem" }}>
							Belum ada order tersync. Klik "Sync Orders" untuk import.
						</p>
					</div>
				) : (
					<div className="data-table">
						<table>
							<thead>
								<tr>
									<th>Order ID</th>
									<th>Status</th>
									<th>Payment</th>
									<th>Total</th>
									<th>Buyer</th>
									<th>Created</th>
								</tr>
							</thead>
							<tbody>
								{orders.map((o) => (
									<tr key={o.id}>
										<td
											style={{ fontSize: "0.75rem", fontFamily: "monospace" }}
										>
											{o.tiktok_order_id?.slice(0, 16)}...
										</td>
										<td>
											<span
												style={{
													padding: "0.15rem 0.5rem",
													borderRadius: "999px",
													fontSize: "0.75rem",
													fontWeight: "600",
													background: ["DELIVERED", "COMPLETED"].includes(
														o.order_status,
													)
														? "#f0fdf4"
														: "#fef9c3",
													color: ["DELIVERED", "COMPLETED"].includes(
														o.order_status,
													)
														? "#166534"
														: "#854d0e",
												}}
											>
												{o.order_status || "-"}
											</span>
										</td>
										<td>
											<span
												style={{
													padding: "0.15rem 0.5rem",
													borderRadius: "999px",
													fontSize: "0.75rem",
													fontWeight: "600",
													background:
														o.payment_status === "PAID" ? "#f0fdf4" : "#fef9c3",
													color:
														o.payment_status === "PAID" ? "#166534" : "#854d0e",
												}}
											>
												{o.payment_status || "-"}
											</span>
										</td>
										<td style={{ fontWeight: "700" }}>
											{formatRp(Number(o.total_amount || 0))}
										</td>
										<td>{o.buyer_name || "-"}</td>
										<td style={{ fontSize: "0.8rem", color: "#6b7280" }}>
											{new Date(o.created_at).toLocaleDateString("id-ID")}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>

			{/* Statements Table */}
			<div
				style={{
					background: "#fff",
					border: "1px solid #e5e7eb",
					borderRadius: "0.75rem",
					overflow: "hidden",
				}}
			>
				<div
					style={{
						padding: "1rem 1.25rem",
						borderBottom: "1px solid #e5e7eb",
						background: "#f9fafb",
						display: "flex",
						alignItems: "center",
						gap: "0.5rem",
					}}
				>
					<DollarSign size={16} />
					<h2
						style={{
							fontSize: "0.9rem",
							fontWeight: "700",
							color: "#374151",
							margin: 0,
						}}
					>
						Settlements
					</h2>
				</div>
				{statements.length === 0 ? (
					<div
						style={{ padding: "2rem", textAlign: "center", color: "#9ca3af" }}
					>
						<DollarSign
							size={24}
							style={{ opacity: 0.3, margin: "0 auto 0.5rem" }}
						/>
						<p style={{ fontSize: "0.85rem" }}>
							Belum ada settlement tersync. Klik "Sync Finance" untuk import.
						</p>
					</div>
				) : (
					<div className="data-table">
						<table>
							<thead>
								<tr>
									<th>Statement ID</th>
									<th>Type</th>
									<th>Amount</th>
									<th>Status</th>
									<th>Period</th>
									<th>Piutang</th>
								</tr>
							</thead>
							<tbody>
								{statements.map((st) => (
									<tr key={st.id}>
										<td
											style={{ fontSize: "0.75rem", fontFamily: "monospace" }}
										>
											{st.statement_id?.slice(0, 16)}...
										</td>
										<td>{st.statement_type || "-"}</td>
										<td style={{ fontWeight: "700", color: "#16a34a" }}>
											{formatRp(Number(st.total_amount || 0))}
										</td>
										<td>
											<span
												style={{
													padding: "0.15rem 0.5rem",
													borderRadius: "999px",
													fontSize: "0.75rem",
													fontWeight: "600",
													background: ["SUCCESS", "PAID"].includes(st.status)
														? "#f0fdf4"
														: "#fef9c3",
													color: ["SUCCESS", "PAID"].includes(st.status)
														? "#166534"
														: "#854d0e",
												}}
											>
												{st.status || "-"}
											</span>
										</td>
										<td style={{ fontSize: "0.8rem", color: "#6b7280" }}>
											{st.start_date
												? new Date(st.start_date).toLocaleDateString("id-ID")
												: "-"}
										</td>
										<td>
											{st.piutang_id ? (
												<a
													href={`/finance/piutang`}
													style={{
														color: "#cc7030",
														fontSize: "0.8rem",
														textDecoration: "none",
													}}
												>
													✓ Linked
												</a>
											) : (
												<span style={{ color: "#9ca3af", fontSize: "0.8rem" }}>
													-
												</span>
											)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>

			{/* Add Shop Modal */}
			{showAddForm && (
				<div
					style={{
						position: "fixed",
						inset: 0,
						background: "rgba(0,0,0,0.4)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						zIndex: 1000,
					}}
					onClick={() => setShowAddForm(false)}
				>
					<div
						style={{
							background: "#fff",
							borderRadius: "0.75rem",
							padding: "1.5rem",
							width: "90%",
							maxWidth: 480,
							boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
						}}
						onClick={(e) => e.stopPropagation()}
					>
						<h3
							style={{
								fontSize: "1rem",
								fontWeight: "700",
								margin: "0 0 1rem",
							}}
						>
							{settings.length > 0
								? "Add Another TikTok Shop"
								: "Connect TikTok Shop"}
						</h3>

						<form onSubmit={handleSave}>
							<div style={{ marginBottom: "0.75rem" }}>
								<label
									style={{
										display: "block",
										fontSize: "0.8rem",
										fontWeight: "600",
										marginBottom: "0.3rem",
									}}
								>
									Shop Name
								</label>
								<input
									value={form.shop_name}
									onChange={(e) =>
										setForm((f) => ({ ...f, shop_name: e.target.value }))
									}
									placeholder="TikTok Shop Saya"
									style={{
										width: "100%",
										padding: "0.6rem",
										border: "1px solid #d1d5db",
										borderRadius: "0.5rem",
										fontSize: "0.85rem",
									}}
								/>
							</div>
							<div style={{ marginBottom: "0.75rem" }}>
								<label
									style={{
										display: "block",
										fontSize: "0.8rem",
										fontWeight: "600",
										marginBottom: "0.3rem",
									}}
								>
									App Key *{" "}
									<span style={{ fontWeight: "400", color: "#9ca3af" }}>
										(dari TikTok Partner Center)
									</span>
								</label>
								<input
									value={form.app_key}
									required
									onChange={(e) =>
										setForm((f) => ({ ...f, app_key: e.target.value }))
									}
									placeholder="Your TikTok Shop App Key"
									style={{
										width: "100%",
										padding: "0.6rem",
										border: "1px solid #d1d5db",
										borderRadius: "0.5rem",
										fontSize: "0.85rem",
									}}
								/>
							</div>
							<div style={{ marginBottom: "0.75rem" }}>
								<label
									style={{
										display: "block",
										fontSize: "0.8rem",
										fontWeight: "600",
										marginBottom: "0.3rem",
									}}
								>
									App Secret *{" "}
									<span style={{ fontWeight: "400", color: "#9ca3af" }}>
										(dari TikTok Partner Center)
									</span>
								</label>
								<input
									value={form.app_secret}
									required
									onChange={(e) =>
										setForm((f) => ({ ...f, app_secret: e.target.value }))
									}
									type="password"
									placeholder="Your TikTok Shop App Secret"
									style={{
										width: "100%",
										padding: "0.6rem",
										border: "1px solid #d1d5db",
										borderRadius: "0.5rem",
										fontSize: "0.85rem",
									}}
								/>
							</div>
							<div style={{ marginBottom: "0.5rem" }}>
								<label
									style={{
										display: "flex",
										alignItems: "center",
										gap: "0.3rem",
										fontSize: "0.8rem",
										fontWeight: "600",
										marginBottom: "0.3rem",
									}}
								>
									Shop Cipher{" "}
									<Info
										size={12}
										style={{ color: "#9ca3af", cursor: "help" }}
										data-tip="Akan otomatis terisi setelah OAuth"
									/>
									<span style={{ fontWeight: "400", color: "#9ca3af" }}>
										(otomatis dari TikTok)
									</span>
								</label>
								<input
									value={form.shop_cipher}
									onChange={(e) =>
										setForm((f) => ({ ...f, shop_cipher: e.target.value }))
									}
									placeholder="Nanti otomatis terisi"
									disabled
									style={{
										width: "100%",
										padding: "0.6rem",
										border: "1px solid #d1d5db",
										borderRadius: "0.5rem",
										fontSize: "0.85rem",
										background: "#f9fafb",
										color: "#9ca3af",
									}}
								/>
							</div>
							<div
								style={{
									display: "flex",
									gap: "0.5rem",
									justifyContent: "flex-end",
								}}
							>
								<button
									type="button"
									onClick={() => setShowAddForm(false)}
									style={{
										padding: "0.5rem 1rem",
										background: "#f3f4f6",
										border: "1px solid #d1d5db",
										borderRadius: "0.5rem",
										fontSize: "0.85rem",
										cursor: "pointer",
									}}
								>
									Cancel
								</button>
								<button
									type="submit"
									disabled={saving}
									style={{
										padding: "0.5rem 1.25rem",
										background: "#cc7030",
										color: "#fff",
										border: "none",
										borderRadius: "0.5rem",
										fontSize: "0.85rem",
										fontWeight: "600",
										cursor: saving ? "not-allowed" : "pointer",
									}}
								>
									{saving ? "Menyimpan..." : "Save & Connect"}
								</button>
							</div>
						</form>

						<div
							style={{
								marginTop: "1rem",
								padding: "0.75rem",
								background: "#f0f9ff",
								border: "1px solid #93c5fd",
								borderRadius: "0.5rem",
								fontSize: "0.75rem",
								color: "#1e40af",
							}}
						>
							<strong>Langkah-langkah:</strong>
							<ol
								style={{
									margin: "0.3rem 0 0",
									paddingLeft: "1rem",
									lineHeight: 1.6,
								}}
							>
								<li>
									Buka{" "}
									<a
										href="https://partner.tiktokshop.com"
										target="_blank"
										style={{ color: "#cc7030" }}
										rel="noopener"
									>
										TikTok Partner Center
									</a>
								</li>
								<li>Buat aplikasi → dapatkan App Key & App Secret</li>
								<li>
									Set redirect URL:{" "}
									<code
										style={{
											background: "#e0e7ff",
											padding: "0.1rem 0.3rem",
											borderRadius: "0.25rem",
										}}
									>
										https://kjhomedecor.com/api/tiktok/auth
									</code>
								</li>
								<li>Isi App Key & Secret, klik "Save & Connect"</li>
							</ol>
						</div>
					</div>
				</div>
			)}

			{/* Re-authorize Confirmation Modal */}
			{showReauthConfirm && (
				<div
					style={{
						position: "fixed",
						inset: 0,
						background: "rgba(0,0,0,0.4)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						zIndex: 1000,
					}}
					onClick={() => setShowReauthConfirm(null)}
				>
					<div
						style={{
							background: "#fff",
							borderRadius: "0.75rem",
							padding: "1.5rem",
							width: "90%",
							maxWidth: 400,
							boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
						}}
						onClick={(e) => e.stopPropagation()}
					>
						<h3
							style={{
								fontSize: "1rem",
								fontWeight: "700",
								margin: "0 0 0.5rem",
							}}
						>
							Re-authorize Shop?
						</h3>
						<p
							style={{
								fontSize: "0.85rem",
								color: "#6b7280",
								margin: "0 0 0.25rem",
							}}
						>
							Ini akan membuka halaman OAuth TikTok untuk refresh token &
							mendownload shop_cipher.
						</p>
						<p
							style={{
								fontSize: "0.8rem",
								color: "#d97706",
								margin: "0 0 1rem",
								background: "#fffbeb",
								padding: "0.5rem",
								borderRadius: "0.375rem",
							}}
						>
							<AlertCircle
								size={12}
								style={{ verticalAlign: "middle", marginRight: "0.3rem" }}
							/>
							Pastikan IP server sudah di-whitelist di TikTok Partner Center.
						</p>
						<div
							style={{
								display: "flex",
								gap: "0.5rem",
								justifyContent: "flex-end",
							}}
						>
							<button
								onClick={() => setShowReauthConfirm(null)}
								style={{
									padding: "0.5rem 1rem",
									background: "#f3f4f6",
									border: "1px solid #d1d5db",
									borderRadius: "0.5rem",
									fontSize: "0.85rem",
									cursor: "pointer",
								}}
							>
								Batal
							</button>
							<button
								onClick={() => handleReauthorize(showReauthConfirm)}
								disabled={reauthLoading}
								style={{
									padding: "0.5rem 1.25rem",
									background: "#cc7030",
									color: "#fff",
									border: "none",
									borderRadius: "0.5rem",
									fontSize: "0.85rem",
									fontWeight: "600",
									cursor: reauthLoading ? "not-allowed" : "pointer",
								}}
							>
								{reauthLoading ? "Loading..." : "Ya, Re-authorize"}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
