import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import DashboardLayoutClient from './DashboardLayoutClient'

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

  return (
    <DashboardLayoutClient role={role} userName={name}>
      {children}
    </DashboardLayoutClient>
  )
}