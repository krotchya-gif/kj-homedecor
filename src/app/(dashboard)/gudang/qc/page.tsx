'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { CheckCircle2, XCircle, AlertTriangle, RefreshCw, Package, Upload, Camera } from 'lucide-react'
import { uploadToLocal } from '@/lib/upload'

const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

export default function GudangQCPage() {
  const [tab, setTab]         = useState<'qc' | 'retur'>('qc')
  const [items, setItems]     = useState<any[]>([])
  const [returns, setReturns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<any|null>(null)
  const [qcForm, setQcForm]   = useState({ result:'pass', fail_reason:'', revision_notes:'' })
  const [saving, setSaving]   = useState(false)

  // Retur tab state
  const [selectedReturn, setSelectedReturn] = useState<any|null>(null)
  const [returForm, setReturForm] = useState({ condition: 'good', notes: '', photos: [] as string[] })
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  const supabase = createClient()

  async function load() {
    setLoading(true)
    const [itemsRes, returnsRes] = await Promise.all([
      supabase.from('order_items').select('*, order:orders(id, customer:customers(name)), product:products(name)').order('created_at', { ascending: false }),
      supabase.from('returns').select('*, order:orders(id, customer:customers(name))').order('created_at', { ascending: false }),
    ])
    setItems(itemsRes.data ?? [])
    setReturns(returnsRes.data ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function handleQC(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()

    await supabase.from('qc_records').insert({
      order_item_id: selected.id,
      result: qcForm.result,
      fail_reason: qcForm.fail_reason || null,
      revision_notes: qcForm.revision_notes || null,
      checked_by: user?.id ?? 'unknown',
      checked_at: new Date().toISOString(),
    })

    if (qcForm.result === 'pass') {
      await supabase.from('order_items').update({ ready: true }).eq('id', selected.id)
      await supabase.from('order_logs').insert({
        order_id: selected.order_id,
        action: 'qc_pass',
        notes: `QC Pass oleh Gudang — item: ${selected.product?.name ?? selected.id.slice(0,8)}`,
        staff_id: user?.id ?? null,
      })
    } else {
      await supabase.from('order_logs').insert({
        order_id: selected.order_id,
        action: 'qc_fail',
        notes: `QC Fail — alasan: ${qcForm.fail_reason || 'n/a'}${qcForm.revision_notes ? ' | Catatan revisi: ' + qcForm.revision_notes : ''}`,
        staff_id: user?.id ?? null,
      })
    }

    setSaving(false)
    setSelected(null)
    setQcForm({ result:'pass', fail_reason:'', revision_notes:'' })
    load()
  }

  async function handleReturResolve(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedReturn) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()

    const isGood = returForm.condition === 'good'

    // Update return record — final condition determined by Gudang
    await supabase.from('returns').update({
      condition: returForm.condition,
      notes: returForm.notes || null,
      photo_evidence: returForm.photos.length > 0 ? returForm.photos : null,
      resolved_at: new Date().toISOString(),
    }).eq('id', selectedReturn.id)

    // If good → stock in, if damaged → dispose
    if (isGood) {
      // Stock return into inventory
      const orderItems = await supabase.from('order_items').select('*, product:products(id,stock_toko)').eq('order_id', selectedReturn.order_id)
      for (const item of orderItems.data ?? []) {
        if (item.product_id) {
          await supabase.from('inventory_movements').insert({
            material_id: null,
            type: 'return_in',
            qty: item.qty ?? 1,
            reason: `Return confirmed GOOD oleh Gudang — order ${selectedReturn.order_id.slice(0,8)}`,
            created_by: user?.id ?? null,
          })
          // increment stock_toko
          const { data: prod } = await supabase.from('products').select('stock_toko').eq('id', item.product_id).single()
          if (prod) {
            await supabase.from('products').update({ stock_toko: (prod.stock_toko ?? 0) + (item.qty ?? 1) }).eq('id', item.product_id)
          }
        }
      }
      await supabase.from('order_logs').insert({
        order_id: selectedReturn.order_id,
        action: 'return_stock_in',
        notes: `Return confirmed GOOD oleh Gudang — stock masuk ke toko. Foto: ${returForm.photos.length} bukti.`,
        staff_id: user?.id ?? null,
      })
    } else {
      await supabase.from('inventory_movements').insert({
        material_id: null,
        type: 'dispose',
        qty: selectedReturn.qty ?? 1,
        reason: `Return confirmed DAMAGED oleh Gudang — disposed. Alasan return: ${selectedReturn.reason}`,
        created_by: user?.id ?? null,
      })
      await supabase.from('order_logs').insert({
        order_id: selectedReturn.order_id,
        action: 'return_disposed',
        notes: `Return confirmed DAMAGED oleh Gudang — disposed. Alasan return: ${selectedReturn.reason}.`,
        staff_id: user?.id ?? null,
      })
    }

    setSaving(false)
    setSelectedReturn(null)
    setReturForm({ condition: 'good', notes: '', photos: [] })
    load()
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !selectedReturn) return
    setUploadingPhoto(true)
    try {
      const result = await uploadToLocal(file, 'evidence', { compress: true, maxSizeMB: 1 })
      setReturForm(f => ({ ...f, photos: [...f.photos, result.url] }))
    } catch (err) {
      console.error('Upload failed:', err)
      alert('Gagal upload foto')
    }
    setUploadingPhoto(false)
  }

  const pendingReturns = returns.filter(r => !r.resolved_at)
  const resolvedReturns = returns.filter(r => r.resolved_at)

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Quality Control</h1>
        <p className="page-subtitle">QC pass/fail per item — dan verifikasi barang return dari customer</p>
      </div>

      {/* Tab switcher */}
      <div style={{ display:'flex', gap:0, borderBottom:'2px solid #e5e7eb', marginBottom:'1.5rem' }}>
        {[
          { key: 'qc', label: '🔍 QC Items', count: items.filter(i=>!i.ready).length },
          { key: 'retur', label: '📦 Retur Customer', count: pendingReturns.length },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as 'qc' | 'retur')}
            style={{ padding:'0.75rem 1.5rem', background:'none', border:'none', borderBottom:`2px solid ${tab===t.key?'#cc7030':'transparent'}`,
              cursor:'pointer', fontWeight: tab===t.key?'700':'500', color: tab===t.key?'#cc7030':'#6b7280', fontSize:'0.9rem', marginBottom:'-2px',
              display:'flex', alignItems:'center', gap:'0.5rem' }}>
            {t.label}
            {t.count > 0 && (
              <span style={{ background:t.key==='retur'?'#9333ea':'#cc7030', color:'#fff', borderRadius:'999px', fontSize:'0.65rem', padding:'0.1rem 0.5rem', fontWeight:'700' }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ========== QC TAB ========== */}
      {tab === 'qc' && (
        <>
          <div className="stat-grid" style={{ marginBottom:'1.25rem' }}>
            {[
              { label:'Pending QC', val: items.filter(i=>!i.ready).length, color:'#ef4444' },
              { label:'Ready', val: items.filter(i=>i.ready).length, color:'#22c55e' },
              { label:'Total Items', val: items.length, color:'#6b7280' },
            ].map(s=>(
              <div key={s.label} className="stat-card">
                <div className="stat-card-label">{s.label}</div>
                <div className="stat-card-value" style={{color:s.color}}>{s.val}</div>
              </div>
            ))}
          </div>

          <div className="data-table">
            {loading ? (
              <div style={{ padding:'2rem', textAlign:'center', color:'#9ca3af' }}>Memuat...</div>
            ) : items.filter(i=>!i.ready).length === 0 ? (
              <div style={{ padding:'3rem', textAlign:'center', color:'#9ca3af' }}>
                <CheckCircle2 size={32} style={{ opacity:0.3, margin:'0 auto 0.75rem' }}/>
                <p>Semua item sudah QC pass ✅</p>
              </div>
            ) : (
              <table>
                <thead>
                  <tr><th>Produk</th><th>Pesanan</th><th>Pelanggan</th><th>Ukuran</th><th>Ready</th><th>Aksi</th></tr>
                </thead>
                <tbody>
                  {items.filter(i=>!i.ready).map(item => (
                    <tr key={item.id}>
                      <td style={{ fontWeight:'500' }}>{item.product?.name ?? '—'}</td>
                      <td style={{ fontFamily:'monospace', fontSize:'0.78rem', color:'#6b7280' }}>{item.order?.id?.slice(0,8)}</td>
                      <td>{item.order?.customer?.name ?? '—'}</td>
                      <td style={{ fontSize:'0.8rem', color:'#6b7280' }}>{item.size ?? '—'}</td>
                      <td><span style={{ color:'#9ca3af', fontSize:'0.8rem' }}>Pending</span></td>
                      <td>
                        <button onClick={()=>{ setSelected(item); setQcForm({result:'pass',fail_reason:'',revision_notes:''}) }}
                          style={{ padding:'0.3rem 0.75rem', background:'#cc7030', color:'#fff', border:'none', borderRadius:'0.375rem', fontSize:'0.75rem', fontWeight:'600', cursor:'pointer' }}>
                          QC Check
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* ========== RETUR TAB ========== */}
      {tab === 'retur' && (
        <>
          <div className="stat-grid" style={{ marginBottom:'1.25rem' }}>
            {[
              { label:'Pending Verifikasi', val: pendingReturns.length, color:'#f59e0b' },
              { label:'Sudah Diproses', val: resolvedReturns.length, color:'#22c55e' },
              { label:'Total Return', val: returns.length, color:'#6b7280' },
            ].map(s=>(
              <div key={s.label} className="stat-card">
                <div className="stat-card-label">{s.label}</div>
                <div className="stat-card-value" style={{color:s.color}}>{s.val}</div>
              </div>
            ))}
          </div>

          {loading ? (
            <div style={{ padding:'2rem', textAlign:'center', color:'#9ca3af' }}>Memuat...</div>
          ) : pendingReturns.length === 0 ? (
            <div className="data-table" style={{ padding:'3rem', textAlign:'center', color:'#9ca3af' }}>
              <Package size={32} style={{ opacity:0.3, margin:'0 auto 0.75rem' }}/>
              <p>Tidak ada return yang menunggu verifikasi</p>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
              {pendingReturns.map(r => (
                <div key={r.id} style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:'0.75rem', padding:'1.25rem' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'1rem', flexWrap:'wrap' }}>
                    <div>
                      <div style={{ fontWeight:'600', fontSize:'0.9rem', marginBottom:'0.25rem' }}>
                        Return Order: <span style={{ fontFamily:'monospace', color:'#6b7280' }}>{r.order?.id?.slice(0,8)}</span>
                      </div>
                      <div style={{ fontSize:'0.82rem', color:'#6b7280' }}>
                        Pelanggan: <strong>{r.order?.customer?.name ?? '—'}</strong>
                      </div>
                      <div style={{ fontSize:'0.8rem', color:'#6b7280', marginTop:'0.2rem' }}>
                        Alasan: <span style={{ color:'#991b1b', fontWeight:'500' }}>{r.reason}</span>
                      </div>
                      <div style={{ fontSize:'0.8rem', color:'#6b7280' }}>
                        Qty return: <strong>{r.qty ?? 1}</strong> &bull; Refund: <strong style={{ color:'#cc7030' }}>{r.refund_amount > 0 ? fmt(r.refund_amount) : 'Tidak ada'}</strong>
                      </div>
                      {r.refund_status === 'pending' && (
                        <span style={{ display:'inline-flex', alignItems:'center', gap:'0.2rem', background:'#fef3c7', color:'#92400e', padding:'0.15rem 0.5rem', borderRadius:'999px', fontSize:'0.7rem', fontWeight:'600', marginTop:'0.375rem' }}>
                          💰 Refund pending
                        </span>
                      )}
                    </div>
                    <button onClick={()=>{ setSelectedReturn(r); setReturForm({condition:r.condition || 'good',notes:'',photos:[]}) }}
                      style={{ padding:'0.5rem 1.25rem', background:'#9333ea', color:'#fff', border:'none', borderRadius:'0.5rem', fontSize:'0.8rem', fontWeight:'600', cursor:'pointer' }}>
                      ✅ Verifikasi & Proses
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Resolved returns history */}
          {resolvedReturns.length > 0 && (
            <div style={{ marginTop:'2rem' }}>
              <h3 style={{ fontSize:'0.9rem', fontWeight:'600', color:'#6b7280', marginBottom:'0.75rem' }}>Sudah Diproses</h3>
              <div className="data-table">
                <table>
                  <thead>
                    <tr><th>Order</th><th>Alasan</th><th>Kondisi Final</th><th>Qty</th><th>Resolved</th></tr>
                  </thead>
                  <tbody>
                    {resolvedReturns.map(r => (
                      <tr key={r.id}>
                        <td style={{ fontFamily:'monospace', fontSize:'0.78rem', color:'#6b7280' }}>{r.order?.id?.slice(0,8)}</td>
                        <td style={{ fontSize:'0.82rem' }}>{r.reason}</td>
                        <td>
                          <span style={{ padding:'0.2rem 0.6rem', borderRadius:'999px', fontSize:'0.72rem', fontWeight:'600',
                            background: r.condition === 'good' ? '#d1fae5' : '#fef2f2',
                            color: r.condition === 'good' ? '#065f46' : '#991b1b' }}>
                            {r.condition === 'good' ? '✅ Bagus → Stock' : '❌ Rusak → Dispose'}
                          </span>
                        </td>
                        <td style={{ color:'#6b7280' }}>{r.qty}</td>
                        <td style={{ fontSize:'0.75rem', color:'#9ca3af' }}>{r.resolved_at ? new Date(r.resolved_at).toLocaleDateString('id-ID') : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* QC Modal */}
      {selected && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}
          onClick={e=>{ if (e.target===e.currentTarget) setSelected(null) }}>
          <div style={{ background:'#fff', borderRadius:'0.875rem', padding:'2rem', width:'100%', maxWidth:460, boxShadow:'0 25px 60px rgba(0,0,0,0.25)' }}>
            <h2 style={{ fontSize:'1.1rem', fontWeight:'700', marginBottom:'0.5rem' }}>QC Check</h2>
            <p style={{ fontSize:'0.875rem', color:'#6b7280', marginBottom:'1.25rem' }}>{selected.product?.name} — {selected.size ?? 'tanpa ukuran'}</p>
            <form onSubmit={handleQC} style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
              <div>
                <label style={{ display:'block', fontSize:'0.8rem', fontWeight:'600', color:'#374151', marginBottom:'0.5rem' }}>Hasil QC</label>
                <div style={{ display:'flex', gap:'0.75rem' }}>
                  {[{val:'pass',label:'✅ Pass'},{val:'fail',label:'❌ Fail'},{val:'revision',label:'🔄 Revisi'}].map(opt=>(
                    <label key={opt.val} style={{ display:'flex', alignItems:'center', gap:'0.4rem', cursor:'pointer', fontWeight:'500', fontSize:'0.875rem',
                      background: qcForm.result===opt.val ? (opt.val==='pass'?'#d1fae5':opt.val==='fail'?'#fef2f2':'#fffbeb') : '#f3f4f6',
                      border:`1px solid ${qcForm.result===opt.val?(opt.val==='pass'?'#22c55e':opt.val==='fail'?'#ef4444':'#f59e0b'):'#e5e7eb'}`,
                      padding:'0.5rem 0.75rem', borderRadius:'0.5rem' }}>
                      <input type="radio" name="qcresult" value={opt.val} checked={qcForm.result===opt.val} onChange={()=>setQcForm(f=>({...f,result:opt.val}))} style={{ display:'none' }}/>
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>
              {qcForm.result !== 'pass' && (
                <>
                  <div>
                    <label style={{ display:'block', fontSize:'0.8rem', fontWeight:'600', color:'#374151', marginBottom:'0.3rem' }}>Alasan Gagal *</label>
                    <input required type="text" placeholder="Jahitan tidak rapi, warna salah, dll..." value={qcForm.fail_reason} onChange={e=>setQcForm(f=>({...f,fail_reason:e.target.value}))}
                      style={{ width:'100%', padding:'0.625rem', border:'1px solid #d1d5db', borderRadius:'0.5rem', fontSize:'0.875rem', outline:'none' }}/>
                  </div>
                  <div>
                    <label style={{ display:'block', fontSize:'0.8rem', fontWeight:'600', color:'#374151', marginBottom:'0.3rem' }}>Catatan Revisi</label>
                    <textarea placeholder="Instruksi perbaikan..." value={qcForm.revision_notes} onChange={e=>setQcForm(f=>({...f,revision_notes:e.target.value}))} rows={2}
                      style={{ width:'100%', padding:'0.625rem', border:'1px solid #d1d5db', borderRadius:'0.5rem', fontSize:'0.875rem', outline:'none', resize:'vertical' }}/>
                  </div>
                </>
              )}
              <div style={{ display:'flex', gap:'0.75rem' }}>
                <button type="button" onClick={()=>setSelected(null)} style={{ flex:1, padding:'0.75rem', border:'1px solid #d1d5db', borderRadius:'0.5rem', background:'#fff', cursor:'pointer', fontWeight:'600' }}>Batal</button>
                <button type="submit" disabled={saving} style={{ flex:1, padding:'0.75rem', background:'#cc7030', color:'#fff', border:'none', borderRadius:'0.5rem', cursor:saving?'not-allowed':'pointer', fontWeight:'600' }}>
                  {saving ? 'Menyimpan...' : 'Submit QC'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Retur Verification Modal */}
      {selectedReturn && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}
          onClick={e=>{ if (e.target===e.currentTarget) setSelectedReturn(null) }}>
          <div style={{ background:'#fff', borderRadius:'0.875rem', padding:'2rem', width:'100%', maxWidth:520, boxShadow:'0 25px 60px rgba(0,0,0,0.25)', maxHeight:'90vh', overflowY:'auto' }}>
            <h2 style={{ fontSize:'1.1rem', fontWeight:'700', marginBottom:'0.25rem' }}>📦 Verifikasi Return</h2>
            <p style={{ fontSize:'0.82rem', color:'#6b7280', marginBottom:'1.25rem' }}>
              Periksa kondisi fisik barang return. Foto wajib sebagai dokumentasi.
            </p>

            <div style={{ background:'#f9fafb', borderRadius:'0.5rem', padding:'0.875rem', marginBottom:'1.25rem', fontSize:'0.82rem', display:'flex', flexDirection:'column', gap:'0.25rem' }}>
              <div><strong>Order:</strong> <span style={{ fontFamily:'monospace' }}>{selectedReturn.order_id}</span></div>
              <div><strong>Pelanggan:</strong> {selectedReturn.order?.customer?.name ?? '—'}</div>
              <div><strong>Alasan return:</strong> {selectedReturn.reason}</div>
              <div><strong>Qty:</strong> {selectedReturn.qty ?? 1}</div>
              {selectedReturn.refund_amount > 0 && (
                <div><strong>Refund:</strong> <span style={{ color:'#cc7030', fontWeight:'600' }}>{fmt(selectedReturn.refund_amount)}</span> ({selectedReturn.refund_status})</div>
              )}
            </div>

            <form onSubmit={handleReturResolve} style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
              <div>
                <label style={{ display:'block', fontSize:'0.8rem', fontWeight:'600', color:'#374151', marginBottom:'0.5rem' }}>Kondisi Final *</label>
                <div style={{ display:'flex', gap:'0.75rem' }}>
                  {[
                    { val:'good', label:'✅ Bagus — masuk stock toko (+qty)', bg:'#d1fae5', border:'#22c55e', text:'#065f46' },
                    { val:'damaged', label:'❌ Rusak — dispose (tidak bisa dijual)', bg:'#fef2f2', border:'#ef4444', text:'#991b1b' },
                  ].map(opt=>(
                    <label key={opt.val} onClick={()=>setReturForm(f=>({...f,condition:opt.val}))}
                      style={{ flex:1, cursor:'pointer', border:`2px solid ${returForm.condition===opt.val?opt.border:'#e5e7eb'}`,
                        borderRadius:'0.5rem', padding:'0.75rem', background: returForm.condition===opt.val?opt.bg:'#fff', textAlign:'center' }}>
                      <input type="radio" name="returCond" value={opt.val} checked={returForm.condition===opt.val} onChange={()=>{}} style={{ display:'none' }}/>
                      <div style={{ fontSize:'0.82rem', fontWeight:'700', color:opt.text }}>{opt.label}</div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display:'block', fontSize:'0.8rem', fontWeight:'600', color:'#374151', marginBottom:'0.3rem' }}>Foto Dokumentasi (min. 2 foto) *</label>
                <div style={{ display:'flex', gap:'0.75rem', flexWrap:'wrap', marginBottom:'0.5rem' }}>
                  {returForm.photos.map((url, idx) => (
                    <div key={idx} style={{ position:'relative', width:72, height:72 }}>
                      <img src={url} alt={`Photo ${idx+1}`} style={{ width:72, height:72, objectFit:'cover', borderRadius:'0.5rem', border:'1px solid #e5e7eb' }}/>
                      <button type='button' onClick={()=>setReturForm(f=>({...f, photos: f.photos.filter((_,i)=>i!==idx)}))}
                        style={{ position:'absolute', top:-6, right:-6, width:20, height:20, borderRadius:'50%', background:'#ef4444', color:'#fff', border:'none', fontSize:'0.7rem', cursor:'pointer' }}>
                        ✕
                      </button>
                    </div>
                  ))}
                  <label style={{ width:72, height:72, border:'2px dashed #d1d5db', borderRadius:'0.5rem', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', background:'#f9fafb' }}>
                    <input type='file' accept='image/*' onChange={handlePhotoUpload} style={{ display:'none' }}/>
                    {uploadingPhoto ? (
                      <span style={{ fontSize:'0.65rem', color:'#9ca3af' }}>...</span>
                    ) : (
                      <Camera size={18} style={{ color:'#9ca3af' }}/>
                    )}
                  </label>
                </div>
                <div style={{ fontSize:'0.72rem', color:'#9ca3af' }}>Wajib upload minimal 2 foto sebagai bukti dokumentasi return.</div>
              </div>

              <div>
                <label style={{ display:'block', fontSize:'0.8rem', fontWeight:'600', color:'#374151', marginBottom:'0.3rem' }}>Catatan Verifikasi</label>
                <textarea placeholder="Contoh: Ada noda di bagian bawah, warna sedikit berbeda dari foto produk..." value={returForm.notes} onChange={e=>setReturForm(f=>({...f,notes:e.target.value}))} rows={2}
                  style={{ width:'100%', padding:'0.625rem', border:'1px solid #d1d5db', borderRadius:'0.5rem', fontSize:'0.875rem', outline:'none', resize:'vertical' }}/>
              </div>

              <div style={{ display:'flex', gap:'0.75rem' }}>
                <button type='button' onClick={()=>setSelectedReturn(null)} style={{ flex:1, padding:'0.75rem', border:'1px solid #d1d5db', borderRadius:'0.5rem', background:'#fff', cursor:'pointer', fontWeight:'600' }}>Batal</button>
                <button type='submit' disabled={saving || returForm.photos.length < 2}
                  style={{ flex:1, padding:'0.75rem', background: returForm.photos.length < 2 ? '#9ca3af' : '#9333ea', color:'#fff', border:'none', borderRadius:'0.5rem', cursor: returForm.photos.length < 2 ? 'not-allowed' : 'pointer', fontWeight:'600' }}>
                  {saving ? 'Menyimpan...' : returForm.photos.length < 2 ? `Upload foto dulu (${returForm.photos.length}/2)` : 'Simpan & Proses'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}