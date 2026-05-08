'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { ArrowLeft, ChevronRight, Plus, Trash2, CheckCircle2, Loader2 } from 'lucide-react'
import Link from 'next/link'
import type { Order, OrderItem, Product, Customer } from '@/types'
import { STATUS_LABELS, PAYMENT_STATUS_LABELS, SOURCE_LABELS } from '@/types'

const ORDER_STATUSES = ['new','sorted','payment_ok','production','steam','ready','done'] as const
const STATUS_COLORS: Record<string,{bg:string,text:string}> = {
  new:        {bg:'#dbeafe',text:'#1e40af'},
  sorted:     {bg:'#e0e7ff',text:'#3730a3'},
  payment_ok: {bg:'#d1fae5',text:'#065f46'},
  production: {bg:'#fef3c7',text:'#92400e'},
  steam:      {bg:'#fef3c7',text:'#92400e'},
  ready:      {bg:'#cffafe',text:'#155e75'},
  done:       {bg:'#f0fdf4',text:'#166534'},
}
const PAYMENT_COLORS: Record<string,{bg:string,text:string}> = {
  pending: {bg:'#fef2f2',text:'#991b1b'},
  partial: {bg:'#fffbeb',text:'#92400e'},
  paid:    {bg:'#d1fae5',text:'#065f46'},
}

type ItemType = 'gorden' | 'perabot' | 'laundry'

const fmt = (n:number) => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n)

