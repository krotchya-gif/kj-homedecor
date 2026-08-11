export type Role = 'admin' | 'gudang' | 'penjahit' | 'finance' | 'installer' | 'owner' | 'surveyor' | 'laundry'

export type OrderSource = 'shopee' | 'tokopedia' | 'tiktok' | 'offline' | 'landing_page'

export type OrderClassification = 'kirim' | 'pasang'

export type OrderStatus =
  | 'new'
  | 'sorted'
  | 'payment_ok'
  | 'production'
  | 'steam'
  | 'ready'
  | 'packed'
  | 'shipped'
  | 'scheduled' // alur pasang — input jadwal pasang
  | 'installing' // alur pasang — sedang dipasang
  | 'done'
  | 'returned'
  | 'cancelled'

export type PaymentStatus = 'pending' | 'partial' | 'paid'

export type ProductionStatus = 'waiting' | 'in_progress' | 'done'

export type StockLocation = 'gudang' | 'toko'

export interface User {
  id: string
  name: string
  email?: string
  role: Role
  status: 'active' | 'inactive'
  created_at: string
}

export interface Customer {
  id: string
  name: string
  phone: string
  address?: string
  notes?: string
  created_at: string
}

export interface Category {
  id: string
  name: string
  slug: string
  image_url?: string
  parent_id?: string
  created_at: string
}

export interface Product {
  id: string
  name: string
  category_id: string
  sku?: string
  kode_kain?: string
  description?: string
  product_type?: 'gorden' | 'perabot'
  price: number
  cost?: number
  stock_toko: number
  is_custom: boolean
  is_featured: boolean
  images: string[]
  hpp_calculated?: number
  hpp_manual?: number | null
  harga_jual?: number
  created_at: string
  category?: Category
  // Gorden style variants: smokring, kaitan, kupu-kupu, romanshade
  style_variants?: string[]
  // Colors for smokring specifically
  smokring_colors?: string[]
  // Perabot color variants (free input by admin)
  color_variants?: string[]
  // Shipping dimensions
  dimension_p?: number
  dimension_l?: number
  dimension_t?: number
  weight?: number
  // Visibility: true = shown on landing page catalog, false = internal/admin only
  is_catalog_visible?: boolean
}

export interface PreparationChecklistItem {
  key: string
  label: string
  done: boolean
  notes: string
}

export interface Material {
  id: string
  name: string
  unit: 'meter' | 'pcs' | 'set' | 'glb' | 'kg'
  cost_per_unit: number
  stock_gudang: number
  stock_toko: number
  min_stock_level: number
  supplier_id?: string
  created_at: string
  supplier?: Supplier
}

export interface Supplier {
  id: string
  name: string
  contact?: string | null
  contact_person?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  notes?: string | null
  created_at?: string
}

export interface BOM {
  id: string
  product_id: string
  material_id: string
  qty_per_unit: number
  material?: Material
}

export interface Order {
  id: string
  order_number?: string // human-readable: ORD-2026-0001
  order_id_external?: string
  source: OrderSource
  customer_id: string
  classification: OrderClassification
  status: OrderStatus
  total_amount: number
  dp_amount: number
  lunas_amount: number
  shipping_cost?: number
  payment_status: PaymentStatus
  notes?: string
  return_reason?: string
  tracking_number?: string
  courier?: string
  packed_at?: string
  packed_by?: string
  shipped_at?: string
  shipped_by?: string
  installed_at?: string
  installed_by?: string
  scheduled_installation_date?: string // untuk alur pasang (input jadwal)
  created_at: string
  customer?: Customer
  order_items?: OrderItem[]
  survey?: Survey | null
}

// Aplikasi Survey Gorden (SRS 2026-08-03) — tabel: surveys, survey_rooms, survey_room_photos
export interface SurveyRoomPhoto {
  id: string
  url: string
  sort_order?: number
}

