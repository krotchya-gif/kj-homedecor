'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { uploadToLocal } from '@/lib/upload'
import type { Survey } from '@/types'

const MODEL_GORDEN_OPTIONS = [
  'Smokring',
  'Double Smokring',
  'Rel Kait',
  'Kupu-kupu',
  'Horizontal Blind',
  'Roller Blind',
  'Vertical Blind'
]

const ROOM_NAME_SUGGESTIONS = ['Ruang Tamu', 'Kamar Utama', 'Kamar Anak', 'Ruang Keluarga', 'Dapur', 'Kamar Mandi']

const ROOM_NOTES_PLACEHOLDER =
  'Contoh: Rel lama masih digunakan / Perlu rel baru / Ada AC / Dinding beton / High Ceiling / Menggunakan motorized'

export interface RoomForm {
  room_name: string
  width_cm: string
  height_cm: string
  model_gorden: string
  fabric_name: string
  fabric_photo: string
  vitras_name: string
  vitras_photo: string
  rel_gorden: string
  rel_vitras: string
  hook: string
  notes: string
  photos: string[]
}

export function emptyRoom(): RoomForm {
  return {
    room_name: '',
    width_cm: '',
    height_cm: '',
    model_gorden: '',
    fabric_name: '',
    fabric_photo: '',
    vitras_name: '',
    vitras_photo: '',
    rel_gorden: '',
    rel_vitras: '',
    hook: '',
    notes: '',
    photos: []
  }
}

interface SurveyFormProps {
  initial?: Survey | null
  onSaved?: (id: string) => void
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.625rem',
  border: '1px solid #d1d5db',
  borderRadius: '0.5rem',
  fontSize: '0.875rem',
  outline: 'none',
  background: 'var(--surface)'
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.8rem',
  fontWeight: '700',
  color: 'var(--neutral-700)',
  marginBottom: '0.4rem'
}

