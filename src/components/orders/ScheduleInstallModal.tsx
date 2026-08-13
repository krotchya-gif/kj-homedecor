'use client'
import { Modal } from '@/components/ui/Modal'
import { XIcon, Loader2, CalendarIcon } from 'lucide-react'

// Phase 6B-2a (refactor order detail): modal "Jadwalkan Pasang" diekstrak dari
// admin/orders/[id]/page.tsx — behavior-preserving (state & handler tetap di parent).
export interface ScheduleFormState {
  date: string
  time: string
  installer_id: string
}

interface Props {
  open: boolean
  onClose: () => void
  scheduling: boolean
  scheduleForm: ScheduleFormState
  setScheduleForm: (updater: (f: ScheduleFormState) => ScheduleFormState) => void
  installers: { id: string; name: string }[]
  onSubmit: (e: React.FormEvent) => void
}

export default function ScheduleInstallModal({
  open,
  onClose,
  scheduling,
  scheduleForm,
  setScheduleForm,
  installers,
  onSubmit
}: Props) {
  return (
    <Modal open={open} onClose={onClose} maxWidth={460} padding="1.5rem">
      <form onSubmit={onSubmit}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: '700' }}>📅 Jadwalkan Pasang</h2>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}
          >
            <XIcon size={18} />
          </button>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--neutral-600)', marginBottom: '1rem' }}>
          Order akan pindah ke <strong>Terjadwal Pasang</strong> dan installer langsung melihat job ini di{' '}
          <strong>/installer/schedule</strong>.
        </p>

        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: 'var(--neutral-700)', marginBottom: '0.3rem' }}>
          Tanggal *
        </label>
        <input
          type="date"
          required
          value={scheduleForm.date}
          onChange={(e) => setScheduleForm((f) => ({ ...f, date: e.target.value }))}
          style={{
            width: '100%',
            padding: '0.625rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            marginBottom: '0.85rem',
            outline: 'none'
          }}
        />

        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: 'var(--neutral-700)', marginBottom: '0.3rem' }}>
          Jam (opsional)
        </label>
        <input
          type="time"
          value={scheduleForm.time}
          onChange={(e) => setScheduleForm((f) => ({ ...f, time: e.target.value }))}
          style={{
            width: '100%',
            padding: '0.625rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            marginBottom: '0.85rem',
            outline: 'none'
          }}
        />

        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: 'var(--neutral-700)', marginBottom: '0.3rem' }}>
          Installer *
        </label>
        <select
          required
          value={scheduleForm.installer_id}
          onChange={(e) => setScheduleForm((f) => ({ ...f, installer_id: e.target.value }))}
          style={{
            width: '100%',
            padding: '0.625rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            marginBottom: '1rem',
            outline: 'none',
            background: 'var(--surface)'
          }}
        >
          <option value="">— Pilih installer —</option>
          {installers.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </select>
        {installers.length === 0 && (
          <p style={{ fontSize: '0.75rem', color: '#ef4444', marginBottom: '1rem' }}>
            ⚠️ Belum ada akun dengan role Installer. Buat di Admin → Staff terlebih dahulu.
          </p>
        )}

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={onClose}
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
            disabled={scheduling || !scheduleForm.date || !scheduleForm.installer_id}
            style={{
              flex: 1,
              padding: '0.75rem',
              background: scheduling || !scheduleForm.date || !scheduleForm.installer_id ? 'var(--neutral-400)' : '#cc7030',
              color: '#fff',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: scheduling || !scheduleForm.date || !scheduleForm.installer_id ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem'
            }}
            title="Simpan jadwal & pilih installer untuk pemasangan"
          >
            {scheduling ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <CalendarIcon size={14} />}
            {scheduling ? 'Menyimpan...' : 'Jadwalkan & Assign'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
