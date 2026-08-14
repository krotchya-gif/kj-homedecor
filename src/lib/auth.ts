import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import type { Role } from '@/types'

/**
 * Require authenticated user. Returns user object or 401 response.
 */
export async function requireAuth() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      user: null,
      supabase: null as any,
    }
  }

  return { error: null, user, supabase }
}

/**
 * Require specific role(s). Returns user data or 403 response.
 * Must be called AFTER requireAuth().
 */
export async function requireRole(
  supabase: any,
  user: any,
  allowedRoles: Role[]
) {
  const { data: userData } = await supabase
    .from('users')
    .select('role, status')
    .eq('id', user.id)
    .single()

  if (!userData || userData.status !== 'active' || !allowedRoles.includes(userData.role as Role)) {
    return {
      error: NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 }),
      userData: null,
    }
  }

  return { error: null, userData }
}

/**
 * Combined: authenticate + check role in one call.
 * Returns { error, user, userData, supabase }.
 * If error is non-null, return it immediately from the route handler.
 */
export async function requireAuthRole(allowedRoles: Role[]) {
  const auth = await requireAuth()
  if (auth.error) return { ...auth, userData: null }

  const roleCheck = await requireRole(auth.supabase, auth.user, allowedRoles)
  if (roleCheck.error) return { ...auth, ...roleCheck }

  return { error: null, user: auth.user, userData: roleCheck.userData, supabase: auth.supabase }
}

/**
 * Extract client IP secara aman untuk rate limiting.
 * Security fix (2026-08-12): jangan percaya `x-forwarded-for` mentah (bisa di-spoof client) —
 * ambil entry PERTAMA (yang di-set proxy/ingress terpercaya) lalu fallback ke `x-real-ip`.
 */
export function getClientIp(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for')
  if (fwd) {
    const first = fwd.split(',')[0]?.trim()
    if (first) return first
  }
  return request.headers.get('x-real-ip') ?? 'unknown'
}

/**
 * Simple in-memory rate limiter.
 * Tracks request counts per IP within a time window.
 * Catatan: Map in-memory tidak skala di multi-instance/serverless — cukup untuk
 * single-instance (VPS). Untuk produksi multi-instance, ganti ke store persisten.
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(
  ip: string,
  maxRequests: number = 30,
  windowMs: number = 60_000
): { blocked: boolean; remaining: number } {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs })
    return { blocked: false, remaining: maxRequests - 1 }
  }

  entry.count++
  if (entry.count > maxRequests) {
    return { blocked: true, remaining: 0 }
  }

  return { blocked: false, remaining: maxRequests - entry.count }
}

/**
 * Clean rate limit map periodically to prevent memory leak.
 */
setInterval(() => {
  const now = Date.now()
  for (const [key, val] of rateLimitMap.entries()) {
    if (now > val.resetAt) rateLimitMap.delete(key)
  }
}, 60_000)
