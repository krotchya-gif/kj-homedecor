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
    .select('role')
    .eq('id', user.id)
    .single()

  if (!userData || !allowedRoles.includes(userData.role as Role)) {
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
 * Simple in-memory rate limiter.
 * Tracks request counts per IP within a time window.
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
