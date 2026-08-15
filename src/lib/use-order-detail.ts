'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { ORDER_STAGES_BY_CLASSIFICATION, getNextStageButtonLabel } from '@/lib/orders'
import type { Order, OrderItem, Product, PreparationChecklistItem, OrderStatus } from '@/types'
import type { Material } from '@/types'
import { uploadToLocal } from '@/lib/upload'
import { generateInvoicePDF, generatePackingListPDF, generateFakturPDF, generateSuratJalanPDF } from '@/lib/invoice'
import { useToast } from '@/components/ui/Toast'
import { canRoleAdvanceNext, getResponsibleRoles, parseGordenMeter, DEFAULT_CHECKLIST } from '@/lib/order-detail'
import type { ItemType, OrderLog, OrderPhoto, BomRow, SurveyCand } from '@/lib/order-detail'
import { formatDateDDMMYYYY } from '@/lib/utils'

export interface ItemFormState {
  product_id: string
  qty: string
  price: string
  size: string
  meter_gorden: string
  meter: string
  poni_lurus: boolean
  poni_gel: boolean
  style_type: string
  smokring_color: string
  variant_color: string
  dimension_p: string
  dimension_l: string
  dimension_t: string
  weight: string
  customer_name: string
  customer_phone: string
  kg: string
  meter_laundry: string
  description: string
}

export const EMPTY_ITEM_FORM: ItemFormState = {
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
}

