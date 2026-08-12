'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { ORDER_STAGES_BY_CLASSIFICATION, getNextStage, getNextStageButtonLabel, isPhotoRequired } from '@/lib/orders'
import {
  ArrowLeft,
  ChevronRight,
  Plus,
  Trash2,
  CheckCircle2,
  Loader2,
  Upload,
  X as XIcon,
  ImageIcon,
  FileText,
  Package,
  Clock,
  AlertTriangle,
  Camera,
  Truck,
  Calendar as CalendarIcon
} from 'lucide-react'
import Link from 'next/link'
import type { Order, OrderItem, Product, Customer, PreparationChecklistItem, OrderStatus } from '@/types'
import { STATUS_LABELS, PAYMENT_STATUS_LABELS, SOURCE_LABELS, GORDEN_STYLES, SMOKRING_COLORS } from '@/types'
import { Material, Survey } from '@/types'

import { uploadToLocal } from '@/lib/upload'
import { Lightbox, LightboxGallery } from '@/components/ui/Lightbox'
import { Modal } from '@/components/ui/Modal'
import { generateInvoicePDF, generatePackingListPDF, generateFakturPDF, generateSuratJalanPDF } from '@/lib/invoice'
import { useToast } from '@/components/ui/Toast'
import { createSimpleJournal } from '@/utils/journal/create'
import { canRoleAdvanceNext, getResponsibleRoles, parseGordenMeter, STATUS_COLORS, PAYMENT_COLORS } from '@/lib/order-detail'
import type { ItemType, OrderLog, OrderPhoto, BomRow, MeterRow, SurveyCand } from '@/lib/order-detail'
import OrderActivityLog from '@/components/orders/OrderActivityLog'

// Pipeline: ORDER_STAGES_BY_CLASSIFICATION (src/lib/orders.ts) = single source of truth.
// STATUS_COLORS / PAYMENT_COLORS / ROLE_NEXT_ALLOWED / canRoleAdvanceNext /
// getResponsibleRoles / parseGordenMeter / types — di-extract ke src/lib/order-detail.ts
// (refactor 2026-08-12, Stage 1 — logika murni, bisa di-unit-test).

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

