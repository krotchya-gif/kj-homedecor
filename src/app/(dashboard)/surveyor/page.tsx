'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { ClipboardPlus, History, FileText } from 'lucide-react'

export default function SurveyorDashboardPage() {
  const supabase = createClient()
  const [stats, setStats] = useState({ today: 0, month: 0, total: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const today = new Date().toISOString().split('T')[0]
      const firstOfMonth = new Date()
      firstOfMonth.setDate(1)
      const monthStart = firstOfMonth.toISOString().split('T')[0]

      const [t, m, total] = await Promise.all([
        supabase.from('surveys').select('id', { count: 'exact', head: true }).eq('survey_date', today),
        supabase.from('surveys').select('id', { count: 'exact', head: true }).gte('survey_date', monthStart),
        supabase.from('surveys').select('id', { count: 'exact', head: true })
      ])
      setStats({
        today: t.count ?? 0,
        month: m.count ?? 0,
        total: total.count ?? 0
      })
      setLoading(false)
    })()
  }, [supabase])

  return (
    <div>
      <PageHeader title="Dashboard Survey" subtitle="Pantau hasil survey kamu" />

      <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <StatCard label="Survey Hari Ini" value={loading ? '...' : String(stats.today)} accent="#cc7030" icon={FileText} />
        <StatCard label="Survey Bulan Ini" value={loading ? '...' : String(stats.month)} accent="#1d4ed8" icon={FileText} />
        <StatCard label="Total Survey" value={loading ? '...' : String(stats.total)} accent="#047857" icon={FileText} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginTop: '1.5rem' }}>
        <Link
          href="/surveyor/survey/new"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            padding: '1.5rem',
            borderRadius: '0.75rem',
            background: '#cc7030',
            color: '#fff',
            fontWeight: '700',
            fontSize: '1rem',
            textDecoration: 'none'
          }}
        >
          <ClipboardPlus size={22} /> Survey Baru
        </Link>
        <Link
          href="/surveyor/history"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            padding: '1.5rem',
            borderRadius: '0.75rem',
            background: 'var(--surface)',
            border: '1px solid #e5e7eb',
            color: 'var(--neutral-700)',
            fontWeight: '700',
            fontSize: '1rem',
            textDecoration: 'none'
          }}
        >
          <History size={22} /> Riwayat Survey
        </Link>
      </div>
    </div>
  )
}
