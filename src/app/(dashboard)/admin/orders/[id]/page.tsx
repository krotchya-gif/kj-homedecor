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
  Camera
} from 'lucide-react'
import Link from 'next/link'
import type { Order, OrderItem, Product, Customer, PreparationChecklistItem, OrderStatus } from '@/types'
import { STATUS_LABELS, PAYMENT_STATUS_LABELS, SOURCE_LABELS, GORDEN_STYLES, SMOKRING_COLORS } from '@/types'
import { uploadToLocal } from '@/lib/upload'
import { Lightbox, LightboxGallery } from '@/components/ui/Lightbox'
import { Modal } from '@/components/ui/Modal'
import { generateInvoicePDF, generatePackingListPDF } from '@/lib/invoice'

// V3 Pipeline: ORDER_STATUSES now conditional based on order.classification
// Use shared util ORDER_STAGES_BY_CLASSIFICATION untuk single source of truth
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  new: { bg: '#dbeafe', text: '#1e40af' },
  sorted: { bg: '#e0e7ff', text: '#3730a3' },
  payment_ok: { bg: '#d1fae5', text: '#065f46' },
  production: { bg: '#fef3c7', text: '#92400e' },
  steam: { bg: '#fef3c7', text: '#92400e' },
  ready: { bg: '#cffafe', text: '#155e75' },
  packed: { bg: '#ede9fe', text: '#5b21b6' },
  shipped: { bg: '#dbeafe', text: '#1e3a8a' },
  done: { bg: '#f0fdf4', text: '#166534' }
}
const PAYMENT_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: '#fef2f2', text: '#991b1b' },
  partial: { bg: '#fffbeb', text: '#92400e' },
  paid: { bg: '#d1fae5', text: '#065f46' }
}

type ItemType = 'gorden' | 'perabot' | 'laundry'

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

