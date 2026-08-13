'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { ORDER_STAGES_BY_CLASSIFICATION, getNextStageButtonLabel } from '@/lib/orders'
import type { Order, OrderItem, Product, PreparationChecklistItem, OrderStatus } from '@/types'
import { STATUS_LABELS } from '@/types'
import type { Material } from '@/types'
import { uploadToLocal } from '@/lib/upload'
import { generateInvoicePDF, generatePackingListPDF, generateFakturPDF, generateSuratJalanPDF } from '@/lib/invoice'
import { useToast } from '@/components/ui/Toast'
import { createSimpleJournal } from '@/utils/journal/create'
import { canRoleAdvanceNext, getResponsibleRoles, parseGordenMeter, getOrderLogAction, DEFAULT_CHECKLIST } from '@/lib/order-detail'
import type { ItemType, OrderLog, OrderPhoto, BomRow, MeterRow, SurveyCand } from '@/lib/order-detail'
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

export const ORDER_FMT = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

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
    const {
      data: { user }
    } = await supabase.auth.getUser()

    const { error: updateErr } = await supabase.from('orders').update({ status: newStatus }).eq('id', id)
    if (updateErr) {
      toast('error', 'Gagal update status: ' + updateErr.message)
      setUpdating(false)
      return
    }

    const { error: logErr } = await supabase.from('order_logs').insert({
      order_id: id,
      action: getOrderLogAction(newStatus),
      notes: `Status diubah oleh Admin dari "${STATUS_LABELS[order.status as keyof typeof STATUS_LABELS]}" → "${STATUS_LABELS[newStatus as keyof typeof STATUS_LABELS]}"`,
      staff_id: user?.id ?? null
    })
    if (logErr) { console.error('Gagal catat log:', logErr) }

    for (const url of photoUrls) {
      const { error: photoErr } = await supabase.from('order_progress_photos').insert({
        order_id: id,
        stage: newStatus,
        photo_url: url,
        uploaded_by: user?.id ?? null
      })
      if (photoErr) { console.error('Gagal simpan foto progress:', photoErr) }
    }

    if (newStatus === 'production' && order.status === 'sorted') {
      const { data: existingJob } = await supabase
        .from('production_jobs')
        .select('id')
        .eq('order_id', id)
        .in('status', ['waiting', 'in_progress'])
        .maybeSingle()

      if (!existingJob) {
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

    let bookingId = orderBooking?.id ?? null

    try {
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

    const totalPaid = (order.dp_amount ?? 0) + (order.lunas_amount ?? 0)
    if ((order.total_amount ?? 0) > 0 || totalPaid > 0) {
      try {
        const { getAccountMapping } = await import('@/utils/journal/create')
        const { createSimpleJournal } = await import('@/utils/journal/create')

        const { data: orderJournals } = await supabase
          .from('journal_entries')
          .select('id')
          .eq('reference_type', 'order')
          .eq('reference_id', id)
        const hasOrderJournal = (orderJournals?.length ?? 0) > 0

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

    if (returnForm.item_id) {
      const { error: itemErr } = await supabase
        .from('order_items')
        .update({ returned_at: new Date().toISOString(), return_reason: returnForm.reason })
        .eq('id', returnForm.item_id)
      if (itemErr) { toast('error', 'Gagal update item return: ' + itemErr.message); return }
    }

    const { error: orderErr } = await supabase.from('orders').update({ status: 'returned', return_reason: returnForm.reason }).eq('id', id)
    if (orderErr) { toast('error', 'Gagal update status order: ' + orderErr.message); return }

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
    if (amount <= 0) {
      setSavingPayment(false)
      toast('error', 'Nominal pembayaran harus lebih dari 0.')
      return
    }
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

    try {
      await createSimpleJournal({
        transaction_type: 'payment_received',
        reference_type: 'order',
        reference_id: id,
        description: `Pembayaran ${paymentForm.type === 'dp' ? 'DP' : 'Lunas'} Rp${amount.toLocaleString('id-ID')} oleh Admin`,
        amount,
        idempotency_key: paymentRow?.id ? `payment:${paymentRow.id}` : undefined
      })
    } catch (jErr) {
      console.error('Gagal buat jurnal pembayaran admin:', jErr)
      toast('warning', 'Pembayaran tercatat, TAPI jurnal GAGAL. Periksa mapping akun.')
    }

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
