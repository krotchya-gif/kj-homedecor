'use client'

import { useCallback, useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { PageHeader } from '@/components/ui/PageHeader'
import BackButton from '@/components/ui/BackButton'
import { formatDateDDMMYYYY } from '@/lib/utils'
import { LightboxGallery } from '@/components/ui/Lightbox'
import { formatSurveyText, buildWhatsAppUrl } from '@/lib/survey'
import { generateSurveyPDF } from '@/lib/survey-pdf'
import { Modal } from '@/components/ui/Modal'
import type { Survey } from '@/types'
import { useToast } from '@/components/ui/Toast'

const STATUS_COLORS: Record<string, string> = {
  draft: '#b45309',
  tersimpan: '#1d4ed8',
  diproses: '#7c3aed',
  selesai: '#047857'
}

const LOG_LABELS: Record<string, string> = {
  created: 'Survey dibuat',
  updated: 'Data diperbarui',
  deleted: 'Survey dihapus',
  linked_order: 'Di-link ke order'
}

interface OrderCand {
  id: string
  order_number?: string | null
  survey_id?: string | null
  customer?: { name?: string }[] | { name?: string } | null
}

interface SurveyLogRow {
  id: string
  action: string
  detail?: string | null
  created_at: string
  user?: { name?: string } | null
}

export default function SurveyDetailPage() {
  const { toast } = useToast()
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [role, setRole] = useState('')
  const [copied, setCopied] = useState(false)

  // State: Link ke Order
  const [linkOpen, setLinkOpen] = useState(false)
  const [orderSearch, setOrderSearch] = useState('')
  const [orderResults, setOrderResults] = useState<OrderCand[]>([])
  const [linkingId, setLinkingId] = useState<string | null>(null)
  const [searchingOrders, setSearchingOrders] = useState(false)

  // Riwayat aktivitas
  const [logs, setLogs] = useState<SurveyLogRow[]>([])

  // Toast sukses setelah save (datang dari /survey/new & /survey/[id]/edit via ?saved=1),
  // lalu bersihkan param tanpa reload (biar refresh tidak memunculkan toast lagi)
  useEffect(() => {
    if (searchParams.get('saved') === '1') {
      toast('success', 'Survey tersimpan. Hasilnya sudah bisa dilihat Admin & Owner.')
      router.replace(`/surveyor/survey/${params.id}`)
    }
  }, [searchParams, params.id, router, toast])

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('surveys')
      .select('*, surveyor:users(name), rooms:survey_rooms(*, photos:survey_room_photos(url, sort_order))')
      .eq('id', params.id)
      .order('sort_order', { referencedTable: 'survey_rooms' })
      .single()
    if (error) {
      setError(error.code === 'PGRST116' || error.message.includes('row-level') ? 'Survey tidak ditemukan atau bukan milik Anda.' : error.message)
      toast('error', error.code === 'PGRST116' || error.message.includes('row-level') ? 'Survey tidak ditemukan atau bukan milik Anda.' : error.message)
    } else {
      setSurvey(data)
    }

    // Riwayat aktivitas (log) — non-blocking
    const { data: logData } = await supabase
      .from('survey_logs')
      .select('id, action, detail, created_at, user:users(name)')
      .eq('survey_id', params.id)
      .order('created_at', { ascending: false })
      .limit(20)
    setLogs((logData ?? []) as SurveyLogRow[])

    setLoading(false)
  }, [params.id, supabase])

  useEffect(() => {
    ;(async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser()
      if (user) {
        const { data: staff } = await supabase.from('users').select('role').eq('id', user.id).single()
        // Phase 1 (BUG-090): fail-closed — user tanpa profil = role '' (bukan 'admin').
        // Alasan: konsisten deny-by-default; server API tetap menolak, UI juga tidak
        // boleh menampilkan tombol edit/delete palsu.
        setRole(staff?.role ?? '')
      }
      await load()
    })()
  }, [load, supabase])

  async function handleDelete() {
    if (!survey) return
    if (!confirm(`Hapus survey ${survey.survey_number ?? ''}? Ruangan & foto ikut terhapus.`)) return
    const res = await fetch(`/api/surveys/${survey.id}`, { method: 'DELETE' })
    const json = await res.json()
    if (!res.ok) {
      toast('error', json.error?.message ?? 'Gagal hapus survey')
      return
    }
    // Pindah ke riwayat + toast muncul di halaman tujuan (?deleted=1) — toast TIDAK
    // dipanggil di sini karena navigasi langsung unmount halaman ini (toast hilang)
    router.push('/surveyor/history?deleted=1')
  }

  async function handleCopy() {
    if (!survey) return
    try {
      await navigator.clipboard.writeText(formatSurveyText(survey))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast('error', 'Gagal menyalin ke clipboard.')
    }
  }

  // Cari order (order_number / nama customer) untuk di-link ke survey ini
  const searchOrders = useCallback(async (q: string) => {
    setSearchingOrders(true)
    try {
      let query = supabase
        .from('orders')
        .select('id, order_number, survey_id, total_amount, customer:customers(name)')
        .order('created_at', { ascending: false })
        .limit(15)
      if (q.trim()) {
        query = query.or(`order_number.ilike.%${q.trim()}%,customer.name.ilike.%${q.trim()}%`)
      }
      const { data, error } = await query
      if (error) {
        toast('error', error.message)
        setOrderResults([])
      } else {
        setOrderResults((data ?? []) as unknown as OrderCand[])
      }
    } finally {
      setSearchingOrders(false)
    }
  }, [supabase, toast])

  // Link survey ini ke order terpilih
  async function handleLinkOrder(orderId: string) {
    if (!survey) return
    setLinkingId(orderId)
    const { error } = await supabase.from('orders').update({ survey_id: survey.id }).eq('id', orderId)
    setLinkingId(null)
    if (error) {
      toast('error', 'Gagal link ke order: ' + error.message)
      return
    }
    toast('success', 'Survey ter-link ke order.')
    setLinkOpen(false)
    load()
  }

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Memuat...</div>
  if (error || !survey) {
    return (
      <div>
        <BackButton href="/surveyor/history" />
        <PageHeader title="Detail Survey" subtitle={error || 'Tidak ditemukan'} />
      </div>
    )
  }

  const canEdit = role === 'admin' || role === 'owner' || role === 'surveyor'
  const rooms = survey.rooms ?? []

  return (
    <div>
      <BackButton href="/surveyor/history" />
      <PageHeader
        title={survey.survey_number ?? 'Survey'}
        subtitle={`${survey.client_name}${survey.client_address ? ' — ' + survey.client_address : ''}`}
        action={
          <span
            style={{
              padding: '0.375rem 0.875rem',
              borderRadius: '999px',
              background: `${STATUS_COLORS[survey.status] ?? '#6b7280'}18`,
              color: STATUS_COLORS[survey.status] ?? '#6b7280',
              fontWeight: '700',
              fontSize: '0.75rem',
              textTransform: 'capitalize'
            }}
          >
            {survey.status}
          </span>
        }
      />

      {/* Info client */}
      <div className="section-card" style={{ marginBottom: '1rem' }}>
        <table className="data-table" style={{ width: '100%' }}>
          <tbody>
            <tr>
              <td style={{ fontWeight: '600', width: 160 }}>Nama Client</td>
              <td>{survey.client_name}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: '600' }}>Alamat</td>
              <td>{survey.client_address || '-'}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: '600' }}>Tanggal Survey</td>
                <td>{formatDateDDMMYYYY(survey.survey_date)}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: '600' }}>Surveyor</td>
              <td>{survey.surveyor?.name ?? '-'}</td>
            </tr>
            {survey.gps_lat && (
              <tr>
                <td style={{ fontWeight: '600' }}>Lokasi GPS</td>
                <td>
                  {survey.gps_lat.toFixed(5)}, {survey.gps_lng?.toFixed(5)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Aksi */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <button
          onClick={handleCopy}
          style={actionBtn('#374151')}
        >
          📋 {copied ? 'Tersalin!' : 'Copy Hasil Survey'}
        </button>
        <button onClick={() => window.open(buildWhatsAppUrl(survey), '_blank')} style={actionBtn('#25D366')}>
          📱 Kirim WhatsApp
        </button>
        <button onClick={() => generateSurveyPDF(survey)} style={actionBtn('#cc7030')}>
          📄 Download PDF
        </button>
        {(role === 'admin' || role === 'owner') && (
          <button
            onClick={() => {
              setOrderSearch('')
              setLinkOpen(true)
              searchOrders('')
            }}
            style={actionBtn('#0d9488')}
          >
            🔗 Link ke Order
          </button>
        )}
        {canEdit && (
          <>
            <Link href={`/surveyor/survey/${survey.id}/edit`} style={actionBtn('#7c3aed')}>
              ✏️ Edit
            </Link>
            <button onClick={handleDelete} style={actionBtn('#dc2626')}>
              🗑 Hapus
            </button>
          </>
        )}
      </div>

      {/* Rooms */}
      {rooms.length === 0 && (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Belum ada ruangan.</div>
      )}
      {rooms.map((room, i) => (
        <div key={room.id} className="section-card" style={{ marginBottom: '1rem' }}>
          <div className="form-section-title" style={{ color: '#cc7030' }}>
            RUANGAN {i + 1}: {room.room_name || '-'}
          </div>
          {(room.photos?.length ?? 0) > 0 && (
            <LightboxGallery photos={(room.photos ?? []).map((p) => p.url)} />
          )}
          <table className="data-table" style={{ width: '100%', marginTop: '0.5rem' }}>
            <tbody>
              <tr>
                <td style={{ fontWeight: '600', width: 160 }}>Ukuran</td>
                <td>{room.width_cm || room.height_cm ? `${room.width_cm ?? '-'} × ${room.height_cm ?? '-'} cm` : '-'}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: '600' }}>Model Gorden</td>
                <td>{room.model_gorden || '-'}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: '600' }}>Jenis Kain</td>
                <td>
                  {room.fabric_name || '-'}
                  {room.fabric_photo && <LightboxGallery photos={[room.fabric_photo]} columns={2} />}
                </td>
              </tr>
              <tr>
                <td style={{ fontWeight: '600' }}>Jenis Vitras</td>
                <td>
                  {room.vitras_name || '-'}
                  {room.vitras_photo && <LightboxGallery photos={[room.vitras_photo]} columns={2} />}
                </td>
              </tr>
              <tr>
                <td style={{ fontWeight: '600' }}>Rel Gorden</td>
                <td>{room.rel_gorden || '-'}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: '600' }}>Rel Vitras</td>
                <td>{room.rel_vitras || '-'}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: '600' }}>Hook</td>
                <td>{room.hook || '-'}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: '600' }}>Catatan</td>
                <td style={{ whiteSpace: 'pre-wrap' }}>{room.notes || '-'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      ))}

      {/* Tanda tangan digital */}
      {survey.signature && (
        <div className="section-card" style={{ marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '0.75rem' }}>✍️ Tanda Tangan Surveyor</h2>
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <img
              src={survey.signature}
              alt="Tanda tangan surveyor"
              style={{
                border: '1px solid var(--neutral-200)',
                borderRadius: '0.5rem',
                background: '#fff',
                maxWidth: 320,
                maxHeight: 120,
                padding: '0.5rem'
              }}
            />
            <div style={{ fontSize: '0.85rem' }}>
              <div style={{ fontWeight: '700' }}>{survey.signature_name || survey.surveyor?.name || 'Surveyor'}</div>
              <div style={{ color: 'var(--neutral-500)' }}>Menandatangani pada {new Date(survey.created_at).toLocaleString('id-ID')}</div>
            </div>
          </div>
        </div>
      )}

      {/* Riwayat Aktivitas */}
      {logs.length > 0 && (
        <div className="section-card" style={{ marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '0.75rem' }}>🕐 Riwayat Aktivitas</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {logs.map((l) => (
              <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', fontSize: '0.85rem' }}>
                <div>
                  <span style={{ fontWeight: '600' }}>{LOG_LABELS[l.action] ?? l.action}</span>
                  {l.detail && <span style={{ color: 'var(--neutral-500)' }}> — {l.detail}</span>}
                </div>
                <div style={{ textAlign: 'right', color: 'var(--neutral-400)', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                  {l.user?.name ?? 'Sistem'} · {new Date(l.created_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Link ke Order */}
      <Modal open={linkOpen} onClose={() => setLinkOpen(false)} maxWidth={520} padding="1.5rem">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: '700', margin: 0 }}>Link Survey ke Order</h2>
          <button onClick={() => setLinkOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--neutral-500)' }}>
            <X size={20} />
          </button>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--neutral-600)', marginBottom: '0.75rem' }}>
          Hasil survey ini akan tampil di invoice order yang dipilih.
        </p>
        <input
          type="text"
          placeholder="Cari nomor pesanan atau nama pelanggan..."
          value={orderSearch}
          onChange={(e) => {
            setOrderSearch(e.target.value)
            searchOrders(e.target.value)
          }}
          style={{
            width: '100%',
            padding: '0.625rem',
            border: '1px solid var(--neutral-200)',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            marginBottom: '0.75rem',
            background: 'var(--surface)',
            color: 'var(--neutral-800)'
          }}
        />
        {searchingOrders ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Mencari...</div>
        ) : orderResults.length === 0 ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Tidak ada order ditemukan.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 320, overflowY: 'auto' }}>
            {orderResults.map((o) => (
              <div
                key={o.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.625rem 0.875rem',
                  border: '1px solid var(--neutral-200)',
                  borderRadius: '0.5rem'
                }}
              >
                <div>
                  <div style={{ fontWeight: '600', fontSize: '0.85rem' }}>{o.order_number ?? '(tanpa nomor)'}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--neutral-500)' }}>
                    {Array.isArray(o.customer) ? o.customer[0]?.name : (o.customer?.name ?? '—')}
                    {o.survey_id ? ' • sudah ada survey' : ''}
                  </div>
                </div>
                <button
                  onClick={() => handleLinkOrder(o.id)}
                  disabled={linkingId === o.id}
                  style={{
                    padding: '0.4rem 0.75rem',
                    background: '#0d9488',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontSize: '0.78rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {linkingId === o.id ? '...' : 'Link'}
                </button>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  )
}

function actionBtn(color: string): React.CSSProperties {
  return {
    padding: '0.625rem 1rem',
    border: 'none',
    borderRadius: '0.5rem',
    background: color,
    color: '#fff',
    fontWeight: '600',
    fontSize: '0.8rem',
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.25rem'
  }
}
