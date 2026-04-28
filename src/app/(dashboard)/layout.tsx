import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import DashboardTopNav from '@/components/dashboard/DashboardTopNav'

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
    <div className="dashboard-layout" style={{ flexDirection: 'column' }}>
      <DashboardTopNav role={role} userName={name} />
      <main className="dashboard-main">
        <div className="dashboard-content">
          {children}
        </div>
      </main>
    </div>
  )
}