export interface SurveyRoom {
  id: string
  survey_id: string
  room_name: string
  width_cm?: number
  height_cm?: number
  model_gorden?: string
  fabric_name?: string
  fabric_photo?: string
  vitras_name?: string
  vitras_photo?: string
  rel_gorden?: string
  rel_vitras?: string
  hook?: string
  notes?: string
  sort_order?: number
  photos?: SurveyRoomPhoto[]
}

export interface Survey {
  id: string
  survey_number?: string
  client_name: string
  client_address?: string
  survey_date: string
  surveyor_id?: string
  status: 'draft' | 'tersimpan' | 'diproses' | 'selesai'
  gps_lat?: number
  gps_lng?: number
  notes?: string
  signature?: string | null
  signature_name?: string | null
  surveyor?: { name?: string } | null
  created_at: string
  rooms?: SurveyRoom[]
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  item_type?: 'gorden' | 'perabot' | 'laundry'
  linked_laundry_id?: string
  qty: number
  price: number
  size?: string
  custom_specs?: string
  meter_gorden?: number
  meter_roman?: number
  poni_lurus?: boolean
  poni_gel?: boolean
  // New unified meter + style for vitras/kupu-kupu
  meter?: number
  style_type?: string
  smokring_color?: string
  // Perabot variants
  variant_size?: string
  variant_color?: string
  // Shipping dimensions
  dimension_p?: number
  dimension_l?: number
  dimension_t?: number
  weight?: number
  ready: boolean
  created_at: string
  product?: Product & { category?: { name: string } | null }
}

export interface ProductionJob {
  id: string
  order_id: string
  penjahit_id: string
  status: ProductionStatus
  meter_gorden?: number
  meter_vitras?: number
  meter_roman?: number
  meter_kupu_kupu?: number
  poni_lurus?: boolean
  poni_gel?: boolean
  started_at?: string
  completed_at?: string
  // Steam revision tracking (migration 042)
  revision_of?: string
  revision_round?: number
  revision_reason?: string
  order?: Order
  penjahit?: User
}

export interface Banner {
  id: string
  image_url: string
  sequence: number
  is_active: boolean
  created_at: string
}

export interface PortfolioPost {
  id: string
  title: string
  content: string
  images: string[]
  created_at: string
  updated_at: string
}

export interface InstallBooking {
  id: string
  order_id?: string | null
  customer_id?: string | null
  customer_name?: string
  customer_phone?: string
  address?: string
  date?: string // legacy field (deprecated)
  time?: string // legacy field (deprecated)
  scheduled_date?: string // real DB column
  scheduled_time?: string // real DB column
  type: 'survey' | 'pasang'
  status: 'pending' | 'scheduled' | 'in_progress' | 'done' | 'revision' | 'cancelled'
  installer_id?: string
  notes?: string
  revision_reason?: string // (migration 034)
  revision_photos?: string[] // (migration 034)
  customer?: Customer
  installer?: User
  order?: Order | null
}

export interface Payment {
  id: string
  order_id: string
  type: 'dp' | 'lunas' | 'refund'
  amount: number
  date: string
  verified_by?: string
  verified_at?: string
  notes?: string
  xendit_payment_id?: string // unique dedup key (migration 043)
}

export interface LowStockAlert {
  id: string
  material_id: string
  current_qty: number
  min_qty: number
  created_at: string
  resolved_at?: string
  material?: Material
}

export interface PurchaseRequest {
  id: string
  material_id: string
  qty: number
  estimated_cost: number
  status: 'pending' | 'approved' | 'rejected'
  created_by: string
  approved_by?: string
  created_at: string
  material?: Material
}

export interface LemburRecord {
  id: string
  staff_name: string
  date: string
  time_start: string
  time_end: string
  total_hours: number
  notes?: string
  created_at: string
}

export interface QCRecord {
  id: string
  order_id: string
  order_item_id?: string
  result: 'pass' | 'fail'
  fail_reason?: string
  photo_evidence?: string[]
  revision_notes?: string
  checked_by: string
  checked_at: string
}