// Phase 6B-4: semua state & handlers order detail dipindah ke hook useOrderDetail
// dari page.tsx (behavior-preserving). Page jadi komposisi murni.
export function useOrderDetail(id: string) {
  const { toast } = useToast()
  const supabase = createClient()

  const [order, setOrder] = useState<Order | null>(null)
  const [items, setItems] = useState<OrderItem[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [orderLogs, setOrderLogs] = useState<OrderLog[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [currentUserRole, setCurrentUserRole] = useState<string>('admin')

  const [boms, setBoms] = useState<BomRow[]>([])
  const [materials, setMaterials] = useState<Material[]>([])

  const [itemType, setItemType] = useState<ItemType>('gorden')
  const [laundryRate, setLaundryRate] = useState<number>(0)

  const [itemForm, setItemForm] = useState<ItemFormState>(EMPTY_ITEM_FORM)
  const [savingItem, setSavingItem] = useState(false)
  const [searchProduct, setSearchProduct] = useState('')

  const [orderPhotos, setOrderPhotos] = useState<OrderPhoto[]>([])
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxPhotos, setLightboxPhotos] = useState<string[]>([])
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [photoPopup, setPhotoPopup] = useState<{ stage: string; photos: string[] } | null>(null)

  const [showPhotoModal, setShowPhotoModal] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<string | null>(null)
  const [progressPhotos, setProgressPhotos] = useState<string[]>([])
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

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

  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [paymentForm, setPaymentForm] = useState({ type: 'dp' as 'dp' | 'lunas', amount: '' })
  const [savingPayment, setSavingPayment] = useState(false)
  // Idempotency key per sesi submit: retry setelah timeout TIDAK membuat
  // pembayaran kedua (audit 2026-08-14). Direset saat sukses / modal ditutup.
  const payKeyRef = useRef<string | null>(null)
  // Sesi 52: reset key setiap modal pembayaran DITUTUP — kalau user buka lagi
  // dengan nominal berbeda, jangan dianggap idempotent dari submit sebelumnya.
  useEffect(() => {
    if (!showPaymentForm) payKeyRef.current = null
  }, [showPaymentForm])

  const [checklist, setChecklist] = useState<PreparationChecklistItem[]>([])
  const [showItemForm, setShowItemForm] = useState(false)

  async function load() {
    setLoading(true)
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
        .order('created_at', { ascending: false }),
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
    if (checklistRes.data) {
      setChecklist(checklistRes.data.items as PreparationChecklistItem[])
    } else {
      const { error: initErr } = await supabase.from('order_preparation_checklists').insert({ order_id: id, items: DEFAULT_CHECKLIST })
      if (initErr) { console.error('Gagal init checklist:', initErr) }
      setChecklist(DEFAULT_CHECKLIST)
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function loadRates() {
    const { data: lr } = await supabase.from('laundry_rates').select('rate_per_kg').eq('is_active', true).maybeSingle()
    setLaundryRate(lr?.rate_per_kg ?? 0)
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
    if (order.payment_status === 'pending' && newStatus !== 'cancelled') {
      toast('warning', 'Order belum dibayar — Finance wajib input DP lalu approve (Cek Bayar) sebelum order bisa diproses.')
      return
    }
    if (['packed', 'shipped', 'done'].includes(newStatus) && order.payment_status !== 'paid') {
      toast('warning', '⚠️ Payment gate: order belum lunas. Finance harus approve pembayaran dulu (status Cek Bayar).')
      return
    }
    setUpdating(true)
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, photo_urls: photoUrls })
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) {
        toast('error', json?.error?.message ?? `Gagal update status (HTTP ${res.status})`)
        return
      }

      setOrder((o) => (o ? { ...o, status: newStatus as Order['status'] } : o))
      setShowPhotoModal(false)
      setProgressPhotos([])
      setPendingStatus(null)
      load()
    } catch (error) {
      toast('error', error instanceof Error ? error.message : 'Gagal update status')
    } finally {
      setUpdating(false)
    }
  }

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
    if (!user) {
      setScheduling(false)
      toast('error', 'Sesi login berakhir.')
      return
    }

    try {
      // Penjadwalan ATOMIC di server (schedule_installation_atomic): booking
      // install + orders.scheduled_* + order_logs dalam SATU transaksi.
      // Sebelumnya: insert booking + PUT booking + update orders terpisah →
      // bisa beda data kalau salah satu gagal (temuan audit 2026-08-14).
      const { data: schedData, error: schedErr } = await supabase.rpc('schedule_installation_atomic', {
        p_order_id: id,
        p_installer_id: scheduleForm.installer_id,
        p_date: scheduleForm.date,
        p_time: scheduleForm.time || null,
        p_actor: user.id
      })
      if (schedErr) throw new Error(schedErr.message)
      void schedData

      const installerName = installers.find((i) => i.id === scheduleForm.installer_id)?.name ?? '—'
      setScheduling(false)
      setShowScheduleModal(false)
      setScheduleForm({ date: '', time: '', installer_id: '' })
      toast('success', `✅ Order terjadwal pasang: ${formatDateDDMMYYYY(scheduleForm.date)} — Installer: ${installerName}. Installer akan melihat job di /installer/schedule.`)
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
    if (!user) {
      toast('error', 'Sesi login berakhir.')
      return
    }

    // Batal order diproses SATU transaksi di server (cancel_order_atomic):
    // void payment + orders.status/nominal + jurnal reversal + order_logs.
    // Jika salah satu gagal, seluruhnya rollback (idempoten per order).
    const { error: cancelErr } = await supabase.rpc('cancel_order_atomic', {
      p_order_id: id,
      p_reason: cancelReason,
      p_actor: user.id
    })
    if (cancelErr) {
      toast('error', 'Gagal batalkan order: ' + cancelErr.message)
      return
    }

    toast('success', 'Order berhasil dibatalkan.')
    setShowCancelForm(false)
    load()
  }

  async function handleReturn(e: React.FormEvent) {
    e.preventDefault()
    if (!order) return
    if (!returnForm.reason.trim()) {
      toast('info', 'Alasan return wajib diisi.')
      return
    }
    const {
      data: { user }
    } = await supabase.auth.getUser()
    if (!user) {
      toast('error', 'Sesi login berakhir.')
      return
    }
    const refundAmt = Number(returnForm.refund_amount) || 0
    // Sesi 52: qty <= 0/NaN ditolak (sebelumnya diam-diam jadi 1)
    const returnQty = Number(returnForm.qty)
    if (!Number.isFinite(returnQty) || returnQty <= 0) {
      toast('error', 'Qty return harus lebih dari 0.')
      return
    }

    // Return diproses SATU transaksi di server (process_order_return_atomic):
    // stok produk + inventory_movements + returns + order_items + orders.status
    // + order_logs. Jika salah satu gagal, seluruhnya rollback (idempoten per return).
    const { data: retData, error: retErr } = await supabase.rpc('process_order_return_atomic', {
      p_order_id: id,
      p_order_item_id: returnForm.item_id || null,
      p_reason: returnForm.reason,
      p_condition: returnForm.condition,
      p_qty: returnQty,
      p_refund_amount: refundAmt,
      p_actor: user.id
    })
    if (retErr) { toast('error', 'Gagal proses return: ' + retErr.message); return }

    toast('success', `Return berhasil dicatat.\nKondisi: ${returnForm.condition === 'good' ? 'Bagus → masuk stock' : 'Rusak → dispose'}\nRefund: Rp${refundAmt.toLocaleString('id-ID')}`)
    setShowReturnForm(false)
    setReturnForm({ item_id: '', reason: '', condition: 'good', qty: '1', refund_amount: '' })
    load()
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault()
    setSavingItem(true)

    const qty = Number(itemForm.qty)
    if (itemType === 'gorden') {
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
      const payload = {
        product_id: null,
        item_type: 'laundry',
        linked_laundry_id: laund?.id ?? null,
        qty: 1,
        price,
        meter: Number(itemForm.meter_laundry) || null
      }
      // Item + hitung ulang total order ATOMIC di server (add_order_item_atomic)
      const { error: rpcErr } = await supabase.rpc('add_order_item_atomic', {
        p_order_id: id,
        p_item: payload,
        p_actor: user?.id ?? null
      })
      if (rpcErr) {
        // Rollback laundry_orders kalau item gagal dicatat
        if (laund?.id) await supabase.from('laundry_orders').delete().eq('id', laund.id)
        toast('error', 'Gagal tambah item laundry: ' + rpcErr.message)
        setSavingItem(false)
        return
      }
    } else {
      const prod = products.find((p) => p.id === itemForm.product_id)
      let finalPrice = Number(itemForm.price) || prod?.price || 0

      if (itemType === 'gorden') {
        const meter = Number(itemForm.meter_gorden) || 0
        finalPrice = (prod?.price || 0) * meter
      }

      const payload = {
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
      }
      // Item + hitung ulang total order ATOMIC di server (add_order_item_atomic)
      const {
        data: { user }
      } = await supabase.auth.getUser()
      const { error: rpcErr } = await supabase.rpc('add_order_item_atomic', {
        p_order_id: id,
        p_item: payload,
        p_actor: user?.id ?? null
      })
      if (rpcErr) {
        toast('error', 'Gagal tambah item: ' + rpcErr.message)
        setSavingItem(false)
        return
      }
    }

    setSavingItem(false)
    setShowItemForm(false)
    resetForm()
    load()
  }

  // ---------- link survey ----------
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
    const {
      data: { user }
    } = await supabase.auth.getUser()
    // Link survey via RPC server (RLS orders UPDATE = admin/owner; RPC ikut
    // audit trail order_logs) — bukan direct update client (temuan audit 2026-08-14)
    const { error } = await supabase.rpc('link_survey_atomic', {
      p_order_id: id,
      p_survey_id: surveyId,
      p_actor: user?.id ?? null
    })
    if (error) {
      toast('error', 'Gagal link survey: ' + error.message)
      return
    }
    setSurveyLinkOpen(false)
    load()
  }

  async function unlinkSurvey() {
    if (!confirm('Lepas survey dari order ini?')) return
    const {
      data: { user }
    } = await supabase.auth.getUser()
    const { error } = await supabase.rpc('link_survey_atomic', {
      p_order_id: id,
      p_survey_id: null,
      p_actor: user?.id ?? null
    })
    if (error) {
      toast('error', 'Gagal lepas survey: ' + error.message)
      return
    }
    load()
  }

  async function removeItem(itemId: string) {
    if (!confirm('Hapus item ini?')) return
    const {
      data: { user }
    } = await supabase.auth.getUser()
    // Hapus item + hitung ulang total ATOMIC di server (remove_order_item_atomic)
    const { error: rpcErr } = await supabase.rpc('remove_order_item_atomic', {
      p_order_id: id,
      p_item_id: itemId,
      p_actor: user?.id ?? null
    })
    if (rpcErr) { toast('error', 'Gagal hapus item: ' + rpcErr.message); return }
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
    const amount = Number(paymentForm.amount)
    if (amount <= 0) {
      toast('error', 'Nominal pembayaran harus lebih dari 0.')
      return
    }
    const {
      data: { user }
    } = await supabase.auth.getUser()
    if (!user) {
      setSavingPayment(false)
      toast('error', 'Sesi login berakhir.')
      return
    }
    setSavingPayment(true)
    if (!payKeyRef.current) {
      payKeyRef.current = `payment_submit:${id}:${crypto.randomUUID()}`
    }

    // Pembayaran diproses SATU transaksi di server (add_order_payment_atomic):
    // validasi sisa tagihan + insert payments + jurnal payment_received + orders
    // dp/lunas/payment_status + order_logs. Gagal di tengah → seluruhnya rollback
    // (termasuk row payment), anti double-pay via FOR UPDATE + guard nilai +
    // idempotency key (retry setelah timeout tidak mencatat dua kali).
    const { data: payData, error: payErr } = await supabase.rpc('add_order_payment_atomic', {
      p_order_id: id,
      p_type: paymentForm.type,
      p_amount: amount,
      p_actor: user.id,
      p_idempotency_key: payKeyRef.current
    })
    if (payErr) {
      setSavingPayment(false)
      toast('error', 'Gagal catat pembayaran: ' + payErr.message)
      return
    }

    toast('success', 'Pembayaran berhasil dicatat.')
    payKeyRef.current = null
    setShowPaymentForm(false)
    setPaymentForm({ type: 'dp', amount: '' })
    setSavingPayment(false)
    load()
  }

  function resetForm() {
    setItemType('gorden')
    setItemForm(EMPTY_ITEM_FORM)
    setSearchProduct('')
  }

  function openItemForm() {
    setShowItemForm(true)
    loadRates()
    resetForm()
  }

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

  const customer = order?.customer as { name: string; phone: string; address?: string } | null
  const orderClassification: 'kirim' | 'pasang' = (order?.classification ?? 'kirim') as 'kirim' | 'pasang'
  const ORDER_STATUSES = ORDER_STAGES_BY_CLASSIFICATION[orderClassification] ?? ORDER_STAGES_BY_CLASSIFICATION.kirim
  const statusIdx = (ORDER_STATUSES as readonly string[]).indexOf(order?.status ?? '')
  const nextStatus: OrderStatus | null =
    order && statusIdx >= 0 && statusIdx < ORDER_STATUSES.length - 1
      ? (ORDER_STATUSES[statusIdx + 1] as OrderStatus)
      : null
  const nextStageButtonLabel = order && nextStatus ? getNextStageButtonLabel(order.status, orderClassification) : 'Lanjut'

  return {
    order,
    items,
    products,
    orderLogs,
    loading,
    updating,
    currentUserRole,
    boms,
    materials,
    itemType,
    setItemType,
    laundryRate,
    itemForm,
    setItemForm,
    savingItem,
    searchProduct,
    setSearchProduct,
    orderPhotos,
    lightboxOpen,
    setLightboxOpen,
    lightboxPhotos,
    setLightboxPhotos,
    lightboxIndex,
    setLightboxIndex,
    photoPopup,
    setPhotoPopup,
    showPhotoModal,
    setShowPhotoModal,
    pendingStatus,
    setPendingStatus,
    progressPhotos,
    setProgressPhotos,
    uploadingPhoto,
    installers,
    showScheduleModal,
    setShowScheduleModal,
    scheduling,
    scheduleForm,
    setScheduleForm,
    orderBooking,
    surveyLinkOpen,
    setSurveyLinkOpen,
    surveyCandidates,
    surveyLoading,
    showCancelForm,
    setShowCancelForm,
    cancelReason,
    setCancelReason,
    showReturnForm,
    setShowReturnForm,
    returnForm,
    setReturnForm,
    showPaymentForm,
    setShowPaymentForm,
    paymentForm,
    setPaymentForm,
    savingPayment,
    checklist,
    showItemForm,
    setShowItemForm,
    customer,
    orderClassification,
    ORDER_STATUSES,
    statusIdx,
    nextStatus,
    nextStageButtonLabel,
    updateChecklistItem,
    handlePhotoUpload,
    updateStatus,
    handleSchedule,
    handleCancel,
    handleReturn,
    addItem,
    openSurveyLink,
    linkSurvey,
    unlinkSurvey,
    removeItem,
    toggleReady,
    handleAddPayment,
    openItemForm,
    resetForm,
    openAdvanceModal
  }
}