// Role → stage yang boleh di-LANJUTKAN (mirror API di /api/orders/[id]/route.ts)
// Setiap role hanya boleh klik "Lanjut" di stage yang menjadi tanggung jawabnya.
// Admin/owner adalah escape hatch (bisa semua).
// Penjual tombol Lanjut: sembunyikan kalau bukan role ini.
// Stage transition permissions — setiap role hanya boleh klik "Lanjut" di stage yang menjadi tanggung jawabnya.
// Owner = escape hatch (bisa semua stage). Admin TIDAK escape hatch — hanya di sortir (awal) dan shipping (akhir).
// Source of truth: matrix di Pipeline V2 docs
const ROLE_NEXT_ALLOWED: Record<string, string[]> = {
  // Admin: sortir order (awal) + shipping akhir + escape hatch pembayaran
  admin: ['new', 'payment_ok', 'sorted', 'packed', 'shipped'],
  // Owner: escape hatch — semua stage
  owner: ['new', 'payment_ok', 'sorted', 'production', 'steam', 'ready', 'packed', 'shipped', 'done'],
  // Gudang: sortir (setelah approve finance) + produksi + QC jahitan + packing
  // 2026-07-31: payment_ok→sorted (sortir) & ready→packed (packing) pindah ke gudang
  gudang: ['payment_ok', 'sorted', 'production', 'steam', 'ready', 'packed'],
  // Finance: approve pembayaran di DEPAN (new → payment_ok, verifikasi DP/lunas sebelum produksi)
  finance: ['new'],
  // Installer: shipping akhir
  installer: ['packed', 'shipped']
  // Penjahit: TIDAK boleh klik "Lanjut" di order detail (mereka kerjakan via /penjahit/jobs)
}
function canRoleAdvanceNext(role: string, currentStatus: string): boolean {
  // Owner adalah escape hatch — boleh semua
  if (role === 'owner') return true
  const allowed = ROLE_NEXT_ALLOWED[role] ?? []
  return allowed.includes(currentStatus)
}
// Tampilkan list role yang bertanggung jawab untuk advance dari currentStatus
function getResponsibleRoles(currentStatus: string): string {
  const responsibles: string[] = []
  for (const [role, stages] of Object.entries(ROLE_NEXT_ALLOWED)) {
    if (stages.includes(currentStatus)) responsibles.push(role)
  }
  // Owner selalu termasuk (escape hatch)
  if (!responsibles.includes('owner')) responsibles.push('owner')
  return responsibles.join(', ')
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [order, setOrder] = useState<Order | null>(null)
  const [items, setItems] = useState<OrderItem[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [orderLogs, setOrderLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [currentUserRole, setCurrentUserRole] = useState<string>('admin')

  // BOM data for material suggestion
  const [boms, setBoms] = useState<any[]>([])
  const [materials, setMaterials] = useState<any[]>([])

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
  const [orderPhotos, setOrderPhotos] = useState<any[]>([])
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxPhotos, setLightboxPhotos] = useState<string[]>([])
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [photoPopup, setPhotoPopup] = useState<{ stage: string; photos: string[] } | null>(null)

  // Photo upload modal for status change
  const [showPhotoModal, setShowPhotoModal] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<string | null>(null)
  const [progressPhotos, setProgressPhotos] = useState<string[]>([])
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
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
      supabase.from('orders').select('*, customer:customers(name,phone,address)').eq('id', id).single(),
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
    setOrderLogs((logsRes.data ?? []) as any[])
    setOrderPhotos((photosRes.data ?? []) as any[])
    setBoms((bomsRes.data ?? []) as any[])
    setMaterials((matsRes.data ?? []) as any[])
    // Init checklist if not exists
    if (checklistRes.data) {
      setChecklist(checklistRes.data.items as PreparationChecklistItem[])
    } else {
      await supabase.from('order_preparation_checklists').insert({ order_id: id, items: DEFAULT_CHECKLIST })
      setChecklist(DEFAULT_CHECKLIST)
    }
    setLoading(false)
  }

  async function updateChecklistItem(key: string, field: 'done' | 'notes', value: boolean | string) {
    const updated = checklist.map((item) => (item.key === key ? { ...item, [field]: value } : item))
    setChecklist(updated)
    await supabase
      .from('order_preparation_checklists')
      .update({ items: updated, updated_at: new Date().toISOString() })
      .eq('order_id', id)
  }

  async function loadRates() {
    const { data: lr } = await supabase.from('laundry_rates').select('rate_per_kg').eq('is_active', true).single()
    setLaundryRate((lr as any)?.rate_per_kg ?? 0)
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
      alert('Gagal upload foto')
    } finally {
      setUploadingPhoto(false)
    }
  }

  async function updateStatus(newStatus: string, photoUrls: string[] = []) {
    if (!order) return
    // Payment gate: packed/shipped/done tetap wajib lunas.
    // 2026-07-31: finance approve di DEPAN (new→payment_ok = verifikasi DP/lunas sudah masuk),
    // lunas penuh tetap wajib sebelum packed/dikirim.
    if (['packed', 'shipped', 'done'].includes(newStatus) && order.payment_status !== 'paid') {
      alert('⚠️ Payment gate: order belum lunas. Finance harus approve pembayaran dulu (status Cek Bayar).')
      return
    }
    setUpdating(true)
    const {
      data: { user }
    } = await supabase.auth.getUser()

    // 1) Update order status (client-side direct, simple & reliable)
    const { error: updateErr } = await supabase.from('orders').update({ status: newStatus }).eq('id', id)
    if (updateErr) {
      alert('Gagal update status: ' + updateErr.message)
      setUpdating(false)
      return
    }

    // 2) Catat ke order_logs untuk audit trail
    await supabase.from('order_logs').insert({
      order_id: id,
      action:
        newStatus === 'sorted'
          ? 'sorted'
          : newStatus === 'payment_ok'
            ? 'payment_verified'
            : newStatus === 'production'
              ? 'production_started'
              : newStatus === 'ready'
                ? 'qc_pass'
                : newStatus === 'packed'
                  ? 'packed'
                  : newStatus === 'shipped'
                    ? 'shipped'
                    : newStatus === 'done'
                      ? 'done'
                      : newStatus,
      notes: `Status diubah oleh Admin dari "${STATUS_LABELS[order.status as keyof typeof STATUS_LABELS]}" → "${STATUS_LABELS[newStatus as keyof typeof STATUS_LABELS]}"`,
      staff_id: user?.id ?? null
    })

    // 3) Save progress photos (accountability)
    for (const url of photoUrls) {
      await supabase.from('order_progress_photos').insert({
        order_id: id,
        stage: newStatus,
        photo_url: url,
        uploaded_by: user?.id ?? null
      })
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
          (s: number, i: any) => s + Number(i.meter_gorden ?? i.meter ?? 0),
          0
        )
        const totalMeterVitras = (orderItems ?? []).reduce((s: number, i: any) => s + Number(i.meter_vitras ?? 0), 0)
        const totalMeterRoman = (orderItems ?? []).reduce((s: number, i: any) => s + Number(i.meter_roman ?? 0), 0)
        const totalMeterKupuKupu = (orderItems ?? []).reduce(
          (s: number, i: any) => s + Number(i.meter_kupu_kupu ?? 0),
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
          alert(
            '⚠️ Order sudah di-update ke production, TAPI gagal membuat production_job: ' +
              jobErr.message +
              '\n\nGudang tidak akan melihat order ini di /gudang/production. Hubungi developer untuk fix data integrity.'
          )
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

  async function handleCancel() {
    if (!order || !cancelReason.trim()) {
      alert('Alasan pembatalan wajib diisi.')
      return
    }
    const {
      data: { user }
    } = await supabase.auth.getUser()
    await supabase
      .from('payments')
      .update({ notes: `VOIDED — Order cancelled (${cancelReason}) - ${new Date().toISOString()}` })
      .eq('order_id', id)
    await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        return_reason: cancelReason,
        dp_amount: 0,
        lunas_amount: 0,
        payment_status: 'pending'
      })
      .eq('id', id)
    await supabase.from('order_logs').insert({
      order_id: id,
      action: 'cancelled',
      notes: `Order dibatalkan oleh Admin. Alasan: ${cancelReason}. Payment di-void.`,
      staff_id: user?.id ?? null
    })
    alert('Order berhasil dibatalkan.')
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
        alert('Tidak ada item untuk diproses return.')
        return
      }
      // Process stock updates first
      for (const item of items) {
        if (item.product_id) {
          await supabase.from('inventory_movements').insert({
            product_id: item.product_id,
            type: 'return_in',
            qty: item.qty ?? 1,
            reason: `Return dari order ${id.slice(0, 8)} — kondisi bagus, masuk stock toko`,
            created_by: user?.id ?? null
          })
          const { error } = await supabase.rpc('increment_stock_toko', {
            product_id: item.product_id,
            amount: item.qty ?? 1
          })
          if (error)
            await supabase
              .from('products')
              .update({ stock_toko: (item.product?.stock_toko ?? 0) + (item.qty ?? 1) })
              .eq('id', item.product_id)
        }
      }
    }

    // Insert return record (after stock updates validated)
    const { data: retData } = await supabase
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

    // Update order item if specific item selected
    if (returnForm.item_id) {
      await supabase
        .from('order_items')
        .update({ returned_at: new Date().toISOString(), return_reason: returnForm.reason })
        .eq('id', returnForm.item_id)
    }

    // Update order status to returned
    await supabase.from('orders').update({ status: 'returned', return_reason: returnForm.reason }).eq('id', id)

    // Log the action
    await supabase.from('order_logs').insert({
      order_id: id,
      action: 'return_initiated',
      notes: `Return diproses oleh Admin. Kondisi: ${returnForm.condition === 'good' ? 'Bagus → masuk stock' : 'Rusak → dispose'}. Alasan: ${returnForm.reason}. Refund: Rp${refundAmt.toLocaleString('id-ID')}`,
      staff_id: user?.id ?? null
    })

    alert(
      `Return berhasil dicatat.\nKondisi: ${returnForm.condition === 'good' ? 'Bagus → masuk stock' : 'Rusak → dispose'}\nRefund: Rp${refundAmt.toLocaleString('id-ID')}`
    )
    setShowReturnForm(false)
    setReturnForm({ item_id: '', reason: '', condition: 'good', qty: '1', refund_amount: '' })
    load()
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault()
    setSavingItem(true)

    // Validate qty for non-laundry items
    const qty = Number(itemForm.qty)
    if (itemType !== 'laundry' && (!itemForm.product_id || qty < 1)) {
      alert('Pilih produk dan qty minimal 1.')
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
        alert('Gagal buat laundry order: ' + laundErr.message)
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
        alert('Gagal tambah item laundry: ' + itemErr.message)
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
        alert('Gagal tambah item: ' + itemErr.message)
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
      alert('Item tersimpan, tapi gagal hitung ulang total: ' + totalErr.message)
      load()
      setSavingItem(false)
      setShowItemForm(false)
      resetForm()
      return
    }
    const total = (newItems ?? []).reduce((s, i) => s + i.price * i.qty, 0)
    const { error: updateErr } = await supabase.from('orders').update({ total_amount: total }).eq('id', id)
    if (updateErr) {
      alert('Item tersimpan, tapi gagal update total order: ' + updateErr.message)
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

  async function removeItem(itemId: string) {
    if (!confirm('Hapus item ini?')) return
    await supabase.from('order_items').delete().eq('id', itemId)
    load()
  }

  async function toggleReady(itemId: string, current: boolean) {
    await supabase.from('order_items').update({ ready: !current }).eq('id', itemId)
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, ready: !current } : i)))
  }

  async function handleAddPayment(e: React.FormEvent) {
    e.preventDefault()
    if (!order || !paymentForm.amount) {
      alert('Jumlah pembayaran wajib diisi.')
      return
    }
    setSavingPayment(true)
    const {
      data: { user }
    } = await supabase.auth.getUser()
    const amount = Number(paymentForm.amount)
    await supabase.from('payments').insert({
      order_id: id,
      type: paymentForm.type,
      amount,
      verified_by: user?.id ?? null,
      verified_at: new Date().toISOString()
    })
    // Update order dp/lunas
    const newDp = paymentForm.type === 'dp' ? order.dp_amount + amount : order.dp_amount
    const newLunas =
      paymentForm.type === 'lunas'
        ? order.lunas_amount + amount
        : paymentForm.type === 'dp'
          ? Math.max(0, order.total_amount - newDp)
          : order.lunas_amount
    const newPaid = newDp + newLunas >= order.total_amount ? 'paid' : newDp > 0 ? 'partial' : 'pending'
    await supabase
      .from('orders')
      .update({
        dp_amount: newDp,
        lunas_amount: newLunas,
        payment_status: newPaid
      })
      .eq('id', id)
    await supabase.from('order_logs').insert({
      order_id: id,
      action: 'payment_added',
      notes: `Pembayaran ${paymentForm.type === 'dp' ? 'DP' : 'Lunas'} Rp${amount.toLocaleString('id-ID')} oleh Admin.`,
      staff_id: user?.id ?? null
    })
    alert('Pembayaran berhasil dicatat.')
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
  // V3: ORDER_STATUSES now conditional per classification (kirim vs pasang)
  const orderClassification: 'kirim' | 'pasang' = (order.classification ?? 'kirim') as 'kirim' | 'pasang'
  const ORDER_STATUSES = ORDER_STAGES_BY_CLASSIFICATION[orderClassification] ?? ORDER_STAGES_BY_CLASSIFICATION.kirim
  const statusIdx = (ORDER_STATUSES as readonly string[]).indexOf(order.status)
  const nextStatus: OrderStatus | null =
    statusIdx >= 0 && statusIdx < ORDER_STATUSES.length - 1 ? (ORDER_STATUSES[statusIdx + 1] as OrderStatus) : null
  // V3: dynamic button label (mis. 'Input Resi' vs 'Jadwalkan Pasang')
  const nextStageButtonLabel = nextStatus ? getNextStageButtonLabel(nextStatus, orderClassification) : 'Lanjut'

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
                setPendingStatus(nextStatus)
                setShowPhotoModal(true)
              }}
              disabled={updating}
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
          >
            📦 Return
          </button>
        )}
        {order.status !== 'cancelled' && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() =>
                generateInvoicePDF({
                  order: { ...order, order_items: items } as any,
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
            >
              <FileText size={14} /> Invoice
            </button>
            <button
              onClick={() =>
                generatePackingListPDF({
                  order: { ...order, order_items: items } as any,
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
            >
              <Package size={14} /> Packing List
            </button>
          </div>
        )}
      </div>

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
            const stagePhotos = orderPhotos.filter((p) => p.stage === s)
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
            >
              + Tambah Pembayaran
            </button>
          </div>
        </div>
      </div>

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
                            const isLow = (mat?.stock_gudang ?? 0) < b.qty_per_unit
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
                                  {mat?.name ?? '—'} × {b.qty_per_unit} {mat?.unit}
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
              <div style={{ background: 'var(--neutral-100)', borderRadius: '0.5rem', padding: '1rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--neutral-700)', marginBottom: '0.75rem' }}>
                  Meteran Gorden
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
                      type="number"
                      step="0.01"
                      min="0"
                      value={itemForm.meter_gorden}
                      onChange={(e) => setItemForm((prev) => ({ ...prev, meter_gorden: e.target.value }))}
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
                      Berat Auto (kg)
                    </label>
                    <input
                      type="text"
                      value={itemForm.meter_gorden ? (Number(itemForm.meter_gorden) * 0.4).toFixed(2) : '0'}
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
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                      fontSize: '0.8rem',
                      cursor: 'pointer'
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
                      cursor: 'pointer'
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

      {/* Activity Log */}
      <div style={{ marginTop: '1.5rem' }}>
        <div
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}
        >
          <h2 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--neutral-700)' }}>Riwayat Aktivitas</h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--neutral-400)' }}>Semua aksi dicatat &bull; Admin bisa pantau</span>
        </div>
        {orderLogs.length === 0 ? (
          <div
            style={{
              padding: '2rem',
              textAlign: 'center',
              color: 'var(--neutral-400)',
              background: 'var(--neutral-100)',
              border: '1px solid #e5e7eb',
              borderRadius: '0.75rem',
              fontSize: '0.875rem'
            }}
          >
            Belum ada aktivitas tercatat
          </div>
        ) : (
          <div style={{ background: 'var(--surface)', border: '1px solid #e5e7eb', borderRadius: '0.75rem', overflow: 'hidden' }}>
            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              {orderLogs.map((log: any) => (
                <div
                  key={log.id}
                  style={{
                    display: 'flex',
                    gap: '0.875rem',
                    padding: '0.875rem 1.25rem',
                    borderBottom: '1px solid #f3f4f6',
                    alignItems: 'flex-start'
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: '#fef3c7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <span style={{ fontSize: '0.65rem' }}>🔔</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                      <span style={{ fontWeight: '700', fontSize: '0.82rem', color: 'var(--neutral-700)' }}>
                        {log.action.replace(/_/g, ' ').toUpperCase()}
                      </span>
                      {log.staff && (
                        <span
                          style={{
                            fontSize: '0.75rem',
                            color: 'var(--neutral-600)',
                            background: 'var(--neutral-100)',
                            padding: '0.1rem 0.5rem',
                            borderRadius: '999px'
                          }}
                        >
                          👤 {log.staff.name}
                        </span>
                      )}
                    </div>
                    {log.notes && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--neutral-600)', marginBottom: '0.25rem' }}>{log.notes}</div>
                    )}
                    <div style={{ fontSize: '0.75rem', color: 'var(--neutral-400)' }}>
                      {new Date(log.created_at).toLocaleString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

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
          {pendingStatus && isPhotoRequired(pendingStatus as any) ? (
            <>
              <strong style={{ color: '#dc2626' }}>WAJIB</strong> upload minimal <strong>1 foto</strong> untuk stage{' '}
              <strong>{STATUS_LABELS[pendingStatus as keyof typeof STATUS_LABELS]}</strong> (V3 accountability). Foto
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
                  {(it.product as any)?.name ?? 'Item'} — Qty: {it.qty}
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