export interface Return {
  id: string
  order_id: string
  order_item_id?: string
  reason: string
  condition: 'good' | 'damaged'
  qty: number
  refund_amount: number
  refund_status: 'pending' | 'approved' | 'rejected' | 'completed'
  approved_by?: string
  created_by?: string
  resolved_at?: string
  photo_evidence?: string[]
  notes?: string
  created_at: string
}

export interface SteamJob {
  id: string
  order_id: string
  production_job_id?: string
  status: 'pending' | 'done' | 'revision'
  result?: 'pass' | 'fail'
  fail_reason?: string
  notes?: string
  checked_by?: string
  completed_at?: string
  created_at: string
}

export interface LaundryRecord {
  id: string
  date: string
  customer_name: string
  kg: number
  meter: number
  description?: string
  created_by?: string
  created_at: string
}

export interface LaundryOrder {
  id: string
  order_id?: string // links to parent order when created from order item
  customer_name: string
  customer_phone?: string
  kg: number
  meter?: number
  description?: string
  status: 'pending' | 'in_progress' | 'done'
  assigned_to?: string
  received_at: string
  completed_at?: string
  created_by?: string
  created_at: string
  kg_actual?: number
  reported_by?: string
  reported_at?: string
}

export interface LaundryRate {
  id: string
  name: string
  rate_per_kg: number
  is_active: boolean
  updated_at: string
}

export interface LaundryPayroll {
  id: string
  staff_id: string
  period_month: number
  period_year: number
  total_kg: number
  total_rate: number
  total_amount: number
  status: 'pending' | 'paid'
  created_at: string
}

export const RATE_PER_METER = {
  gorden: 5000,
  vitras: 3000,
  roman: 7000,
  kupu_kupu: 6000
} as const

// Style rates per meter for gorden models
export const STYLE_RATES = {
  smokring: 5000,
  kaitan: 4000,
  'kupu-kupu': 6000,
  romanshade: 7000
} as const

// Smokring color options
export const SMOKRING_COLORS = ['Hitam', 'Putih', 'Coklat', 'Silver', 'Gold'] as const

// Gorden style options
export const GORDEN_STYLES = ['smokring', 'kaitan', 'kupu-kupu', 'romanshade'] as const

export const SOURCE_LABELS: Record<OrderSource, string> = {
  shopee: 'Shopee',
  tokopedia: 'Tokopedia',
  tiktok: 'TikTok',
  offline: 'Offline',
  landing_page: 'Landing Page'
}

export const STATUS_LABELS: Record<OrderStatus, string> = {
  new: 'Baru',
  sorted: 'Sudah Disortir',
  payment_ok: 'Cek Bayar',
  production: 'Produksi',
  steam: 'Steam/QC',
  ready: 'Siap',
  packed: 'Dikemas',
  shipped: 'Terkirim',
  scheduled: 'Terjadwal Pasang', //
  installing: 'Sedang Dipasang', //
  done: 'Selesai',
  returned: 'Return',
  cancelled: 'Batal'
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Belum Bayar',
  partial: 'DP',
  paid: 'Lunas'
}

export interface OrderProgressPhoto {
  id: string
  order_id: string
  stage: string
  photo_url: string
  notes?: string
  uploaded_by?: string
  created_at: string
}


// Keuangan — jurnal & garis jurnal (dipakai cash/income/expense/transfer/mutation/daftar-jurnal/accounts)
export interface JournalLine {
  id: string
  journal_entry_id?: string
  account_id?: string
  account?: { id: string; name?: string; code?: string } | null
  debit: number
  credit: number
  description?: string
}

export interface JournalEntry {
  id: string
  entry_number?: string
  date: string
  entry_date?: string
  description?: string
  notes?: string
  reference_type?: string
  debit?: number
  credit?: number
  amount?: number
  created_at?: string
  lines?: JournalLine[] | null
}
