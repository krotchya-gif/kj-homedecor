'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { PageHeader } from '@/components/ui/PageHeader'
import BackButton from '@/components/ui/BackButton'
import { LightboxGallery } from '@/components/ui/Lightbox'
import { formatSurveyText, buildWhatsAppUrl } from '@/lib/survey'
import { generateSurveyPDF } from '@/lib/survey-pdf'
import type { Survey } from '@/types'
import { useToast } from '@/components/ui/Toast'

const STATUS_COLORS: Record<string, string> = {
  draft: '#b45309',
  tersimpan: '#1d4ed8',
  diproses: '#7c3aed',
  selesai: '#047857'
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

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('surveys')
      .select('*, surveyor:users(name), rooms:survey_rooms(*, photos:survey_room_photos(url, sort_order))')
      .eq('id', params.id)
      .order('sort_order', { referencedTable: 'survey_rooms' })
      .single()
    if (error) {
      setError(error.code === 'PGRST116' || error.message.includes('row-level') ? 'Survey tidak ditemukan atau bukan milik Anda.' : error.message)
    } else {
      setSurvey(data)
    }
    setLoading(false)
  }, [params.id, supabase])

  useEffect(() => {
    ;(async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser()
      if (user) {
        const { data: staff } = await supabase.from('users').select('role').eq('id', user.id).single()
        setRole(staff?.role ?? 'admin')
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
    router.push('/surveyor/history')
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

      {searchParams.get('saved') === '1' && (
        <div style={{ background: '#dcfce7', color: '#166534', borderRadius: '0.5rem', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.85rem', fontWeight: '600' }}>
          ✅ Survey tersimpan. Hasilnya sudah bisa dilihat Admin & Owner.
        </div>
      )}

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
              <td>{survey.survey_date}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: '600' }}>Surveyor</td>
              <td>{(survey as any).surveyor?.name ?? '-'}</td>
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
