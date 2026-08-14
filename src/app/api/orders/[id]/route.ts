import { createClient, createServiceClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { toClientError } from '@/lib/api-errors'
import { isPhotoRequired } from '@/lib/orders'
import { checkRateLimit, getClientIp } from '@/lib/auth'

// Pipeline: branching untuk kirim (delivery) vs pasang (delivery + installation)
// 2026-07-31: payment_ok dipindah ke depan (new → payment_ok) — finance approve pembayaran
// SEBELUM produksi (anti bukti transfer palsu, sesuai permintaan finance/customer).
const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  new: ['payment_ok', 'cancelled'],
  payment_ok: ['sorted', 'cancelled'],
  sorted: ['production', 'cancelled'],
  production: ['steam', 'cancelled'],
  steam: ['ready', 'cancelled', 'production'], // 'production' = Steam revision re-queue
  ready: ['packed', 'cancelled'],
  packed: ['shipped', 'scheduled', 'cancelled'], // 'scheduled' untuk alur pasang
  shipped: ['done'],
  scheduled: ['installing', 'cancelled'], // alur pasang
  installing: ['done', 'cancelled'], // alur pasang
  done: [],
  returned: [],
  cancelled: []
}

// Role-based permissions for status transitions
// tambah permissions untuk alur pasang (scheduled, installing)
// 2026-07-31: finance approve di DEPAN — new→payment_ok (verifikasi pembayaran sebelum produksi).
// E-commerce (TikTok/Shopee) masuk langsung 'sorted' via sync (auto-skip, pembayaran platform terverifikasi).
// admin: all transitions + packed→scheduled (input jadwal pasang untuk admin)
// gudang: production→steam (QC pass) + steam→production (revision re-queue)
// installer: packed→shipped (kirim) + scheduled→installing + installing→done (pasang)
const ROLE_STATUS_PERMISSIONS: Record<string, string[]> = {
  finance: ['new->payment_ok'],
  admin: ['packed->scheduled'], // admin bisa input jadwal pasang
  // 2026-07-31: gudang pegang payment_ok→sorted (sortir setelah approve) + ready→packed (packing setelah Siap)
  gudang: ['payment_ok->sorted', 'production->steam', 'steam->production', 'steam->ready', 'ready->packed'],
  penjahit: ['production->steam'],
  installer: ['packed->shipped', 'scheduled->installing', 'installing->done']
}

