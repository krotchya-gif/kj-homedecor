export type Role =
  | "admin"
  | "gudang"
  | "penjahit"
  | "finance"
  | "installer"
  | "owner";

export type OrderSource =
  | "shopee"
  | "tokopedia"
  | "tiktok"
  | "offline"
  | "landing_page";

export type OrderClassification = "kirim" | "pasang";

export type OrderStatus =
  | "new"
  | "sorted"
  | "payment_ok"
  | "production"
  | "ready"
  | "done"
  | "returned"
  | "cancelled";

export type PaymentStatus = "pending" | "partial" | "paid";

export type ProductionStatus = "waiting" | "in_progress" | "done";

export type StockLocation = "gudang" | "toko";

export interface User {
  id: string;
  name: string;
  email?: string;
  role: Role;
  status: "active" | "inactive";
  created_at: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address?: string;
  notes?: string;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  image_url?: string;
  parent_id?: string;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  category_id: string;
  sku?: string;
  kode_kain?: string;
  price: number;
  cost?: number;
  stock_toko: number;
  is_custom: boolean;
  is_featured: boolean;
  images: string[];
  hpp_calculated?: number;
  hpp_manual?: number | null;
  harga_jual?: number;
  created_at: string;
  category?: Category;
}

export interface Material {
  id: string;
  name: string;
  unit: "meter" | "pcs" | "set" | "glb" | "kg";
  cost_per_unit: number;
  stock_gudang: number;
  stock_toko: number;
  min_stock_level: number;
  supplier_id?: string;
  created_at: string;
  supplier?: Supplier;
}

export interface Supplier {
  id: string;
  name: string;
  contact?: string;
  address?: string;
  created_at: string;
}

export interface BOM {
  id: string;
  product_id: string;
  material_id: string;
  qty_per_unit: number;
  material?: Material;
}

export interface Order {
  id: string;
  order_id_external?: string;
  source: OrderSource;
  customer_id: string;
  classification: OrderClassification;
  status: OrderStatus;
  total_amount: number;
  dp_amount: number;
  lunas_amount: number;
  shipping_cost?: number;
  payment_status: PaymentStatus;
  notes?: string;
  return_reason?: string;
  shipped_at?: string;
  installed_at?: string;
  created_at: string;
  customer?: Customer;
  order_items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  qty: number;
  price: number;
  size?: string;
  custom_specs?: string;
  meter_gorden?: number;
  meter_vitras?: number;
  meter_roman?: number;
  meter_kupu_kupu?: number;
  poni_lurus?: boolean;
  poni_gel?: boolean;
  smokering_color?: string;
  ready: boolean;
  created_at: string;
  product?: Product;
}

export interface ProductionJob {
  id: string;
  order_id: string;
  penjahit_id: string;
  status: ProductionStatus;
  meter_gorden?: number;
  meter_vitras?: number;
  meter_roman?: number;
  meter_kupu_kupu?: number;
  poni_lurus?: boolean;
  poni_gel?: boolean;
  started_at?: string;
  completed_at?: string;
  order?: Order;
  penjahit?: User;
}

export interface Banner {
  id: string;
  image_url: string;
  sequence: number;
  is_active: boolean;
  created_at: string;
}

export interface PortfolioPost {
  id: string;
  title: string;
  content: string;
  images: string[];
  created_at: string;
  updated_at: string;
}

export interface InstallBooking {
  id: string;
  order_id: string;
  customer_id: string;
  address: string;
  date: string;
  time: string;
  type: "survey" | "pasang";
  status: "scheduled" | "done" | "cancelled";
  installer_id?: string;
  notes?: string;
  customer?: Customer;
  installer?: User;
}

export interface Payment {
  id: string;
  order_id: string;
  type: "dp" | "lunas" | "refund";
  amount: number;
  date: string;
  verified_by?: string;
  verified_at?: string;
}

export interface LowStockAlert {
  id: string;
  material_id: string;
  current_qty: number;
  min_qty: number;
  created_at: string;
  resolved_at?: string;
  material?: Material;
}

export interface PurchaseRequest {
  id: string;
  material_id: string;
  qty: number;
  estimated_cost: number;
  status: "pending" | "approved" | "rejected";
  created_by: string;
  approved_by?: string;
  created_at: string;
  material?: Material;
}

export interface LemburRecord {
  id: string;
  staff_name: string;
  date: string;
  time_start: string;
  time_end: string;
  total_hours: number;
  notes?: string;
  created_at: string;
}

export interface QCRecord {
  id: string;
  order_id: string;
  order_item_id?: string;
  result: "pass" | "fail";
  fail_reason?: string;
  photo_evidence?: string[];
  revision_notes?: string;
  checked_by: string;
  checked_at: string;
}

export interface Return {
  id: string;
  order_id: string;
  order_item_id?: string;
  reason: string;
  condition: "good" | "damaged";
  qty: number;
  refund_amount: number;
  refund_status: "pending" | "approved" | "rejected" | "completed";
  approved_by?: string;
  created_by?: string;
  resolved_at?: string;
  photo_evidence?: string[];
  notes?: string;
  created_at: string;
}

export const RATE_PER_METER = {
  gorden: 5000,
  vitras: 3000,
  roman: 7000,
  kupu_kupu: 6000,
} as const;

export const SOURCE_LABELS: Record<OrderSource, string> = {
  shopee: "Shopee",
  tokopedia: "Tokopedia",
  tiktok: "TikTok",
  offline: "Offline",
  landing_page: "Landing Page",
};

export const STATUS_LABELS: Record<OrderStatus, string> = {
  new: "Baru",
  sorted: "Sudah Disortir",
  payment_ok: "Pembayaran OK",
  production: "Produksi",
  ready: "Siap",
  done: "Selesai",
  returned: "Return",
  cancelled: "Batal",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: "Belum Bayar",
  partial: "DP",
  paid: "Lunas",
};
