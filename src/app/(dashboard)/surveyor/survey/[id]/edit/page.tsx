'use client'

import { useEffect, useState } from 'react'
import { useParams, usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { PageHeader } from '@/components/ui/PageHeader'
import { useToast } from '@/components/ui/Toast'
import BackButton from '@/components/ui/BackButton'
import SurveyForm from '@/components/survey/SurveyForm'
import type { Survey } from '@/types'

export default function SurveyEditPage() {
  const params = useParams<{ id: string }>()
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const basePath = pathname.startsWith('/admin/surveys')
    ? '/admin'
    : pathname.startsWith('/owner/surveys')
      ? '/owner'
      : '/surveyor'
  const surveyListPath = basePath === '/surveyor' ? '/surveyor/history' : `${basePath}/surveys`
  const surveyDetailPath = basePath === '/surveyor' ? `/surveyor/survey/${params.id}` : `${basePath}/surveys/${params.id}`
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { toast } = useToast()

  useEffect(() => {
    ;(async () => {
      const { data, error } = await supabase
        .from('surveys')
        .select('*, surveyor:users(name), rooms:survey_rooms(*, photos:survey_room_photos(url, sort_order))')
        .eq('id', params.id)
        .order('sort_order', { referencedTable: 'survey_rooms' })
        .single()
      if (error) {
        setError(error.message.includes('row-level security') || error.code === 'PGRST116' ? 'Survey tidak ditemukan atau bukan milik Anda.' : error.message)
        toast('error', error.message.includes('row-level security') || error.code === 'PGRST116' ? 'Survey tidak ditemukan atau bukan milik Anda.' : error.message)
      } else {
        setSurvey(data)
      }
      setLoading(false)
    })()
  }, [params.id, supabase])

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Memuat...</div>
  if (error || !survey) {
    return (
      <div>
        <BackButton href={surveyListPath} />
        <PageHeader title="Edit Survey" subtitle={error || 'Tidak ditemukan'} />
      </div>
    )
  }

  return (
    <div>
       <BackButton href={surveyDetailPath} />
      <PageHeader title={`Edit Survey ${survey.survey_number ?? ''}`} subtitle={survey.client_name} />
       <SurveyForm
         initial={survey}
         onSaved={(id) => router.push(`${basePath === '/surveyor' ? `/surveyor/survey/${id}` : `${basePath}/surveys/${id}`}?saved=1`)}
       />
    </div>
  )
}
