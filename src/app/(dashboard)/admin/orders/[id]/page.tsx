'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { ORDER_STAGES_BY_CLASSIFICATION, getNextStage, getNextStageButtonLabel, isPhotoRequired } from '@/lib/orders'
import {
  ArrowLeft,
  ChevronRight,
  Loader2,
  Upload,
  X as XIcon,
  ImageIcon,
  FileText,
  Package,
  AlertTriangle,
  Truck,
  Calendar as CalendarIcon
} from 'lucide-react'
import Link from 'next/link'
import type { Order, OrderItem, Product, Customer, PreparationChecklistItem, OrderStatus } from '@/types'
import { STATUS_LABELS } from '@/types'
import { Material, Survey } from '@/types'

import { uploadToLocal } from '@/lib/upload'
import { Lightbox, LightboxGallery } from '@/components/ui/Lightbox'
import { Modal } from '@/components/ui/Modal'
import { generateInvoicePDF, generatePackingListPDF, generateFakturPDF, generateSuratJalanPDF } from '@/lib/invoice'
import { useToast } from '@/components/ui/Toast'
import { createSimpleJournal } from '@/utils/journal/create'
import { canRoleAdvanceNext, getResponsibleRoles, parseGordenMeter, STATUS_COLORS, getOrderLogAction, DEFAULT_CHECKLIST } from '@/lib/order-detail'
import type { ItemType, OrderLog, OrderPhoto, BomRow, MeterRow, SurveyCand } from '@/lib/order-detail'
import { formatDateDDMMYYYY } from '@/lib/utils'
import OrderActivityLog from '@/components/orders/OrderActivityLog'
import ScheduleInstallModal from '@/components/orders/ScheduleInstallModal'
import PhotoUploadModal from '@/components/orders/PhotoUploadModal'
import CancelOrderModal from '@/components/orders/CancelOrderModal'
import ReturnModal from '@/components/orders/ReturnModal'
import PaymentModal from '@/components/orders/PaymentModal'
import OrderPipelineStepper from '@/components/orders/OrderPipelineStepper'
import OrderSurveySection from '@/components/orders/OrderSurveySection'
import OrderSummarySection from '@/components/orders/OrderSummarySection'
import OrderItemsTable from '@/components/orders/OrderItemsTable'
import PreparationChecklist from '@/components/orders/PreparationChecklist'
import AddItemModal from '@/components/orders/AddItemModal'

