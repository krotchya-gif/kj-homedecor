'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Plus, Waves } from 'lucide-react'

export default function GudangSteamPage() {
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState<'laundry'|'steam'>('laundry')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [form, setForm]       = useState({ customer_name:'', kg:'', meter:'', description:'' , date: new Date().toISOString().slice(0,10)})
  const supabase = createClient()

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('laundry_records').select('*').order('date', { ascending: false })
    setRecords(data ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await supabase.from('laundry_records').insert({
      date: form.date,
      customer_name: form.customer_name,
      kg: Number(form.kg) || 0,
      meter: Number(form.meter) || 0,
      description: form.description || null,
    })
    setSaving(false)
    setShowForm(false)
    setForm({ customer_name:'', kg:'', meter:'', description:'', date: new Date().toISOString().slice(0,10) })
    load()
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Barang Masuk — Laundry & Steam</h1>
        <p className="page-subtitle">Input proses cuci, steam, dan finishing per pelanggan</p>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:'0', borderBottom:'2px solid #e5e7eb', marginBottom:'1.5rem' }}>
        {(['laundry','steam'] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)}
            style={{ padding:'0.75rem 1.5rem', background:'none', border:'none', borderBottom:`2px solid ${tab===t?'#cc7030':'transparent'}`, cursor:'pointer', fontWeight:tab===t?'700':'500', color:tab===t?'#cc7030':'#6b7280', fontSize:'0.9rem', marginBottom:'-2px', transition:'all 0.15s' }}>
            {t === 'laundry' ? '🧺 Laundry' : '♨️ Steam'}
          </button>
        ))}
      </div>

      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'1rem' }}>
        <button onClick={()=>setShowForm(true)}
          style={{ display:'flex', alignItems:'center', gap:'0.375rem', padding:'0.625rem 1.25rem', background:'#cc7030', color:'#fff', border:'none', borderRadius:'0.5rem', fontWeight:'600', fontSize:'0.875rem', cursor:'pointer' }}>
          <Plus size={16}/> Input {tab === 'laundry' ? 'Laundry' : 'Steam'}
        </button>
      </div>

      <div className="data-table">
        {loading ? (
          <div style={{ padding:'2rem', textAlign:'center', color:'#9ca3af' }}>Memuat...</div>
        ) : records.length === 0 ? (
          <div style={{ padding:'3rem', textAlign:'center', color:'#9ca3af' }}>
            <Waves size={32} style={{ opacity:0.3, margin:'0 auto 0.75rem' }}/>
            <p>Belum ada catatan {tab}</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr><th>Tanggal</th><th>Nama Pelanggan</th><th>Kg</th><th>Meter</th><th>Keterangan</th></tr>
            </thead>
            <tbody>
              {records.map(r => (
                <tr key={r.id}>
                  <td style={{ color:'#6b7280', fontSize:'0.85rem' }}>{new Date(r.date).toLocaleDateString('id-ID')}</td>
                  <td style={{ fontWeight:'500' }}>{r.customer_name}</td>
                  <td>{r.kg > 0 ? `${r.kg} kg` : '—'}</td>
                  <td>{r.meter > 0 ? `${r.meter} m` : '—'}</td>
                  <td style={{ color:'#6b7280' }}>{r.description ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}
          onClick={e=>{ if (e.target===e.currentTarget) setShowForm(false) }}>
          <div style={{ background:'#fff', borderRadius:'0.875rem', padding:'2rem', width:'100%', maxWidth:440, boxShadow:'0 25px 60px rgba(0,0,0,0.25)' }}>
            <h2 style={{ fontSize:'1.1rem', fontWeight:'700', marginBottom:'1.5rem' }}>
              Input {tab === 'laundry' ? '🧺 Laundry' : '♨️ Steam'}
            </h2>
            <form onSubmit={handleSave} style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
              {[
                { label:'Nama Pelanggan *', id:'customer_name', placeholder:'Nama pelanggan' },
                { label:'Tanggal', id:'date', placeholder:'', type:'date' },
              ].map(f=>(
                <div key={f.id}>
                  <label style={{ display:'block', fontSize:'0.8rem', fontWeight:'600', color:'#374151', marginBottom:'0.3rem' }}>{f.label}</label>
                  <input required={f.label.includes('*')} type={f.type??'text'} placeholder={f.placeholder}
                    value={(form as Record<string,string>)[f.id]} onChange={e=>setForm(prev=>({...prev,[f.id]:e.target.value}))}
                    style={{ width:'100%', padding:'0.625rem', border:'1px solid #d1d5db', borderRadius:'0.5rem', fontSize:'0.875rem', outline:'none' }}/>
                </div>
              ))}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem' }}>
                <div>
                  <label style={{ display:'block', fontSize:'0.8rem', fontWeight:'600', color:'#374151', marginBottom:'0.3rem' }}>Kg</label>
                  <input type="number" step="0.1" min="0" placeholder="0" value={form.kg} onChange={e=>setForm(f=>({...f,kg:e.target.value}))}
                    style={{ width:'100%', padding:'0.625rem', border:'1px solid #d1d5db', borderRadius:'0.5rem', fontSize:'0.875rem', outline:'none' }}/>
                </div>
                <div>
                  <label style={{ display:'block', fontSize:'0.8rem', fontWeight:'600', color:'#374151', marginBottom:'0.3rem' }}>Meter</label>
                  <input type="number" step="0.1" min="0" placeholder="0" value={form.meter} onChange={e=>setForm(f=>({...f,meter:e.target.value}))}
                    style={{ width:'100%', padding:'0.625rem', border:'1px solid #d1d5db', borderRadius:'0.5rem', fontSize:'0.875rem', outline:'none' }}/>
                </div>
              </div>
              <div>
                <label style={{ display:'block', fontSize:'0.8rem', fontWeight:'600', color:'#374151', marginBottom:'0.3rem' }}>Keterangan</label>
                <input type="text" placeholder="Vitras, Gorden, dll..." value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}
                  style={{ width:'100%', padding:'0.625rem', border:'1px solid #d1d5db', borderRadius:'0.5rem', fontSize:'0.875rem', outline:'none' }}/>
              </div>
              <div style={{ display:'flex', gap:'0.75rem' }}>
                <button type="button" onClick={()=>setShowForm(false)} style={{ flex:1, padding:'0.75rem', border:'1px solid #d1d5db', borderRadius:'0.5rem', background:'#fff', cursor:'pointer', fontWeight:'600' }}>Batal</button>
                <button type="submit" disabled={saving} style={{ flex:1, padding:'0.75rem', background:'#cc7030', color:'#fff', border:'none', borderRadius:'0.5rem', cursor:saving?'not-allowed':'pointer', fontWeight:'600' }}>
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
