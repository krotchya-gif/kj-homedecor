'use client'
import { Modal } from '@/components/ui/Modal'
import { formatDateDDMMYYYY } from '@/lib/utils'
import type { SurveyCand } from '@/lib/order-detail'
import type { Survey } from '@/types'

// Phase 6B-3b (refactor order detail): blok "Hasil Survey" + modal pilih survey
// diekstrak dari admin/orders/[id]/page.tsx — behavior-preserving.
interface Props {
  survey: Survey | null | undefined
  surveyLinkOpen: boolean
  onCloseSurveyLink: () => void
  surveyCandidates: SurveyCand[]
  surveyLoading: boolean
  onUnlink: () => void
  onOpenSurveyLink: () => void
  onLinkSurvey: (id: string) => void
}

export default function OrderSurveySection({
  survey,
  surveyLinkOpen,
  onCloseSurveyLink,
  surveyCandidates,
  surveyLoading,
  onUnlink,
  onOpenSurveyLink,
  onLinkSurvey
}: Props) {
  return (
    <>
      <div className="form-section" style={{ marginBottom: '1rem' }}>
        <div className="form-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Hasil Survey</span>
          {survey ? (
            <button
              onClick={onUnlink}
              title="Lepas tautan survey dari pesanan ini"
              style={{ padding: '0.3rem 0.625rem', border: '1px solid #fecaca', borderRadius: '0.375rem', background: '#fef2f2', color: '#dc2626', fontSize: '0.7rem', fontWeight: '600', cursor: 'pointer' }}
            >
              Lepas Survey
            </button>
          ) : (
            <button
              onClick={onOpenSurveyLink}
              style={{ padding: '0.3rem 0.625rem', border: 'none', borderRadius: '0.375rem', background: '#cc7030', color: '#fff', fontSize: '0.7rem', fontWeight: '600', cursor: 'pointer' }}
            >
              🔗 Pilih Survey
            </button>
          )}
        </div>
        {survey ? (
          <div style={{ fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <div>
              <span style={{ color: 'var(--neutral-400)' }}>No: </span>
              <strong>{survey.survey_number ?? '—'}</strong>{' '}
              <a href={`/surveyor/survey/${survey.id}`} style={{ color: '#cc7030', fontSize: '0.8rem' }}>
                lihat detail →
              </a>
            </div>
            <div>
              <span style={{ color: 'var(--neutral-400)' }}>Client: </span>
              {survey.client_name}
              {survey.client_address ? ' — ' + survey.client_address : ''}
            </div>
            <div>
              <span style={{ color: 'var(--neutral-400)' }}>Ruangan: </span>
              {survey.rooms?.length ?? 0} ruangan · Tanggal {formatDateDDMMYYYY(survey.survey_date)}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: '600' }}>
              Blok HASIL SURVEY akan otomatis masuk ke Invoice PDF.
            </div>
          </div>
        ) : (
          <div style={{ fontSize: '0.8rem', color: 'var(--neutral-400)' }}>
            Belum ada survey ter-link. Pilih survey untuk menampilkan hasilnya di invoice.
          </div>
        )}
      </div>

      {/* Modal pilih survey */}
      <Modal open={surveyLinkOpen} onClose={onCloseSurveyLink} maxWidth={560}>
        <div style={{ padding: '1.25rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '0.75rem' }}>Pilih Survey</h3>
          {surveyLoading ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Memuat...</div>
          ) : surveyCandidates.length === 0 ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--neutral-400)' }}>
              Belum ada survey ber-status Tersimpan. Buat survey dulu di menu Survey.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 320, overflowY: 'auto' }}>
              {surveyCandidates.map((s) => (
                <button
                  key={s.id}
                  onClick={() => onLinkSurvey(s.id)}
                  style={{
                    textAlign: 'left',
                    padding: '0.75rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.5rem',
                    background: 'var(--surface)',
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}
                >
                  <strong>{s.survey_number ?? '—'}</strong> · {s.client_name}
                  <span style={{ color: 'var(--neutral-400)', marginLeft: '0.5rem' }}>
                    ({s.rooms?.[0]?.count ?? 0} ruangan · {formatDateDDMMYYYY(s.survey_date)})
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </>
  )
}
