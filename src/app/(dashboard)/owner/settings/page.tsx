'use client'
import { PageHeader } from '@/components/ui/PageHeader'
import { Modal } from '@/components/ui/Modal'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { AlertTriangle, ShieldAlert, Loader2, CheckCircle2 } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'

export default function OwnerSettingsPage() {
  const { toast } = useToast()
  const router = useRouter()
  const [step1Open, setStep1Open] = useState(false)
  const [step2Open, setStep2Open] = useState(false)
  const [typeInput, setTypeInput] = useState('')
  const [resetting, setResetting] = useState(false)
  const [done, setDone] = useState(false)
  const supabase = createClient()

  async function handleReset() {
    if (typeInput !== 'RESET') return
    setResetting(true)
    // Wave 4 (2026-08-15): reset via route server (/api/owner/reset-data) — fungsi
    // destruktif tidak dipanggil langsung dari browser; route cek role owner + rate limit.
    let data: unknown = null
    let error: string | null = null
    try {
      const res = await fetch('/api/owner/reset-data', { method: 'POST' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        error = json.error ?? `HTTP ${res.status}`
      } else {
        data = (json as { data?: unknown }).data ?? null
      }
    } catch (e) {
      error = e instanceof Error ? e.message : String(e)
    }
    if (error) {
      setResetting(false)
      // Route sudah membubuhkan pesan lengkap (mis. "Gagal reset data: <msg>") —
      // jangan tambahkan prefix lagi agar tidak dobel (BUG-146).
      toast('error', error)
      return
    }
    setResetting(false)
    setStep2Open(false)
    setTypeInput('')
    setDone(true)
    // Tampilkan bukti counts_before dari RPC (jangan discard data)
    const counts = (data as { counts_before?: Record<string, number> } | null)?.counts_before
    const summary = counts
      ? Object.entries(counts)
          .filter(([, v]) => Number(v) > 0)
          .map(([k, v]) => `${k}: ${Number(v).toLocaleString('id-ID')}`)
          .join(', ')
      : ''
    toast('success', summary ? `Data transaksional berhasil di-reset! (${summary})` : 'Data transaksional berhasil di-reset!')
    // A-1 fix (sesi 13): arahkan ke Finance → Pengaturan untuk isi saldo awal kas/bank.
    setTimeout(() => router.push('/finance/settings'), 1200)
  }

  return (
    <div>
      <PageHeader title="Pengaturan" subtitle="Pengaturan sistem — hanya Owner" />

      <div className="section-card" style={{ border: '1px solid #fecaca', background: '#fff7f7' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
          <AlertTriangle size={22} style={{ color: '#dc2626', flexShrink: 0, marginTop: '0.15rem' }} />
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#991b1b' }}>Reset Data Transaksional</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--neutral-700)', marginTop: '0.5rem', lineHeight: 1.6 }}>
              Menghapus <strong>semua data transaksional</strong>: pesanan & item, pembayaran, jurnal keuangan,
              hutang & piutang, pelanggan, laundry (order, payroll, lembur), produksi/QC, survey, stok opname,
              purchase order & request, mutasi stok, data TikTok/Shopee & settlement, aset, riwayat harga
              material, notifikasi, laporan produksi — serta <strong>reset saldo kas & stok ke 0</strong>.
            </p>
            <p style={{ fontSize: '0.85rem', color: 'var(--neutral-700)', marginTop: '0.35rem', lineHeight: 1.6 }}>
              <strong style={{ color: '#166534' }}>Yang DI-PERTAHANKAN:</strong> akun login staff, chart of
              accounts & mapping akun, produk, material, supplier, BOM, tarif laundry/gorden, konten landing
              page, pengaturan marketplace.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem', fontSize: '0.8rem', color: '#b91c1c' }}>
              <ShieldAlert size={14} />
              <span>
                <strong>Tindakan ini TIDAK bisa dibatalkan (irreversible).</strong> Hanya Owner yang bisa melakukannya.
              </span>
            </div>
            <button
              onClick={() => setStep1Open(true)}
              disabled={resetting}
              style={{
                marginTop: '1rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.5rem',
                background: '#dc2626',
                color: '#fff',
                border: 'none',
                borderRadius: '0.5rem',
                fontWeight: '700',
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              {resetting ? <Loader2 size={16} className="spin" /> : <AlertTriangle size={16} />}
              {resetting ? 'Mereset...' : 'Reset Data'}
            </button>
          </div>
        </div>
      </div>

      {done && (
        <div
          style={{
            marginTop: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '0.75rem',
            padding: '1rem 1.25rem',
            fontSize: '0.875rem',
            color: '#166534'
          }}
        >
          <CheckCircle2 size={18} style={{ color: '#16a34a' }} />
          <span>
            Data berhasil di-reset. Silakan input saldo awal kas/bank di Finance &rarr; Pengaturan, lalu mulai
            transaksi baru.
          </span>
          <button
            onClick={() => router.push('/finance/settings')}
            style={{
              marginLeft: 'auto',
              padding: '0.5rem 1rem',
              background: '#16a34a',
              color: '#fff',
              border: 'none',
              borderRadius: '0.5rem',
              fontSize: '0.8rem',
              fontWeight: '600',
              cursor: 'pointer',
              flexShrink: 0
            }}
          >
            Isi Saldo Awal →
          </button>
        </div>
      )}
      {/* Dialog 1: peringatan */}
      <Modal open={step1Open} onClose={() => !resetting && setStep1Open(false)} maxWidth={480} padding="1.5rem" zIndex={300}>
        <h2 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#991b1b', marginBottom: '0.75rem' }}>
          ⚠️ Yakin ingin reset SEMUA data?
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--neutral-700)', lineHeight: 1.6, marginBottom: '0.5rem' }}>
          Semua pesanan & item, pembayaran, jurnal keuangan, hutang/piutang, pelanggan, laundry, produksi/QC,
          survey, PO, mutasi stok, data TikTok/Shopee, aset, notifikasi & lembur akan <strong>dihapus permanen</strong>.
          Saldo kas & stok di-reset ke 0.
        </p>
        <p style={{ fontSize: '0.85rem', color: 'var(--neutral-700)', lineHeight: 1.6 }}>
          Data master (produk, material, supplier, BOM, akun, staff) <strong>tetap dipertahankan</strong>.
        </p>
        <p style={{ fontSize: '0.8rem', color: '#b91c1c', marginTop: '0.5rem' }}>
          Tindakan ini tidak bisa dibatalkan.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
          <button
            onClick={() => setStep1Open(false)}
            disabled={resetting}
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
            onClick={() => {
              setStep1Open(false)
              setTypeInput('')
              setStep2Open(true)
            }}
            disabled={resetting}
            title="Lanjut ke konfirmasi penghapusan permanen"
            style={{
              flex: 1,
              padding: '0.75rem',
              background: '#dc2626',
              color: '#fff',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontWeight: '700'
            }}
          >
            Lanjutkan
          </button>
        </div>
      </Modal>

      {/* Dialog 2: ketik RESET */}
      <Modal open={step2Open} onClose={() => !resetting && setStep2Open(false)} maxWidth={440} padding="1.5rem" zIndex={301}>
        <h2 style={{ fontSize: '1rem', fontWeight: '800', color: '#991b1b', marginBottom: '0.5rem' }}>
          🔒 Konfirmasi Terakhir
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--neutral-700)', marginBottom: '1rem' }}>
          Ketik <strong style={{ fontFamily: 'monospace', background: '#fee2e2', padding: '0.1rem 0.4rem', borderRadius: '0.25rem' }}>RESET</strong> untuk mengonfirmasi penghapusan permanen.
        </p>
        <input
          value={typeInput}
          onChange={(e) => setTypeInput(e.target.value)}
          placeholder="Ketik RESET di sini"
          style={{
            width: '100%',
            padding: '0.625rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            outline: 'none',
            fontFamily: 'monospace'
          }}
        />
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
          <button
            onClick={() => setStep2Open(false)}
            disabled={resetting}
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
            onClick={handleReset}
            disabled={typeInput !== 'RESET' || resetting}
            style={{
              flex: 1,
              padding: '0.75rem',
              background: typeInput === 'RESET' && !resetting ? '#dc2626' : 'var(--neutral-300)',
              color: typeInput === 'RESET' && !resetting ? '#fff' : 'var(--neutral-500)',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: typeInput === 'RESET' && !resetting ? 'pointer' : 'not-allowed',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem'
            }}
          >
            {resetting && <Loader2 size={15} className="spin" />}
            {resetting ? 'Mereset...' : 'Ya, Reset Data'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
