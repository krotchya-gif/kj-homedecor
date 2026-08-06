'use client'

import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/ui/PageHeader'
import BackButton from '@/components/ui/BackButton'
import SurveyForm from '@/components/survey/SurveyForm'

export default function SurveyNewPage() {
  const router = useRouter()
  return (
    <div>
      <BackButton href="/surveyor" />
      <PageHeader title="Survey Baru" subtitle="Catat hasil survey di lokasi customer (SRS)" />
      <SurveyForm onSaved={(id) => router.push(`/surveyor/survey/${id}?saved=1`)} />
    </div>
  )
}
