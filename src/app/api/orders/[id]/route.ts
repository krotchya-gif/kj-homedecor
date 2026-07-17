import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { requireAuth, requireAuthRole, checkRateLimit } from '@/lib/auth'

const ALLOWED_ORDER_UPDATE_FIELDS = [
  'source', 'classification', 'notes',
  'status',
  'shipping_cost', 'tracking_number', 'courier',
  'scheduled_installation_date',
  'photo_urls', 'progress_photos',
] as const

const ALLOWED_ORDER_FINANCIAL_FIELDS = [
  'total_amount', 'dp_amount', 'lunas_amount',
  'payment_status', 'customer_id',
] as const

// V3 Pipeline: branching untuk kirim (delivery) vs pasang (delivery + installation)
const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  new: ['sorted', 'cancelled'],
  sorted: ['production', 'cancelled'],
  payment_ok: ['packed', 'cancelled'],
  production: ['steam', 'cancelled'],
  steam: ['ready', 'cancelled', 'production'], // 'production' = Steam revision re-queue
  ready: ['payment_ok', 'cancelled'],
  packed: ['shipped', 'scheduled', 'cancelled'], // V3: 'scheduled' untuk alur pasang
  shipped: ['done'],
  scheduled: ['installing', 'cancelled'],         // V3: alur pasang
  installing: ['done', 'cancelled'],                // V3: alur pasang
  done: [],
  returned: [],
  cancelled: [],
}

