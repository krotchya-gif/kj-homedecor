import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import DashboardLayoutClient from './DashboardLayoutClient'
import { ErrorBoundary } from '@/components/ErrorBoundary'

const ROLE_DASHBOARD_MAP: Record<string, string> = {
  admin: '/admin',
  finance: '/finance',
  gudang: '/gudang',
  penjahit: '/penjahit',
  installer: '/installer',
  owner: '/owner',
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: staffData } = await supabase
    .from('users')
    .select('name, role')
    .eq('id', user.id)
    .single()

  const role = staffData?.role ?? 'admin'
  const name = staffData?.name ?? user.email ?? 'Staff'

  // Validate that user's role matches the dashboard path segment
  const expectedPrefix = ROLE_DASHBOARD_MAP[role]
  if (expectedPrefix) {
    const { headers } = await import('next/headers')
    const headersList = await headers()
    const pathname = headersList.get('x-pathname') ?? headersList.get('x-next-pathname') ?? ''
    const dashboardSegment = '/' + pathname.split('/').filter(Boolean)[0]
    if (dashboardSegment && dashboardSegment !== expectedPrefix) {
      redirect(expectedPrefix)
    }
  }

  return (
    <ErrorBoundary>
      <DashboardLayoutClient role={role} userName={name}>
        {children}
      </DashboardLayoutClient>
    </ErrorBoundary>
  )
}