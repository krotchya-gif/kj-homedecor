import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  new: ['sorted', 'cancelled'],
  sorted: ['production', 'cancelled'],
  payment_ok: ['packed', 'cancelled'],
  production: ['steam', 'cancelled'],
  steam: ['ready', 'cancelled', 'production'], // 'production' = Steam revision re-queue
  ready: ['payment_ok', 'cancelled'],
  packed: ['shipped', 'cancelled'],
  shipped: ['done'],
  done: [],
  returned: [],
  cancelled: [],
}

// Role-based permissions for status transitions
// finance: ready→payment_ok (verify lunas) + payment_ok→packed (approve before packing)
// admin: all transitions
// gudang: production→steam (QC pass) + steam→production (revision re-queue)
// installer: packed→shipped (delivery)
const ROLE_STATUS_PERMISSIONS: Record<string, string[]> = {
  finance: ['ready->payment_ok', 'payment_ok->packed'],
  admin: [], // admin can do all transitions (handled separately)
  gudang: ['production->steam', 'steam->production'],
  installer: ['packed->shipped'],
}

function isStatusTransitionAllowed(
  fromStatus: string,
  toStatus: string,
  userRole: string
): boolean {
  // Admin can do all transitions (except cancel which is always allowed)
  if (userRole === 'admin' || userRole === 'owner') return true

  // Check role-specific permissions
  const rolePerms = ROLE_STATUS_PERMISSIONS[userRole]
  if (rolePerms && rolePerms.length > 0) {
    const transition = `${fromStatus}->${toStatus}`
    if (!rolePerms.includes(transition)) {
      return false
    }
  } else if (userRole !== 'admin' && userRole !== 'owner') {
    // Other roles (penjahit, etc.) cannot change order status
    return false
  }

  return true
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: { message: 'Unauthorized' } }, { status: 401 })

  const { data, error } = await supabase
    .from('orders')
    .select('*, customer:customers(*), order_items(*, product:products(name))')
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ data: null, error: { message: error.message } }, { status: 500 })
  return NextResponse.json({ data, error: null })
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: { message: 'Unauthorized' } }, { status: 401 })

  // Get requester role
  const { data: requester } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  const userRole = requester?.role ?? 'admin'
  const body = await request.json()

  // Validate status transition if status is being changed
  if (body.status) {
    const { data: current } = await supabase.from('orders').select('status, payment_status, total_amount, dp_amount, lunas_amount').eq('id', id).single()

    if (!current) {
      return NextResponse.json({ data: null, error: { message: 'Order not found' } }, { status: 404 })
    }

    // Check role-based permission for this transition
    if (!isStatusTransitionAllowed(current.status, body.status, userRole)) {
      return NextResponse.json(
        { data: null, error: { message: `Role "${userRole}" tidak memiliki permission untuk mengubah status dari "${current.status}" ke "${body.status}"` } },
        { status: 403 }
      )
    }

    const allowed = VALID_STATUS_TRANSITIONS[current.status] ?? []
    if (!allowed.includes(body.status)) {
      return NextResponse.json(
        { data: null, error: { message: `Invalid status transition from "${current.status}" to "${body.status}". Allowed: ${allowed.join(', ') || 'none'}` } },
        { status: 400 }
      )
    }

    // Payment gate: cannot move to packed/shipped/done unless payment_status is 'paid'
    // (pipeline baru: payment_ok adalah gate antara ready dan packed, tapi financial guard ada di packed)
    if (['packed', 'shipped', 'done'].includes(body.status)) {
      if (current.payment_status !== 'paid') {
        return NextResponse.json(
          { data: null, error: { message: 'Payment gate: order belum lunas. Finance harus approve pembayaran dulu.' } },
          { status: 403 }
        )
      }
    }

    // Steam revision re-queue: when moving steam → production, create a new production_job
    if (body.status === 'production' && current.status === 'steam') {
      // Look up the failed steam_job to find the original production_job
      const { data: latestSteamJob } = await supabase
        .from('steam_jobs')
        .select('id, production_job_id, fail_reason')
        .eq('order_id', id)
        .eq('status', 'revision')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      let originalPenjahitId: string | null = null
      if (latestSteamJob?.production_job_id) {
        const { data: origJob } = await supabase
          .from('production_jobs')
          .select('penjahit_id')
          .eq('id', latestSteamJob.production_job_id)
          .single()
        originalPenjahitId = origJob?.penjahit_id ?? null
      }

      // Calculate revision round
      const { data: priorRevisions } = await supabase
        .from('production_jobs')
        .select('revision_round')
        .eq('order_id', id)
        .order('revision_round', { ascending: false })
        .limit(1)
      const nextRound = ((priorRevisions?.[0]?.revision_round ?? -1)) + 1

      // Create new production_job for re-do
      const { data: newJob, error: newJobErr } = await supabase
        .from('production_jobs')
        .insert({
          order_id: id,
          penjahit_id: originalPenjahitId,
          status: 'waiting',
          revision_of: latestSteamJob?.production_job_id ?? null,
          revision_round: nextRound,
          revision_reason: latestSteamJob?.fail_reason ?? 'Steam QC revision',
        })
        .select('id')
        .single()

      if (newJobErr) {
        return NextResponse.json(
          { data: null, error: { message: 'Gagal membuat job revisi: ' + newJobErr.message } },
          { status: 500 }
        )
      }

      // Log the revision re-queue
      const { data: { user: authUser } } = await supabase.auth.getUser()
      await supabase.from('order_logs').insert({
        order_id: id,
        action: 'steam_revision_requeue',
        notes: `Steam QC Fail → re-queue ke Penjahit (round ${nextRound}). Alasan: ${latestSteamJob?.fail_reason ?? 'n/a'}. Job revisi: ${newJob.id.slice(0, 8)}`,
        staff_id: authUser?.id ?? null,
      })
    }
  }

  const { data, error } = await supabase.from('orders').update(body).eq('id', id).select().single()
  if (error) return NextResponse.json({ data: null, error: { message: error.message } }, { status: 500 })
  return NextResponse.json({ data, error: null })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: { message: 'Unauthorized' } }, { status: 401 })

  // RBAC: only admin/owner can hard-delete. Other roles should use 'cancelled' status instead.
  const { data: requester } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  const userRole = requester?.role ?? 'admin'

  if (userRole !== 'admin' && userRole !== 'owner') {
    return NextResponse.json(
      { data: null, error: { message: `Role "${userRole}" tidak punya permission untuk hard-delete order. Gunakan status 'cancelled' sebagai gantinya.` } },
      { status: 403 }
    )
  }

  // Log the deletion for audit trail before deleting
  await supabase.from('order_logs').insert({
    order_id: id,
    action: 'order_deleted',
    notes: `Order dihapus oleh ${userRole} (${user.id})`,
    staff_id: user.id,
  })

  const { error } = await supabase.from('orders').delete().eq('id', id)
  if (error) return NextResponse.json({ data: null, error: { message: error.message } }, { status: 500 })
  return NextResponse.json({ data: { deleted: true }, error: null })
}