// Pipeline: ORDER_STAGES_BY_CLASSIFICATION (src/lib/orders.ts) = single source of truth.
// STATUS_COLORS / PAYMENT_COLORS / ROLE_NEXT_ALLOWED / canRoleAdvanceNext /
// getResponsibleRoles / parseGordenMeter / types â€” di-extract ke src/lib/order-detail.ts
// (refactor 2026-08-12, Stage 1 â€” logika murni, bisa di-unit-test).

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

  // item form â€” gorden
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

  // BUG-007 fix (2026-08-11): Jadwalkan Pasang â€” assign installer langsung dari order detail
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
    // maybeSingle (bukan single): kalau tidak ada laundry_rates aktif â†’ 406 (PGRST116) di console
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
    // F-2 fix: order TANPA pembayaran (pending) tidak bisa lanjut proses â€”
    // Finance wajib input DP lalu approve (new â†’ payment_ok / Cek Bayar).
    if (order.payment_status === 'pending' && newStatus !== 'cancelled') {
      toast('warning', 'Order belum dibayar â€” Finance wajib input DP lalu approve (Cek Bayar) sebelum order bisa diproses.')
      return
    }
    // Payment gate: packed/shipped/done tetap wajib lunas.
    // 2026-07-31: finance approve di DEPAN (newâ†’payment_ok = verifikasi DP/lunas sudah masuk),
    // lunas penuh tetap wajib sebelum packed/dikirim.
    if (['packed', 'shipped', 'done'].includes(newStatus) && order.payment_status !== 'paid') {
      toast('warning', 'âš ï¸ Payment gate: order belum lunas. Finance harus approve pembayaran dulu (status Cek Bayar).')
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
    // PENTING: semua action harus masuk daftar chk_action â€” fallback pakai 'status_changed'
    // (bukan newStatus mentah: 'steam'/'install' tidak ada di constraint â†’ insert 400).
    // Phase 6B-1: map action dipindah ke lib/order-detail (getOrderLogAction).
    const { error: logErr } = await supabase.from('order_logs').insert({
      order_id: id,
      action: getOrderLogAction(newStatus),
      notes: `Status diubah oleh Admin dari "${STATUS_LABELS[order.status as keyof typeof STATUS_LABELS]}" â†’ "${STATUS_LABELS[newStatus as keyof typeof STATUS_LABELS]}"`,
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

    // 4) PENTING: sortedâ†’production. Auto-create production_job dengan idempotency check.
    // Kalau insert gagal, ALERT user â€” jangan silent fail. Gudang Production page butuh job ini.
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
          toast('error', 'âš ï¸ Order sudah di-update ke production, TAPI gagal membuat production_job: ' +
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

  // BUG-007 fix (2026-08-11): Jadwalkan Pasang â€” 1 langkah dari order detail.
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

    // F-18 fix: SATU JALUR â€” semua perubahan status booking lewat API route
    // (RPC advance_install_booking_status cascade orders.status â†’ 'scheduled' + order_logs).
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
            notes: `Dijadwalkan dari detail pesanan oleh Admin â€” installer & tanggal dipilih langsung.`
          })
          .select('id')
          .single()
        if (insErr || !newBooking) throw new Error(insErr?.message ?? 'Gagal buat booking')
        bookingId = newBooking.id
      }

      // 2) PUT ke API route â€” RPC update status + cascade orders + log install_started,
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

      // 3) Kolom jadwal di orders (tidak disentuh RPC) â€” set dengan guard status
      const { error: schedErr } = await supabase
        .from('orders')
        .update({
          scheduled_installation_date: scheduleForm.date,
          scheduled_installation_time: scheduleForm.time || null
        })
        .eq('id', id)
        .eq('status', 'scheduled')
      if (schedErr) console.error('Gagal simpan jadwal di orders:', schedErr)

      const installerName = installers.find((i) => i.id === scheduleForm.installer_id)?.name ?? 'â€”'
      setScheduling(false)
      setShowScheduleModal(false)
      setScheduleForm({ date: '', time: '', installer_id: '' })
      toast('success', `âœ… Order terjadwal pasang: ${formatDateDDMMYYYY(scheduleForm.date)} â€” Installer: ${installerName}. Installer akan melihat job di /installer/schedule.`)
      load()
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      console.error('Jadwal pasang gagal:', err)
      setScheduling(false)
      toast('error', 'âš ï¸ Gagal jadwalkan pasang: ' + errMsg)
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
      .update({ notes: `VOIDED â€” Order cancelled (${cancelReason}) - ${new Date().toISOString()}` })
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

    // F-med fix: reversal jurnal saat cancel â€” order_created & payment_received
    // yang sudah tercatat harus dibalik agar laba-rugi & neraca tidak overstated.
    // BUG-060 fix (2026-08-13): cek dulu jurnal yang BENAR-BENAR ada â€” jangan
    // bikin reversal "hantu" untuk jurnal yang tak pernah dibuat (mis. DP yang
    // jurnalnya gagal BUG-058, atau order tanpa pembayaran).
    const totalPaid = (order.dp_amount ?? 0) + (order.lunas_amount ?? 0)
    if ((order.total_amount ?? 0) > 0 || totalPaid > 0) {
      try {
        const { getAccountMapping } = await import('@/utils/journal/create')
        const { createSimpleJournal } = await import('@/utils/journal/create')

        // Cek jurnal order_created nyata (reference order â€” reversal pakai 'order_cancelled')
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
              description: `Reversal order_created â€” order ${(order as { order_number?: string }).order_number ?? id.slice(0, 8)} dibatalkan`,
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
              description: `Reversal pembayaran â€” order ${(order as { order_number?: string }).order_number ?? id.slice(0, 8)} dibatalkan (Rp${totalPaid.toLocaleString('id-ID')})`,
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
            reason: `Return dari order ${id.slice(0, 8)} â€” kondisi bagus, masuk stock toko`,
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
      notes: `Return diproses oleh Admin. Kondisi: ${returnForm.condition === 'good' ? 'Bagus â†’ masuk stock' : 'Rusak â†’ dispose'}. Alasan: ${returnForm.reason}. Refund: Rp${refundAmt.toLocaleString('id-ID')}`,
      staff_id: user?.id ?? null
    })
    if (retLogErr) { console.error('Gagal catat log return:', retLogErr) }

    toast('success', `Return berhasil dicatat.\nKondisi: ${returnForm.condition === 'good' ? 'Bagus â†’ masuk stock' : 'Rusak â†’ dispose'}\nRefund: Rp${refundAmt.toLocaleString('id-ID')}`)
    setShowReturnForm(false)
    setReturnForm({ item_id: '', reason: '', condition: 'good', qty: '1', refund_amount: '' })
    load()
  }

  // Gorden dihitung per ukuran (cm), bukan qty: meter kain = tinggi ukuran Ã· 100
  // Format ukuran: "lebar x tinggi" cm â€” cth "120 x 250" â†’ 2.5 m (parseGordenMeter dari lib)

  async function addItem(e: React.FormEvent) {
    e.preventDefault()
    setSavingItem(true)

    // Validate qty for non-laundry items
    const qty = Number(itemForm.qty)
    if (itemType === 'gorden') {
      // Gorden: tidak pakai qty â€” pakai ukuran cm (meter otomatis = tinggi Ã· 100)
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

      // Gorden: price = product.price per meter Ã— meter needed
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
    // sebelumnya total tidak turun â†’ laporan keuangan & payment status tidak akurat)
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
    // (sebelumnya hanya finance/payments yang berjurnal â†’ buku besar tidak lengkap).
    try {
      await createSimpleJournal({
        transaction_type: 'payment_received',
        reference_type: 'order',
        reference_id: id,
        description: `Pembayaran ${paymentForm.type === 'dp' ? 'DP' : 'Lunas'} Rp${amount.toLocaleString('id-ID')} oleh Admin`,
        amount,
        // F-54 fix: idempotent per payment â€” retry tidak bikin jurnal ganda
        idempotency_key: paymentRow?.id ? `payment:${paymentRow.id}` : undefined
      })
    } catch (jErr) {
      console.error('Gagal buat jurnal pembayaran admin:', jErr)
      toast('warning', 'Pembayaran tercatat, TAPI jurnal GAGAL. Periksa mapping akun.')
    }

    // F-2 fix: hitungan JUJUR â€” DP TIDAK mengisi lunas_amount fiktif.
    // DP â†’ partial; lunas penuh â†’ paid. Payment gate packed tetap wajib paid.
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
      // F-2 fix: guard gagal (race) â†’ rollback row payments agar tidak yatim
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
  // PENTING: label dihitung dari status SAAT INI (bukan nextStatus) â€” kalau pakai
  // nextStatus, tombol sortedâ†’production tampil 'Submit Report' (label utk production)
  // padahal seharusnya 'Mulai Produksi' (bug 2026-08-11 â€” bikin user salah paham)
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
                // BUG-007 fix: packedâ†’scheduled (pasang) buka modal jadwal + assign installer
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
              ðŸ”’ Role <strong style={{ color: '#dc2626' }}>{currentUserRole}</strong> tidak boleh lanjut di stage ini.
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
            âŒ Batalkan
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
            ðŸ“¦ Return
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

      {/* BUG-007 fix: info booking pasang â€” installer & jadwal terlihat langsung di order detail */}
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
            {orderBooking.scheduled_time ? ` â€¢ ${orderBooking.scheduled_time}` : ''}
          </span>
          <span style={{ fontSize: '0.85rem', color: 'var(--neutral-600)' }}>
            â€” Installer:{' '}
            <strong style={{ color: '#cc7030' }}>{orderBooking.installer?.name ?? 'belum di-assign'}</strong>
          </span>
        </div>
      )}

      {/* Status pipeline â€” Phase 6B-3a: diekstrak ke komponen */}
      <OrderPipelineStepper
        statuses={ORDER_STATUSES}
        statusIdx={statusIdx}
        currentStatus={order.status}
        photos={orderPhotos}
        onPhotoClick={(stage, urls) => setPhotoPopup({ stage, photos: urls })}
      />

      {/* Estimasi Selesai + Pelanggan + Info Pesanan â€” Phase 6B-3c: diekstrak ke komponen */}
      <OrderSummarySection
        order={order}
        statuses={ORDER_STATUSES}
        statusIdx={statusIdx}
        customer={customer}
        fmt={fmt}
        onAddPayment={() => setShowPaymentForm(true)}
      />

      {/* Hasil Survey (fitur "hasil survey masuk invoice") â€” Phase 6B-3b: diekstrak ke komponen */}
      <OrderSurveySection
        survey={order.survey}
        surveyLinkOpen={surveyLinkOpen}
        onCloseSurveyLink={() => setSurveyLinkOpen(false)}
        surveyCandidates={surveyCandidates}
        surveyLoading={surveyLoading}
        onUnlink={unlinkSurvey}
        onOpenSurveyLink={openSurveyLink}
        onLinkSurvey={linkSurvey}
      />

      {/* Order Items â€” Phase 6B-3d-2: diekstrak ke komponen */}
      <OrderItemsTable
        items={items}
        fmt={fmt}
        onAddItem={openItemForm}
        onToggleReady={toggleReady}
        onRemoveItem={removeItem}
      />

      {/* Persiapan & Kelengkapan â€” Phase 6B-3d-1: diekstrak ke komponen */}
      <PreparationChecklist checklist={checklist} onUpdate={updateChecklistItem} />

      {/* Add Item Modal — Phase 6B-3d-3: diekstrak ke komponen */}
      <AddItemModal
        open={showItemForm}
        onClose={() => {
          setShowItemForm(false)
          resetForm()
        }}
        onReset={() => {
          setShowItemForm(false)
          resetForm()
        }}
        itemType={itemType}
        setItemType={setItemType}
        itemForm={itemForm}
        setItemForm={setItemForm}
        searchProduct={searchProduct}
        setSearchProduct={setSearchProduct}
        products={products}
        boms={boms}
        laundryRate={laundryRate}
        savingItem={savingItem}
        fmt={fmt}
        onSubmit={addItem}
      />

      <OrderActivityLog logs={orderLogs} />

      {/* BUG-007 fix: Modal Jadwalkan Pasang â€” assign installer + tanggal langsung dari order detail
          Phase 6B-2a: diekstrak ke komponen ScheduleInstallModal (behavior-preserving) */}
      <ScheduleInstallModal
        open={showScheduleModal}
        onClose={() => {
          setShowScheduleModal(false)
          setScheduleForm({ date: '', time: '', installer_id: '' })
        }}
        scheduling={scheduling}
        scheduleForm={scheduleForm}
        setScheduleForm={setScheduleForm}
        installers={installers}
        onSubmit={handleSchedule}
      />

      {/* Photo Upload Modal for Status Change â€” Phase 6B-2b: diekstrak ke komponen */}
      <PhotoUploadModal
        open={showPhotoModal}
        onClose={() => {
          setShowPhotoModal(false)
          setProgressPhotos([])
          setPendingStatus(null)
        }}
        pendingStatus={pendingStatus}
        progressPhotos={progressPhotos}
        setProgressPhotos={setProgressPhotos}
        uploadingPhoto={uploadingPhoto}
        updating={updating}
        onUpload={handlePhotoUpload}
        onConfirm={() => pendingStatus && updateStatus(pendingStatus, progressPhotos)}
      />

      {/* Cancel Order Modal â€” Phase 6B-2c: diekstrak ke komponen */}
      <CancelOrderModal
        open={showCancelForm}
        onClose={() => setShowCancelForm(false)}
        cancelReason={cancelReason}
        setCancelReason={setCancelReason}
        onConfirm={handleCancel}
      />

      {/* Return Modal â€” Phase 6B-2d: diekstrak ke komponen */}
      <ReturnModal
        open={showReturnForm}
        onClose={() => setShowReturnForm(false)}
        returnForm={returnForm}
        setReturnForm={setReturnForm}
        items={items}
        onSubmit={handleReturn}
      />

      {/* Payment Modal â€” Phase 6B-2e: diekstrak ke komponen */}
      <PaymentModal
        open={showPaymentForm}
        onClose={() => setShowPaymentForm(false)}
        paymentForm={paymentForm}
        setPaymentForm={setPaymentForm}
        saving={savingPayment}
        sisa={order.total_amount - order.dp_amount - order.lunas_amount}
        fmt={fmt}
        onSubmit={handleAddPayment}
      />

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <Modal open={!!photoPopup} onClose={() => setPhotoPopup(null)} maxWidth={480} padding="1.5rem" zIndex={300}>
        {photoPopup && (
          <>
            <div
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}
            >
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: '700', margin: 0 }}>ðŸ“· Foto Progress</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--neutral-600)', margin: '0.25rem 0 0' }}>
                  {STATUS_LABELS[photoPopup.stage as keyof typeof STATUS_LABELS]} â€” {photoPopup.photos.length} foto
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