// Role-based permissions for status transitions
// V3: tambah permissions untuk alur pasang (scheduled, installing)
// finance: ready→payment_ok (verify lunas) + payment_ok→packed (approve before packing)
// admin: all transitions + packed→scheduled (input jadwal pasang untuk admin)
// gudang: production→steam (QC pass) + steam→production (revision re-queue)
// installer: packed→shipped (kirim) + scheduled→installing + installing→done (pasang)
const ROLE_STATUS_PERMISSIONS: Record<string, string[]> = {
  finance: ['ready->payment_ok', 'payment_ok->packed'],
  admin: ['packed->scheduled'], // V3: admin bisa input jadwal pasang
  gudang: ['production->steam', 'steam->production'],
  installer: ['packed->shipped', 'scheduled->installing', 'installing->done'],
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
  const auth = await requireAuthRole(['admin', 'owner', 'finance', 'gudang', 'penjahit', 'installer'])
  if (auth.error) return auth.error
  const { supabase, user, userData } = auth

  // IDOR protection: non-admin/owner/finance can only see orders related to them
  const userRole = userData?.role
  if (userRole !== 'admin' && userRole !== 'owner' && userRole !== 'finance') {
    // Check if user is related to this order via install_bookings or production_jobs
    const { data: relatedBooking } = await supabase
      .from('install_bookings')
      .select('id')
      .eq('order_id', id)
      .eq('installer_id', user.id)
      .maybeSingle()

    const { data: relatedJob } = await supabase
      .from('production_jobs')
      .select('id')
      .eq('order_id', id)
      .eq('penjahit_id', user.id)
      .maybeSingle()

    if (!relatedBooking && !relatedJob) {
      return NextResponse.json({ data: null, error: { message: 'Forbidden' } }, { status: 403 })
    }
  }

  const { data, error } = await supabase
    .from('orders')
    .select('*, customer:customers(*), order_items(*, product:products(name))')
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ data: null, error: { message: 'Internal server error' } }, { status: 500 })
  return NextResponse.json({ data, error: null })
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const rateLimit = checkRateLimit(request.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimit.blocked) return NextResponse.json({ data: null, error: { message: 'Too many requests' } }, { status: 429 })

  const auth = await requireAuthRole(['admin', 'owner', 'finance', 'gudang', 'penjahit', 'installer'])
  if (auth.error) return auth.error
  const { supabase, user, userData } = auth

  const { id } = await params
  const userRole = userData?.role ?? 'admin'
  const body = await request.json()

  // Validate status transition if status is being changed
  if (body.status) {
    const { data: current } = await supabase.from('orders').select('status, payment_status, total_amount, dp_amount, lunas_amount, classification, customer_id, scheduled_installation_date').eq('id', id).single()

    if (!current) {
      return NextResponse.json({ data: null, error: { message: 'Order not found' } }, { status: 404 })
    }

    // WAJIB: foto bukti untuk status yang butuh accountability (hasil kerja/fisik)
    const PHOTO_REQUIRED_TRANSITIONS = ['steam', 'packed', 'shipped', 'done']
    if (PHOTO_REQUIRED_TRANSITIONS.includes(body.status)) {
      const photoEvidence: string[] = body.photo_urls ?? body.progress_photos ?? []
      if (photoEvidence.length === 0) {
        return NextResponse.json(
          { data: null, error: { message: 'Wajib upload minimal 1 foto bukti pengerjaan (accountability). Field: photo_urls atau progress_photos.' } },
          { status: 400 }
        )
      }
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

    // sorted → production: create production_job (server-side, idempotent)
    // Cek dulu apakah sudah ada production_job aktif untuk order ini (idempotency)
    if (body.status === 'production' && current.status === 'sorted') {
      const { data: existingJob } = await supabase
        .from('production_jobs')
        .select('id')
        .eq('order_id', id)
        .in('status', ['waiting', 'in_progress'])
        .maybeSingle()

      if (!existingJob) {
        // Hitung total meter dari order_items
        const { data: orderItems } = await supabase
          .from('order_items')
          .select('meter_gorden, meter_vitras, meter_roman, meter_kupu_kupu, meter')
          .eq('order_id', id)
        const totalMeterGorden    = (orderItems ?? []).reduce((s: number, i: any) => s + Number(i.meter_gorden ?? i.meter ?? 0), 0)
        const totalMeterVitras    = (orderItems ?? []).reduce((s: number, i: any) => s + Number(i.meter_vitras ?? 0), 0)
        const totalMeterRoman     = (orderItems ?? []).reduce((s: number, i: any) => s + Number(i.meter_roman ?? 0), 0)
        const totalMeterKupuKupu  = (orderItems ?? []).reduce((s: number, i: any) => s + Number(i.meter_kupu_kupu ?? 0), 0)

        const { error: jobErr } = await supabase
          .from('production_jobs')
          .insert({
            order_id: id,
            meter_gorden: totalMeterGorden,
            meter_vitras: totalMeterVitras,
            meter_roman: totalMeterRoman,
            meter_kupu_kupu: totalMeterKupuKupu,
            status: 'waiting',
          })

        if (jobErr) {
          return NextResponse.json(
            { data: null, error: { message: 'Gagal membuat production_job' } },
            { status: 500 }
          )
        }
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
          { data: null, error: { message: 'Gagal membuat job revisi' } },
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

    // V3 Pipeline: packed → scheduled (alur pasang)
    // Auto-create install_bookings row dengan status 'pending'.
    // Admin akan assign installer + tanggal di /admin/booking.
    if (body.status === 'scheduled' && current.status === 'packed') {
      if (current.classification !== 'pasang') {
        return NextResponse.json(
          { data: null, error: { message: `Hanya order classification='pasang' yang bisa ke status 'scheduled'. Order ini classification='${current.classification}'.` } },
          { status: 400 }
        )
      }

      // Cek apakah sudah ada install_bookings row aktif
      const { data: existingBooking } = await supabase
        .from('install_bookings')
        .select('id')
        .eq('order_id', id)
        .eq('type', 'pasang')
        .in('status', ['pending', 'scheduled', 'in_progress'])
        .maybeSingle()

      if (!existingBooking) {
        // Get customer address (untuk default install_bookings.address)
        let defaultAddress = 'Alamat belum di-set'
        if (current.customer_id) {
          const { data: customer } = await supabase
            .from('customers')
            .select('address')
            .eq('id', current.customer_id)
            .maybeSingle()
          if (customer?.address) defaultAddress = customer.address
        }

        // Insert install_bookings dengan status='pending'
        const { data: newBooking, error: bookingErr } = await supabase
          .from('install_bookings')
          .insert({
            order_id: id,
            type: 'pasang',
            status: 'pending',
            address: defaultAddress,
            scheduled_date: current.scheduled_installation_date ?? null,
            scheduled_time: null,
            notes: 'Auto-created oleh sistem saat order masuk stage scheduled. Silakan Admin assign installer & tanggal.',
          })
          .select('id')
          .single()

        if (bookingErr) {
          return NextResponse.json(
            { data: null, error: { message: 'Gagal membuat install_bookings: ' + bookingErr.message } },
            { status: 500 }
          )
        }

        // Log ke order_logs
        const { data: { user: authUserBooking } } = await supabase.auth.getUser()
        await supabase.from('order_logs').insert({
          order_id: id,
          action: 'install_started',
          notes: `Order masuk stage 'scheduled' → install_bookings auto-created (id: ${newBooking.id.slice(0, 8)}, status: pending). Admin perlu assign installer + tanggal.`,
          staff_id: authUserBooking?.id ?? null,
        })
      }
    }
  }

  // Build whitelisted update object
  const whitelistedUpdate: Record<string, any> = {}
  for (const field of ALLOWED_ORDER_UPDATE_FIELDS) {
    if (body[field] !== undefined) whitelistedUpdate[field] = body[field]
  }
  // Hanya admin/owner/finance yang bisa update financial fields
  if (['admin', 'owner', 'finance'].includes(userRole)) {
    for (const field of ALLOWED_ORDER_FINANCIAL_FIELDS) {
      if (body[field] !== undefined) whitelistedUpdate[field] = body[field]
    }
  }

  const { data, error } = await supabase.from('orders').update(whitelistedUpdate).eq('id', id).select().single()
  if (error) return NextResponse.json({ data: null, error: { message: 'Internal server error' } }, { status: 500 })
  return NextResponse.json({ data, error: null })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const rateLimit = checkRateLimit(request.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimit.blocked) return NextResponse.json({ data: null, error: { message: 'Too many requests' } }, { status: 429 })

  const auth = await requireAuthRole(['admin', 'owner'])
  if (auth.error) return auth.error
  const { supabase, user, userData } = auth

  const { id } = await params
  const userRole = userData?.role ?? 'admin'

  // Log the deletion for audit trail before deleting
  await supabase.from('order_logs').insert({
    order_id: id,
    action: 'order_deleted',
    notes: `Order dihapus oleh ${userRole} (${user.id})`,
    staff_id: user.id,
  })

  const { error } = await supabase.from('orders').delete().eq('id', id)
  if (error) return NextResponse.json({ data: null, error: { message: 'Internal server error' } }, { status: 500 })
  return NextResponse.json({ data: { deleted: true }, error: null })
}