function isStatusTransitionAllowed(fromStatus: string, toStatus: string, userRole: string): boolean {
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
  if (checkRateLimit(getClientIp(request), 120, 60_000).blocked) {
    return NextResponse.json({ data: null, error: { message: 'Too many requests' } }, { status: 429 })
  }
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: { message: 'Unauthorized' } }, { status: 401 })

  // Phase 1 (BUG-086): GET order membawa PII pelanggan (customer(*) phone/address) —
  // batasi ke role operasional, konsisten dengan GET koleksi di api/orders/route.ts.
  // Alasan: role penjahit/surveyor/installer tidak butuh akses PII order semua pelanggan.
  const { data: requester } = await supabase.from('users').select('role, status').eq('id', user.id).single()
  if (!requester || requester.status !== 'active' || !['admin', 'owner', 'finance', 'gudang'].includes(requester.role)) {
    return NextResponse.json({ data: null, error: { message: 'Forbidden' } }, { status: 403 })
  }

  const db = createServiceClient()

  const { data, error } = await db
    .from('orders')
    .select('*, customer:customers(*), order_items(*, product:products(name))')
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ data: null, error: { message: toClientError(error) } }, { status: 500 })
  return NextResponse.json({ data, error: null })
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (checkRateLimit(getClientIp(request), 60, 60_000).blocked) {
    return NextResponse.json({ data: null, error: { message: 'Too many requests' } }, { status: 429 })
  }
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: { message: 'Unauthorized' } }, { status: 401 })

  // Get requester role — F-21 fix: lookup gagal → DENY (bukan fail-open ke 'admin')
  const { data: requester } = await supabase.from('users').select('role, status').eq('id', user.id).single()
  if (!requester || requester.status !== 'active') {
    return NextResponse.json({ data: null, error: { message: 'User profile tidak ditemukan' } }, { status: 403 })
  }

  const userRole = requester.role ?? ''
  const body = await request.json()
  const db = createServiceClient()
  let previousStatus: string | null = null

  // Validate status transition if status is being changed
  if (body.status) {
      const { data: current } = await db
      .from('orders')
      .select(
        'status, payment_status, total_amount, dp_amount, lunas_amount, classification, customer_id, scheduled_installation_date'
      )
      .eq('id', id)
      .single()

    if (!current) {
      return NextResponse.json({ data: null, error: { message: 'Order not found' } }, { status: 404 })
    }
    previousStatus = current.status

    // WAJIB: foto bukti pengerjaan harus di-upload (accountability)
    // photoUrls bisa dikirim via body.photo_urls atau body.progress_photos
    const photoEvidence: string[] = body.photo_urls ?? body.progress_photos ?? []
    // Auto-transition produksi (production→steam) tanpa foto: penjahit (sistem
    // auto-advance saat job selesai) DAN gudang (auto-transition saat job
    // produksi selesai di /gudang/production). Keduanya tetap role-gated di
    // ROLE_STATUS_PERMISSIONS ('production->steam').
    const isAutoProductionTransition =
      body.auto_transition === true && current.status === 'production' && body.status === 'steam' && (userRole === 'penjahit' || userRole === 'gudang')
    if (isPhotoRequired(body.status) && photoEvidence.length === 0 && !isAutoProductionTransition) {
      return NextResponse.json(
        {
          data: null,
          error: {
            message:
              'Wajib upload minimal 1 foto bukti pengerjaan (accountability). Field: photo_urls atau progress_photos.'
          }
        },
        { status: 400 }
      )
    }

    // Check role-based permission for this transition
    if (!isStatusTransitionAllowed(current.status, body.status, userRole)) {
      return NextResponse.json(
        {
          data: null,
          error: {
            message: `Role "${userRole}" tidak memiliki permission untuk mengubah status dari "${current.status}" ke "${body.status}"`
          }
        },
        { status: 403 }
      )
    }

    const allowed = VALID_STATUS_TRANSITIONS[current.status] ?? []
    if (!allowed.includes(body.status)) {
      return NextResponse.json(
        {
          data: null,
          error: {
            message: `Invalid status transition from "${current.status}" to "${body.status}". Allowed: ${allowed.join(', ') || 'none'}`
          }
        },
        { status: 400 }
      )
    }

    // F-2 fix: order TANPA pembayaran (pending) tidak bisa lanjut proses —
    // Finance wajib input DP lalu approve (new → payment_ok). Kecuali:
    // - transisi ke 'cancelled' (boleh siapa pun yang punya izin status itu)
    // - role finance (dia yang approve new → payment_ok)
    if (current.payment_status === 'pending' && body.status !== 'cancelled' && userRole !== 'finance') {
      return NextResponse.json(
        {
          data: null,
          error: {
            message: 'Order belum dibayar — Finance wajib input DP lalu approve (Cek Bayar) sebelum order bisa diproses.'
          }
        },
        { status: 403 }
      )
    }

    // Payment gate: cannot move to packed/shipped/done unless payment_status is 'paid'
    // 2026-07-31: financial guard tetap di packed (order harus lunas sebelum dikemas/dikirim).
    // payment_ok di depan (new→payment_ok) hanya verifikasi DP/bukti transfer, lunas tetap wajib untuk packed.
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
      const { data: existingJob } = await db
        .from('production_jobs')
        .select('id')
        .eq('order_id', id)
        .in('status', ['waiting', 'in_progress'])
        .maybeSingle()

      if (!existingJob) {
        // Hitung total meter dari order_items
        const { data: orderItems } = await db
          .from('order_items')
          .select('meter_gorden, meter_vitras, meter_roman, meter_kupu_kupu, meter')
          .eq('order_id', id)
        const totalMeterGorden = (orderItems ?? []).reduce(
          (s: number, i: { meter_gorden?: number; meter?: number }) => s + Number(i.meter_gorden ?? i.meter ?? 0),
          0
        )
        const totalMeterVitras = (orderItems ?? []).reduce((s: number, i: { meter_vitras?: number }) => s + Number(i.meter_vitras ?? 0), 0)
        const totalMeterRoman = (orderItems ?? []).reduce((s: number, i: { meter_roman?: number }) => s + Number(i.meter_roman ?? 0), 0)
        const totalMeterKupuKupu = (orderItems ?? []).reduce(
          (s: number, i: { meter_kupu_kupu?: number }) => s + Number(i.meter_kupu_kupu ?? 0),
          0
        )

        const { error: jobErr } = await db.from('production_jobs').insert({
          order_id: id,
          meter_gorden: totalMeterGorden,
          meter_vitras: totalMeterVitras,
          meter_roman: totalMeterRoman,
          meter_kupu_kupu: totalMeterKupuKupu,
          status: 'waiting'
        })

        if (jobErr) {
          return NextResponse.json(
            { data: null, error: { message: 'Gagal membuat production_job: ' + toClientError(jobErr) } },
            { status: 500 }
          )
        }
      }
    }

    // Steam revision re-queue: when moving steam → production, create a new production_job
    if (body.status === 'production' && current.status === 'steam') {
      // Look up the failed steam_job to find the original production_job
      const { data: latestSteamJob } = await db
        .from('steam_jobs')
        .select('id, production_job_id, fail_reason')
        .eq('order_id', id)
        .eq('status', 'revision')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      let originalPenjahitId: string | null = null
      if (latestSteamJob?.production_job_id) {
        const { data: origJob } = await db
          .from('production_jobs')
          .select('penjahit_id')
          .eq('id', latestSteamJob.production_job_id)
          .single()
        originalPenjahitId = origJob?.penjahit_id ?? null
      }

      // Calculate revision round
      const { data: priorRevisions } = await db
        .from('production_jobs')
        .select('revision_round')
        .eq('order_id', id)
        .order('revision_round', { ascending: false })
        .limit(1)
      const nextRound = (priorRevisions?.[0]?.revision_round ?? -1) + 1

      // Create new production_job for re-do
      const { data: newJob, error: newJobErr } = await db
        .from('production_jobs')
        .insert({
          order_id: id,
          penjahit_id: originalPenjahitId,
          status: 'waiting',
          revision_of: latestSteamJob?.production_job_id ?? null,
          revision_round: nextRound,
          revision_reason: latestSteamJob?.fail_reason ?? 'Steam QC revision'
        })
        .select('id')
        .single()

      if (newJobErr) {
        return NextResponse.json(
          { data: null, error: { message: 'Gagal membuat job revisi: ' + toClientError(newJobErr) } },
          { status: 500 }
        )
      }

      // Log the revision re-queue
      const {
        data: { user: authUser }
      } = await supabase.auth.getUser()
      await db.from('order_logs').insert({
        order_id: id,
        action: 'steam_revision_requeue',
        notes: `Steam QC Fail → re-queue ke Penjahit (round ${nextRound}). Alasan: ${latestSteamJob?.fail_reason ?? 'n/a'}. Job revisi: ${newJob.id.slice(0, 8)}`,
        staff_id: authUser?.id ?? null
      })
    }

    // Pipeline: packed → scheduled (alur pasang)
    // Auto-create install_bookings row dengan status 'pending'.
    // Admin akan assign installer + tanggal di /admin/booking.
    if (body.status === 'scheduled' && current.status === 'packed') {
      if (current.classification !== 'pasang') {
        return NextResponse.json(
          {
            data: null,
            error: {
              message: `Hanya order classification='pasang' yang bisa ke status 'scheduled'. Order ini classification='${current.classification}'.`
            }
          },
          { status: 400 }
        )
      }

      // Cek apakah sudah ada install_bookings row aktif
      const { data: existingBooking } = await db
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
            const { data: customer } = await db
            .from('customers')
            .select('address')
            .eq('id', current.customer_id)
            .maybeSingle()
          if (customer?.address) defaultAddress = customer.address
        }

        // Insert install_bookings dengan status='pending'
        const { data: newBooking, error: bookingErr } = await db
          .from('install_bookings')
          .insert({
            order_id: id,
            type: 'pasang',
            status: 'pending',
            address: defaultAddress,
            scheduled_date: current.scheduled_installation_date ?? null,
            scheduled_time: null,
            notes:
              'Auto-created oleh sistem saat order masuk stage scheduled. Silakan Admin assign installer & tanggal.'
          })
          .select('id')
          .single()

        if (bookingErr) {
          return NextResponse.json(
            { data: null, error: { message: 'Gagal membuat install_bookings: ' + toClientError(bookingErr) } },
            { status: 500 }
          )
        }

        // Log ke order_logs
        const {
          data: { user: authUserBooking }
        } = await supabase.auth.getUser()
        await db.from('order_logs').insert({
          order_id: id,
          action: 'install_started',
          notes: `Order masuk stage 'scheduled' → install_bookings auto-created (id: ${newBooking.id.slice(0, 8)}, status: pending). Admin perlu assign installer + tanggal.`,
          staff_id: authUserBooking?.id ?? null
        })
      }
    }
  }

  // Whitelist field yang BOLEH di-update di tabel orders — JANGAN pakai body mentah
  // (body berisi photo_urls yang bukan kolom orders → error 500 "Could not find the 'photo_urls' column")
  const allowedOrderFields = [
    'status',
    'courier',
    'tracking_number',
    'shipped_at',
    'packed_at',
    'scheduled_installation_date',
    'scheduled_installation_time',
    'installed_at',
    'notes'
  ]
  const updateData: Record<string, unknown> = {}
  for (const k of allowedOrderFields) {
    if (k in body) updateData[k] = body[k]
  }

  const { data, error } = await db.from('orders').update(updateData).eq('id', id).select().single()
  if (error) return NextResponse.json({ data: null, error: { message: toClientError(error) } }, { status: 500 })

  if (body.status && previousStatus) {
    const logAction: Record<string, string> = {
      payment_ok: 'payment_verified',
      sorted: 'sorted',
      production: 'production_started',
      steam: 'steam_qc_pass',
      ready: 'qc_pass',
      packed: 'packed',
      shipped: 'shipped',
      scheduled: 'install_started',
      installing: 'install_started',
      done: 'done',
      cancelled: 'cancelled'
    }
    const isSpecialRevision = previousStatus === 'steam' && body.status === 'production'
    const isSpecialSchedule = previousStatus === 'packed' && body.status === 'scheduled'
    if (!isSpecialRevision && !isSpecialSchedule) {
      await db.from('order_logs').insert({
        order_id: id,
        action: logAction[body.status] ?? 'status_changed',
        notes: `Status order: ${previousStatus} → ${body.status}`,
        staff_id: user.id
      })
    }
  }

  // Simpan foto bukti ke order_progress_photos (bukan kolom orders)
  const photoEvidence: string[] = body.photo_urls ?? body.progress_photos ?? []
  for (const url of photoEvidence) {
    const { error: photoErr } = await db.from('order_progress_photos').insert({
      order_id: id,
      stage: body.status ?? 'progress',
      photo_url: url,
      uploaded_by: user.id
    })
    if (photoErr) console.error('Gagal simpan foto progress:', photoErr)
  }

  return NextResponse.json({ data, error: null })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (checkRateLimit(getClientIp(request), 30, 60_000).blocked) {
    return NextResponse.json({ data: null, error: { message: 'Too many requests' } }, { status: 429 })
  }
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: { message: 'Unauthorized' } }, { status: 401 })

  // RBAC: only admin/owner can hard-delete. Other roles should use 'cancelled' status instead.
  // Security fix (2026-08-12): DENY kalau profil users tidak ditemukan — jangan fail-open ke 'admin'
  const { data: requester } = await supabase.from('users').select('role, status').eq('id', user.id).single()
  if (!requester || requester.status !== 'active' || !['admin', 'owner'].includes(requester.role)) {
    return NextResponse.json(
      {
        data: null,
        error: {
          message: 'Forbidden: hanya admin/owner aktif yang bisa hard-delete order. Gunakan status "cancelled" sebagai gantinya.'
        }
      },
      { status: 403 }
    )
  }
  const userRole = requester.role
  const db = createServiceClient()

  // Log the deletion for audit trail before deleting
  await db.from('order_logs').insert({
    order_id: id,
    action: 'order_deleted',
    notes: `Order dihapus oleh ${userRole} (${user.id})`,
    staff_id: user.id
  })

  const { error } = await db.from('orders').delete().eq('id', id)
  if (error) return NextResponse.json({ data: null, error: { message: toClientError(error) } }, { status: 500 })
  return NextResponse.json({ data: { deleted: true }, error: null })
}