export default function OrderDetailPage() {
  const { id } = useParams<{id:string}>()
  const router = useRouter()
  const supabase = createClient()

  const [order, setOrder]     = useState<Order|null>(null)
  const [items, setItems]     = useState<OrderItem[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [orderLogs, setOrderLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  // item type selector
  const [itemType, setItemType] = useState<ItemType>('gorden')

  // laundry rate from DB
  const [laundryRate, setLaundryRate] = useState<number>(0)

  // item form — gorden
  const [itemForm, setItemForm] = useState({
    product_id:'', qty:'1', price:'',
    size:'',
    meter_gorden:'0',
    meter:'0',
    poni_lurus:false,
    poni_gel:false,
    // perabot
    variant_color:'',
    dimension_p:'',dimension_l:'',dimension_t:'',
    weight:'',
    // laundry
    customer_name:'', customer_phone:'',
    kg:'0', meter_laundry:'0', description:'',
  })
  const [savingItem, setSavingItem] = useState(false)

  // Cancel & Return form
  const [showCancelForm, setShowCancelForm] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [showReturnForm, setShowReturnForm] = useState(false)
  const [returnForm, setReturnForm] = useState({ item_id: '', reason: '', condition: 'good' as 'good'|'damaged', qty: '1', refund_amount: '' })

  async function load() {
    setLoading(true)
    const [orderRes, itemsRes, prodsRes, logsRes] = await Promise.all([
      supabase.from('orders').select('*, customer:customers(name,phone,address)').eq('id',id).single(),
      supabase.from('order_items').select('*, product:products(name,sku)').eq('order_id',id),
      supabase.from('products').select('id,name,sku,price').order('name'),
      supabase.from('order_logs').select('*, staff:users(name)').eq('order_id',id).order('created_at', { ascending: true }),
    ])
    setOrder(orderRes.data as Order)
    setItems((itemsRes.data as OrderItem[]) ?? [])
    setProducts((prodsRes.data as Product[]) ?? [])
    setOrderLogs((logsRes.data ?? []) as any[])
    setLoading(false)
  }

  async function loadRates() {
    const { data: lr } = await supabase.from('laundry_rates').select('rate_per_kg').eq('is_active',true).single()
    setLaundryRate((lr as any)?.rate_per_kg ?? 0)
  }

  useEffect(()=>{ load() },[id])

  async function updateStatus(newStatus: string) {
    if (!order) return
    if ((newStatus==='ready'||newStatus==='done') && order.payment_status!=='paid') {
      alert('⚠️ Payment gate: order belum lunas. Finance harus approve pembayaran dulu.')
      return
    }
    setUpdating(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('orders').update({status:newStatus}).eq('id',id)
    await supabase.from('order_logs').insert({
      order_id: id,
      action: newStatus === 'sorted' ? 'sorted' :
             newStatus === 'payment_ok' ? 'payment_approved' :
             newStatus === 'production' ? 'production_started' :
             newStatus === 'ready' ? 'ready' :
             newStatus === 'done' ? 'done' : newStatus,
      notes: `Status diubah oleh Admin dari "${STATUS_LABELS[order.status as keyof typeof STATUS_LABELS]}" → "${STATUS_LABELS[newStatus as keyof typeof STATUS_LABELS]}"`,
      staff_id: user?.id ?? null,
    })
    if (newStatus === 'production') {
      const { data: orderItems } = await supabase.from('order_items').select('*, product:products(name)').eq('order_id', id)
      const totalMeterGorden = (orderItems ?? []).reduce((s: number, i: any) => s + Number(i.meter_gorden ?? 0), 0)
      const totalMeterStyle = (orderItems ?? []).reduce((s: number, i: any) => s + Number(i.meter ?? 0), 0)
      await supabase.from('production_jobs').insert({
        order_id: id,
        meter_gorden: totalMeterGorden,
        meter_vitras: totalMeterStyle,
        meter_roman: 0,
        meter_kupu_kupu: 0,
        status: 'waiting',
      })
    }
    setOrder(o => o ? {...o, status:newStatus as Order['status']} : o)
    setUpdating(false)
    load()
  }

  async function handleCancel() {
    if (!order || !cancelReason.trim()) { alert('Alasan pembatalan wajib diisi.'); return }
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('payments').update({ notes: `VOIDED — Order cancelled (${cancelReason}) - ${new Date().toISOString()}` }).eq('order_id', id)
    await supabase.from('orders').update({ status: 'cancelled', return_reason: cancelReason }).eq('id', id)
    await supabase.from('order_logs').insert({
      order_id: id, action: 'cancelled',
      notes: `Order dibatalkan oleh Admin. Alasan: ${cancelReason}. Payment di-void.`,
      staff_id: user?.id ?? null,
    })
    alert('Order berhasil dibatalkan.')
    setShowCancelForm(false)
    load()
  }

  async function handleReturn(e: React.FormEvent) {
    e.preventDefault()
    if (!order) return
    const { data: { user } } = await supabase.auth.getUser()
    const refundAmt = Number(returnForm.refund_amount) || 0
    const { data: retData } = await supabase.from('returns').insert({
      order_id: id, order_item_id: returnForm.item_id || null,
      reason: returnForm.reason, condition: returnForm.condition,
      qty: Number(returnForm.qty) || 1, refund_amount: refundAmt,
      refund_status: refundAmt > 0 ? 'pending' : 'completed',
      created_by: user?.id ?? null,
      resolved_at: returnForm.condition === 'good' ? new Date().toISOString() : null,
    }).select().single()
    if (returnForm.item_id) {
      await supabase.from('order_items').update({ returned_at: new Date().toISOString(), return_reason: returnForm.reason }).eq('id', returnForm.item_id)
    }
    await supabase.from('orders').update({ status: 'returned', return_reason: returnForm.reason }).eq('id', id)
    if (returnForm.condition === 'good') {
      const orderItems = await supabase.from('order_items').select('*, product:products(id,stock_toko)').eq('order_id', id)
      for (const item of orderItems.data ?? []) {
        if (item.product_id) {
          await supabase.from('inventory_movements').insert({
            material_id: null, type: 'return_in', qty: item.qty ?? 1,
            reason: `Return dari order ${id.slice(0,8)} — kondisi bagus, masuk stock toko`,
            created_by: user?.id ?? null,
          })
          const { error } = await supabase.rpc('increment_stock_toko', { product_id: item.product_id, amount: item.qty ?? 1 })
          if (error) await supabase.from('products').update({ stock_toko: (item.product?.stock_toko ?? 0) + (item.qty ?? 1) }).eq('id', item.product_id)
        }
      }
    }
    await supabase.from('order_logs').insert({
      order_id: id, action: 'return_initiated',
      notes: `Return diproses oleh Admin. Kondisi: ${returnForm.condition === 'good' ? 'Bagus → masuk stock' : 'Rusak → dispose'}. Alasan: ${returnForm.reason}. Refund: Rp${refundAmt.toLocaleString('id-ID')}`,
      staff_id: user?.id ?? null,
    })
    alert(`Return berhasil dicatat.\nKondisi: ${returnForm.condition === 'good' ? 'Bagus → masuk stock' : 'Rusak → dispose'}\nRefund: Rp${refundAmt.toLocaleString('id-ID')}`)
    setShowReturnForm(false)
    setReturnForm({ item_id: '', reason: '', condition: 'good', qty: '1', refund_amount: '' })
    load()
  }

  async function addItem(e:React.FormEvent) {
    e.preventDefault()
    setSavingItem(true)

    if (itemType === 'laundry') {
      // create laundry order first
      const { data: { user } } = await supabase.auth.getUser()
      const { data: laund } = await supabase.from('laundry_orders').insert({
        customer_name: itemForm.customer_name,
        customer_phone: itemForm.customer_phone || null,
        kg: Number(itemForm.kg) || 0,
        meter: Number(itemForm.meter_laundry) || 0,
        description: itemForm.description || null,
        status: 'pending',
        created_by: user?.id ?? null,
      }).select('id').single()

      const price = Number(itemForm.kg) * laundryRate
      await supabase.from('order_items').insert({
        order_id: id,
        product_id: null,
        item_type: 'laundry',
        linked_laundry_id: laund?.id ?? null,
        qty: 1,
        price,
        meter: Number(itemForm.meter_laundry) || null,
      })
    } else {
      const prod = products.find(p=>p.id===itemForm.product_id)
      let finalPrice = Number(itemForm.price) || prod?.price || 0

      // Gorden: price = product.price per meter × meter needed
      if (itemType === 'gorden') {
        const meter = Number(itemForm.meter_gorden) || 0
        finalPrice = (prod?.price || 0) * meter
      }

      await supabase.from('order_items').insert({
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
        variant_color: itemType === 'perabot' ? itemForm.variant_color || null : null,
        dimension_p: itemType === 'perabot' ? (itemForm.dimension_p ? Number(itemForm.dimension_p) : null) : null,
        dimension_l: itemType === 'perabot' ? (itemForm.dimension_l ? Number(itemForm.dimension_l) : null) : null,
        dimension_t: itemType === 'perabot' ? (itemForm.dimension_t ? Number(itemForm.dimension_t) : null) : null,
        weight: itemType === 'perabot' ? (itemForm.weight ? Number(itemForm.weight) : null) : null,
      })
    }

    // recalc total
    const newItems = await supabase.from('order_items').select('price,qty').eq('order_id',id)
    const total = (newItems.data??[]).reduce((s,i)=>s+i.price*i.qty,0)
    await supabase.from('orders').update({total_amount:total}).eq('id',id)

    setSavingItem(false)
    setShowItemForm(false)
    resetForm()
    load()
  }

  async function removeItem(itemId:string) {
    if (!confirm('Hapus item ini?')) return
    await supabase.from('order_items').delete().eq('id',itemId)
    load()
  }

  async function toggleReady(itemId:string, current:boolean) {
    await supabase.from('order_items').update({ready:!current}).eq('id',itemId)
    setItems(prev=>prev.map(i=>i.id===itemId?{...i,ready:!current}:i))
  }

  function resetForm() {
    setItemType('gorden')
    setItemForm({
      product_id:'', qty:'1', price:'', size:'',
      meter_gorden:'0', meter:'0',
      poni_lurus:false, poni_gel:false,
      variant_color:'', dimension_p:'',dimension_l:'',dimension_t:'',weight:'',
      customer_name:'', customer_phone:'', kg:'0', meter_laundry:'0', description:'',
    })
  }

  const [showItemForm, setShowItemForm] = useState(false)

  function openItemForm() {
    setShowItemForm(true)
    loadRates()
    resetForm()
  }

  if (loading) return <div style={{padding:'3rem',textAlign:'center',color:'#9ca3af'}}>Memuat...</div>
  if (!order)  return <div style={{padding:'3rem',textAlign:'center',color:'#9ca3af'}}>Order tidak ditemukan.</div>

  const customer = order.customer as {name:string,phone:string,address?:string}|null
  const statusIdx = ORDER_STATUSES.indexOf(order.status as typeof ORDER_STATUSES[number])
  const nextStatus = statusIdx < ORDER_STATUSES.length-1 ? ORDER_STATUSES[statusIdx+1] : null

  return (
    <div>
      {/* Back */}
      <Link href="/admin/orders" style={{display:'inline-flex',alignItems:'center',gap:'0.375rem',color:'#6b7280',fontSize:'0.875rem',textDecoration:'none',marginBottom:'1rem'}}>
        <ArrowLeft size={15}/> Kembali ke Pesanan
      </Link>

      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:'1rem',marginBottom:'1.5rem'}}>
        <div>
          <h1 className="page-title" style={{margin:0}}>Detail Pesanan</h1>
          <p style={{fontSize:'0.78rem',fontFamily:'monospace',color:'#9ca3af',marginTop:'0.25rem'}}>{id}</p>
        </div>
        {nextStatus && !['done','returned','cancelled'].includes(order.status) && (
          <button onClick={()=>updateStatus(nextStatus)} disabled={updating}
            style={{display:'flex',alignItems:'center',gap:'0.5rem',padding:'0.75rem 1.5rem',background:'#cc7030',color:'#fff',border:'none',borderRadius:'0.5rem',fontWeight:'600',cursor:updating?'not-allowed':'pointer'}}>
            {updating ? <Loader2 size={15} style={{animation:'spin 1s linear infinite'}}/> : <ChevronRight size={15}/>}
            Lanjut: {STATUS_LABELS[nextStatus]}
          </button>
        )}
        {['new','sorted'].includes(order.status) && (
          <button onClick={()=>setShowCancelForm(true)}
            style={{display:'flex',alignItems:'center',gap:'0.5rem',padding:'0.75rem 1.5rem',background:'#ef4444',color:'#fff',border:'none',borderRadius:'0.5rem',fontWeight:'600',cursor:'pointer'}}>
            ❌ Batalkan
          </button>
        )}
        {['ready','done'].includes(order.status) && (
          <button onClick={()=>setShowReturnForm(true)}
            style={{display:'flex',alignItems:'center',gap:'0.5rem',padding:'0.75rem 1.5rem',background:'#9333ea',color:'#fff',border:'none',borderRadius:'0.5rem',fontWeight:'600',cursor:'pointer'}}>
            📦 Return
          </button>
        )}
      </div>

      {/* Status pipeline */}
      <div style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:'0.75rem',padding:'1.25rem',marginBottom:'1.25rem'}}>
        <div style={{display:'flex',alignItems:'center',gap:0,overflowX:'auto'}}>
          {ORDER_STATUSES.map((s,i)=>{
            const done = i<=statusIdx
            const current = s===order.status
            return (
              <div key={s} style={{display:'flex',alignItems:'center',flex:1,minWidth:80}}>
                <div style={{display:'flex',flexDirection:'column',alignItems:'center',flex:1,gap:'0.375rem'}}>
                  <div style={{
                    width:32,height:32,borderRadius:'50%',
                    background: current?'#cc7030':done?'#d1fae5':'#f3f4f6',
                    border:`2px solid ${current?'#cc7030':done?'#22c55e':'#e5e7eb'}`,
                    display:'flex',alignItems:'center',justifyContent:'center',
                    color: current?'#fff':done?'#16a34a':'#9ca3af',
                    fontSize:'0.7rem',fontWeight:'700',
                  }}>
                    {done&&!current ? <CheckCircle2 size={14}/> : i+1}
                  </div>
                  <span style={{fontSize:'0.68rem',fontWeight:current?'700':'400',color:current?'#cc7030':done?'#374151':'#9ca3af',textAlign:'center',whiteSpace:'nowrap'}}>
                    {STATUS_LABELS[s]}
                  </span>
                </div>
                {i<ORDER_STATUSES.length-1 && (
                  <div style={{width:24,height:2,background:i<statusIdx?'#22c55e':'#e5e7eb',flexShrink:0}}/>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem',marginBottom:'1.25rem'}}>
        {/* Customer info */}
        <div className="form-section">
          <div className="form-section-title">Pelanggan</div>
          <div style={{display:'flex',flexDirection:'column',gap:'0.5rem',fontSize:'0.875rem'}}>
            <div><span style={{color:'#9ca3af'}}>Nama: </span><strong>{customer?.name??'—'}</strong></div>
            <div><span style={{color:'#9ca3af'}}>HP: </span>
              <a href={`https://wa.me/${customer?.phone?.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer" style={{color:'#16a34a',fontWeight:'500'}}>{customer?.phone??'—'}</a>
            </div>
            <div><span style={{color:'#9ca3af'}}>Alamat: </span>{customer?.address??'—'}</div>
          </div>
        </div>

        {/* Order info */}
        <div className="form-section">
          <div className="form-section-title">Info Pesanan</div>
          <div style={{display:'flex',flexDirection:'column',gap:'0.5rem',fontSize:'0.875rem'}}>
            <div style={{display:'flex',justifyContent:'space-between'}}>
              <span style={{color:'#9ca3af'}}>Sumber</span>
              <span>{SOURCE_LABELS[order.source]}</span>
            </div>
            <div style={{display:'flex',justifyContent:'space-between'}}>
              <span style={{color:'#9ca3af'}}>Jenis</span>
              <span style={{fontWeight:'600'}}>{order.classification==='pasang'?'📍 Pasang':'📦 Kirim'}</span>
            </div>
            <div style={{display:'flex',justifyContent:'space-between'}}>
              <span style={{color:'#9ca3af'}}>Total</span>
              <span style={{fontWeight:'700',color:'#cc7030'}}>{fmt(order.total_amount)}</span>
            </div>
            <div style={{display:'flex',justifyContent:'space-between'}}>
              <span style={{color:'#9ca3af'}}>DP</span>
              <span>{fmt(order.dp_amount)}</span>
            </div>
            <div style={{display:'flex',justifyContent:'space-between'}}>
              <span style={{color:'#9ca3af'}}>Lunas</span>
              <span>{fmt(order.lunas_amount)}</span>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{color:'#9ca3af'}}>Pembayaran</span>
              <span style={{...PAYMENT_COLORS[order.payment_status],padding:'0.15rem 0.6rem',borderRadius:'999px',fontSize:'0.72rem',fontWeight:'600'}}>
                {PAYMENT_STATUS_LABELS[order.payment_status]}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Order Items */}
      <div style={{marginBottom:'1rem'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.75rem'}}>
          <h2 style={{fontSize:'1rem',fontWeight:'600',color:'#374151'}}>Item Pesanan</h2>
          <button onClick={openItemForm}
            style={{display:'flex',alignItems:'center',gap:'0.375rem',padding:'0.5rem 1rem',background:'#cc7030',color:'#fff',border:'none',borderRadius:'0.5rem',fontWeight:'600',fontSize:'0.8rem',cursor:'pointer'}}>
            <Plus size={14}/> Tambah Item
          </button>
        </div>
        <div className="data-table">
          {items.length===0?(
            <div style={{padding:'2rem',textAlign:'center',color:'#9ca3af',fontSize:'0.875rem'}}>Belum ada item pesanan</div>
          ):(
            <table>
              <thead>
                <tr>
                  <th>Tipe</th>
                  <th>Produk</th>
                  <th>Ukuran</th><th>Qty</th>
                  <th>Specs</th>
                  <th>Harga</th><th>Ready</th><th></th>
                </tr>
              </thead>
              <tbody>
                {items.map(item=>{
                  const prod = item.product as {name:string,sku?:string}|null
                  const itemTypeLabel = item.item_type === 'laundry' ? '🧺 Laundry' : item.item_type === 'perabot' ? '🪑 Perabot' : '🪟 Gorden'
                  return (
                    <tr key={item.id}>
                      <td><span style={{fontSize:'0.72rem',fontWeight:'600',padding:'0.15rem 0.5rem',borderRadius:'999px',background:'#f3f4f6',color:'#374151'}}>{itemTypeLabel}</span></td>
                      <td style={{fontWeight:'500'}}>{prod?.name??'—'}</td>
                      <td style={{color:'#6b7280',fontSize:'0.8rem'}}>{item.size??'—'}</td>
                      <td>{item.qty}</td>
                      <td style={{fontSize:'0.72rem',color:'#6b7280',maxWidth:180}}>
                        {item.item_type === 'gorden' && (
                          <>
                            {Number(item.meter_gorden??0)>0 && <span>Gorden: {Number(item.meter_gorden).toFixed(2)}m</span>}
                            {item.style_type && <span> • {item.style_type}</span>}
                            {item.meter && <span> • {Number(item.meter).toFixed(2)}m</span>}
                            {(item.poni_lurus||item.poni_gel) && <span> • {[item.poni_lurus&&'Lurus',item.poni_gel&&'Gel'].filter(Boolean).join('/')}</span>}
                          </>
                        )}
                        {item.item_type === 'perabot' && (
                          <>
                            {item.variant_color && <span>Warna: {item.variant_color}</span>}
                            {item.dimension_p && <span> • {item.dimension_p}×{item.dimension_l}×{item.dimension_t}cm</span>}
                            {item.weight && <span> • {item.weight}kg</span>}
                          </>
                        )}
                        {item.item_type === 'laundry' && (
                          <>
                            {item.meter && <span>{Number(item.meter).toFixed(2)}m</span>}
                          </>
                        )}
                      </td>
                      <td style={{fontWeight:'600',color:'#cc7030'}}>{fmt(item.price)}</td>
                      <td>
                        <button onClick={()=>toggleReady(item.id,item.ready)}
                          style={{background:'none',border:'none',cursor:'pointer',color:item.ready?'#16a34a':'#d1d5db'}}>
                          <CheckCircle2 size={18}/>
                        </button>
                      </td>
                      <td>
                        <button onClick={()=>removeItem(item.id)} style={{background:'none',border:'none',cursor:'pointer',color:'#dc2626'}}>
                          <Trash2 size={14}/>
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

      {/* Add Item Modal */}
      {showItemForm&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'}}
          onClick={e=>{if(e.target===e.currentTarget){setShowItemForm(false);resetForm()}}}>
          <div style={{background:'#fff',borderRadius:'0.875rem',padding:'2rem',width:'100%',maxWidth:580,maxHeight:'90vh',overflowY:'auto',boxShadow:'0 25px 60px rgba(0,0,0,0.25)'}}>
            <h2 style={{fontSize:'1.1rem',fontWeight:'700',marginBottom:'1.5rem'}}>Tambah Item Pesanan</h2>

            {/* Step 1: Type selector */}
            <div style={{display:'flex',gap:'0.75rem',marginBottom:'1.5rem'}}>
              {(['gorden','perabot','laundry'] as ItemType[]).map(t=>{
                const labels: Record<ItemType,string> = { gorden:'🪟 Gorden', perabot:'🪑 Perabot', laundry:'🧺 Laundry' }
                return (
                  <button key={t} onClick={()=>setItemType(t)}
                    style={{flex:1,padding:'0.625rem',border:`2px solid ${itemType===t?'#cc7030':'#e5e7eb'}`,borderRadius:'0.5rem',background:itemType===t?'#fff7ed':'#fff',cursor:'pointer',fontWeight:'600',fontSize:'0.8rem',color:itemType===t?'#92400e':'#6b7280'}}>
                    {labels[t]}
                  </button>
                )
              })}
            </div>

            <form onSubmit={addItem} style={{display:'flex',flexDirection:'column',gap:'1rem'}}>

              {/* === GORDEN FORM === */}
              {itemType==='gorden'&&(<>
                <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:'0.75rem'}}>
                  <div>
                    <label style={{display:'block',fontSize:'0.8rem',fontWeight:'600',color:'#374151',marginBottom:'0.3rem'}}>Produk</label>
                    <select value={itemForm.product_id} onChange={e=>{
                      const p=products.find(x=>x.id===e.target.value)
                      setItemForm(f=>({...f,product_id:e.target.value}))
                    }} style={{width:'100%',padding:'0.625rem',border:'1px solid #d1d5db',borderRadius:'0.5rem',fontSize:'0.875rem',outline:'none',background:'#fff'}}>
                      <option value="">— Pilih Produk —</option>
                      {products.map(p=><option key={p.id} value={p.id}>{p.name} {p.sku?`(${p.sku})`:''}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{display:'block',fontSize:'0.8rem',fontWeight:'600',color:'#374151',marginBottom:'0.3rem'}}>Qty</label>
                    <input type="number" min="1" value={itemForm.qty} onChange={e=>setItemForm(f=>({...f,qty:e.target.value}))}
                      style={{width:'100%',padding:'0.625rem',border:'1px solid #d1d5db',borderRadius:'0.5rem',fontSize:'0.875rem',outline:'none'}}/>
                  </div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr',gap:'0.75rem'}}>
                  <div>
                    <label style={{display:'block',fontSize:'0.8rem',fontWeight:'600',color:'#374151',marginBottom:'0.3rem'}}>Ukuran (cm)</label>
                    <input type="text" placeholder="120 x 250" value={itemForm.size} onChange={e=>setItemForm(f=>({...f,size:e.target.value}))}
                      style={{width:'100%',padding:'0.625rem',border:'1px solid #d1d5db',borderRadius:'0.5rem',fontSize:'0.875rem',outline:'none'}}/>
                  </div>
                </div>
                <div style={{background:'#f9fafb',borderRadius:'0.5rem',padding:'1rem'}}>
                  <div style={{fontSize:'0.8rem',fontWeight:'600',color:'#374151',marginBottom:'0.75rem'}}>Meteran Gorden</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.75rem'}}>
                    <div>
                      <label style={{display:'block',fontSize:'0.72rem',fontWeight:'600',color:'#6b7280',marginBottom:'0.25rem'}}>Meter Gorden (m)</label>
                      <input type="number" step="0.1" min="0" value={itemForm.meter_gorden}
                        onChange={e=>setItemForm(prev=>({...prev,meter_gorden:e.target.value}))}
                        style={{width:'100%',padding:'0.5rem',border:'1px solid #d1d5db',borderRadius:'0.375rem',fontSize:'0.8rem',outline:'none'}}/>
                    </div>
                    <div>
                      <label style={{display:'block',fontSize:'0.72rem',fontWeight:'600',color:'#6b7280',marginBottom:'0.25rem'}}>Berat Auto (kg)</label>
                      <input type="text" value={itemForm.meter_gorden ? (Number(itemForm.meter_gorden) * 0.4).toFixed(2) : '0'} readOnly
                        style={{width:'100%',padding:'0.5rem',border:'1px solid #d1d5db',borderRadius:'0.375rem',fontSize:'0.8rem',outline:'none',background:'#f3f4f6',color:'#6b7280'}}/>
                    </div>
                  </div>
                </div>
                <div style={{background:'#f9fafb',borderRadius:'0.5rem',padding:'1rem'}}>
                  <div style={{display:'flex',gap:'1rem',flexWrap:'wrap',marginTop:'0.5rem'}}>
                    <label style={{display:'flex',alignItems:'center',gap:'0.375rem',fontSize:'0.8rem',cursor:'pointer'}}>
                      <input type="checkbox" checked={itemForm.poni_lurus}
                        onChange={e=>setItemForm(prev=>({...prev,poni_lurus:e.target.checked}))}/>
                      Poni Lurus
                    </label>
                    <label style={{display:'flex',alignItems:'center',gap:'0.375rem',fontSize:'0.8rem',cursor:'pointer'}}>
                      <input type="checkbox" checked={itemForm.poni_gel}
                        onChange={e=>setItemForm(prev=>({...prev,poni_gel:e.target.checked}))}/>
                      Poni Gel
                    </label>
                  </div>
                  {itemForm.meter_gorden && Number(itemForm.meter_gorden) > 0 && (
                    <div style={{marginTop:'0.75rem',fontSize:'0.78rem',color:'#16a34a',fontWeight:'600'}}>
                      Estimasi: {(products.find(p=>p.id===itemForm.product_id)?.price || 0) * Number(itemForm.meter_gorden)}
                    </div>
                  )}
                </div>
              </>)}

              {/* === PERABOT FORM === */}
              {itemType==='perabot'&&(<>
                <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:'0.75rem'}}>
                  <div>
                    <label style={{display:'block',fontSize:'0.8rem',fontWeight:'600',color:'#374151',marginBottom:'0.3rem'}}>Produk</label>
                    <select value={itemForm.product_id} onChange={e=>{
                      const p=products.find(x=>x.id===e.target.value)
                      setItemForm(f=>({...f,product_id:e.target.value}))
                    }} style={{width:'100%',padding:'0.625rem',border:'1px solid #d1d5db',borderRadius:'0.5rem',fontSize:'0.875rem',outline:'none',background:'#fff'}}>
                      <option value="">— Pilih Produk —</option>
                      {products.map(p=><option key={p.id} value={p.id}>{p.name} {p.sku?`(${p.sku})`:''}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{display:'block',fontSize:'0.8rem',fontWeight:'600',color:'#374151',marginBottom:'0.3rem'}}>Qty</label>
                    <input type="number" min="1" value={itemForm.qty} onChange={e=>setItemForm(f=>({...f,qty:e.target.value}))}
                      style={{width:'100%',padding:'0.625rem',border:'1px solid #d1d5db',borderRadius:'0.5rem',fontSize:'0.875rem',outline:'none'}}/>
                  </div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.75rem'}}>
                  <div>
                    <label style={{display:'block',fontSize:'0.8rem',fontWeight:'600',color:'#374151',marginBottom:'0.3rem'}}>Harga (Rp)</label>
                    <input type="number" value={itemForm.price} onChange={e=>setItemForm(f=>({...f,price:e.target.value}))}
                      style={{width:'100%',padding:'0.625rem',border:'1px solid #d1d5db',borderRadius:'0.5rem',fontSize:'0.875rem',outline:'none'}}/>
                  </div>
                  <div>
                    <label style={{display:'block',fontSize:'0.8rem',fontWeight:'600',color:'#374151',marginBottom:'0.3rem'}}>Ukuran (cm)</label>
                    <input type="text" placeholder="120 x 250" value={itemForm.size} onChange={e=>setItemForm(f=>({...f,size:e.target.value}))}
                      style={{width:'100%',padding:'0.625rem',border:'1px solid #d1d5db',borderRadius:'0.5rem',fontSize:'0.875rem',outline:'none'}}/>
                  </div>
                </div>
                <div style={{background:'#f9fafb',borderRadius:'0.5rem',padding:'1rem'}}>
                  <div style={{fontSize:'0.8rem',fontWeight:'600',color:'#374151',marginBottom:'0.5rem'}}>Warna & Dimensi</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.75rem'}}>
                    <div>
                      <label style={{display:'block',fontSize:'0.72rem',fontWeight:'600',color:'#6b7280',marginBottom:'0.25rem'}}>Warna</label>
                      <input type="text" placeholder="Contoh: Hitam, Silver" value={itemForm.variant_color}
                        onChange={e=>setItemForm(prev=>({...prev,variant_color:e.target.value}))}
                        style={{width:'100%',padding:'0.5rem',border:'1px solid #d1d5db',borderRadius:'0.375rem',fontSize:'0.8rem',outline:'none'}}/>
                    </div>
                    <div>
                      <label style={{display:'block',fontSize:'0.72rem',fontWeight:'600',color:'#6b7280',marginBottom:'0.25rem'}}>Berat (kg)</label>
                      <input type="number" step="0.1" min="0" placeholder="0" value={itemForm.weight}
                        onChange={e=>setItemForm(prev=>({...prev,weight:e.target.value}))}
                        style={{width:'100%',padding:'0.5rem',border:'1px solid #d1d5db',borderRadius:'0.375rem',fontSize:'0.8rem',outline:'none'}}/>
                    </div>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'0.5rem',marginTop:'0.5rem'}}>
                    {(['dimension_p','P','dimension_l','L','dimension_t','T'] as const).map((field,i)=>(
                      <div key={field}>
                        <label style={{fontSize:'0.65rem',color:'#6b7280'}}>{['P','L','T'][i]} (cm)</label>
                        <input type="number" placeholder={['P','L','T'][i]}
                          value={itemForm[field as keyof typeof itemForm] as string}
                          onChange={e=>setItemForm(prev=>({...prev,[field]:e.target.value}))}
                          style={{width:'100%',padding:'0.4rem',border:'1px solid #d1d5db',borderRadius:'0.375rem',fontSize:'0.8rem',outline:'none'}}/>
                      </div>
                    ))}
                  </div>
                </div>
              </>)}

              {/* === LAUNDRY FORM === */}
              {itemType==='laundry'&&(<>
                <div style={{background:'#f9fafb',borderRadius:'0.5rem',padding:'1rem'}}>
                  <div style={{fontSize:'0.8rem',fontWeight:'600',color:'#374151',marginBottom:'0.75rem'}}>🧺 Detail Laundry</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.75rem'}}>
                    <div>
                      <label style={{display:'block',fontSize:'0.72rem',fontWeight:'600',color:'#6b7280',marginBottom:'0.25rem'}}>Nama Customer *</label>
                      <input type="text" required placeholder="Nama customer" value={itemForm.customer_name}
                        onChange={e=>setItemForm(f=>({...f,customer_name:e.target.value}))}
                        style={{width:'100%',padding:'0.5rem',border:'1px solid #d1d5db',borderRadius:'0.375rem',fontSize:'0.8rem',outline:'none'}}/>
                    </div>
                    <div>
                      <label style={{display:'block',fontSize:'0.72rem',fontWeight:'600',color:'#6b7280',marginBottom:'0.25rem'}}>Telepon</label>
                      <input type="text" placeholder="08xxxxxxxxxx" value={itemForm.customer_phone}
                        onChange={e=>setItemForm(f=>({...f,customer_phone:e.target.value}))}
                        style={{width:'100%',padding:'0.5rem',border:'1px solid #d1d5db',borderRadius:'0.375rem',fontSize:'0.8rem',outline:'none'}}/>
                    </div>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.75rem',marginTop:'0.75rem'}}>
                    <div>
                      <label style={{display:'block',fontSize:'0.72rem',fontWeight:'600',color:'#6b7280',marginBottom:'0.25rem'}}>Berat (kg)</label>
                      <input type="number" step="0.1" min="0" value={itemForm.kg}
                        onChange={e=>setItemForm(f=>({...f,kg:e.target.value}))}
                        style={{width:'100%',padding:'0.5rem',border:'1px solid #d1d5db',borderRadius:'0.375rem',fontSize:'0.8rem',outline:'none'}}/>
                    </div>
                    <div>
                      <label style={{display:'block',fontSize:'0.72rem',fontWeight:'600',color:'#6b7280',marginBottom:'0.25rem'}}>Meter (m)</label>
                      <input type="number" step="0.1" min="0" value={itemForm.meter_laundry}
                        onChange={e=>setItemForm(f=>({...f,meter_laundry:e.target.value}))}
                        style={{width:'100%',padding:'0.5rem',border:'1px solid #d1d5db',borderRadius:'0.375rem',fontSize:'0.8rem',outline:'none'}}/>
                    </div>
                  </div>
                  {itemForm.kg && laundryRate > 0 && (
                    <div style={{marginTop:'0.5rem',fontSize:'0.72rem',color:'#16a34a'}}>
                      Estimasi harga: {fmt(Number(itemForm.kg) * laundryRate)} ({itemForm.kg}kg × {fmt(laundryRate)}/kg)
                    </div>
                  )}
                  <div style={{marginTop:'0.75rem'}}>
                    <label style={{display:'block',fontSize:'0.72rem',fontWeight:'600',color:'#6b7280',marginBottom:'0.25rem'}}>Keterangan</label>
                    <input type="text" placeholder="Contoh: Gorden 15kg, Vitras 5kg, dll..." value={itemForm.description}
                      onChange={e=>setItemForm(f=>({...f,description:e.target.value}))}
                      style={{width:'100%',padding:'0.5rem',border:'1px solid #d1d5db',borderRadius:'0.375rem',fontSize:'0.8rem',outline:'none'}}/>
                  </div>
                </div>
              </>)}

              <div style={{display:'flex',gap:'0.75rem'}}>
                <button type="button" onClick={()=>{setShowItemForm(false);resetForm()}} style={{flex:1,padding:'0.75rem',border:'1px solid #d1d5db',borderRadius:'0.5rem',background:'#fff',cursor:'pointer',fontWeight:'600'}}>Batal</button>
                <button type="submit" disabled={savingItem} style={{flex:1,padding:'0.75rem',background:'#cc7030',color:'#fff',border:'none',borderRadius:'0.5rem',cursor:savingItem?'not-allowed':'pointer',fontWeight:'600'}}>
                  {savingItem?'Menyimpan...':'Tambah Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Activity Log */}
      <div style={{ marginTop: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: '600', color: '#374151' }}>Riwayat Aktivitas</h2>
          <span style={{ fontSize: '0.72rem', color: '#9ca3af' }}>Semua aksi dicatat &bull; Admin bisa pantau</span>
        </div>
        {orderLogs.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '0.75rem', fontSize: '0.875rem' }}>
            Belum ada aktivitas tercatat
          </div>
        ) : (
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.75rem', overflow: 'hidden' }}>
            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              {orderLogs.map((log: any) => (
                <div key={log.id} style={{ display: 'flex', gap: '0.875rem', padding: '0.875rem 1.25rem', borderBottom: '1px solid #f3f4f6', alignItems: 'flex-start' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: '0.65rem' }}>🔔</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                      <span style={{ fontWeight: '700', fontSize: '0.82rem', color: '#374151' }}>{log.action.replace(/_/g, ' ').toUpperCase()}</span>
                      {log.staff && (
                        <span style={{ fontSize: '0.72rem', color: '#6b7280', background: '#f3f4f6', padding: '0.1rem 0.5rem', borderRadius: '999px' }}>
                          👤 {log.staff.name}
                        </span>
                      )}
                    </div>
                    {log.notes && <div style={{ fontSize: '0.78rem', color: '#6b7280', marginBottom: '0.25rem' }}>{log.notes}</div>}
                    <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>
                      {new Date(log.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Cancel Order Modal */}
      {showCancelForm && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'}}
          onClick={e=>{if(e.target===e.currentTarget)setShowCancelForm(false)}}>
          <div style={{background:'#fff',borderRadius:'0.875rem',padding:'2rem',width:'100%',maxWidth:440,boxShadow:'0 25px 60px rgba(0,0,0,0.25)'}}>
            <h2 style={{fontSize:'1.1rem',fontWeight:'700',marginBottom:'1rem'}}>❌ Batalkan Order</h2>
            <p style={{fontSize:'0.875rem',color:'#6b7280',marginBottom:'1.25rem'}}>Order akan dibatalkan dan payment di-void. Tindakan ini tidak bisa dibatalkan.</p>
            <div style={{marginBottom:'1rem'}}>
              <label style={{display:'block',fontSize:'0.8rem',fontWeight:'600',color:'#374151',marginBottom:'0.3rem'}}>Alasan Pembatalan *</label>
              <textarea value={cancelReason} onChange={e=>setCancelReason(e.target.value)} rows={3}
                style={{width:'100%',padding:'0.625rem',border:'1px solid #d1d5db',borderRadius:'0.5rem',fontSize:'0.875rem',outline:'none',resize:'vertical'}}
                placeholder="Contoh: Customer batal, stok tidak tersedia, dll"/>
            </div>
            <div style={{display:'flex',gap:'0.75rem'}}>
              <button onClick={()=>setShowCancelForm(false)} style={{flex:1,padding:'0.75rem',border:'1px solid #d1d5db',borderRadius:'0.5rem',background:'#fff',cursor:'pointer',fontWeight:'600'}}>Batal</button>
              <button onClick={handleCancel} style={{flex:1,padding:'0.75rem',background:'#ef4444',color:'#fff',border:'none',borderRadius:'0.5rem',cursor:'pointer',fontWeight:'600'}}>Ya, Batalkan</button>
            </div>
          </div>
        </div>
      )}

      {/* Return Modal */}
      {showReturnForm && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'}}
          onClick={e=>{if(e.target===e.currentTarget)setShowReturnForm(false)}}>
          <div style={{background:'#fff',borderRadius:'0.875rem',padding:'2rem',width:'100%',maxWidth:480,boxShadow:'0 25px 60px rgba(0,0,0,0.25)'}}>
            <h2 style={{fontSize:'1.1rem',fontWeight:'700',marginBottom:'0.5rem'}}>📦 Proses Return</h2>
            <p style={{fontSize:'0.8rem',color:'#6b7280',marginBottom:'1.25rem'}}>Barang yang dikembalikan akan dicek kondisinya. Bagus → masuk stock toko. Rusak → dispose.</p>
            <form onSubmit={handleReturn} style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
              <div>
                <label style={{display:'block',fontSize:'0.8rem',fontWeight:'600',color:'#374151',marginBottom:'0.3rem'}}>Item (opsional)</label>
                <select value={returnForm.item_id} onChange={e=>setReturnForm(f=>({...f,item_id:e.target.value}))}
                  style={{width:'100%',padding:'0.625rem',border:'1px solid #d1d5db',borderRadius:'0.5rem',fontSize:'0.875rem',outline:'none',background:'#fff'}}>
                  <option value="">Semua item (return entire order)</option>
                  {items.map(it=>(
                    <option key={it.id} value={it.id}>{(it.product as any)?.name ?? 'Item'} — Qty: {it.qty}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{display:'block',fontSize:'0.8rem',fontWeight:'600',color:'#374151',marginBottom:'0.3rem'}}>Alasan Return *</label>
                <textarea value={returnForm.reason} onChange={e=>setReturnForm(f=>({...f,reason:e.target.value}))} rows={2}
                  style={{width:'100%',padding:'0.625rem',border:'1px solid #d1d5db',borderRadius:'0.5rem',fontSize:'0.875rem',outline:'none',resize:'vertical'}}
                  placeholder="Contoh: Barang rusak, tidak sesuai ukuran, dll"/>
              </div>
              <div>
                <label style={{display:'block',fontSize:'0.8rem',fontWeight:'600',color:'#374151',marginBottom:'0.3rem'}}>Kondisi Barang *</label>
                <div style={{display:'flex',gap:'0.75rem'}}>
                  {[['good','✅ Bagus (masuk stock)'],['damaged','❌ Rusak (dispose)']].map(([val,label])=>(
                    <label key={val} onClick={()=>setReturnForm(f=>({...f,condition:val as 'good'|'damaged'}))}
                      style={{flex:1,cursor:'pointer',border:`2px solid ${returnForm.condition===val?'#9333ea':'#e5e7eb'}`,borderRadius:'0.5rem',padding:'0.75rem',background:returnForm.condition===val?'#f5f3ff':'#fff',textAlign:'center'}}>
                      <input type="radio" name="condition" value={val} checked={returnForm.condition===val} onChange={()=>{}} style={{display:'none'}}/>
                      <span style={{fontSize:'0.875rem',fontWeight:'600'}}>{label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.75rem'}}>
                <div>
                  <label style={{display:'block',fontSize:'0.8rem',fontWeight:'600',color:'#374151',marginBottom:'0.3rem'}}>Qty Return</label>
                  <input type="number" min="1" value={returnForm.qty} onChange={e=>setReturnForm(f=>({...f,qty:e.target.value}))}
                    style={{width:'100%',padding:'0.625rem',border:'1px solid #d1d5db',borderRadius:'0.5rem',fontSize:'0.875rem',outline:'none'}}/>
                </div>
                <div>
                  <label style={{display:'block',fontSize:'0.8rem',fontWeight:'600',color:'#374151',marginBottom:'0.3rem'}}>Refund (Rp)</label>
                  <input type="number" min="0" value={returnForm.refund_amount} onChange={e=>setReturnForm(f=>({...f,refund_amount:e.target.value}))}
                    placeholder="0 = tidak ada refund"
                    style={{width:'100%',padding:'0.625rem',border:'1px solid #d1d5db',borderRadius:'0.5rem',fontSize:'0.875rem',outline:'none'}}/>
                </div>
              </div>
              <div style={{display:'flex',gap:'0.75rem',marginTop:'0.5rem'}}>
                <button type='button' onClick={()=>setShowReturnForm(false)} style={{flex:1,padding:'0.75rem',border:'1px solid #d1d5db',borderRadius:'0.5rem',background:'#fff',cursor:'pointer',fontWeight:'600'}}>Batal</button>
                <button type='submit' style={{flex:1,padding:'0.75rem',background:'#9333ea',color:'#fff',border:'none',borderRadius:'0.5rem',cursor:'pointer',fontWeight:'600'}}>Simpan Return</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
