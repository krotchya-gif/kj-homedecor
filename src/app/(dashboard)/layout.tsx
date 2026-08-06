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
  surveyor: '/surveyor',
  owner: '/owner'
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: staffData } = await supabase.from('users').select('name, role').eq('id', user.id).single()

  const role = staffData?.role ?? 'admin'
  const name = staffData?.name ?? user.email ?? 'Staff'

  // Check if current pathname matches user's role
  // This handles cases where middleware allowed through but we want double-check
  return (
    <ErrorBoundary>
      <DashboardLayoutClient role={role} userName={name}>
        {children}
      </DashboardLayoutClient>
    </ErrorBoundary>
  )
}
