import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/middleware'

const DASHBOARD_ROUTES = ['/admin', '/gudang', '/penjahit', '/finance', '/installer', '/surveyor', '/owner']

const PUBLIC_ROUTES = ['/', '/login']

export async function proxy(request: NextRequest) {
  const { supabase, supabaseResponse } = createClient(request)

  // Refresh session
  const {
    data: { user }
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  const isDashboardRoute = DASHBOARD_ROUTES.some((route) => pathname.startsWith(route))

  // Not logged in → redirect to login
  if (!user && isDashboardRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Logged in → don't show login page
  if (user && pathname === '/login') {
    const { data: staffData } = await supabase.from('users').select('role').eq('id', user.id).single()

    const role = staffData?.role ?? 'admin'
    const dashboards: Record<string, string> = {
      admin: '/admin',
      gudang: '/gudang',
      penjahit: '/penjahit',
      finance: '/finance',
      installer: '/installer',
      surveyor: '/surveyor',
      owner: '/owner'
    }

    return NextResponse.redirect(new URL(dashboards[role] ?? '/admin', request.url))
  }

  // Role-based access control for dashboard routes
  if (user && isDashboardRoute) {
    const { data: staffData } = await supabase.from('users').select('role').eq('id', user.id).single()

    const userRole = staffData?.role ?? 'admin'

    // Map dashboard paths to allowed roles
    // Use prefix matching so /admin/orders matches /admin
    const ROLE_DASHBOARD_MAP: Record<string, string[]> = {
      '/admin': ['admin', 'owner'],
      '/finance': ['finance', 'owner'],
      '/gudang': ['gudang', 'owner'],
      '/penjahit': ['penjahit', 'owner'],
      '/installer': ['installer', 'owner'],
      '/surveyor': ['surveyor', 'owner'],
      '/owner': ['owner']
    }

    // Prefix match — subroute (mis. /admin/orders, /owner/laporan/neraca) harus ikut dicek,
    // bukan hanya pathname exact. Ambil segmen pertama dari path.
    const dashboardPrefix = DASHBOARD_ROUTES.find(
      (route) => pathname === route || pathname.startsWith(route + '/')
    )

    // 2026-08-11: finance boleh akses /owner/marketplace & /owner/tiktok (data settlement
    // dipakai finance untuk piutang channel) — whitelist path spesifik, bukan seluruh /owner.
    const isFinanceAllowedOwnerPath =
      userRole === 'finance' && (pathname.startsWith('/owner/marketplace') || pathname.startsWith('/owner/tiktok'))

    const allowedRoles = dashboardPrefix ? ROLE_DASHBOARD_MAP[dashboardPrefix] : undefined
    if (allowedRoles && !allowedRoles.includes(userRole) && !isFinanceAllowedOwnerPath) {
      // Redirect to user's own dashboard
      const dashboards: Record<string, string> = {
        admin: '/admin',
        gudang: '/gudang',
        penjahit: '/penjahit',
        finance: '/finance',
        installer: '/installer',
        surveyor: '/surveyor',
        owner: '/owner'
      }
      return NextResponse.redirect(new URL(dashboards[userRole] ?? '/login', request.url))
    }
  }

  // BUG-006 fix: set x-pathname header untuk validasi role di layout (defense-in-depth)
  supabaseResponse.headers.set('x-pathname', pathname)

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)']
}