export default function OrderDetailPage() {
  const { toast } = useToast()
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [order, setOrder] = useState<Order | null>(null)
  const [items, setItems] = useState<OrderItem[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [orderLogs, setOrderLogs] = useState<OrderLog[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [currentUserRole, setCurrentUserRole] = useState<string>('admin')

  // BOM data for material suggestion
  const [boms, setBoms] = useState<BomRow[]>([])
  const [materials, setMaterials] = useState<Material[]>([])

  // item type selector
  const [itemType, setItemType] = useState<ItemType>('gorden')

  // laundry rate from DB
  const [laundryRate, setLaundryRate] = useState<number>(0)

  // item form — gorden
  const [itemForm, setItemForm] = useState({
    product_id: '',
    qty: '1',
    price: '',
    size: '',
    meter_gorden: '0',
    meter: '0',
    poni_lurus: false,
    poni_gel: false,
    // style variants
    style_type: '',
    smokring_color: '',
    // perabot
    variant_color: '',
    dimension_p: '',
    dimension_l: '',
    dimension_t: '',
    weight: '',
    // laundry
    customer_name: '',
    customer_phone: '',
    kg: '0',
    meter_laundry: '0',
    description: ''
  })
  const [savingItem, setSavingItem] = useState(false)
  const [searchProduct, setSearchProduct] = useState('')

  // Progress photos
  const [orderPhotos, setOrderPhotos] = useState<OrderPhoto[]>([])
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxPhotos, setLightboxPhotos] = useState<string[]>([])
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [photoPopup, setPhotoPopup] = useState<{ stage: string; photos: string[] } | null>(null)

  // Photo upload modal for status change
  const [showPhotoModal, setShowPhotoModal] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<string | null>(null)
  const [progressPhotos, setProgressPhotos] = useState<string[]>([])
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  // BUG-007 fix (2026-08-11): Jadwalkan Pasang — assign installer langsung dari order detail
  const [installers, setInstallers] = useState<{ id: string; name: string }[]>([])
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [scheduling, setScheduling] = useState(false)
  const [scheduleForm, setScheduleForm] = useState({ date: '', time: '', installer_id: '' })
  const [orderBooking, setOrderBooking] = useState<{
    id: string
    status: string
    installer_id?: string | null
    installer?: { name?: string } | null
    scheduled_date?: string | null
    scheduled_time?: string | null
  } | null>(null)
  // survey link (fitur "hasil survey masuk invoice")
  const [surveyLinkOpen, setSurveyLinkOpen] = useState(false)
  const [surveyCandidates, setSurveyCandidates] = useState<SurveyCand[]>([])
  const [surveyLoading, setSurveyLoading] = useState(false)
  const [showCancelForm, setShowCancelForm] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [showReturnForm, setShowReturnForm] = useState(false)
  const [returnForm, setReturnForm] = useState({
    item_id: '',
    reason: '',
    condition: 'good' as 'good' | 'damaged',
    qty: '1',
    refund_amount: ''
  })

  // Payment form
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [paymentForm, setPaymentForm] = useState({ type: 'dp' as 'dp' | 'lunas', amount: '' })
  const [savingPayment, setSavingPayment] = useState(false)

  // Preparation checklist
  const [checklist, setChecklist] = useState<PreparationChecklistItem[]>([])
  const DEFAULT_CHECKLIST: PreparationChecklistItem[] = [
    { key: 'besi', label: 'Besi', done: false, notes: '' },
    { key: 'endcup_rollet', label: 'Endcup Rolet', done: false, notes: '' },
    { key: 'tutup_vitrase', label: 'Tutup Vitrase', done: false, notes: '' },
    { key: 'braket', label: 'Braket', done: false, notes: '' },
    { key: 'hook', label: 'Hook', done: false, notes: '' },
    { key: 'roda', label: 'Roda', done: false, notes: '' }
  ]

  async function load() {
    setLoading(true)
    // Fetch current user role for UI guard on action buttons
    const {
      data: { user }
    } = await supabase.auth.getUser()
    if (user) {
      const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single()
      if (userData) setCurrentUserRole(userData.role)
    }
    const [orderRes, itemsRes, prodsRes, logsRes, checklistRes, photosRes, bomsRes, matsRes] = await Promise.all([
      supabase
        .from('orders')
        .select(
          '*, customer:customers(name,phone,address), survey:surveys(*, surveyor:users(name), rooms:survey_rooms(*, photos:survey_room_photos(url, sort_order)))'
        )
        .eq('id', id)
        .single(),
      supabase.from('order_items').select('*, product:products(name,sku)').eq('order_id', id),
      supabase.from('products').select('id,name,sku,price').order('name'),
      supabase
        .from('order_logs')
        .select('*, staff:users(name)')
        .eq('order_id', id)
        .order('created_at', { ascending: true }),
      supabase.from('order_preparation_checklists').select('items').eq('order_id', id).single(),
      supabase.from('order_progress_photos').select('*').eq('order_id', id).order('created_at', { ascending: true }),
      supabase.from('bom').select('*, material:materials(name,unit,cost_per_unit,stock_gudang,min_stock_level)'),
      supabase.from('materials').select('id,name,unit,stock_gudang,min_stock_level').order('name')
    ])
    setOrder(orderRes.data as Order)
    setItems((itemsRes.data as OrderItem[]) ?? [])
    setProducts((prodsRes.data as Product[]) ?? [])
    setOrderLogs((logsRes.data ?? []) as OrderLog[])
    setOrderPhotos((photosRes.data ?? []) as OrderPhoto[])
    setBoms((bomsRes.data ?? []) as BomRow[])
    setMaterials((matsRes.data ?? []) as Material[])

    // BUG-007 fix: load installer list (untuk dropdown jadwal pasang)
    const [{ data: installerRes }, { data: bookingRes }] = await Promise.all([
      supabase.from('users').select('id, name').eq('role', 'installer').eq('status', 'active'),
      supabase
        .from('install_bookings')
        .select('id, status, installer_id, installer:users(name), scheduled_date, scheduled_time')
        .eq('order_id', id)
        .in('status', ['pending', 'scheduled', 'in_progress'])
        .maybeSingle()
    ])
    setInstallers((installerRes ?? []) as { id: string; name: string }[])
    setOrderBooking((bookingRes as typeof orderBooking) ?? null)
    // Init checklist if not exists
    if (checklistRes.data) {
      setChecklist(checklistRes.data.items as PreparationChecklistItem[])
    } else {
      const { error: initErr } = await supabase.from('order_preparation_checklists').insert({ order_id: id, items: DEFAULT_CHECKLIST })
      if (initErr) { console.error('Gagal init checklist:', initErr) }
      setChecklist(DEFAULT_CHECKLIST)
    }
    setLoading(false)
  }

  async function updateChecklistItem(key: string, field: 'done' | 'notes', value: boolean | string) {
    const updated = checklist.map((item) => (item.key === key ? { ...item, [field]: value } : item))
    setChecklist(updated)
    const { error } = await supabase
      .from('order_preparation_checklists')
      .update({ items: updated, updated_at: new Date().toISOString() })
      .eq('order_id', id)
    if (error) { console.error('Gagal simpan checklist:', error) }
  }

  async function loadRates() {
    // maybeSingle (bukan single): kalau tidak ada laundry_rates aktif → 406 (PGRST116) di console
    const { data: lr } = await supabase.from('laundry_rates').select('rate_per_kg').eq('is_active', true).maybeSingle()
    setLaundryRate(lr?.rate_per_kg ?? 0)
  }

  useEffect(() => {
    load()
  }, [id])

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingPhoto(true)
    try {
      const result = await uploadToLocal(file, 'order_progress', { compress: true, maxSizeMB: 1 })
      setProgressPhotos((prev) => [...prev, result.url])
    } catch (err) {
      console.error('Upload failed:', err)
      toast('error', 'Gagal upload foto')
    } finally {
      setUploadingPhoto(false)
    }
  }

  async function updateStatus(newStatus: string, photoUrls: string[] = []) {
    if (!order) return
    // F-2 fix: order TANPA pembayaran (pending) tidak bisa lanjut proses —
    // Finance wajib input DP lalu approve (new → payment_ok / Cek Bayar).
    if (order.payment_status === 'pending' && newStatus !== 'cancelled') {
      toast('warning', 'Order belum dibayar — Finance wajib input DP lalu approve (Cek Bayar) sebelum order bisa diproses.')
      return
    }
    // Payment gate: packed/shipped/done tetap wajib lunas.
    // 2026-07-31: finance approve di DEPAN (new→payment_ok = verifikasi DP/lunas sudah masuk),
    // lunas penuh tetap wajib sebelum packed/dikirim.
    if (['packed', 'shipped', 'done'].includes(newStatus) && order.payment_status !== 'paid') {
      toast('warning', '⚠️ Payment gate: order belum lunas. Finance harus approve pembayaran dulu (status Cek Bayar).')
      return
    }
    setUpdating(true)
    const {
      data: { user }
    } = await supabase.auth.getUser()

    // 1) Update order status (client-side direct, simple & reliable)
    const { error: updateErr } = await supabase.from('orders').update({ status: newStatus }).eq('id', id)
    if (updateErr) {
      toast('error', 'Gagal update status: ' + updateErr.message)
      setUpdating(false)
      return
    }

    // 2) Catat ke order_logs untuk audit trail
    // PENTING: semua action harus masuk daftar chk_action — fallback pakai 'status_changed'
    // (bukan newStatus mentah: 'steam'/'install' tidak ada di constraint → insert 400)
    const LOG_ACTION: Record<string, string> = {
      new: 'created',
      payment_ok: 'payment_verified',
      sorted: 'sorted',
      production: 'production_started',
      steam: 'steam_qc_pass',
      ready: 'qc_pass',
      packed: 'packed',
      shipped: 'shipped',
      done: 'done',
      cancelled: 'cancelled'
    }
    const { error: logErr } = await supabase.from('order_logs').insert({
      order_id: id,
      action: LOG_ACTION[newStatus] ?? 'status_changed',
      notes: `Status diubah oleh Admin dari "${STATUS_LABELS[order.status as keyof typeof STATUS_LABELS]}" → "${STATUS_LABELS[newStatus as keyof typeof STATUS_LABELS]}"`,
      staff_id: user?.id ?? null
    })
    if (logErr) { console.error('Gagal catat log:', logErr) }

    // 3) Save progress photos (accountability)
    for (const url of photoUrls) {
      const { error: photoErr } = await supabase.from('order_progress_photos').insert({
        order_id: id,
        stage: newStatus,
        photo_url: url,
        uploaded_by: user?.id ?? null
      })
      if (photoErr) { console.error('Gagal simpan foto progress:', photoErr) }
    }

    // 4) PENTING: sorted→production. Auto-create production_job dengan idempotency check.
    // Kalau insert gagal, ALERT user — jangan silent fail. Gudang Production page butuh job ini.
    if (newStatus === 'production' && order.status === 'sorted') {
      // Cek dulu apakah sudah ada production_job aktif untuk order ini
      const { data: existingJob } = await supabase
        .from('production_jobs')
        .select('id')
        .eq('order_id', id)
        .in('status', ['waiting', 'in_progress'])
        .maybeSingle()

      if (!existingJob) {
        // Hitung total meter dari order_items
        const { data: orderItems } = await supabase
          .from('order_items')
          .select('meter_gorden, meter_vitras, meter_roman, meter_kupu_kupu, meter')
          .eq('order_id', id)
        const totalMeterGorden = (orderItems ?? []).reduce(
          (s: number, i: MeterRow) => s + Number(i.meter_gorden ?? i.meter ?? 0),
          0
        )
        const totalMeterVitras = (orderItems ?? []).reduce((s: number, i: MeterRow) => s + Number(i.meter_vitras ?? 0), 0)
        const totalMeterRoman = (orderItems ?? []).reduce((s: number, i: MeterRow) => s + Number(i.meter_roman ?? 0), 0)
        const totalMeterKupuKupu = (orderItems ?? []).reduce(
          (s: number, i: MeterRow) => s + Number(i.meter_kupu_kupu ?? 0),
          0
        )

        const { error: jobErr } = await supabase.from('production_jobs').insert({
          order_id: id,
          meter_gorden: totalMeterGorden,
          meter_vitras: totalMeterVitras,
          meter_roman: totalMeterRoman,
          meter_kupu_kupu: totalMeterKupuKupu,
          status: 'waiting'
        })

        if (jobErr) {
          // CRITICAL: order stuck di production tapi tidak ada job
          toast('error', '⚠️ Order sudah di-update ke production, TAPI gagal membuat production_job: ' +
              jobErr.message +
              '\n\nGudang tidak akan melihat order ini di /gudang/production. Hubungi developer untuk fix data integrity.')
        }
      }
    }

    setOrder((o) => (o ? { ...o, status: newStatus as Order['status'] } : o))
    setUpdating(false)
    setShowPhotoModal(false)
    setProgressPhotos([])
    setPendingStatus(null)
    load()
  }

  // BUG-007 fix (2026-08-11): Jadwalkan Pasang — 1 langkah dari order detail.
  // Update orders ke 'scheduled' + upsert install_bookings (assign installer + jadwal).
  async function handleSchedule(e: React.FormEvent) {
    e.preventDefault()
    if (!order) return
    if (!scheduleForm.date || !scheduleForm.installer_id) {
      toast('warning', 'Tanggal & installer wajib diisi.')
      return
    }
    setScheduling(true)
    const {
      data: { user }
    } = await supabase.auth.getUser()

    // F-18 fix: SATU JALUR — semua perubahan status booking lewat API route
    // (RPC advance_install_booking_status cascade orders.status → 'scheduled' + order_logs).
    let bookingId = orderBooking?.id ?? null

    try {
      // 1) Kalau booking belum ada (auto-created pending belum pernah dibuat),
      //    buat dulu (status pending) lalu PUT ke scheduled.
      if (!bookingId) {
        const customerAddr =
          (order.customer as { address?: string } | null)?.address ?? 'Alamat belum di-set'
        const { data: newBooking, error: insErr } = await supabase
          .from('install_bookings')
          .insert({
            order_id: id,
            type: 'pasang',
            status: 'pending',
            installer_id: scheduleForm.installer_id,
            scheduled_date: scheduleForm.date,
            scheduled_time: scheduleForm.time || null,
            address: customerAddr,
            notes: `Dijadwalkan dari detail pesanan oleh Admin — installer & tanggal dipilih langsung.`
          })
          .select('id')
          .single()
        if (insErr || !newBooking) throw new Error(insErr?.message ?? 'Gagal buat booking')
        bookingId = newBooking.id
      }

      // 2) PUT ke API route — RPC update status + cascade orders + log install_started,
      //    field lain (installer_id, jadwal) di-update via otherFields.
      const res = await fetch(`/api/install-bookings/${bookingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'scheduled',
          installer_id: scheduleForm.installer_id,
          scheduled_date: scheduleForm.date,
          scheduled_time: scheduleForm.time || null
        })
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(json?.error?.message ?? `HTTP ${res.status}`)

      // 3) Kolom jadwal di orders (tidak disentuh RPC) — set dengan guard status
      const { error: schedErr } = await supabase
        .from('orders')
        .update({
          scheduled_installation_date: scheduleForm.date,
          scheduled_installation_time: scheduleForm.time || null
        })
        .eq('id', id)
        .eq('status', 'scheduled')
      if (schedErr) console.error('Gagal simpan jadwal di orders:', schedErr)

      const installerName = installers.find((i) => i.id === scheduleForm.installer_id)?.name ?? '—'
      setScheduling(false)
      setShowScheduleModal(false)
      setScheduleForm({ date: '', time: '', installer_id: '' })
      toast('success', `✅ Order terjadwal pasang: ${scheduleForm.date} — Installer: ${installerName}. Installer akan melihat job di /installer/schedule.`)
      load()
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      console.error('Jadwal pasang gagal:', err)
      setScheduling(false)
      toast('error', '⚠️ Gagal jadwalkan pasang: ' + errMsg)
    }
  }

  async function handleCancel() {
    if (!order || !cancelReason.trim()) {
      toast('info', 'Alasan pembatalan wajib diisi.')
      return
    }
    const {
      data: { user }
    } = await supabase.auth.getUser()
    const { error: voidErr } = await supabase
      .from('payments')
      .update({ notes: `VOIDED — Order cancelled (${cancelReason}) - ${new Date().toISOString()}` })
      .eq('order_id', id)
    if (voidErr) { console.error('Gagal void payment:', voidErr) }
    const { error: cancelErr } = await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        return_reason: cancelReason,
        dp_amount: 0,
        lunas_amount: 0,
        payment_status: 'pending'
      })
      .eq('id', id)
    if (cancelErr) { toast('error', 'Gagal batalkan order: ' + cancelErr.message); return }

    // F-med fix: reversal jurnal saat cancel — order_created & payment_received
    // yang sudah tercatat harus dibalik agar laba-rugi & neraca tidak overstated.
    // BUG-060 fix (2026-08-13): cek dulu jurnal yang BENAR-BENAR ada — jangan
    // bikin reversal "hantu" untuk jurnal yang tak pernah dibuat (mis. DP yang
    // jurnalnya gagal BUG-058, atau order tanpa pembayaran).
    const totalPaid = (order.dp_amount ?? 0) + (order.lunas_amount ?? 0)
    if ((order.total_amount ?? 0) > 0 || totalPaid > 0) {
      try {
        const { getAccountMapping } = await import('@/utils/journal/create')
        const { createSimpleJournal } = await import('@/utils/journal/create')

        // Cek jurnal order_created nyata (reference order — reversal pakai 'order_cancelled')
        const { data: orderJournals } = await supabase
          .from('journal_entries')
          .select('id')
          .eq('reference_type', 'order')
          .eq('reference_id', id)
        const hasOrderJournal = (orderJournals?.length ?? 0) > 0

        // Cek jurnal payment_received nyata lewat idempotency key yang dipakai semua jalur
        const { data: existingPayments } = await supabase.from('payments').select('id').eq('order_id', id)
        const paymentKeys = [
          ...(existingPayments ?? []).map((p) => `payment:${p.id}`),
          `admin_dp_auto:${id}`,
          `tiktok_sync_payment:${id}`
        ]
        const { data: payJournals } = await supabase
          .from('journal_entries')
          .select('id')
          .in('idempotency_key', paymentKeys)
        const hasPaymentJournal = (payJournals?.length ?? 0) > 0

        // Reversal order_created: Dr (akun kredit mapping) / Cr (akun debit mapping)
        if (hasOrderJournal) {
          const revOrder = await getAccountMapping('order_created')
          if (revOrder?.debit_account_id && revOrder?.credit_account_id) {
            await createSimpleJournal({
              transaction_type: 'order_created',
              reference_type: 'order_cancelled',
              reference_id: id,
              description: `Reversal order_created — order ${(order as { order_number?: string }).order_number ?? id.slice(0, 8)} dibatalkan`,
              amount: order.total_amount ?? 0,
              debit_account_id: revOrder.credit_account_id,
              credit_account_id: revOrder.debit_account_id,
              idempotency_key: `cancel_order_created:${id}`
            })
          }
        }

        // Reversal payment_received: Dr (akun kredit mapping) / Cr (akun debit mapping)
        if (totalPaid > 0 && hasPaymentJournal) {
          const revPay = await getAccountMapping('payment_received')
          if (revPay?.debit_account_id && revPay?.credit_account_id) {
            await createSimpleJournal({
              transaction_type: 'payment_received',
              reference_type: 'order_cancelled',
              reference_id: id,
              description: `Reversal pembayaran — order ${(order as { order_number?: string }).order_number ?? id.slice(0, 8)} dibatalkan (Rp${totalPaid.toLocaleString('id-ID')})`,
              amount: totalPaid,
              debit_account_id: revPay.credit_account_id,
              credit_account_id: revPay.debit_account_id,
              idempotency_key: `cancel_payment:${id}`
            })
          }
        }
      } catch (jErr) {
        console.error('Gagal buat jurnal reversal cancel:', jErr)
        toast('warning', 'Order dibatalkan, TAPI jurnal reversal GAGAL. Hubungi owner untuk fix pembukuan.')
      }
    }

    const { error: cancelLogErr } = await supabase.from('order_logs').insert({
      order_id: id,
      action: 'cancelled',
      notes: `Order dibatalkan oleh Admin. Alasan: ${cancelReason}. Payment di-void.`,
      staff_id: user?.id ?? null
    })
    if (cancelLogErr) { console.error('Gagal catat log cancel:', cancelLogErr) }
    toast('success', 'Order berhasil dibatalkan.')
    setShowCancelForm(false)
    load()
  }

  async function handleReturn(e: React.FormEvent) {
    e.preventDefault()
    if (!order) return
    const {
      data: { user }
    } = await supabase.auth.getUser()
    const refundAmt = Number(returnForm.refund_amount) || 0

    // Validate items BEFORE writing any records
    if (returnForm.condition === 'good') {
      const { data: itemsToReturn } = returnForm.item_id
        ? await supabase
            .from('order_items')
            .select('*, product:products(id,stock_toko)')
            .eq('order_id', id)
            .eq('id', returnForm.item_id)
        : await supabase.from('order_items').select('*, product:products(id,stock_toko)').eq('order_id', id)
      const items = itemsToReturn ?? []
      if (items.length === 0) {
        toast('info', 'Tidak ada item untuk diproses return.')
        return
      }
      // Process stock updates first
      for (const item of items) {
        if (item.product_id) {
          const { error: movErr } = await supabase.from('inventory_movements').insert({
            product_id: item.product_id,
            type: 'return_in',
            qty: item.qty ?? 1,
            reason: `Return dari order ${id.slice(0, 8)} — kondisi bagus, masuk stock toko`,
            created_by: user?.id ?? null
          })
          if (movErr) { toast('error', 'Gagal catat pergerakan stok return: ' + movErr.message); return }
          const { error } = await supabase.rpc('increment_stock_toko', {
            product_id: item.product_id,
            amount: item.qty ?? 1
          })
          if (error) {
            console.error('RPC increment_stock_toko gagal:', error)
            const { error: fbErr } = await supabase
              .from('products')
              .update({ stock_toko: (item.product?.stock_toko ?? 0) + (item.qty ?? 1) })
              .eq('id', item.product_id)
            if (fbErr) { console.error('Fallback update stok juga gagal:', fbErr); toast('error', 'Gagal menambah stok return: ' + fbErr.message); return }
          }
        }
      }
    }

    // Insert return record (after stock updates validated)
    const { data: retData, error: retErr } = await supabase
      .from('returns')
      .insert({
        order_id: id,
        order_item_id: returnForm.item_id || null,
        reason: returnForm.reason,
        condition: returnForm.condition,
        qty: Number(returnForm.qty) || 1,
        refund_amount: refundAmt,
        refund_status: refundAmt > 0 ? 'pending' : 'completed',
        created_by: user?.id ?? null,
        resolved_at: returnForm.condition === 'good' ? new Date().toISOString() : null
      })
      .select()
      .single()
    if (retErr) { toast('error', 'Gagal catat return: ' + retErr.message); return }

    // Update order item if specific item selected
    if (returnForm.item_id) {
      const { error: itemErr } = await supabase
        .from('order_items')
        .update({ returned_at: new Date().toISOString(), return_reason: returnForm.reason })
        .eq('id', returnForm.item_id)
      if (itemErr) { toast('error', 'Gagal update item return: ' + itemErr.message); return }
    }

    // Update order status to returned
    const { error: orderErr } = await supabase.from('orders').update({ status: 'returned', return_reason: returnForm.reason }).eq('id', id)
    if (orderErr) { toast('error', 'Gagal update status order: ' + orderErr.message); return }

    // Log the action
    const { error: retLogErr } = await supabase.from('order_logs').insert({
      order_id: id,
      action: 'return_initiated',
      notes: `Return diproses oleh Admin. Kondisi: ${returnForm.condition === 'good' ? 'Bagus → masuk stock' : 'Rusak → dispose'}. Alasan: ${returnForm.reason}. Refund: Rp${refundAmt.toLocaleString('id-ID')}`,
      staff_id: user?.id ?? null
    })
    if (retLogErr) { console.error('Gagal catat log return:', retLogErr) }

    toast('success', `Return berhasil dicatat.\nKondisi: ${returnForm.condition === 'good' ? 'Bagus → masuk stock' : 'Rusak → dispose'}\nRefund: Rp${refundAmt.toLocaleString('id-ID')}`)
    setShowReturnForm(false)
    setReturnForm({ item_id: '', reason: '', condition: 'good', qty: '1', refund_amount: '' })
    load()
  }

  // Gorden dihitung per ukuran (cm), bukan qty: meter kain = tinggi ukuran ÷ 100
  // Format ukuran: "lebar x tinggi" cm — cth "120 x 250" → 2.5 m (parseGordenMeter dari lib)

  async function addItem(e: React.FormEvent) {
    e.preventDefault()
    setSavingItem(true)

    // Validate qty for non-laundry items
    const qty = Number(itemForm.qty)
    if (itemType === 'gorden') {
      // Gorden: tidak pakai qty — pakai ukuran cm (meter otomatis = tinggi ÷ 100)
      const gordenMeter = parseGordenMeter(itemForm.size)
      if (!itemForm.product_id) {
        toast('info', 'Pilih produk gorden dulu.')
        setSavingItem(false)
        return
      }
      if (gordenMeter <= 0) {
        toast('info', 'Isi ukuran gorden dalam cm (format: lebar x tinggi, cth "120 x 250").')
        setSavingItem(false)
        return
      }
      itemForm.qty = '1'
      itemForm.meter_gorden = String(gordenMeter)
    } else if (itemType !== 'laundry' && (!itemForm.product_id || qty < 1)) {
      toast('info', 'Pilih produk dan qty minimal 1.')
      setSavingItem(false)
      return
    }

    if (itemType === 'laundry') {
      // create laundry order first
      const {
        data: { user }
      } = await supabase.auth.getUser()
      const { data: laund, error: laundErr } = await supabase
        .from('laundry_orders')
        .insert({
          order_id: id,
          customer_name: itemForm.customer_name,
          customer_phone: itemForm.customer_phone || null,
          kg: Number(itemForm.kg) || 0,
          meter: Number(itemForm.meter_laundry) || 0,
          description: itemForm.description || null,
          status: 'pending',
          created_by: user?.id ?? null,
          received_at: new Date().toISOString()
        })
        .select('id')
        .single()
      if (laundErr) {
        toast('error', 'Gagal buat laundry order: ' + laundErr.message)
        setSavingItem(false)
        return
      }

      const price = Number(itemForm.kg) * laundryRate
      const { error: itemErr } = await supabase.from('order_items').insert({
        order_id: id,
        product_id: null,
        item_type: 'laundry',
        linked_laundry_id: laund?.id ?? null,
        qty: 1,
        price,
        meter: Number(itemForm.meter_laundry) || null
      })
      if (itemErr) {
        toast('error', 'Gagal tambah item laundry: ' + itemErr.message)
        setSavingItem(false)
        return
      }
    } else {
      const prod = products.find((p) => p.id === itemForm.product_id)
      let finalPrice = Number(itemForm.price) || prod?.price || 0

      // Gorden: price = product.price per meter × meter needed
      if (itemType === 'gorden') {
        const meter = Number(itemForm.meter_gorden) || 0
        finalPrice = (prod?.price || 0) * meter
      }

      const { error: itemErr } = await supabase.from('order_items').insert({
        order_id: id,
        product_id: itemForm.product_id || null,
        item_type: itemType,
        qty: Number(itemForm.qty),
        price: finalPrice,
        size: itemForm.size || null,
        meter_gorden: itemType === 'gorden' ? Number(itemForm.meter_gorden) : 0,
        meter: itemType === 'gorden' ? Number(itemForm.meter) || null : null,
        poni_lurus: itemType === 'gorden' ? itemForm.poni_lurus : false,
        poni_gel: itemType === 'gorden' ? itemForm.poni_gel : false,
        style_type: itemType === 'gorden' ? itemForm.style_type || null : null,
        smokring_color:
          itemType === 'gorden' && itemForm.style_type === 'smokring' ? itemForm.smokring_color || null : null,
        variant_color: itemType === 'perabot' ? itemForm.variant_color || null : null,
        dimension_p: itemType === 'perabot' ? (itemForm.dimension_p ? Number(itemForm.dimension_p) : null) : null,
        dimension_l: itemType === 'perabot' ? (itemForm.dimension_l ? Number(itemForm.dimension_l) : null) : null,
        dimension_t: itemType === 'perabot' ? (itemForm.dimension_t ? Number(itemForm.dimension_t) : null) : null,
        weight: itemType === 'perabot' ? (itemForm.weight ? Number(itemForm.weight) : null) : null
      })
      if (itemErr) {
        toast('error', 'Gagal tambah item: ' + itemErr.message)
        setSavingItem(false)
        return
      }
    }

    // recalc total
    const { data: newItems, error: totalErr } = await supabase
      .from('order_items')
      .select('price,qty')
      .eq('order_id', id)
    if (totalErr) {
      toast('error', 'Item tersimpan, tapi gagal hitung ulang total: ' + totalErr.message)
      load()
      setSavingItem(false)
      setShowItemForm(false)
      resetForm()
      return
    }
    const total = (newItems ?? []).reduce((s, i) => s + i.price * i.qty, 0)
    const { error: updateErr } = await supabase.from('orders').update({ total_amount: total }).eq('id', id)
    if (updateErr) {
      toast('error', 'Item tersimpan, tapi gagal update total order: ' + updateErr.message)
      load()
      setSavingItem(false)
      setShowItemForm(false)
      resetForm()
      return
    }

    setSavingItem(false)
    setShowItemForm(false)
    resetForm()
    load()
  }

  // ---------- link survey (fitur "hasil survey masuk invoice") ----------
  async function openSurveyLink() {
    setSurveyLinkOpen(true)
    setSurveyLoading(true)
    setSurveyCandidates([])
    try {
      const res = await fetch('/api/surveys?status=tersimpan&limit=20')
      const json = await res.json()
      if (res.ok) setSurveyCandidates((json.data ?? []) as SurveyCand[])
      else toast('error', json.error?.message ?? 'Gagal load survey')
    } finally {
      setSurveyLoading(false)
    }
  }

  async function linkSurvey(surveyId: string) {
    const { error } = await supabase.from('orders').update({ survey_id: surveyId }).eq('id', id)
    if (error) {
      toast('error', 'Gagal link survey: ' + error.message)
      return
    }
    setSurveyLinkOpen(false)
    load()
  }

  async function unlinkSurvey() {
    if (!confirm('Lepas survey dari order ini?')) return
    const { error } = await supabase.from('orders').update({ survey_id: null }).eq('id', id)
    if (error) {
      toast('error', 'Gagal lepas survey: ' + error.message)
      return
    }
    load()
  }

  async function removeItem(itemId: string) {
    if (!confirm('Hapus item ini?')) return
    const { error } = await supabase.from('order_items').delete().eq('id', itemId)
    if (error) { toast('error', 'Gagal hapus item: ' + error.message); return }
    // Recalc total_amount agar sinkron dengan order_items (temuan QA 2026-08-10:
    // sebelumnya total tidak turun → laporan keuangan & payment status tidak akurat)
    const { data: remaining, error: totalErr } = await supabase
      .from('order_items')
      .select('price,qty')
      .eq('order_id', id)
    if (totalErr) { console.error('Gagal hitung ulang total:', totalErr) }
    const newTotal = (remaining ?? []).reduce((s, i) => s + i.price * i.qty, 0)
    const { error: updErr } = await supabase.from('orders').update({ total_amount: newTotal }).eq('id', id)
    if (updErr) { console.error('Gagal update total_amount:', updErr) }
    load()
  }

  async function toggleReady(itemId: string, current: boolean) {
    const { error } = await supabase.from('order_items').update({ ready: !current }).eq('id', itemId)
    if (error) { toast('error', 'Gagal update item: ' + error.message); return }
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, ready: !current } : i)))
  }

  async function handleAddPayment(e: React.FormEvent) {
    e.preventDefault()
    if (!order || !paymentForm.amount) {
      toast('warning', 'Jumlah pembayaran wajib diisi.')
      return
    }
    setSavingPayment(true)
    const {
      data: { user }
    } = await supabase.auth.getUser()
    const amount = Number(paymentForm.amount)
    // Validasi nominal (temuan QA 2026-08-10): jangan biarkan pembayaran melebihi sisa tagihan
    if (amount <= 0) {
      setSavingPayment(false)
      toast('error', 'Nominal pembayaran harus lebih dari 0.')
      return
    }
    // F-2 fix: refetch order FRESH (hindari state basi / race dua admin bayar bersamaan)
    const { data: fresh } = await supabase
      .from('orders')
      .select('id, total_amount, dp_amount, lunas_amount, payment_status')
      .eq('id', id)
      .single()
    if (!fresh) {
      setSavingPayment(false)
      toast('error', 'Order tidak ditemukan.')
      return
    }
    const sisaTagihan = (fresh.total_amount ?? 0) - (fresh.dp_amount ?? 0) - (fresh.lunas_amount ?? 0)
    if (amount > sisaTagihan) {
      setSavingPayment(false)
      toast('error', `Nominal pembayaran melebihi sisa tagihan (Rp ${sisaTagihan.toLocaleString('id-ID')}).`)
      return
    }
    const { data: paymentRow, error: payErr } = await supabase
      .from('payments')
      .insert({
        order_id: id,
        type: paymentForm.type,
        amount,
        verified_by: user?.id ?? null,
        verified_at: new Date().toISOString()
      })
      .select('id')
      .single()
    if (payErr) { setSavingPayment(false); toast('error', 'Gagal catat pembayaran: ' + payErr.message); return }

    // BUG/F-24 fix (2026-08-11): pembayaran via admin detail JUGA harus bikin jurnal
    // (sebelumnya hanya finance/payments yang berjurnal → buku besar tidak lengkap).
    try {
      await createSimpleJournal({
        transaction_type: 'payment_received',
        reference_type: 'order',
        reference_id: id,
        description: `Pembayaran ${paymentForm.type === 'dp' ? 'DP' : 'Lunas'} Rp${amount.toLocaleString('id-ID')} oleh Admin`,
        amount,
        // F-54 fix: idempotent per payment — retry tidak bikin jurnal ganda
        idempotency_key: paymentRow?.id ? `payment:${paymentRow.id}` : undefined
      })
    } catch (jErr) {
      console.error('Gagal buat jurnal pembayaran admin:', jErr)
      toast('warning', 'Pembayaran tercatat, TAPI jurnal GAGAL. Periksa mapping akun.')
    }

    // F-2 fix: hitungan JUJUR — DP TIDAK mengisi lunas_amount fiktif.
    // DP → partial; lunas penuh → paid. Payment gate packed tetap wajib paid.
    const newDp = paymentForm.type === 'dp' ? fresh.dp_amount + amount : fresh.dp_amount
    const newLunas = paymentForm.type === 'lunas' ? fresh.lunas_amount + amount : fresh.lunas_amount
    const paidSum = newDp + newLunas
    const newPaid =
      paidSum >= (fresh.total_amount ?? 0) && fresh.total_amount > 0 ? 'paid' : paidSum > 0 ? 'partial' : 'pending'
    const { error: ordErr } = await supabase
      .from('orders')
      .update({
        dp_amount: newDp,
        lunas_amount: newLunas,
        payment_status: newPaid
      })
      .eq('id', id)
      .eq('dp_amount', fresh.dp_amount)
      .eq('lunas_amount', fresh.lunas_amount)
    if (ordErr) {
      // F-2 fix: guard gagal (race) → rollback row payments agar tidak yatim
      await supabase.from('payments').delete().eq('id', paymentRow?.id ?? '')
      setSavingPayment(false)
      toast('error', 'Gagal update status pembayaran (mungkin dibayar admin lain). Row payment di-rollback: ' + ordErr.message)
      return
    }
    const { error: payLogErr } = await supabase.from('order_logs').insert({
      order_id: id,
      action: 'payment_added',
      notes: `Pembayaran ${paymentForm.type === 'dp' ? 'DP' : 'Lunas'} Rp${amount.toLocaleString('id-ID')} oleh Admin.`,
      staff_id: user?.id ?? null
    })
    if (payLogErr) { console.error('Gagal catat log pembayaran:', payLogErr) }
    toast('success', 'Pembayaran berhasil dicatat.')
    setShowPaymentForm(false)
    setPaymentForm({ type: 'dp', amount: '' })
    setSavingPayment(false)
    load()
  }

  function resetForm() {
    setItemType('gorden')
    setItemForm({
      product_id: '',
      qty: '1',
      price: '',
      size: '',
      meter_gorden: '0',
      meter: '0',
      poni_lurus: false,
      poni_gel: false,
      style_type: '',
      smokring_color: '',
      variant_color: '',
      dimension_p: '',
      dimension_l: '',
      dimension_t: '',
      weight: '',
      customer_name: '',
      customer_phone: '',
      kg: '0',
      meter_laundry: '0',
      description: ''
    })
    setSearchProduct('')
  }

  const [showItemForm, setShowItemForm] = useState(false)

  function openItemForm() {
    setShowItemForm(true)
    loadRates()
    resetForm()
  }

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Memuat...</div>
  if (!order)
    return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Order tidak ditemukan.</div>

  const customer = order.customer as { name: string; phone: string; address?: string } | null
  // ORDER_STATUSES now conditional per classification (kirim vs pasang)
  const orderClassification: 'kirim' | 'pasang' = (order.classification ?? 'kirim') as 'kirim' | 'pasang'
  const ORDER_STATUSES = ORDER_STAGES_BY_CLASSIFICATION[orderClassification] ?? ORDER_STAGES_BY_CLASSIFICATION.kirim
  const statusIdx = (ORDER_STATUSES as readonly string[]).indexOf(order.status)
  const nextStatus: OrderStatus | null =
    statusIdx >= 0 && statusIdx < ORDER_STATUSES.length - 1 ? (ORDER_STATUSES[statusIdx + 1] as OrderStatus) : null
  // dynamic button label (mis. 'Input Resi' vs 'Jadwalkan Pasang')
  // PENTING: label dihitung dari status SAAT INI (bukan nextStatus) — kalau pakai
  // nextStatus, tombol sorted→production tampil 'Submit Report' (label utk production)
  // padahal seharusnya 'Mulai Produksi' (bug 2026-08-11 — bikin user salah paham)
  const nextStageButtonLabel = nextStatus ? getNextStageButtonLabel(order.status, orderClassification) : 'Lanjut'

  // BUG-003/fix-4 (2026-08-11): prefill bukti foto yang sudah ada saat modal advance dibuka.
  // Prioritas: foto stage SAAT INI (evidence dari gudang/steam dll). Fallback: semua foto order.
  // Tombol "Lanjut" langsung aktif tanpa harus upload ulang bukti yang sama.
  function prefillProgressPhotos() {
    if (!order) return
    const stagePhotos = orderPhotos
      .filter((p) => p.stage === order.status && p.photo_url.startsWith('http'))
      .map((p) => p.photo_url)
    const fallback = orderPhotos.filter((p) => p.photo_url.startsWith('http')).map((p) => p.photo_url)
    const prefilled = stagePhotos.length > 0 ? stagePhotos : fallback
    setProgressPhotos((prev) => (prev.length > 0 ? prev : prefilled))
  }

  function openAdvanceModal(status: OrderStatus) {
    setPendingStatus(status)
    setProgressPhotos([])
    prefillProgressPhotos()
    setShowPhotoModal(true)
  }

  return (
    <div>
      {/* Back */}
      <Link
        href="/admin/orders"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.375rem',
          color: 'var(--neutral-600)',
          fontSize: '0.875rem',
          textDecoration: 'none',
          marginBottom: '1rem'
        }}
      >
        <ArrowLeft size={15} /> Kembali ke Pesanan
      </Link>

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}
      >
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>
            Detail Pesanan
          </h1>
          <p
            style={{
              fontSize: '0.9rem',
              fontFamily: 'monospace',
              color: '#cc7030',
              fontWeight: '700',
              marginTop: '0.25rem'
            }}
          >
            {order.order_number || `#${id.slice(0, 8)}`}
          </p>
          <p style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--neutral-400)', marginTop: '0.1rem' }}>{id}</p>
        </div>
        {nextStatus &&
          !['done', 'returned', 'cancelled'].includes(order.status) &&
          canRoleAdvanceNext(currentUserRole, order.status) && (
            <button
              onClick={() => {
                // BUG-007 fix: packed→scheduled (pasang) buka modal jadwal + assign installer
                if (nextStatus === 'scheduled') {
                  setScheduleForm({
                    date: orderBooking?.scheduled_date ?? '',
                    time: orderBooking?.scheduled_time ?? '',
                    installer_id: orderBooking?.installer_id ?? ''
                  })
                  setShowScheduleModal(true)
                } else {
                  openAdvanceModal(nextStatus)
                }
              }}
              disabled={updating}
              title="Lanjut ke tahap berikutnya (status terkunci, tidak bisa dibatalkan)"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.5rem',
                background: '#cc7030',
                color: '#fff',
                border: 'none',
                borderRadius: '0.5rem',
                fontWeight: '600',
                cursor: updating ? 'not-allowed' : 'pointer'
              }}
            >
              {updating ? (
                <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <ChevronRight size={15} />
              )}
              Lanjut: {nextStatus ? nextStageButtonLabel : STATUS_LABELS[nextStatus!]}
            </button>
          )}
        {nextStatus &&
          !['done', 'returned', 'cancelled'].includes(order.status) &&
          !canRoleAdvanceNext(currentUserRole, order.status) && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.25rem',
                background: 'var(--neutral-100)',
                color: 'var(--neutral-600)',
                border: '1px dashed #d1d5db',
                borderRadius: '0.5rem',
                fontWeight: '600',
                fontSize: '0.8rem',
                flexWrap: 'wrap'
              }}
            >
              🔒 Role <strong style={{ color: '#dc2626' }}>{currentUserRole}</strong> tidak boleh lanjut di stage ini.
              Stage <strong>{STATUS_LABELS[order.status as keyof typeof STATUS_LABELS]}</strong> adalah tanggung jawab:{' '}
              <strong style={{ color: '#cc7030' }}>{getResponsibleRoles(order.status)}</strong>
            </div>
          )}
        {['new', 'sorted'].includes(order.status) && (
          <button
            onClick={() => setShowCancelForm(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              background: '#ef4444',
              color: '#fff',
              border: 'none',
              borderRadius: '0.5rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
            title="Batalkan pesanan (pembayaran di-void, jurnal dibalik)"
          >
            ❌ Batalkan
          </button>
        )}
        {['ready', 'done'].includes(order.status) && (
          <button
            onClick={() => setShowReturnForm(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              background: '#9333ea',
              color: '#fff',
              border: 'none',
              borderRadius: '0.5rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
            title="Catat barang kembali / retur dari pesanan ini"
          >
            📦 Return
          </button>
        )}
        {order.status !== 'cancelled' && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() =>
                generateInvoicePDF({
                  order: { ...order, order_items: items },
                  orderNumber: order.order_number || id.slice(0, 8)
                })
              }
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1rem',
                background: 'var(--surface)',
                color: 'var(--neutral-700)',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '0.8rem'
              }}
              title="Unduh dokumen PDF"
            >
              <FileText size={14} /> Invoice
            </button>
            <button
              onClick={() =>
                generatePackingListPDF({
                  order: { ...order, order_items: items },
                  orderNumber: order.order_number || id.slice(0, 8)
                })
              }
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1rem',
                background: 'var(--surface)',
                color: 'var(--neutral-700)',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '0.8rem'
              }}
              title="Unduh dokumen PDF"
            >
              <Package size={14} /> Packing List
            </button>
            <button
              onClick={() =>
                generateFakturPDF({
                  order: { ...order, order_items: items },
                  orderNumber: order.order_number || id.slice(0, 8)
                })
              }
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1rem',
                background: 'var(--surface)',
                color: 'var(--neutral-700)',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '0.8rem'
              }}
              title="Unduh dokumen PDF"
            >
              <FileText size={14} /> Faktur
            </button>
            <button
              onClick={() =>
                generateSuratJalanPDF({
                  order: { ...order, order_items: items },
                  orderNumber: order.order_number || id.slice(0, 8),
                  courier: (order as { courier?: string }).courier,
                  waybill: (order as { tracking_number?: string }).tracking_number
                })
              }
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1rem',
                background: 'var(--surface)',
                color: 'var(--neutral-700)',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '0.8rem'
              }}
              title="Unduh dokumen PDF"
            >
              <Truck size={14} /> Surat Jalan
            </button>
          </div>
        )}
      </div>

      {/* BUG-007 fix: info booking pasang — installer & jadwal terlihat langsung di order detail */}
      {orderBooking && ['scheduled', 'installing', 'done'].includes(order.status) && (
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid #e5e7eb',
            borderRadius: '0.75rem',
            padding: '0.9rem 1.25rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            flexWrap: 'wrap'
          }}
        >
          <CalendarIcon size={16} style={{ color: '#cc7030' }} />
          <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>Jadwal Pasang:</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--neutral-700)' }}>
            {orderBooking.scheduled_date ? new Date(orderBooking.scheduled_date + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'Belum ada tanggal'}
            {orderBooking.scheduled_time ? ` • ${orderBooking.scheduled_time}` : ''}
          </span>
          <span style={{ fontSize: '0.85rem', color: 'var(--neutral-600)' }}>
            — Installer:{' '}
            <strong style={{ color: '#cc7030' }}>{orderBooking.installer?.name ?? 'belum di-assign'}</strong>
          </span>
        </div>
      )}

      {/* Status pipeline */}
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid #e5e7eb',
          borderRadius: '0.75rem',
          padding: '1.25rem',
          marginBottom: '1.25rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto' }}>
          {ORDER_STATUSES.map((s, i) => {
            const done = i <= statusIdx
            const current = s === order.status
            // Foto lama (path relatif /uploads/... dari era public/uploads) sudah HILANG
            // (file tidak pernah ada di storage) — jangan hitung sbg foto valid (fix 2026-08-10)
            const stagePhotos = orderPhotos.filter((p) => p.stage === s && p.photo_url.startsWith('http'))
            const hasPhotos = stagePhotos.length > 0
            return (
              <div key={s} style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 80 }}>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    flex: 1,
                    gap: '0.375rem',
                    position: 'relative'
                  }}
                >
                  <div
                    onClick={() =>
                      hasPhotos ? setPhotoPopup({ stage: s, photos: stagePhotos.map((p) => p.photo_url) }) : null
                    }
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: current ? '#cc7030' : done ? '#d1fae5' : 'var(--neutral-100)',
                      border: `2px solid ${current ? '#cc7030' : done ? '#22c55e' : 'var(--neutral-200)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: current ? '#fff' : done ? '#16a34a' : 'var(--neutral-400)',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      cursor: hasPhotos ? 'pointer' : 'default',
                      position: 'relative'
                    }}
                  >
                    {done && !current ? <CheckCircle2 size={14} /> : i + 1}
                    {hasPhotos && (
                      <div
                        style={{
                          position: 'absolute',
                          top: -4,
                          right: -4,
                          width: 14,
                          height: 14,
                          borderRadius: '50%',
                          background: '#ef4444',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '2px solid #fff'
                        }}
                      >
                        <Camera size={8} style={{ color: '#fff' }} />
                      </div>
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: current ? '700' : '400',
                      color: current ? '#cc7030' : done ? 'var(--neutral-700)' : 'var(--neutral-400)',
                      textAlign: 'center',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {STATUS_LABELS[s]}
                  </span>
                  {current && (
                    <span
                      style={{
                        fontSize: '0.6rem',
                        fontWeight: '600',
                        color: '#cc7030',
                        background: 'rgba(204,112,48,0.12)',
                        borderRadius: '0.25rem',
                        padding: '0.1rem 0.35rem',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      Saat Ini
                    </span>
                  )}
                </div>
                {i < ORDER_STATUSES.length - 1 && (
                  <div
                    style={{ width: 24, height: 2, background: i < statusIdx ? '#22c55e' : 'var(--neutral-200)', flexShrink: 0 }}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Estimasi Selesai */}
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid #e5e7eb',
          borderRadius: '0.75rem',
          padding: '1rem 1.25rem',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}
      >
        <Clock size={18} style={{ color: '#cc7030', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--neutral-400)', marginBottom: '0.2rem' }}>ESTIMASI SELESAI</div>
          {order.status === 'done' ? (
            <div style={{ fontWeight: '700', color: '#16a34a' }}>✅ Sudah Selesai</div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: '700', color: 'var(--neutral-700)' }}>
                Tahap {statusIdx + 1}/{ORDER_STATUSES.length}
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--neutral-600)' }}>—</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--neutral-600)' }}>
                Pipeline:{' '}
                {ORDER_STATUSES.slice(statusIdx + 1)
                  .map((s) => STATUS_LABELS[s])
                  .join(' → ')}
              </span>
            </div>
          )}
        </div>
        {order.status !== 'done' && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--neutral-400)' }}>Status Saat Ini</div>
            <div style={{ fontWeight: '700', color: '#cc7030' }}>
              {STATUS_LABELS[order.status as keyof typeof STATUS_LABELS]}
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
        {/* Customer info */}
        <div className="form-section">
          <div className="form-section-title">Pelanggan</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
            <div>
              <span style={{ color: 'var(--neutral-400)' }}>Nama: </span>
              <strong>{customer?.name ?? '—'}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--neutral-400)' }}>HP: </span>
              <a
                href={`https://wa.me/${customer?.phone?.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#16a34a', fontWeight: '500' }}
              >
                {customer?.phone ?? '—'}
              </a>
            </div>
            <div>
              <span style={{ color: 'var(--neutral-400)' }}>Alamat: </span>
              {customer?.address ?? '—'}
            </div>
          </div>
        </div>

        {/* Order info */}
        <div className="form-section">
          <div className="form-section-title">Info Pesanan</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--neutral-400)' }}>Sumber</span>
              <span>{SOURCE_LABELS[order.source]}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--neutral-400)' }}>Jenis</span>
              <span style={{ fontWeight: '600' }}>{order.classification === 'pasang' ? '📍 Pasang' : '📦 Kirim'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--neutral-400)' }}>Total</span>
              <span style={{ fontWeight: '700', color: '#cc7030' }}>{fmt(order.total_amount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--neutral-400)' }}>DP</span>
              <span>{fmt(order.dp_amount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--neutral-400)' }}>Lunas</span>
              <span>{fmt(order.lunas_amount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--neutral-400)' }}>Pembayaran</span>
              <span
                style={{
                  ...PAYMENT_COLORS[order.payment_status],
                  padding: '0.15rem 0.6rem',
                  borderRadius: '999px',
                  fontSize: '0.75rem',
                  fontWeight: '600'
                }}
              >
                {PAYMENT_STATUS_LABELS[order.payment_status]}
              </span>
            </div>
            {order.return_reason && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  background: '#fef2f2',
                  padding: '0.5rem',
                  borderRadius: '0.5rem',
                  gap: '0.5rem'
                }}
              >
                <span style={{ color: 'var(--neutral-400)', flexShrink: 0 }}>
                  {order.status === 'cancelled' ? 'Alasan Batal:' : 'Alasan Return:'}
                </span>
                <span style={{ color: '#991b1b', fontSize: '0.8rem', fontWeight: '600' }}>{order.return_reason}</span>
              </div>
            )}
            <button
              onClick={() => setShowPaymentForm(true)}
              type="button"
              style={{
                marginTop: '0.25rem',
                padding: '0.375rem 0.75rem',
                background: '#16a34a',
                color: '#fff',
                border: 'none',
                borderRadius: '0.375rem',
                fontSize: '0.75rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
              title="Catat DP / pelunasan untuk pesanan ini"
            >
              + Tambah Pembayaran
            </button>
          </div>
        </div>
      </div>

      {/* Hasil Survey (fitur "hasil survey masuk invoice") */}
      <div className="form-section" style={{ marginBottom: '1rem' }}>
        <div className="form-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Hasil Survey</span>
          {order.survey ? (
            <button
              onClick={unlinkSurvey}
              title="Lepas tautan survey dari pesanan ini"
              style={{ padding: '0.3rem 0.625rem', border: '1px solid #fecaca', borderRadius: '0.375rem', background: '#fef2f2', color: '#dc2626', fontSize: '0.7rem', fontWeight: '600', cursor: 'pointer' }}
            >
              Lepas Survey
            </button>
          ) : (
            <button
              onClick={openSurveyLink}
              style={{ padding: '0.3rem 0.625rem', border: 'none', borderRadius: '0.375rem', background: '#cc7030', color: '#fff', fontSize: '0.7rem', fontWeight: '600', cursor: 'pointer' }}
            >
              🔗 Pilih Survey
            </button>
          )}
        </div>
        {order.survey ? (
          <div style={{ fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <div>
              <span style={{ color: 'var(--neutral-400)' }}>No: </span>
              <strong>{order.survey.survey_number ?? '—'}</strong>{' '}
              <a href={`/surveyor/survey/${order.survey.id}`} style={{ color: '#cc7030', fontSize: '0.8rem' }}>
                lihat detail →
              </a>
            </div>
            <div>
              <span style={{ color: 'var(--neutral-400)' }}>Client: </span>
              {order.survey.client_name}
              {order.survey.client_address ? ' — ' + order.survey.client_address : ''}
            </div>
            <div>
              <span style={{ color: 'var(--neutral-400)' }}>Ruangan: </span>
              {order.survey.rooms?.length ?? 0} ruangan · Tanggal {order.survey.survey_date}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: '600' }}>
              Blok HASIL SURVEY akan otomatis masuk ke Invoice PDF.
            </div>
          </div>
        ) : (
          <div style={{ fontSize: '0.8rem', color: 'var(--neutral-400)' }}>
            Belum ada survey ter-link. Pilih survey untuk menampilkan hasilnya di invoice.
          </div>
        )}
      </div>

      {/* Modal pilih survey */}
      <Modal open={surveyLinkOpen} onClose={() => setSurveyLinkOpen(false)} maxWidth={560}>
        <div style={{ padding: '1.25rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '0.75rem' }}>Pilih Survey</h3>
          {surveyLoading ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Memuat...</div>
          ) : surveyCandidates.length === 0 ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--neutral-400)' }}>
              Belum ada survey ber-status Tersimpan. Buat survey dulu di menu Survey.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 320, overflowY: 'auto' }}>
              {surveyCandidates.map((s) => (
                <button
                  key={s.id}
                  onClick={() => linkSurvey(s.id)}
                  style={{
                    textAlign: 'left',
                    padding: '0.75rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.5rem',
                    background: 'var(--surface)',
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}
                >
                  <strong>{s.survey_number ?? '—'}</strong> · {s.client_name}
                  <span style={{ color: 'var(--neutral-400)', marginLeft: '0.5rem' }}>
                    ({s.rooms?.[0]?.count ?? 0} ruangan · {s.survey_date})
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* Order Items */}
      <div style={{ marginBottom: '1rem' }}>
        <div
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}
        >
          <h2 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--neutral-700)' }}>Item Pesanan</h2>
          <button
            onClick={openItemForm}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              padding: '0.5rem 1rem',
              background: '#cc7030',
              color: '#fff',
              border: 'none',
              borderRadius: '0.5rem',
              fontWeight: '600',
              fontSize: '0.8rem',
              cursor: 'pointer'
            }}
          >
            <Plus size={14} /> Tambah Item
          </button>
        </div>
        <div className="data-table">
          {items.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--neutral-400)', fontSize: '0.875rem' }}>
              Belum ada item pesanan
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Tipe</th>
                  <th>Produk</th>
                  <th>Ukuran</th>
                  <th>Qty</th>
                  <th>Specs</th>
                  <th>Harga</th>
                  <th>Ready</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const prod = item.product as { name: string; sku?: string } | null
                  const itemTypeLabel =
                    item.item_type === 'laundry'
                      ? '🧺 Laundry'
                      : item.item_type === 'perabot'
                        ? '🪑 Perabot'
                        : '🪟 Gorden'
                  return (
                    <tr key={item.id}>
                      <td>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '999px',
                            background: 'var(--neutral-100)',
                            color: 'var(--neutral-700)'
                          }}
                        >
                          {itemTypeLabel}
                        </span>
                      </td>
                      <td style={{ fontWeight: '500' }}>{prod?.name ?? item.custom_specs ?? '—'}</td>
                      <td style={{ color: 'var(--neutral-600)', fontSize: '0.8rem' }}>{item.size ?? '—'}</td>
                      <td>{item.qty}</td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--neutral-600)', maxWidth: 180 }}>
                        {item.item_type === 'gorden' && (
                          <>
                            {Number(item.meter_gorden ?? 0) > 0 && (
                              <span>Gorden: {Number(item.meter_gorden).toFixed(2)}m</span>
                            )}
                            {item.style_type && <span> • {item.style_type}</span>}
                            {item.meter && <span> • {Number(item.meter).toFixed(2)}m</span>}
                            {(item.poni_lurus || item.poni_gel) && (
                              <span>
                                {' '}
                                • {[item.poni_lurus && 'Lurus', item.poni_gel && 'Gel'].filter(Boolean).join('/')}
                              </span>
                            )}
                          </>
                        )}
                        {item.item_type === 'perabot' && (
                          <>
                            {item.variant_color && <span>Warna: {item.variant_color}</span>}
                            {item.dimension_p && (
                              <span>
                                {' '}
                                • {item.dimension_p}×{item.dimension_l}×{item.dimension_t}cm
                              </span>
                            )}
                            {item.weight && <span> • {item.weight}kg</span>}
                          </>
                        )}
                        {item.item_type === 'laundry' && (
                          <>{item.meter && <span>{Number(item.meter).toFixed(2)}m</span>}</>
                        )}
                      </td>
                      <td style={{ fontWeight: '600', color: '#cc7030' }}>{fmt(item.price)}</td>
                      <td>
                        <button
                          onClick={() => toggleReady(item.id, item.ready)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: item.ready ? '#16a34a' : 'var(--input-border)'
                          }}
                        >
                          <CheckCircle2 size={18} />
                        </button>
                      </td>
                      <td>
                        <button
                          onClick={() => removeItem(item.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Persiapan & Kelengkapan */}
      <div
        style={{
          marginTop: '1.5rem',
          background: 'var(--surface)',
          borderRadius: '0.875rem',
          border: '1px solid #e5e7eb',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            padding: '1rem 1.25rem',
            borderBottom: '1px solid #f3f4f6',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <span style={{ fontSize: '1.1rem' }}>📦</span>
          <h2 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--neutral-700)' }}>Persiapan & Kelengkapan</h2>
          <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--neutral-400)' }}>
            {checklist.filter((i) => i.done).length}/{checklist.length} siap
          </span>
        </div>
        <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {checklist.map((item) => (
            <div
              key={item.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.5rem 0',
                borderBottom: '1px solid #f9fafb'
              }}
            >
              <input
                type="checkbox"
                checked={item.done}
                onChange={(e) => updateChecklistItem(item.key, 'done', e.target.checked)}
                style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#cc7030' }}
              />
              <span
                style={{
                  flex: 1,
                  fontSize: '0.875rem',
                  fontWeight: item.done ? '400' : '500',
                  color: item.done ? 'var(--neutral-400)' : 'var(--neutral-700)',
                  textDecoration: item.done ? 'line-through' : 'none'
                }}
              >
                {item.label}
              </span>
              <input
                type="text"
                placeholder="Catatan..."
                value={item.notes}
                onChange={(e) => updateChecklistItem(item.key, 'notes', e.target.value)}
                style={{
                  flex: 2,
                  padding: '0.375rem 0.625rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.375rem',
                  fontSize: '0.8rem',
                  outline: 'none'
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Add Item Modal */}
      <Modal
        open={showItemForm}
        onClose={() => {
          setShowItemForm(false)
          resetForm()
        }}
        maxWidth={580}
        padding="2rem"
      >
        <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.5rem' }}>Tambah Item Pesanan</h2>

        {/* Step 1: Type selector */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {(['gorden', 'perabot', 'laundry'] as ItemType[]).map((t) => {
            const labels: Record<ItemType, string> = {
              gorden: '🪟 Gorden',
              perabot: '🪑 Perabot',
              laundry: '🧺 Laundry'
            }
            return (
              <button
                key={t}
                onClick={() => setItemType(t)}
                style={{
                  flex: 1,
                  padding: '0.625rem',
                  border: `2px solid ${itemType === t ? '#cc7030' : 'var(--neutral-200)'}`,
                  borderRadius: '0.5rem',
                  background: itemType === t ? '#fff7ed' : '#fff',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '0.8rem',
                  color: itemType === t ? '#92400e' : 'var(--neutral-600)'
                }}
              >
                {labels[t]}
              </button>
            )
          })}
        </div>

        <form onSubmit={addItem} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* === GORDEN FORM === */}
          {itemType === 'gorden' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      color: 'var(--neutral-700)',
                      marginBottom: '0.3rem'
                    }}
                  >
                    Produk
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      placeholder="Cari produk..."
                      value={searchProduct}
                      onChange={(e) => setSearchProduct(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.625rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        outline: 'none',
                        background: 'var(--surface)'
                      }}
                    />
                    {searchProduct && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          zIndex: 50,
                          background: 'var(--surface)',
                          border: '1px solid #d1d5db',
                          borderRadius: '0.5rem',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          maxHeight: 200,
                          overflowY: 'auto'
                        }}
                      >
                        <div
                          onClick={() => {
                            setItemForm((f) => ({ ...f, product_id: '', price: '' }))
                            setSearchProduct('')
                          }}
                          style={{
                            padding: '0.5rem 0.75rem',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            color: 'var(--neutral-600)',
                            borderBottom: '1px solid #f3f4f6'
                          }}
                        >
                          — Pilih Produk —
                        </div>
                        {products
                          .filter(
                            (p) =>
                              p.name.toLowerCase().includes(searchProduct.toLowerCase()) ||
                              (p.sku && p.sku.toLowerCase().includes(searchProduct.toLowerCase()))
                          )
                          .map((p) => (
                            <div
                              key={p.id}
                              onClick={() => {
                                setItemForm((f) => ({ ...f, product_id: p.id, price: String(p.price ?? 0) }))
                                setSearchProduct('')
                              }}
                              style={{
                                padding: '0.5rem 0.75rem',
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                                borderBottom: '1px solid #f3f4f6',
                                background: itemForm.product_id === p.id ? '#fef3c7' : 'transparent'
                              }}
                            >
                              <span style={{ fontWeight: 500 }}>{p.name}</span>
                              {p.sku && <span style={{ color: 'var(--neutral-400)', marginLeft: '0.5rem' }}>({p.sku})</span>}
                              <span style={{ float: 'right', color: '#cc7030' }}>
                                {p.price != null
                                  ? new Intl.NumberFormat('id-ID', {
                                      style: 'currency',
                                      currency: 'IDR',
                                      maximumFractionDigits: 0
                                    }).format(p.price)
                                  : ''}
                              </span>
                            </div>
                          ))}
                        {products.filter(
                          (p) =>
                            p.name.toLowerCase().includes(searchProduct.toLowerCase()) ||
                            (p.sku && p.sku.toLowerCase().includes(searchProduct.toLowerCase()))
                        ).length === 0 && (
                          <div style={{ padding: '0.75rem', color: 'var(--neutral-400)', fontSize: '0.8rem' }}>
                            Tidak ada produk ditemukan
                          </div>
                        )}
                      </div>
                    )}
                    {!searchProduct && !itemForm.product_id && (
                      <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--neutral-400)' }}>
                        Ketik untuk mencari produk
                      </div>
                    )}
                    {!searchProduct &&
                      itemForm.product_id &&
                      (() => {
                        const sel = products.find((p) => p.id === itemForm.product_id)
                        return sel ? (
                          <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--neutral-700)' }}>
                            <span style={{ fontWeight: 500 }}>{sel.name}</span>
                            {sel.sku && <span style={{ color: 'var(--neutral-400)', marginLeft: '0.5rem' }}>({sel.sku})</span>}
                          </div>
                        ) : null
                      })()}
                  </div>
                </div>
                {itemType !== 'gorden' && (
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        color: 'var(--neutral-700)',
                        marginBottom: '0.3rem'
                      }}
                    >
                      Qty
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={itemForm.qty}
                      onChange={(e) => setItemForm((f) => ({ ...f, qty: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '0.625rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        outline: 'none'
                      }}
                    />
                  </div>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      color: 'var(--neutral-700)',
                      marginBottom: '0.3rem'
                    }}
                  >
                    Ukuran (cm)
                  </label>
                  <input
                    type="text"
                    placeholder="120 x 250"
                    value={itemForm.size}
                    onChange={(e) => setItemForm((f) => ({ ...f, size: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '0.625rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      outline: 'none'
                    }}
                  />
                </div>
                {itemForm.product_id &&
                  (() => {
                    const prodBom = boms.filter((b) => b.product_id === itemForm.product_id)
                    if (prodBom.length === 0) return null
                    return (
                      <div>
                        <label
                          style={{
                            display: 'block',
                            fontSize: '0.8rem',
                            fontWeight: '600',
                            color: 'var(--neutral-700)',
                            marginBottom: '0.3rem'
                          }}
                        >
                          📋 Material Dibutuhkan
                        </label>
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.25rem',
                            maxHeight: 120,
                            overflowY: 'auto',
                            padding: '0.5rem',
                            background: '#fef3c7',
                            borderRadius: '0.5rem',
                            fontSize: '0.75rem'
                          }}
                        >
                          {prodBom.map((b) => {
                            const mat = b.material
                            const isLow = (mat?.stock_gudang ?? 0) < (b.qty_per_unit ?? 0)
                            return (
                              <div
                                key={b.id}
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  padding: '0.2rem 0'
                                }}
                              >
                                <span
                                  style={{
                                    color: isLow ? '#dc2626' : 'var(--neutral-700)',
                                    fontWeight: isLow ? '700' : '400'
                                  }}
                                >
                                  {mat?.name ?? '—'} × {(b.qty_per_unit ?? 0)} {mat?.unit}
                                </span>
                                <span style={{ color: isLow ? '#dc2626' : '#059669', fontWeight: '600' }}>
                                  {isLow ? '⚠️ Stok kurang' : '✅ Cukup'}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })()}
              </div>
              {itemType === 'gorden' && (
                <div style={{ background: 'var(--neutral-100)', borderRadius: '0.5rem', padding: '1rem' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--neutral-700)', marginBottom: '0.75rem' }}>
                    Meteran Gorden (otomatis dari ukuran)
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          color: 'var(--neutral-600)',
                          marginBottom: '0.25rem'
                        }}
                      >
                        Meter Gorden (m)
                      </label>
                      <input
                        type="text"
                        value={parseGordenMeter(itemForm.size) > 0 ? parseGordenMeter(itemForm.size).toFixed(2) : '0'}
                        readOnly
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '0.375rem',
                          fontSize: '0.8rem',
                          outline: 'none',
                          background: 'var(--surface)'
                        }}
                      />
                      <div style={{ fontSize: '0.68rem', color: 'var(--neutral-400)', marginTop: '0.2rem' }}>
                        = tinggi ukuran ÷ 100 (isi ukuran "lebar x tinggi" di atas)
                      </div>
                    </div>
                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          color: 'var(--neutral-600)',
                          marginBottom: '0.25rem'
                        }}
                      >
                        Berat Auto (kg)
                      </label>
                      <input
                        type="text"
                        value={parseGordenMeter(itemForm.size) > 0 ? (parseGordenMeter(itemForm.size) * 0.4).toFixed(2) : '0'}
                        readOnly
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '0.375rem',
                          fontSize: '0.8rem',
                          outline: 'none',
                          background: 'var(--neutral-100)',
                          color: 'var(--neutral-600)'
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
              {/* Style Variant Cards */}
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--neutral-700)', marginBottom: '0.5rem' }}>
                  Model Gorden
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.5rem' }}>
                  {GORDEN_STYLES.map((style) => (
                    <div
                      key={style}
                      onClick={() => setItemForm((f) => ({ ...f, style_type: style, smokring_color: '' }))}
                      style={{
                        padding: '0.625rem 0.5rem',
                        textAlign: 'center',
                        borderRadius: '0.5rem',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        background: itemForm.style_type === style ? '#cc7030' : '#fff',
                        color: itemForm.style_type === style ? '#fff' : 'var(--neutral-700)',
                        border: `1px solid ${itemForm.style_type === style ? '#cc7030' : 'var(--input-border)'}`
                      }}
                    >
                      {style.charAt(0).toUpperCase() + style.slice(1)}
                    </div>
                  ))}
                </div>
                {itemForm.style_type === 'smokring' && (
                  <div style={{ marginTop: '0.75rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--neutral-600)', marginBottom: '0.4rem' }}>
                      Warna Smokring
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {SMOKRING_COLORS.map((c) => (
                        <div
                          key={c}
                          onClick={() => setItemForm((f) => ({ ...f, smokring_color: c }))}
                          style={{
                            padding: '0.375rem 0.75rem',
                            borderRadius: '9999px',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            background: itemForm.smokring_color === c ? '#cc7030' : '#fff',
                            color: itemForm.smokring_color === c ? '#fff' : 'var(--neutral-700)',
                            border: `1px solid ${itemForm.smokring_color === c ? '#cc7030' : 'var(--input-border)'}`
                          }}
                        >
                          {c}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div style={{ background: 'var(--neutral-100)', borderRadius: '0.5rem', padding: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      background: 'var(--surface)',
                      border: '1px solid var(--input-border)',
                      borderRadius: '0.5rem',
                      padding: '0.625rem 0.75rem'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={itemForm.poni_lurus}
                      onChange={(e) => setItemForm((prev) => ({ ...prev, poni_lurus: e.target.checked }))}
                    />
                    Poni Lurus
                  </label>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      background: 'var(--surface)',
                      border: '1px solid var(--input-border)',
                      borderRadius: '0.5rem',
                      padding: '0.625rem 0.75rem'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={itemForm.poni_gel}
                      onChange={(e) => setItemForm((prev) => ({ ...prev, poni_gel: e.target.checked }))}
                    />
                    Poni Gel
                  </label>
                </div>
                {itemForm.meter_gorden && Number(itemForm.meter_gorden) > 0 && (
                  <div style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: '#16a34a', fontWeight: '600' }}>
                    Estimasi:{' '}
                    {(products.find((p) => p.id === itemForm.product_id)?.price || 0) * Number(itemForm.meter_gorden)}
                  </div>
                )}
              </div>
            </>
          )}

          {/* === PERABOT FORM === */}
          {itemType === 'perabot' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      color: 'var(--neutral-700)',
                      marginBottom: '0.3rem'
                    }}
                  >
                    Produk
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      placeholder="Cari produk..."
                      value={searchProduct}
                      onChange={(e) => setSearchProduct(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.625rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        outline: 'none',
                        background: 'var(--surface)'
                      }}
                    />
                    {searchProduct && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          zIndex: 50,
                          background: 'var(--surface)',
                          border: '1px solid #d1d5db',
                          borderRadius: '0.5rem',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          maxHeight: 200,
                          overflowY: 'auto'
                        }}
                      >
                        <div
                          onClick={() => {
                            setItemForm((f) => ({ ...f, product_id: '', price: '' }))
                            setSearchProduct('')
                          }}
                          style={{
                            padding: '0.5rem 0.75rem',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            color: 'var(--neutral-600)',
                            borderBottom: '1px solid #f3f4f6'
                          }}
                        >
                          — Pilih Produk —
                        </div>
                        {products
                          .filter(
                            (p) =>
                              p.name.toLowerCase().includes(searchProduct.toLowerCase()) ||
                              (p.sku && p.sku.toLowerCase().includes(searchProduct.toLowerCase()))
                          )
                          .map((p) => (
                            <div
                              key={p.id}
                              onClick={() => {
                                setItemForm((f) => ({ ...f, product_id: p.id, price: String(p.price ?? 0) }))
                                setSearchProduct('')
                              }}
                              style={{
                                padding: '0.5rem 0.75rem',
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                                borderBottom: '1px solid #f3f4f6',
                                background: itemForm.product_id === p.id ? '#fef3c7' : 'transparent'
                              }}
                            >
                              <span style={{ fontWeight: 500 }}>{p.name}</span>
                              {p.sku && <span style={{ color: 'var(--neutral-400)', marginLeft: '0.5rem' }}>({p.sku})</span>}
                              <span style={{ float: 'right', color: '#cc7030' }}>
                                {p.price != null
                                  ? new Intl.NumberFormat('id-ID', {
                                      style: 'currency',
                                      currency: 'IDR',
                                      maximumFractionDigits: 0
                                    }).format(p.price)
                                  : ''}
                              </span>
                            </div>
                          ))}
                      </div>
                    )}
                    {!searchProduct &&
                      itemForm.product_id &&
                      (() => {
                        const sel = products.find((p) => p.id === itemForm.product_id)
                        return sel ? (
                          <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--neutral-700)' }}>
                            <span style={{ fontWeight: 500 }}>{sel.name}</span>
                            {sel.sku && <span style={{ color: 'var(--neutral-400)', marginLeft: '0.5rem' }}>({sel.sku})</span>}
                          </div>
                        ) : null
                      })()}
                  </div>
                </div>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      color: 'var(--neutral-700)',
                      marginBottom: '0.3rem'
                    }}
                  >
                    Qty
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={itemForm.qty}
                    onChange={(e) => setItemForm((f) => ({ ...f, qty: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '0.625rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      color: 'var(--neutral-700)',
                      marginBottom: '0.3rem'
                    }}
                  >
                    Harga (Rp)
                  </label>
                  <input
                    type="number"
                    value={itemForm.price}
                    onChange={(e) => setItemForm((f) => ({ ...f, price: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '0.625rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      outline: 'none'
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      color: 'var(--neutral-700)',
                      marginBottom: '0.3rem'
                    }}
                  >
                    Ukuran (cm)
                  </label>
                  <input
                    type="text"
                    placeholder="120 x 250"
                    value={itemForm.size}
                    onChange={(e) => setItemForm((f) => ({ ...f, size: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '0.625rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>
              <div style={{ background: 'var(--neutral-100)', borderRadius: '0.5rem', padding: '1rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--neutral-700)', marginBottom: '0.5rem' }}>
                  Warna & Dimensi
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: 'var(--neutral-600)',
                        marginBottom: '0.25rem'
                      }}
                    >
                      Warna
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Hitam, Silver"
                      value={itemForm.variant_color}
                      onChange={(e) => setItemForm((prev) => ({ ...prev, variant_color: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.375rem',
                        fontSize: '0.8rem',
                        outline: 'none'
                      }}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: 'var(--neutral-600)',
                        marginBottom: '0.25rem'
                      }}
                    >
                      Berat (kg)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0"
                      value={itemForm.weight}
                      onChange={(e) => setItemForm((prev) => ({ ...prev, weight: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.375rem',
                        fontSize: '0.8rem',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3,1fr)',
                    gap: '0.5rem',
                    marginTop: '0.5rem'
                  }}
                >
                  {(['dimension_p', 'P', 'dimension_l', 'L', 'dimension_t', 'T'] as const).map((field, i) => (
                    <div key={field}>
                      <label style={{ fontSize: '0.65rem', color: 'var(--neutral-600)' }}>{['P', 'L', 'T'][i]} (cm)</label>
                      <input
                        type="number"
                        placeholder={['P', 'L', 'T'][i]}
                        value={itemForm[field as keyof typeof itemForm] as string}
                        onChange={(e) => setItemForm((prev) => ({ ...prev, [field]: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '0.4rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '0.375rem',
                          fontSize: '0.8rem',
                          outline: 'none'
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* === LAUNDRY FORM === */}
          {itemType === 'laundry' && (
            <>
              <div style={{ background: 'var(--neutral-100)', borderRadius: '0.5rem', padding: '1rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--neutral-700)', marginBottom: '0.75rem' }}>
                  🧺 Detail Laundry
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: 'var(--neutral-600)',
                        marginBottom: '0.25rem'
                      }}
                    >
                      Nama Customer *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Nama customer"
                      value={itemForm.customer_name}
                      onChange={(e) => setItemForm((f) => ({ ...f, customer_name: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.375rem',
                        fontSize: '0.8rem',
                        outline: 'none'
                      }}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: 'var(--neutral-600)',
                        marginBottom: '0.25rem'
                      }}
                    >
                      Telepon
                    </label>
                    <input
                      type="text"
                      placeholder="08xxxxxxxxxx"
                      value={itemForm.customer_phone}
                      onChange={(e) => setItemForm((f) => ({ ...f, customer_phone: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.375rem',
                        fontSize: '0.8rem',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: 'var(--neutral-600)',
                        marginBottom: '0.25rem'
                      }}
                    >
                      Berat (kg)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={itemForm.kg}
                      onChange={(e) => setItemForm((f) => ({ ...f, kg: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.375rem',
                        fontSize: '0.8rem',
                        outline: 'none'
                      }}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: 'var(--neutral-600)',
                        marginBottom: '0.25rem'
                      }}
                    >
                      Meter (m)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={itemForm.meter_laundry}
                      onChange={(e) => setItemForm((f) => ({ ...f, meter_laundry: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.375rem',
                        fontSize: '0.8rem',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>
                {itemForm.kg && laundryRate > 0 && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#16a34a' }}>
                    Estimasi harga: {fmt(Number(itemForm.kg) * laundryRate)} ({itemForm.kg}kg × {fmt(laundryRate)}
                    /kg)
                  </div>
                )}
                <div style={{ marginTop: '0.75rem' }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: 'var(--neutral-600)',
                      marginBottom: '0.25rem'
                    }}
                  >
                    Keterangan
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Gorden 15kg, Vitras 5kg, dll..."
                    value={itemForm.description}
                    onChange={(e) => setItemForm((f) => ({ ...f, description: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '0.8rem',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>
            </>
          )}

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={() => {
                setShowItemForm(false)
                resetForm()
              }}
              style={{
                flex: 1,
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                background: 'var(--surface)',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={savingItem}
              style={{
                flex: 1,
                padding: '0.75rem',
                background: '#cc7030',
                color: '#fff',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: savingItem ? 'not-allowed' : 'pointer',
                fontWeight: '600'
              }}
            >
              {savingItem ? 'Menyimpan...' : 'Tambah Item'}
            </button>
          </div>
        </form>
      </Modal>

      <OrderActivityLog logs={orderLogs} />

      {/* BUG-007 fix: Modal Jadwalkan Pasang — assign installer + tanggal langsung dari order detail */}
      <Modal
        open={showScheduleModal}
        onClose={() => {
          setShowScheduleModal(false)
          setScheduleForm({ date: '', time: '', installer_id: '' })
        }}
        maxWidth={460}
        padding="1.5rem"
      >
        <form onSubmit={handleSchedule}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: '700' }}>📅 Jadwalkan Pasang</h2>
            <button
              type="button"
              onClick={() => {
                setShowScheduleModal(false)
                setScheduleForm({ date: '', time: '', installer_id: '' })
              }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}
            >
              <XIcon size={18} />
            </button>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--neutral-600)', marginBottom: '1rem' }}>
            Order akan pindah ke <strong>Terjadwal Pasang</strong> dan installer langsung melihat job ini di{' '}
            <strong>/installer/schedule</strong>.
          </p>

          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: 'var(--neutral-700)', marginBottom: '0.3rem' }}>
            Tanggal *
          </label>
          <input
            type="date"
            required
            value={scheduleForm.date}
            onChange={(e) => setScheduleForm((f) => ({ ...f, date: e.target.value }))}
            style={{
              width: '100%',
              padding: '0.625rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              marginBottom: '0.85rem',
              outline: 'none'
            }}
          />

          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: 'var(--neutral-700)', marginBottom: '0.3rem' }}>
            Jam (opsional)
          </label>
          <input
            type="time"
            value={scheduleForm.time}
            onChange={(e) => setScheduleForm((f) => ({ ...f, time: e.target.value }))}
            style={{
              width: '100%',
              padding: '0.625rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              marginBottom: '0.85rem',
              outline: 'none'
            }}
          />

          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: 'var(--neutral-700)', marginBottom: '0.3rem' }}>
            Installer *
          </label>
          <select
            required
            value={scheduleForm.installer_id}
            onChange={(e) => setScheduleForm((f) => ({ ...f, installer_id: e.target.value }))}
            style={{
              width: '100%',
              padding: '0.625rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              marginBottom: '1rem',
              outline: 'none',
              background: 'var(--surface)'
            }}
          >
            <option value="">— Pilih installer —</option>
            {installers.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
          {installers.length === 0 && (
            <p style={{ fontSize: '0.75rem', color: '#ef4444', marginBottom: '1rem' }}>
              ⚠️ Belum ada akun dengan role Installer. Buat di Admin → Staff terlebih dahulu.
            </p>
          )}

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={() => {
                setShowScheduleModal(false)
                setScheduleForm({ date: '', time: '', installer_id: '' })
              }}
              style={{
                flex: 1,
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                background: 'var(--surface)',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={scheduling || !scheduleForm.date || !scheduleForm.installer_id}
              style={{
                flex: 1,
                padding: '0.75rem',
                background: scheduling || !scheduleForm.date || !scheduleForm.installer_id ? 'var(--neutral-400)' : '#cc7030',
                color: '#fff',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: scheduling || !scheduleForm.date || !scheduleForm.installer_id ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem'
              }}
              title="Simpan jadwal & pilih installer untuk pemasangan"
            >
              {scheduling ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <CalendarIcon size={14} />}
              {scheduling ? 'Menyimpan...' : 'Jadwalkan & Assign'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Photo Upload Modal for Status Change */}
      <Modal
        open={showPhotoModal}
        onClose={() => {
          setShowPhotoModal(false)
          setProgressPhotos([])
          setPendingStatus(null)
        }}
        maxWidth={480}
        padding="1.5rem"
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: '700' }}>
            📷 Foto Progress — {pendingStatus ? STATUS_LABELS[pendingStatus as keyof typeof STATUS_LABELS] : ''}
          </h2>
          <button
            onClick={() => {
              setShowPhotoModal(false)
              setProgressPhotos([])
              setPendingStatus(null)
            }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}
          >
            <XIcon size={18} />
          </button>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--neutral-600)', marginBottom: '1rem' }}>
          {pendingStatus && isPhotoRequired(pendingStatus as OrderStatus) ? (
            <>
              <strong style={{ color: '#dc2626' }}>WAJIB</strong> upload minimal <strong>1 foto</strong> untuk stage{' '}
              <strong>{STATUS_LABELS[pendingStatus as keyof typeof STATUS_LABELS]}</strong> (wajib bukti foto). Foto
              akan tercatat sebagai bukti pengerjaan.
            </>
          ) : (
            <>
              <strong style={{ color: '#dc2626' }}>WAJIB</strong> upload minimal <strong>1 foto</strong> sebagai bukti
              pengerjaan. Foto akan tercatat sebagai akuntabilitas siapa yang bertanggung jawab di stage ini.
            </>
          )}
        </p>
        <div
          style={{
            border: '2px dashed #d1d5db',
            borderRadius: '0.5rem',
            padding: '1.5rem',
            textAlign: 'center',
            marginBottom: '1rem',
            cursor: uploadingPhoto ? 'not-allowed' : 'pointer',
            opacity: uploadingPhoto ? 0.6 : 1
          }}
        >
          <input
            type="file"
            accept="image/*"
            onChange={handlePhotoUpload}
            disabled={uploadingPhoto}
            id="progress-photo-input"
            style={{ display: 'none' }}
          />
          <label
            htmlFor="progress-photo-input"
            style={{
              cursor: uploadingPhoto ? 'not-allowed' : 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            {uploadingPhoto ? (
              <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <Upload size={24} style={{ color: 'var(--neutral-400)' }} />
            )}
            <span style={{ fontSize: '0.875rem', color: 'var(--neutral-600)' }}>
              {uploadingPhoto ? 'Mengupload...' : 'Klik untuk upload foto'}
            </span>
          </label>
        </div>
        {progressPhotos.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
            {progressPhotos.map((url, i) => (
              <div key={i} style={{ position: 'relative', width: 72, height: 72 }}>
                <img
                  src={url}
                  style={{
                    width: 72,
                    height: 72,
                    objectFit: 'cover',
                    borderRadius: '0.375rem',
                    border: '1px solid #e5e7eb'
                  }}
                />
                <button
                  onClick={() => setProgressPhotos((p) => p.filter((_, j) => j !== i))}
                  style={{
                    position: 'absolute',
                    top: -6,
                    right: -6,
                    background: '#ef4444',
                    border: 'none',
                    borderRadius: '50%',
                    width: 20,
                    height: 20,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#fff',
                    fontSize: 10
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => {
              setShowPhotoModal(false)
              setProgressPhotos([])
              setPendingStatus(null)
            }}
            style={{
              flex: 1,
              padding: '0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              background: 'var(--surface)',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            Batal
          </button>
          <button
            onClick={() => pendingStatus && updateStatus(pendingStatus, progressPhotos)}
            disabled={updating || progressPhotos.length === 0}
            style={{
              flex: 1,
              padding: '0.75rem',
              background: progressPhotos.length === 0 ? 'var(--neutral-400)' : '#cc7030',
              color: '#fff',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: updating || progressPhotos.length === 0 ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              opacity: updating ? 0.6 : 1
            }}
          >
            {updating ? (
              <Loader2 size={14} style={{ animation: 'spin 1s linear infinite', display: 'inline', marginRight: 4 }} />
            ) : null}
            {progressPhotos.length === 0 ? '📷 Upload foto dulu' : `Lanjut & Simpan (${progressPhotos.length} foto)`}
          </button>
        </div>
      </Modal>

      {/* Cancel Order Modal */}
      <Modal open={showCancelForm} onClose={() => setShowCancelForm(false)} maxWidth={440} padding="2rem">
        <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1rem' }}>❌ Batalkan Order</h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--neutral-600)', marginBottom: '1.25rem' }}>
          Order akan dibatalkan dan payment di-void. Tindakan ini tidak bisa dibatalkan.
        </p>
        <div style={{ marginBottom: '1rem' }}>
          <label
            style={{
              display: 'block',
              fontSize: '0.8rem',
              fontWeight: '600',
              color: 'var(--neutral-700)',
              marginBottom: '0.3rem'
            }}
          >
            Alasan Pembatalan *
          </label>
          <textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            rows={3}
            style={{
              width: '100%',
              padding: '0.625rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              outline: 'none',
              resize: 'vertical'
            }}
            placeholder="Contoh: Customer batal, stok tidak tersedia, dll"
          />
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => setShowCancelForm(false)}
            style={{
              flex: 1,
              padding: '0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              background: 'var(--surface)',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            Batal
          </button>
          <button
            onClick={handleCancel}
            style={{
              flex: 1,
              padding: '0.75rem',
              background: '#ef4444',
              color: '#fff',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            Ya, Batalkan
          </button>
        </div>
      </Modal>

      {/* Return Modal */}
      <Modal open={showReturnForm} onClose={() => setShowReturnForm(false)} maxWidth={480} padding="2rem">
        <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.5rem' }}>📦 Proses Return</h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--neutral-600)', marginBottom: '1.25rem' }}>
          Barang yang dikembalikan akan dicek kondisinya. Bagus → masuk stock toko. Rusak → dispose.
        </p>
        <form onSubmit={handleReturn} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: '600',
                color: 'var(--neutral-700)',
                marginBottom: '0.3rem'
              }}
            >
              Item (opsional)
            </label>
            <select
              value={returnForm.item_id}
              onChange={(e) => setReturnForm((f) => ({ ...f, item_id: e.target.value }))}
              style={{
                width: '100%',
                padding: '0.625rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                outline: 'none',
                background: 'var(--surface)'
              }}
            >
              <option value="">Semua item (return entire order)</option>
              {items.map((it) => (
                <option key={it.id} value={it.id}>
                  {it.product?.name ?? 'Item'} — Qty: {it.qty}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: '600',
                color: 'var(--neutral-700)',
                marginBottom: '0.3rem'
              }}
            >
              Alasan Return *
            </label>
            <textarea
              value={returnForm.reason}
              onChange={(e) => setReturnForm((f) => ({ ...f, reason: e.target.value }))}
              rows={2}
              style={{
                width: '100%',
                padding: '0.625rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                outline: 'none',
                resize: 'vertical'
              }}
              placeholder="Contoh: Barang rusak, tidak sesuai ukuran, dll"
            />
          </div>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: '600',
                color: 'var(--neutral-700)',
                marginBottom: '0.3rem'
              }}
            >
              Kondisi Barang *
            </label>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {[
                ['good', '✅ Bagus (masuk stock)'],
                ['damaged', '❌ Rusak (dispose)']
              ].map(([val, label]) => (
                <label
                  key={val}
                  onClick={() => setReturnForm((f) => ({ ...f, condition: val as 'good' | 'damaged' }))}
                  style={{
                    flex: 1,
                    cursor: 'pointer',
                    border: `2px solid ${returnForm.condition === val ? '#9333ea' : 'var(--neutral-200)'}`,
                    borderRadius: '0.5rem',
                    padding: '0.75rem',
                    background: returnForm.condition === val ? '#f5f3ff' : '#fff',
                    textAlign: 'center'
                  }}
                >
                  <input
                    type="radio"
                    name="condition"
                    value={val}
                    checked={returnForm.condition === val}
                    onChange={() => {}}
                    style={{ display: 'none' }}
                  />
                  <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>{label}</span>
                </label>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  color: 'var(--neutral-700)',
                  marginBottom: '0.3rem'
                }}
              >
                Qty Return
              </label>
              <input
                type="number"
                min="1"
                value={returnForm.qty}
                onChange={(e) => setReturnForm((f) => ({ ...f, qty: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  outline: 'none'
                }}
              />
            </div>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  color: 'var(--neutral-700)',
                  marginBottom: '0.3rem'
                }}
              >
                Refund (Rp)
              </label>
              <input
                type="number"
                min="0"
                value={returnForm.refund_amount}
                onChange={(e) => setReturnForm((f) => ({ ...f, refund_amount: e.target.value }))}
                placeholder="0 = tidak ada refund"
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  outline: 'none'
                }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setShowReturnForm(false)}
              style={{
                flex: 1,
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                background: 'var(--surface)',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Batal
            </button>
            <button
              type="submit"
              style={{
                flex: 1,
                padding: '0.75rem',
                background: '#9333ea',
                color: '#fff',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Simpan Return
            </button>
          </div>
        </form>
      </Modal>

      {/* Payment Modal */}
      <Modal open={showPaymentForm} onClose={() => setShowPaymentForm(false)} maxWidth={400} padding="2rem">
        <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1rem' }}>+ Tambah Pembayaran</h2>
        <form onSubmit={handleAddPayment} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: '600',
                color: 'var(--neutral-700)',
                marginBottom: '0.3rem'
              }}
            >
              Tipe Pembayaran
            </label>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {(
                [
                  ['dp', '💰 DP'],
                  ['lunas', '✅ Lunas']
                ] as const
              ).map(([val, label]) => (
                <label
                  key={val}
                  onClick={() => setPaymentForm((f) => ({ ...f, type: val }))}
                  style={{
                    flex: 1,
                    cursor: 'pointer',
                    border: `2px solid ${paymentForm.type === val ? '#16a34a' : 'var(--neutral-200)'}`,
                    borderRadius: '0.5rem',
                    padding: '0.75rem',
                    background: paymentForm.type === val ? '#f0fdf4' : '#fff',
                    textAlign: 'center'
                  }}
                >
                  <input
                    type="radio"
                    name="paymentType"
                    value={val}
                    checked={paymentForm.type === val}
                    onChange={() => {}}
                    style={{ display: 'none' }}
                  />
                  <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>{label}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: '600',
                color: 'var(--neutral-700)',
                marginBottom: '0.3rem'
              }}
            >
              Jumlah (Rp)
            </label>
            <input
              type="number"
              min="1"
              value={paymentForm.amount}
              onChange={(e) => setPaymentForm((f) => ({ ...f, amount: e.target.value }))}
              style={{
                width: '100%',
                padding: '0.625rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                outline: 'none'
              }}
            />
            <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--neutral-600)' }}>
              Sisa: {fmt(order.total_amount - order.dp_amount - order.lunas_amount)}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={() => setShowPaymentForm(false)}
              style={{
                flex: 1,
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                background: 'var(--surface)',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={savingPayment}
              style={{
                flex: 1,
                padding: '0.75rem',
                background: '#16a34a',
                color: '#fff',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: savingPayment ? 'not-allowed' : 'pointer',
                fontWeight: '600'
              }}
            >
              {savingPayment ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </Modal>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <Modal open={!!photoPopup} onClose={() => setPhotoPopup(null)} maxWidth={480} padding="1.5rem" zIndex={300}>
        {photoPopup && (
          <>
            <div
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}
            >
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: '700', margin: 0 }}>📷 Foto Progress</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--neutral-600)', margin: '0.25rem 0 0' }}>
                  {STATUS_LABELS[photoPopup.stage as keyof typeof STATUS_LABELS]} — {photoPopup.photos.length} foto
                </p>
              </div>
              <button
                onClick={() => setPhotoPopup(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}
              >
                <XIcon size={20} />
              </button>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3,1fr)',
                gap: '0.5rem',
                maxHeight: 400,
                overflowY: 'auto'
              }}
            >
              {photoPopup.photos.map((url, i) => (
                <div
                  key={i}
                  style={{
                    aspectRatio: '1',
                    overflow: 'hidden',
                    borderRadius: '0.5rem',
                    border: '1px solid #e5e7eb',
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    setLightboxPhotos(photoPopup.photos)
                    setLightboxIndex(i)
                    setLightboxOpen(true)
                  }}
                >
                  <img src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
            </div>
          </>
        )}
      </Modal>

      {lightboxOpen && (
        <Lightbox
          photos={lightboxPhotos}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
          onNext={() => setLightboxIndex((i) => (i < lightboxPhotos.length - 1 ? i + 1 : i))}
          onPrev={() => setLightboxIndex((i) => (i > 0 ? i - 1 : i))}
        />
      )}
    </div>
  )
}