export default function SurveyForm({ initial, onSaved }: SurveyFormProps) {
  const supabase = createClient()
  const [clientName, setClientName] = useState(initial?.client_name ?? '')
  const [clientAddress, setClientAddress] = useState(initial?.client_address ?? '')
  const [surveyDate, setSurveyDate] = useState(initial?.survey_date ?? new Date().toISOString().split('T')[0])
  const [surveyorName, setSurveyorName] = useState((initial as any)?.surveyor?.name ?? '')
  const [rooms, setRooms] = useState<RoomForm[]>(() => {
    if (!initial?.rooms?.length) return [emptyRoom()]
    return initial.rooms.map((r) => ({
      room_name: r.room_name ?? '',
      width_cm: r.width_cm ? String(r.width_cm) : '',
      height_cm: r.height_cm ? String(r.height_cm) : '',
      model_gorden: r.model_gorden ?? '',
      fabric_name: r.fabric_name ?? '',
      fabric_photo: r.fabric_photo ?? '',
      vitras_name: r.vitras_name ?? '',
      vitras_photo: r.vitras_photo ?? '',
      rel_gorden: r.rel_gorden ?? '',
      rel_vitras: r.rel_vitras ?? '',
      hook: r.hook ?? '',
      notes: r.notes ?? '',
      photos: (r.photos ?? []).map((p) => p.url).filter(Boolean)
    }))
  })
  const [gps, setGps] = useState<{ lat: number | null; lng: number | null }>({
    lat: (initial as any)?.gps_lat ?? null,
    lng: (initial as any)?.gps_lng ?? null
  })
  const [step, setStep] = useState<'form' | 'review'>('form')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null)
  const draftIdRef = useRef<string | null>(initial?.id ?? null)

  // ---------- auto-save draft (SRS 13: Auto Save) ----------
  const autoSave = useCallback(async () => {
    if (!clientName.trim()) return
    setDraftSavedAt('menyimpan...')
    try {
      if (draftIdRef.current) {
        await fetch(`/api/surveys/${draftIdRef.current}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ client_name: clientName, client_address: clientAddress, survey_date: surveyDate, gps_lat: gps.lat, gps_lng: gps.lng })
        })
      } else {
        const res = await fetch('/api/surveys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ client_name: clientName, client_address: clientAddress, survey_date: surveyDate, status: 'draft', gps_lat: gps.lat, gps_lng: gps.lng })
        })
        const json = await res.json()
        if (res.ok && json.data?.id) draftIdRef.current = json.data.id
      }
      setDraftSavedAt(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }))
    } catch {
      setDraftSavedAt(null)
    }
  }, [clientName, clientAddress, surveyDate, gps.lat, gps.lng])

  useEffect(() => {
    const t = setTimeout(autoSave, 5000)
    return () => clearTimeout(t)
  }, [autoSave])

  // ---------- GPS ----------
  function captureGps() {
    if (!navigator.geolocation) {
      alert('Browser tidak mendukung GPS.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => alert('Gagal ambil lokasi. Periksa izin lokasi browser.'),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  // ---------- upload foto ----------
  async function handleUploadPhotos(roomIdx: number, files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(`ruangan ${roomIdx + 1}`)
    try {
      const urls: string[] = []
      for (const file of Array.from(files)) {
        const res = await uploadToLocal(file, 'survey')
        urls.push(res.url)
      }
      setRooms((prev) => prev.map((r, i) => (i === roomIdx ? { ...r, photos: [...r.photos, ...urls] } : r)))
    } catch (e) {
      alert('Gagal upload foto: ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setUploading(null)
    }
  }

  async function handleUploadSingle(roomIdx: number, field: 'fabric_photo' | 'vitras_photo', file: File | null) {
    if (!file) return
    setUploading(`foto ${field}`)
    try {
      const res = await uploadToLocal(file, 'survey')
      setRooms((prev) => prev.map((r, i) => (i === roomIdx ? { ...r, [field]: res.url } : r)))
    } catch (e) {
      alert('Gagal upload foto: ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setUploading(null)
    }
  }

  function updateRoom(roomIdx: number, patch: Partial<RoomForm>) {
    setRooms((prev) => prev.map((r, i) => (i === roomIdx ? { ...r, ...patch } : r)))
  }

  function addRoom() {
    setRooms((prev) => [...prev, emptyRoom()])
  }

  function removeRoom(roomIdx: number) {
    setRooms((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== roomIdx)))
  }

  // ---------- save final ----------
  async function saveFinal() {
    if (!clientName.trim()) {
      alert('Nama client wajib diisi.')
      return
    }
    const validRooms = rooms.filter((r) => r.room_name.trim())
    if (validRooms.length === 0) {
      alert('Minimal 1 ruangan dengan nama wajib diisi.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        client_name: clientName,
        client_address: clientAddress,
        survey_date: surveyDate,
        status: 'tersimpan',
        gps_lat: gps.lat,
        gps_lng: gps.lng,
        rooms: validRooms.map((r, i) => ({
          room_name: r.room_name,
          width_cm: r.width_cm ? Number(r.width_cm) : null,
          height_cm: r.height_cm ? Number(r.height_cm) : null,
          model_gorden: r.model_gorden,
          fabric_name: r.fabric_name,
          fabric_photo: r.fabric_photo,
          vitras_name: r.vitras_name,
          vitras_photo: r.vitras_photo,
          rel_gorden: r.rel_gorden,
          rel_vitras: r.rel_vitras,
          hook: r.hook,
          notes: r.notes,
          sort_order: i,
          photos: r.photos.map((url, j) => ({ url, sort_order: j }))
        }))
      }
      let surveyId = draftIdRef.current
      if (surveyId) {
        const res = await fetch(`/api/surveys/${surveyId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error?.message ?? 'Gagal simpan survey')
      } else {
        const res = await fetch('/api/surveys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error?.message ?? 'Gagal simpan survey')
        surveyId = json.data?.id
      }
      if (surveyId) onSaved?.(surveyId)
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  // ---------- render ----------
  if (step === 'review') {
    return (
      <div>
        <div className="section-card" style={{ marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '0.75rem' }}>Review Sebelum Disimpan</h2>
          <table className="data-table" style={{ width: '100%' }}>
            <tbody>
              <tr>
                <td style={{ fontWeight: '600', width: 160 }}>Nama Client</td>
                <td>{clientName}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: '600' }}>Alamat</td>
                <td>{clientAddress || '-'}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: '600' }}>Tanggal</td>
                <td>{surveyDate}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: '600' }}>Surveyor</td>
                <td>{surveyorName || 'Akun login'}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: '600' }}>Jumlah Ruangan</td>
                <td>{rooms.filter((r) => r.room_name.trim()).length} ruangan</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setStep('form')}
            disabled={saving}
            style={{
              padding: '0.75rem 1.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              background: 'var(--surface)',
              fontWeight: '600',
              fontSize: '0.875rem',
              cursor: 'pointer'
            }}
          >
            ✏️ Edit
          </button>
          <button
            onClick={saveFinal}
            disabled={saving}
            style={{
              padding: '0.75rem 1.5rem',
              border: 'none',
              borderRadius: '0.5rem',
              background: '#cc7030',
              color: '#fff',
              fontWeight: '700',
              fontSize: '0.875rem',
              cursor: 'pointer'
            }}
          >
            {saving ? 'Menyimpan...' : '💾 Simpan Survey'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* ============ A. Informasi Client ============ */}
      <div className="form-section" style={{ marginBottom: '1rem' }}>
        <div className="form-section-title">Informasi Client</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>Nama Client *</label>
            <input style={inputStyle} value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Nama customer" />
          </div>
          <div>
            <label style={labelStyle}>Alamat Client</label>
            <input style={inputStyle} value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} placeholder="Alamat lokasi survey" />
          </div>
          <div>
            <label style={labelStyle}>Tanggal Survey</label>
            <input type="date" style={inputStyle} value={surveyDate} onChange={(e) => setSurveyDate(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Nama Surveyor</label>
            <input style={inputStyle} value={surveyorName} onChange={(e) => setSurveyorName(e.target.value)} placeholder="Otomatis akun login" />
          </div>
        </div>
        <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={captureGps}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              background: 'var(--surface)',
              fontSize: '0.8rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            📍 Ambil Lokasi
          </button>
          {gps.lat && (
            <span style={{ fontSize: '0.75rem', color: 'var(--neutral-500)' }}>
              GPS: {gps.lat.toFixed(5)}, {gps.lng?.toFixed(5)}
            </span>
          )}
          <span style={{ fontSize: '0.75rem', color: 'var(--neutral-400)' }}>
            {draftSavedAt ? `💾 Draft tersimpan ${draftSavedAt}` : ''}
          </span>
        </div>
      </div>

      {/* ============ B. Data Ruangan ============ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <div className="form-section-title" style={{ margin: 0 }}>
          Data Ruangan
        </div>
        <button
          onClick={addRoom}
          style={{
            padding: '0.5rem 1rem',
            border: 'none',
            borderRadius: '0.5rem',
            background: '#cc7030',
            color: '#fff',
            fontSize: '0.8rem',
            fontWeight: '700',
            cursor: 'pointer'
          }}
        >
          ➕ Tambah Ruangan
        </button>
      </div>

      {rooms.map((room, idx) => (
        <div key={idx} className="section-card" style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div className="form-section-title" style={{ margin: 0, color: '#cc7030' }}>
              Ruangan {idx + 1}
            </div>
            <button
              onClick={() => removeRoom(idx)}
              disabled={rooms.length <= 1}
              style={{
                padding: '0.375rem 0.75rem',
                border: '1px solid #fecaca',
                borderRadius: '0.5rem',
                background: '#fef2f2',
                color: '#dc2626',
                fontSize: '0.75rem',
                fontWeight: '600',
                cursor: 'pointer',
                opacity: rooms.length <= 1 ? 0.4 : 1
              }}
            >
              🗑 Hapus Ruangan
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Nama Ruangan</label>
              <input
                style={inputStyle}
                list="room-name-suggestions"
                value={room.room_name}
                onChange={(e) => updateRoom(idx, { room_name: e.target.value })}
                placeholder="Contoh: Ruang Tamu"
              />
              <datalist id="room-name-suggestions">
                {ROOM_NAME_SUGGESTIONS.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
            <div>
              <label style={labelStyle}>Lebar (cm)</label>
              <input
                type="number"
                style={inputStyle}
                value={room.width_cm}
                onChange={(e) => updateRoom(idx, { width_cm: e.target.value })}
                placeholder="0"
              />
            </div>
            <div>
              <label style={labelStyle}>Tinggi (cm)</label>
              <input
                type="number"
                style={inputStyle}
                value={room.height_cm}
                onChange={(e) => updateRoom(idx, { height_cm: e.target.value })}
                placeholder="0"
              />
            </div>
            <div>
              <label style={labelStyle}>Model Gorden</label>
              <select style={inputStyle} value={room.model_gorden} onChange={(e) => updateRoom(idx, { model_gorden: e.target.value })}>
                <option value="">— Pilih —</option>
                {MODEL_GORDEN_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Foto ruangan */}
          <div style={{ marginTop: '0.75rem' }}>
            <label style={labelStyle}>Foto Ruangan (bisa lebih dari satu)</label>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              onChange={(e) => handleUploadPhotos(idx, e.target.files)}
              style={{ fontSize: '0.8rem' }}
            />
            {uploading === `ruangan ${idx + 1}` && (
              <div style={{ fontSize: '0.75rem', color: '#cc7030', marginTop: '0.25rem' }}>Uploading...</div>
            )}
            {room.photos.length > 0 && (
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                {room.photos.map((url, j) => (
                  <div key={j} style={{ position: 'relative' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Foto ${idx + 1}-${j + 1}`} style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }} />
                    <button
                      onClick={() => updateRoom(idx, { photos: room.photos.filter((_, k) => k !== j) })}
                      style={{
                        position: 'absolute',
                        top: -6,
                        right: -6,
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        border: 'none',
                        background: '#dc2626',
                        color: '#fff',
                        fontSize: '0.65rem',
                        cursor: 'pointer',
                        lineHeight: '20px'
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Kain & Vitras */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
            <div>
              <label style={labelStyle}>Jenis Kain</label>
              <input style={inputStyle} value={room.fabric_name} onChange={(e) => updateRoom(idx, { fabric_name: e.target.value })} placeholder="Nama kain" />
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleUploadSingle(idx, 'fabric_photo', e.target.files?.[0] ?? null)}
                style={{ fontSize: '0.75rem', marginTop: '0.375rem' }}
              />
              {room.fabric_photo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={room.fabric_photo} alt="Foto kain" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: '0.5rem', marginTop: '0.375rem' }} />
              )}
            </div>
            <div>
              <label style={labelStyle}>Jenis Vitras</label>
              <input style={inputStyle} value={room.vitras_name} onChange={(e) => updateRoom(idx, { vitras_name: e.target.value })} placeholder="Nama vitras" />
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleUploadSingle(idx, 'vitras_photo', e.target.files?.[0] ?? null)}
                style={{ fontSize: '0.75rem', marginTop: '0.375rem' }}
              />
              {room.vitras_photo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={room.vitras_photo} alt="Foto vitras" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: '0.5rem', marginTop: '0.375rem' }} />
              )}
            </div>
            <div>
              <label style={labelStyle}>Rel Gorden</label>
              <input style={inputStyle} value={room.rel_gorden} onChange={(e) => updateRoom(idx, { rel_gorden: e.target.value })} placeholder="Rel Aluminium / Hollow / Premium / Motorized" />
            </div>
            <div>
              <label style={labelStyle}>Rel Vitras</label>
              <input style={inputStyle} value={room.rel_vitras} onChange={(e) => updateRoom(idx, { rel_vitras: e.target.value })} placeholder="Jenis rel vitras" />
            </div>
            <div>
              <label style={labelStyle}>Hook</label>
              <input style={inputStyle} value={room.hook} onChange={(e) => updateRoom(idx, { hook: e.target.value })} placeholder="Hook Plastik / Stainless / Premium" />
            </div>
          </div>

          {/* Catatan */}
          <div style={{ marginTop: '1rem' }}>
            <label style={labelStyle}>Catatan</label>
            <textarea
              style={{ ...inputStyle, minHeight: 64, resize: 'vertical' }}
              value={room.notes}
              onChange={(e) => updateRoom(idx, { notes: e.target.value })}
              placeholder={ROOM_NOTES_PLACEHOLDER}
            />
          </div>
        </div>
      ))}

      {/* ============ Review button ============ */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={() => setStep('review')}
          style={{
            padding: '0.75rem 1.5rem',
            border: 'none',
            borderRadius: '0.5rem',
            background: '#cc7030',
            color: '#fff',
            fontWeight: '700',
            fontSize: '0.875rem',
            cursor: 'pointer'
          }}
        >
          Review & Simpan →
        </button>
      </div>
    </div>
  )
}
