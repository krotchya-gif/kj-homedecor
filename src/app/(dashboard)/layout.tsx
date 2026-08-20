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
  laundry: '/laundry',
  owner: '/owner'
}

// Matriks akses per prefix dashboard — WAJIB identik dengan src/proxy.ts
// (SOP single-source-of-truth: layout hanya lapisan defense-in-depth, bukan penentu akses).
// owner diizinkan di semua dashboard; role lain hanya di prefix-nya sendiri.
const DASHBOARD_ROLE_MAP: Record<string, string[]> = {
  '/admin': ['admin', 'owner'],
  '/finance': ['finance', 'owner'],
  '/gudang': ['gudang', 'owner'],
  '/penjahit': ['penjahit', 'owner'],
  '/installer': ['installer', 'owner'],
  '/surveyor': ['surveyor', 'owner'],
  '/laundry': ['laundry', 'owner'],
  '/owner': ['owner']
}

const DASHBOARD_ROUTES = Object.keys(DASHBOARD_ROLE_MAP)

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: staffData } = await supabase.from('users').select('name, role, status').eq('id', user.id).single()

  // Phase 1 (BUG-090): fail-closed — user tanpa profil users (role null) TIDAK boleh
  // masuk dashboard (sebelumnya ?? 'admin' → bisa dianggap admin). Alasan: konsisten
  // deny-by-default (F-21 di proxy & login). Redundan dgn proxy, tapi defense-in-depth.
  const role = staffData?.role
  if (!role || staffData?.status !== 'active') {
    redirect('/login')
  }
  const name = staffData?.name ?? user.email ?? 'Staff'

  // Validate that user's role is allowed on the requested dashboard prefix
  // (BUG-144 fix: sebelumnya cek "prefix == dashboard sendiri" → owner di-block dari
  // /finance/* (link Rekonsiliasi dashboard owner), dan finance di-block dari
  // /owner/marketplace & /owner/tiktok padahal proxy sudah mengizinkan. Sekarang
  // matriks akses diselaraskan persis dengan proxy.ts.)
  const { headers } = await import('next/headers')
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') ?? headersList.get('x-next-pathname') ?? ''
  const dashboardPrefix = DASHBOARD_ROUTES.find(
    (route) => pathname === route || pathname.startsWith(route + '/')
  )
  if (dashboardPrefix) {
    const allowedRoles = DASHBOARD_ROLE_MAP[dashboardPrefix]
    // Identik dengan isFinanceAllowedOwnerPath di proxy.ts
    const isFinanceAllowedOwnerPath =
      role === 'finance' && (pathname.startsWith('/owner/marketplace') || pathname.startsWith('/owner/tiktok'))
    const allowed = allowedRoles.includes(role) || isFinanceAllowedOwnerPath
    if (!allowed) {
      redirect(ROLE_DASHBOARD_MAP[role] ?? '/login')
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
