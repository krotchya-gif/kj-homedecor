# Bug Tracker — KJ Homedecor

Dokumentasi bug & masalah yang ditemukan selama audit + penggunaan harian. Update terus-menerus saat bug baru ditemukan atau di-fix.

---

## Ringkasan Status

| ID | Bug | Status | Diprioritaskan |
|---|---|---|---|
| BUG-001 | Pipeline macet di Steam/QC — gudang tidak bisa advance | ✅ Fixed | — |
| BUG-002 | Pipeline macet di Kemas (ready → packed) — gudang tidak bisa advance | ✅ Fixed | — |
| BUG-003 | Role admin diblokir di stage production/steam/ready (🔒) | ✅ Fixed | — |
| BUG-004 | Approve pembayaran (Cek Bayar) gagal jika DP diinput admin | ✅ Fixed (Opsi B) | — |
| BUG-005 | Role drift: TS `Role` vs DB CHECK constraint vs pemakaian app | ✅ Fixed | — |
| BUG-006 | `x-pathname` header diklaim tapi tidak pernah di-set | ✅ Fixed | — |
| BUG-007 | Pipeline pasang: booking installer tidak terhubung dari order detail (order nyangkut di Terjadwal Pasang) | ✅ Fixed | — |
| BUG-008 | Harga jual produk diinput admin (tebakan) padahal belum tahu HPP → harga asal-asalan tampil di katalog | ✅ Fixed (Opsi A) | — |
| BUG-009 | **Pembukuan server mati**: `createJournalEntry` pakai `fetch('/api/journal')` URL relatif → di Next.js route handler throw → jurnal order/PO tidak pernah dibuat | ✅ Fixed | — |
| BUG-010 | **Tanda saldo terbalik** di laporan keuangan: `ledger.ts` cek `normal_side` (kolom mati/NULL) → liability/equity/revenue minus | ✅ Fixed | — |
| BUG-011 | **PO received jurnal pakai QUANTITY** sebagai nominal rupiah (`amount: materialQty`) → korup buku besar | ✅ Fixed | — |
| BUG-012 | Refund rusak 3 lapis: tanpa jurnal reversal, RLS returns dead policy (`auth.role() IN(...)` mustahil), retry = refund dobel | ✅ Fixed | — |
| BUG-013 | Hutang & piutang off-ledger: bayar hutang / buat piutang tidak pernah bikin jurnal | ✅ Fixed | — |
| BUG-014 | `piutang.paid_amount/return_amount` tidak pernah di-write di seluruh kode → piutang tak bisa lunas; tombol "Proses Retur" tanpa handler | ✅ Fixed | — |
| BUG-015 | Filter periode DEAD di 8/10 laporan: `useEffect(..., [])` tidak refetch; umur-hutang/piutang & mutasi-kas ignore tanggal di query | ✅ Fixed | — |
| BUG-016 | Neraca tidak balance: tanpa laba berjalan di ekuitas + tanda saldo terbalik | ✅ Fixed | — |
| BUG-017 | Komisi marketplace TikTok hilang: `commission_fee: 0` hardcode, net_amount tidak kurangi komisi; settlement tanpa jurnal | ✅ Fixed | — |
| BUG-018 | `exec_sql` backdoor (SECURITY DEFINER) di DB dari migration 055; tidak dipakai src/ tapi berbahaya | ✅ Fixed (migration 063) | — |
| BUG-019 | RLS tabel keuangan `FOR ALL authenticated` + `api/journal` tanpa role check + RPC `update_cash_account_balance` tanpa role | ✅ Fixed | — |
| BUG-020 | **FALSE POSITIVE (verified)**: F-35/F-72 "NUMERIC string concat" — semua kolom NUMERIC = `number` di runtime, `+` = aritmetika | ❌ Bukan bug | — |
| BUG-021 | **Security API**: create-staff fail-open, purchase-orders no-auth, po-delivery fail-open, seo-upload no-auth, surveys/[id] tanpa ownership, TikTok webhook fail-open, upload MIME spoofable | ✅ Fixed | — |
| BUG-022 | **Pembukuan bocor**: payment admin detail & auto-payment tanpa jurnal, Xendit tanpa jurnal, faktur piutang tanpa jurnal, payroll & aset tanpa jurnal, saldo awal tanpa jurnal pembuka | ✅ Fixed | — |
| BUG-023 | **UI finance**: handleQcApprove dead, refund tab mobile salah render, dashboard angka menyesatkan, cash tanpa validasi, transfer race, mutasi saldo salah, mapping-diff error, PDF reports rusak, tarif upah hardcode, kronologi-hpp mislabeled | ✅ Fixed | — |
| BUG-024 | **Drift**: Role type tanpa surveyor, x-pathname tak di-set, proxy login map surveyor, rename sidebar, finance akses marketplace/tiktok | ✅ Fixed | — |
| BUG-025 | **Sisa audit F-31/53/58/40/41/42/44/12/19/57/54/33/20/22/25/59/60/65/23/62/63/64/66/67/68/69/71**: dua kolom sumber order, statistik halaman-aktif, buku besar tanpa detail, piutang UI, akun kas di form payment, jurnal non-atomik, kas tidak live, saldo awal manual, pagination laporan, guard payroll paid, jurnal order diam-diam gagal, toast ganda, tanggal masa depan, FK error mentah, desimal & timezone | ✅ Fixed (migration 064) | Migration 064 = RPC `create_journal_atomic` (entry+lines+saldo kas SATU transaksi + idempotency key) |
| BUG-026 | **F-18 booking installer tidak cascade ke orders**: checklist installer & admin accept booking update `install_bookings` langsung → orders.status tidak pernah `scheduled`/`done` | ✅ Fixed | Semua status booking lewat 1 jalur (API → RPC `advance_install_booking_status`) + role check installer |
| BUG-027 | **F-2 DP order = `paid` palsu + gate tanpa-DP** | ✅ Fixed | DP tidak lagi isi `lunas_amount` fiktif; order `pending` diblokir advance (UI+API, kecuali finance) |
| BUG-028 | **F-16/F-17 pipeline gate bocor**: packing tanpa cek lunas; regresi status (penjahit/steam fail); production selesai tanpa steam_job | ✅ Fixed | Gate `paid` di gudang/qc & admin/shipping; guard `.eq('status',...)`; auto-create steam_job |
| BUG-029 | **F-13/14 e-commerce off-ledger**: order TikTok dicatat `paid` tanpa payment/jurnal; settlement tanpa jurnal; cancel TikTok tak sinkron; cancel order tanpa reversal jurnal | ✅ Fixed | sync-to-main-orders + payment + jurnal idempotent; webhook/create-piutang berjurnal; cancel reversal |
| BUG-030 | **F-9 refund menciptakan piutang** (Dr Piutang/Cr Kas) | ✅ Fixed | Mapping `sales_return` (Dr Penjualan Retur/Cr Kas) + retur piutang berjurnal |
| BUG-031 | **Security API lanjutan**: TikTok auth/sync tanpa role check (bocor app_secret), purchase-requests/[id] mass-assignment, fail-open `?? 'admin'`, users write bebas | ✅ Fixed | Role check TikTok/PR/staff; `toClientError()` redaksi error 26 route; deny (bukan fail-open) |
| BUG-032 | **RLS & RPC hardening**: policy permisif (laundry_payroll/rates, style_rates, assets, account_categories, users, tiktok owner_all USING(true)), RPC stock tanpa role check | ✅ Fixed (migration 067) | RLS role-based + REVOKE PUBLIC/anon + role check di 5 RPC |
| BUG-033 | **`users_role_check` hilang role laundry** (migration 060) → insert role laundry gagal 23514 | ✅ Fixed (migration 070) | Drop + recreate constraint lengkap |
| BUG-034 | **F-61 sumber piutang ganda**: laporan campur orders vs tabel piutang | ✅ Fixed | Sumber utama = tabel `piutang` (umur-piutang, dashboard, payments) + halaman rekonsiliasi read-only |
| BUG-035 | **RLS hardening 067/071 no-op** — DROP policy pakai nama salah ("Authenticated staff (full) access" vs asli tanpa kurung) → users full access & permissive tiktok/accounting masih aktif | ✅ Fixed (migration 072) | Drop nama benar + ENABLE RLS tiktok/survey_logs + hardening accounts/hutang/piutang/cash_accounts |
| BUG-036 | **`order_logs_action_check` menolak `payment_verified`** → insert log approve cek bayar gagal 23514 | ✅ Fixed (migration 072) | Constraint = union codebase + data live (payment_verified, production_completed, status_changed) |
| BUG-037 | **Kolom live dipakai codebase hilang dari schema reference** (order_date, shipping_address, actual_date, piutang.description, accounts.normal_side, hutang.remaining, landing_settings.key, survey_logs.user_id) | ✅ Fixed (migration 072) | Sinkron `000_full_schema.sql` = kondisi live |
| BUG-038 | **Settlement TikTok "main net"** — fee (komisi/platform) tidak pernah masuk jurnal; piutang dicatat net saja | ✅ Fixed (migration 073) | Piutang gross + 3 jurnal (order_created → ecommerce_fee → piutang_received) idempotent + breakdown fee |
| BUG-039 | **Mapping settlement TikTok terbalik** — `settlement_amount` (gross) dipakai sebagai kas masuk; net yang benar = `revenue_amount` | ✅ Fixed (migration 073) | Diverifikasi dari payload live: settlement = revenue + fee |
| BUG-040 | **Fail-open DELETE order** `requester?.role ?? 'admin'` — user tanpa profil dianggap admin | ✅ Fixed (commit `4277557`) | Deny kalau profil tak ada / non-admin-owner aktif |
| BUG-041 | **`consume-materials` tanpa role check** — role mana pun kurangi stok via RPC SECURITY DEFINER | ✅ Fixed | +role check gudang/admin/owner |
| BUG-042 | **Surveys fail-open** `data?.role ?? 'admin'` + POST tanpa role gate | ✅ Fixed | role `?? null` → deny; POST/GET surveyor/admin/owner |
| BUG-043 | **install-bookings PUT mass-assignment** `update({...body})` + `actual_date` tidak pernah tersimpan | ✅ Fixed | Whitelist field; installer tetap hanya status |
| BUG-044 | **po-delivery GET tanpa auth** & **journal GET login-only** (data keuangan bocor) | ✅ Fixed | GET + auth/role; journal GET finance/admin/owner |
| BUG-045 | **TikTok webhook non-timing-safe** (`!==` string compare) | ✅ Fixed | `crypto.timingSafeEqual` (tiru xendit) |
| BUG-046 | **TikTok OAuth callback mati** — `getUser()` service client selalu null → selalu 401; **rate limit IP spoofable** (`x-forwarded-for`) | ✅ Fixed | Hapus gate callback (aman via code+state); `getClientIp()` anti-spoof |
| BUG-047 | **Route POST login-only tanpa role check** — customers/materials/products/suppliers/install-bookings/orders (ubah harga/cost), purchase-requests | ✅ Fixed (commit `2f72c53`) | POST → admin/owner; purchase-requests → gudang/admin/owner (defense-in-depth; API ini tak dipanggil UI) |
| BUG-048 | **`/api/upload`** — service client module-scope + semua role bisa upload video 100MB; folder tanpa scope | ✅ Fixed | Service client pindah ke handler (setelah auth) + scope folder per role |
| BUG-049 | **Jurnal `is_auto` selalu false** — flag `createSimpleJournal` dibuang server | ✅ Fixed (commit `7b15790`) | `is_auto` diterima body + divalidasi schema |
| BUG-050 | **`piutang.remaining` dua sumber** — di-write 4 tempat tapi tak pernah dibaca | ✅ Fixed | Hapus write → satu sumber = derived (`amount−paid−return−fee`) |
| BUG-051 | **setup-accounts**: race bootstrap (2 request → 2 admin) + bocor kredensial di response; rate limit hanya saat DB terisi | ✅ Fixed | Rate limit semua path + double-check count + kredensial tidak di-echo |
| BUG-052 | **Xendit webhook**: amount tidak divalidasi; jurnal gagal hanya log (200 → tak ada retry); retry path tak update order | ✅ Fixed | Validasi amount ≤ sisa + idempotency dulu; jurnal gagal → 500 (retry); retry repair jurnal+order |
| BUG-053 | **sync-to-main-orders**: insert order error `continue` (order hilang diam-diam); order existing tanpa pembukuan tak pernah diperbaiki | ✅ Fixed | Error → BLOCK; helper `ensurePaymentAndJournal` + repair saat re-run |
| BUG-054 | **TikTok webhook single-secret** (`TIKTOK_APP_SECRET` env vs `app_secret` per-shop) | ✅ Fixed | Per-shop via `shop_cipher` di DB, fallback env |
| BUG-055 | **Accounts `type='income'`** (4101/4102) di luar CHECK — constraint 067 NOT VALID | ✅ Fixed (migration 074) | `income → revenue` + VALIDATE constraint |
| BUG-056 | **Pipeline macet di produksi (gudang)** — `updateJobStatus` memanggil consume-materials SEBELUM update status job → route `/api/orders/[id]/consume-materials` menolak (job masih `in_progress`) → job tak pernah selesai, order stuck | ✅ Fixed (2026-08-12, ditemukan simulasi E2E) | Pindah panggilan consume-materials SETELAH update status `done` |
| BUG-057 | **Installer tidak bisa upload foto checklist** — `/api/upload` folder `evidence` (dipakai installer checklist) dibatasi admin/owner/finance (fix sesi 5) → installer 403 | ✅ Fixed (2026-08-12, ditemukan simulasi E2E) | Tambah `installer` ke `FOLDER_ROLES.evidence` |
| BUG-058 | **Jurnal server-path 100% gagal 401** — `createSimpleJournal` dari route handler = `fetch(baseUrl/api/journal)` tanpa cookie; route journal wajib session → jurnal Xendit/PO/order-API/TikTok-sync tak pernah tersimpan | ✅ Fixed (2026-08-13) | `createJournalEntry` terima `supabase` server client → panggil RPC `create_journal_atomic` langsung (bypass HTTP/cookie). Verifikasi: jurnal `admin_dp_auto`/`po_received` tersimpan di live |
| BUG-059 | **RLS permissive `orders/customers/materials/suppliers/install_bookings`** = `FOR ALL (auth.role()='authenticated')` — penjahit (role terendah) LIVE bisa baca+tulis semua (diverifikasi login live) | ✅ Fixed (migration 078) | Role-based: SELECT semua staff aktif; orders INSERT finance/admin/owner + UPDATE semua staff; customers/materials/suppliers tulis admin/owner; install_bookings UPDATE installer + manage admin/owner + public insert tetap; REVOKE grant anon materials/suppliers. Diverifikasi user-level (penjahit insert ditolak 42501, auto-transition tetap jalan) |
| BUG-060 | **DP auto-catat tanpa jurnal `payment_received`** saat buat order → Kas kurang DP, Piutang overstated; reversal cancel bikin jurnal hantu | ✅ Fixed (2026-08-13) | Auto-DP tambah jurnal `payment_received` (idempotency `admin_dp_auto:<order>`); cancel hanya reverse jurnal yang benar-benar ada (query journal_entries by idempotency/reference) |
| BUG-061 | **`orders.scheduled_installation_time` TIDAK ada di live** — update jadwal pasang gagal diam-diam (42703), tanggal tak tersimpan | ✅ Fixed (migration 077) | `ADD COLUMN IF NOT EXISTS scheduled_installation_time TIME` + sync `000_full_schema.sql` |
| BUG-062 | **PO PUT `received`/`paid` bisa dobel** — tanpa guard status → stok & jurnal purchase ganda; `paid` tanpa `received` → hutang negatif | ✅ Fixed (2026-08-13) | Guard transisi `pending→delivered→received→paid` + idempotent submit status sama (200 tanpa aksi) + idempotency key jurnal `po_received:<id>`/`po_paid:<id>` |
| BUG-063 | **Xendit webhook retry balas 200 tanpa repair** — setelah jurnal gagal, `alreadyProcessed` → skip selamanya, order tak pernah lunas | ✅ Fixed (2026-08-13) | Webhook Xendit DIHAPUS (Xendit tidak dipakai lagi, keputusan owner) — bug mati bersama route |
| BUG-064 | **QC mobile tab "QC Per-Item" render daftar RETUR** (copy-paste) — QC mobile tak bisa dipakai | ✅ Fixed (2026-08-13) | Perbaiki render mobile → item QC pending (`items.filter(i => !i.ready)`) |
| BUG-065 | **`/admin/shipping` tombol "Input Resi" tampil utk order `ready`** padahal API menolak `ready→shipped` | ✅ Fixed (2026-08-13) | Gate tombol hanya utk `packed` |
| BUG-066 | **Teks korup Mandarin** di modal installer "Laporkan Masalah" | ✅ Fixed (2026-08-13) | Perbaiki string |
| BUG-067 | **Stock Opname selisih qty diformat `formatRp`** → "Rp-3" | ✅ Fixed (2026-08-13) | Format angka qty (`toLocaleString('id-ID')` + unit), bukan uang |
| BUG-068 | **Form `/admin/seo` menulis `seo_title/seo_description/seo_keywords/seo_og_image` tapi meta tag `layout.tsx` HARDCODED** — perubahan SEO admin tak pernah dirender sebagai `<meta>` | ✅ Fixed (2026-08-13) | `layout.tsx` pindah ke `generateMetadata()` async yang baca `landing_settings` (key='hero'), fallback hardcoded; `SeoScripts` tetap baca pixel/GA4 |
| BUG-069 | **TikTok double-booking revenue** — sale dicatat 2× (order_created+payment_received di jalur order & order_created+piutang_received di jalur settlement) → Penjualan & E-Wallet debit ganda | ✅ Fixed (2026-08-13, model akrual) | Order path = revenue (order_created, hapus payment_received); Settlement path = kas+beban (piutang_received+ecommerce_fee, hapus order_created). Revenue ×1, kas ×1, fee ×1 |
| BUG-070 | **Order TikTok AWAITING_SHIPMENT tak masuk main orders** — `sync-orders` map payment_status dari `order.status` (lifecycle) bukan field payment → filter `.eq('payment_status','PAID')` menolak | ✅ Fixed (2026-08-13) | `payment_status` dari `order.payment_status`/`order.payment?.payment_status`, fallback COMPLETED/DELIVERED→PAID |
| BUG-071 | **Steam rework macet** — setelah fail (status revision), `gudang/production` `.eq('order_id').maybeSingle()` lihat steam_job stale → tak buat baru, order stuck | ✅ Fixed (2026-08-13) | Guard cari `.eq('status','pending')` (abaikan revision/done stale) |
| BUG-072 | **Hutang delete tanpa guard paid** — tagihan lunas/partial bisa dihapus (liabilitas+riwayat hilang) | ✅ Fixed (2026-08-13) | Tolak hapus paid/cancelled/paid_amount>0/return_amount>0 (mirror handleSave) |
| BUG-073 | **Finance pay race / tanpa rollback** — jurnal gagal → payment row menggantung; update order kalah race → row orphan | ✅ Fixed (2026-08-13) | `handlePay`: jurnal gagal → hapus payment row (rollback penuh); `ordErr` → hapus payment row (mirror refund) |

### Dead code terdokumentasi (tidak dihapus — keputusan owner, sesi 9)
- **Route API tanpa caller produksi:** `api/customers`, `api/landing-settings`, `api/materials`, `api/products`, `api/suppliers`, `api/purchase-orders` (+`[id]`), `api/purchase-requests` (+`[id]`), `api/install-bookings` (base), `api/orders` (base — hanya dipakai E2E smoke GET 403)
- **Tabel dead:** `low_stock_alerts` (ditulis RPC saja), `order_material_consumption` (ditulis RPC, tak pernah dibaca), `order_preparation_checklist` (singular — kode pakai plural), `packing_checklists`, `return_requests`. **`seo_settings` DI-DROP** (migration 079 — dead sejak migration 008, 3 baris tak pernah dibaca).
- **RPC dead:** `decrement_stock_gudang`, `get_material_stock`, `get_product_stock`, `update_cash_account_balance`, `rls_auto_enable`
- **Export dead:** `clientError` (`src/lib/api-errors.ts:14`)
- **Schema drift fix:** `users.email` dihapus dari `000_full_schema.sql` (tidak ada di live)

---

## BUG-001 — Pipeline macet di Steam/QC

**Severity:** 🟠 Tinggi (✅ FIXED 2026-08-11)
**File:** `src/app/(dashboard)/gudang/steam/page.tsx`
**Stage:** `steam` → `ready`

### Gejala
- Gudang melakukan Steam QC **Pass** + upload bukti foto di `/gudang/steam`
- Foto bukti **tersimpan dengan benar** di tabel `order_progress_photos` (stage='steam')
- TAPI `orders.status` **tetap `steam`** — pipeline di detail pesanan tidak maju
- Akibatnya: order menunggu sampai ada role yang manual klik "Lanjut" di detail pesanan

### Akar Masalah
`handleSteamPass()` (line 151-197) hanya meng-update `steam_jobs` + insert foto + log, tapi **tidak pernah meng-update `orders.status`**. Komentar di line 189 mengaku disengaja:

```
// 2026-07-31: steam → ready dilakukan manual di order detail (Gudang/Admin klik "Lanjut").
```

Tapi faktanya:
- Gudang **tidak bisa** membuka `/admin/orders/[id]` (proxy.ts memblok role gudang dari `/admin/*`)
- Admin **diblokir** di stage ini (lihat BUG-003)
- Jadi satu-satunya yang bisa adalah **owner** — yang harus upload ulang bukti foto

### Perilaku Benar (Fix)
Setelah Steam QC Pass sukses:
1. `steam_jobs.status = 'done'` (sudah benar)
2. Foto bukti insert (sudah benar)
3. **`orders.status = 'ready'`** ← otomatis, pakai foto yang baru saja di-upload sebagai evidence
4. Log `qc_pass` ("Steam/QC Passed oleh Gudang → Siap")

### ✅ Implementasi (2026-08-11)
`handleSteamPass` setelah foto & log tersimpan:
```ts
await supabase.from('orders').update({ status: 'ready' }).eq('id', job.order_id).eq('status', 'steam')
await supabase.from('order_logs').insert({ action: 'qc_pass', notes: 'Steam/QC Passed oleh Gudang → order otomatis Siap', ... })
```
- Guard `eq('status','steam')` = idempoten (update 0 baris jika sudah lanjut, tidak merusak)
- Foto bukti yang di-upload gudang dipakai sebagai evidence stage steam — tidak ada upload ulang
- Flow **Fail/revisi sudah benar** (line 277-279 meng-update order ke `production` + auto-create job revisi) — tidak diubah

---

## BUG-002 — Pipeline macet di Kemas (ready → packed)

**Severity:** 🟠 Tinggi (✅ FIXED 2026-08-11)
**File:** `src/app/(dashboard)/gudang/qc/page.tsx` & `src/app/(dashboard)/admin/shipping/page.tsx`
**Stage:** `ready` → `packed`

### Gejala
- Setelah order `ready` (QC per-item selesai), harus ada yang menandai "Dikemas"
- Satu-satunya halaman yang bisa melakukan ini: **`/admin/shipping`** (shipping/page.tsx:85)
- Gudang **tidak punya akses** ke `/admin/*` (proxy.ts) → gudang tidak bisa mengemas
- Admin bisa akses tapi tidak tahu harus buka `/admin/shipping` (di matriks stage, `ready→packed` adalah tanggung jawab gudang, route API:34)
- Owner lagi-lagi yang jadi penyelamat

### Akar Masalah
Fitur "packing" hanya ada di halaman milik admin, padahal tanggung jawabnya ada di gudang. Tidak ada tombol "Kemas" di halaman kerja gudang mana pun.

### Perilaku Benar (Fix)
Tambah tombol **"📦 Kemas"** di tab QC Per-Item (`/gudang/qc`):
- Muncul per order yang `status='ready'` dan semua `order_items.ready=true`
- Update `orders.status='packed'` + `packed_at` + `packed_by` + log
- Tidak wajib foto (konsisten dengan `/admin/shipping`)

### ✅ Implementasi (2026-08-11)
Blok "📦 Siap Dikemas" di tab QC (`/gudang/qc`):
- Derive `readyToPack`: group `order_items` by `order_id`, tampilkan order dengan `orders.status='ready'` DAN semua item `ready:true`
- Tombol "Kemas" per order → `orders.update({ status:'packed', packed_at, packed_by })` + guard `eq('status','ready')` + log `packed`
- Tidak wajib foto (konsisten `/admin/shipping`)

## BUG-003 — Role admin diblokir (🔒) di stage production/steam/ready

**Severity:** 🟡 Sedang (✅ FIXED 2026-08-11)
**File:** `src/app/(dashboard)/admin/orders/[id]/page.tsx:65-78`

### Gejala
Admin melihat pesan di detail pesanan:
```
🔒 Role admin tidak boleh lanjut di stage ini. Stage Steam/QC adalah tanggung jawab: owner, gudang
```

### Akar Masalah
Dua "source of truth" **bertentangan**:

| Lokasi | Aturan |
|---|---|
| Client `ROLE_NEXT_ALLOWED` (page.tsx:65-78) | `admin: ['new','payment_ok','sorted','packed','shipped']` — **tanpa** production/steam/ready |
| API `ROLE_STATUS_PERMISSIONS` (route.ts:30-36) | `admin` = escape hatch — **boleh semua transisi** (route.ts:40) |

UI lebih ketat dari API → admin diblokir di UI padahal API mengizinkan.

### Perilaku Benar (Fix)
- Tambah `'production','steam','ready'` ke daftar admin di `ROLE_NEXT_ALLOWED`
- Konsisten dengan API (admin = escape hatch, owner juga)

### ✅ Implementasi (2026-08-11)
`ROLE_NEXT_ALLOWED.admin` → `['new','payment_ok','sorted','production','steam','ready','packed','shipped']`
- 🔒 tidak muncul lagi untuk admin di semua stage
- Pesan "tangung jawab owner, gudang" hilang — admin tidak perlu pinjam akun owner

---

## BUG-004 — Approve pembayaran gagal jika DP diinput admin

**Severity:** 🔴 Tinggi
**File:** `src/app/(dashboard)/finance/payments/page.tsx` (`handleApprove`, line 229-315)

### Gejala
| Skenario | Hasil |
|---|---|
| Admin input order **dengan DP** (offline/landing) | Finance **tidak bisa approve** — harus input nominal kecil dulu baru tombol approve bisa lanjut |
| Admin input order **tanpa DP** → finance input DP sendiri | **Langsung bisa approve** ✅ |

### Akar Masalah
`handleApprove()` mewajibkan adanya **record di tabel `payments` yang ter-verified**:

```ts
// line 253-257
const verifiedPayment = await getVerifiedPayment(freshOrder.id)
if (!verifiedPayment) {
  toast('error', 'Gagal Approve — Belum ada pembayaran yang diverifikasi.')
  return
}
```

Tapi `getVerifiedPayment()` membaca tabel `payments` (select verified_by != null). **Admin yang input order + DP tidak pernah membuat record di tabel `payments`** — auto-create payment hanya ada untuk order marketplace lunas penuh (`admin/orders/page.tsx:306-317`). DP admin hanya tercatat sebagai kolom `orders.dp_amount`.

Jadi:
- DP admin → tabel `payments` kosong → approve diblokir → finance "memutar akal" input nominal kecil
- Tanpa DP → finance input lewat form (`handlePay`) yang memang mencatat ke tabel `payments` → approve jalan

### Opsi Perbaikan

**Opsi A: Relax cek di handleApprove**
- Hapus blok `getVerifiedPayment` dari `handleApprove` (line 253-257)
- Cukup cek: `paidSum > 0` DAN `payment_status !== 'pending'` — pembayaran sudah tercatat (entah dari DP admin di `orders.dp_amount`, atau diinput finance)
- Klik Approve = verifikasi manual finance bahwa pembayaran sudah masuk
- `getVerifiedPayment` tetap dipakai di `handleQcApprove` (alur lama)
- ✅ Perubahan kecil & lokal

**Opsi B (DIPILIH ✅): Auto-catat record `payments` saat admin buat order dengan DP**
- Saat `admin/orders` insert order dengan `dp_amount > 0`, sekaligus insert row ke tabel `payments` (`type:'dp'|'lunas'`, `amount: dpAmt`, `verified_by: admin_id`) — berlaku **semua source** (offline/landing/marketplace), bukan hanya marketplace lunas penuh seperti sebelumnya
- Jejak akuntansi lengkap: setiap rupiah DP yang diinput admin punya record transaksi

### ✅ Implementasi (2026-08-11)

**1. `src/app/(dashboard)/admin/orders/page.tsx` (buat pesanan)**
- Blok auto-payment lama (khusus marketplace lunas penuh) diganti: **jika `dpAmt > 0`** → insert ke `payments`:
  - `type: dpAmt >= total ? 'lunas' : 'dp'`
  - `amount: dpAmt`
  - `verified_by: admin.id`, `verified_at: now`
  - `notes: "Auto-catat DP/Lunas oleh Admin saat buat pesanan (source: ...)"`
- `orders.payment_status` tetap dihitung seperti biasa (`paid`/`partial`/`pending`)

**2. `src/app/(dashboard)/finance/payments/page.tsx` (`handleApprove`)**
- Blok `getVerifiedPayment` yang memblokir **dihapus** — klik Approve oleh Finance **itu sendiri** adalah verifikasi final (cek bayar)
- Cek tetap: `paidSum > 0` DAN `payment_status !== 'pending'`
- Ditambah variabel `sisaTagihan` / `belumLunas`:
  - Approve `new` **belum lunas** → toast: *"Sisa tagihan Rp X — Finance wajib input pelunasan sebelum order dikemas (payment gate)"*
  - Approve `new` **lunas** → toast *"Pembayaran diverifikasi (LUNAS)"*
  - Order `ready` **belum lunas** → toast warning: packing diblokir payment gate, Finance harus input pelunasan dulu
- `handleQcApprove` (alur lama, steam→ready) **tetap** memakai `getVerifiedPayment` + syarat lunas penuh = **cek bayar terakhir tetap di tangan Finance**

### ATURAN CEK BAYAR TERAKHIR (kunci)
1. Auto-record admin **bukan** approve — order tidak pernah auto-maju ke `payment_ok` tanpa klik Finance
2. Jika order **belum lunas**: hanya **Finance** yang bisa approve (`new → payment_ok`) atau input pelunasan (`handlePay`)
3. Gate final di `packed/shipped/done`: API (`orders/[id]/route.ts:149`) & halaman admin mewajibkan `payment_status='paid'` — belum lunas → tidak bisa dikemas/dikirim

---

## BUG-005 — Role drift: TS `Role` vs DB CHECK constraint

**Severity:** 🟡 Sedang
**File:** `src/types/index.ts:1`, migration `060_survey_schema.sql:11`

| Layer | Role yang diizinkan |
|---|---|
| TS `Role` type | `admin, gudang, penjahit, finance, installer, owner, laundry` |
| DB CHECK (post-060) | `admin, gudang, penjahit, finance, installer, owner, surveyor` |
| App (proxy, sidebar, create-staff, API) | Pakai `surveyor` di mana-mana |

Akibat:
- User dengan role `laundry` **ditolak DB** (CHECK constraint) — tapi role masih ada di TS type & halaman `/admin/laundry`
- `requireAuthRole(['surveyor'])` **error TypeScript** karena `surveyor` tidak ada di `Role` type

Fix: tambah `'surveyor'` ke `Role` type (putuskan nasib `laundry` — apakah tetap atau dihapus).

---

## BUG-006 — `x-pathname` header tidak pernah di-set

**Severity:** 🟡 Rendah
**File:** `src/proxy.ts`, `src/app/(dashboard)/layout.tsx:36`

### Gejala
`layout.tsx` membaca header `x-pathname`/`x-next-pathname` untuk validasi role vs path (defense-in-depth), tapi `proxy.ts` **tidak pernah menulis header tersebut** (grep = 0 hasil). Layout selalu fallback ke `''`.

### Perilaku Benar (Fix)
- `proxy.ts` tambahkan `request.headers.set('x-pathname', pathname)` sebelum return `supabaseResponse`
- Atau hapus klaim di layout kalau memang tidak dibutuhkan

---

## BUG-007 — Pipeline pasang: booking installer tidak terhubung dari order detail

**Severity:** 🟠 Tinggi (✅ FIXED 2026-08-11)
**File:** `src/app/(dashboard)/admin/orders/[id]/page.tsx`, `src/app/api/orders/[id]/route.ts`

### Gejala
- Order `pasang` masuk `Dikemas (packed)` → klik "Lanjut: Jadwalkan Pasang"
- **Tidak ada yang terjadi** di sisi installer — booking `install_bookings` **tidak pernah dibuat**
- Order nyangkut di `Terjadwal Pasang (scheduled)`; installer tidak melihat apa pun; admin harus manual ke `/admin/booking` (kalau ingat)

### Akar Masalah
- `admin/orders/[id]/page.tsx` meng-update status **langsung via client** (`supabase.from('orders').update`) — **bypass API**
- Logika auto-create `install_bookings` hanya ada di API (`route.ts:270-338`) yang **tidak pernah dipanggil** halaman ini
- Tidak ada referensi `installer`/`install_bookings` sama sekali di halaman order detail

### ✅ Implementasi (2026-08-11) — satu langkah, langsung dari order detail
1. **Tombol "Jadwalkan Pasang"** (saat `packed`, classification `pasang`) → buka modal berisi: tanggal + jam + dropdown installer (dari `users` role='installer')
2. Submit:
   - `orders.update({ status:'scheduled', scheduled_installation_date, scheduled_installation_time }).eq('status','packed')`
   - **Upsert `install_bookings`** (type pasang): booking aktif (`pending`/`scheduled`) → update `installer_id/scheduled_date/scheduled_time/status='scheduled'`; tidak ada → insert baru
   - Log `install_scheduled` ke `order_logs`
3. Installer langsung lihat job di `/installer/schedule` (realtime)
4. Installer advance `scheduled → installing → done` via `PUT /api/install-bookings/[id]` → RPC cascade ke `orders.status` → pipeline ke "Sedang Dipasang" → "Selesai"
5. Bonus: blok info booking di order detail (nama installer + tanggal) untuk order pasang di `scheduled/installing/done`

## BUG-008 — Harga jual produk diinput admin padahal belum tahu HPP

**Severity:** 🟡 Sedang (✅ FIXED 2026-08-11, Opsi A)
**File:** `admin/catalog/products/page.tsx`, `src/app/catalog/page.tsx`, `src/components/landing/ProductCatalog.tsx`, `src/app/products/[slug]/page.tsx`

### Gejala
- Admin membuat produk (mis. "Gordyn A") — form **mewajibkan input "Harga Jual"** padahal admin tidak tahu HPP-nya
- Owner baru menghitung HPP setelahnya (di `/owner/hpp`) — saat Simpan, `products.price` **ditimpa** dengan harga jual hasil perhitungan HPP
- Efek: antara admin buat produk sampai owner set HPP, produk dijual dengan **harga tebakan** admin di katalog publik
- Admin buta: tidak ada indikator di list produk apakah HPP sudah dihitung atau belum

### Akar Masalah
1. Form admin products `price` bersifat `required` (field label `Harga Jual (Rp) *`)
2. Halaman admin products tidak menampilkan status HPP (`hpp_calculated`/`hpp_manual` tidak pernah dirender)
3. Harga jual final seharusnya **hanya** ditentukan Owner lewat perhitungan HPP (menimpa `price`)

### ✅ Implementasi (2026-08-11) — Opsi A: harga jual bukan tanggung jawab admin

| File | Perubahan |
|---|---|
| `admin/catalog/products/page.tsx` | Field "Harga Jual" → **opsional** + keterangan *"Kosongkan jika belum ada — harga jual final ditetapkan Owner via /owner/hpp"*; `handleSave`: price kosong → `0`; badge status di list (desktop + mobile): 🟠 "HPP belum dihitung" / ✅ "HPP: Rp X"; harga tampil `—` kalau 0; Import CSV: `price` tidak lagi `required` |
| `src/app/catalog/page.tsx` | Filter tambah `.gt('price', 0)` → produk tanpa harga **tidak tampil** di katalog publik |
| `src/components/landing/ProductCatalog.tsx` | Sama — featured hanya produk yang sudah punya harga |
| `src/app/products/[slug]/page.tsx` | Jaring pengaman: harga 0 → tampil *"Harga: Hubungi via WhatsApp"*; pesan WA tanpa angka harga |

**Tidak perlu migrasi database** — `products.price` sudah `NUMERIC NOT NULL DEFAULT 0` (`001_initial_schema.sql:80`), insert tanpa harga otomatis `0`. API `/api/products` juga sudah `price: z.number().min(0).optional()`.

### Alur final
```
Admin buat "Gordyn A" (tanpa harga, badge 🟠 "HPP belum dihitung")
→ Owner isi material (cost_per_unit) 
→ Owner hitung BOM di /owner/hpp → Simpan 
→ products.price ter-set + badge ✅ HPP 
→ produk otomatis muncul di katalog publik & landing (filter price > 0)
```

### Catatan
- Keputusan: produk tanpa harga **disembunyikan** dari katalog publik (bukan ditampilkan "hubungi") — dipilih untuk mencegah harga asal-asalan tampil

---

## BUG-009 — Pembukuan server mati (jurnal order/PO tidak pernah dibuat)

**Severity:** 🔴 Kritis (✅ FIXED 2026-08-11)
**File:** `src/utils/journal/create.ts:25` + `api/orders/route.ts:69` + `api/purchase-orders/[id]/route.ts:88,113`

### Akar masalah
```ts
// create.ts:25
const res = await fetch('/api/journal', { ... })  // URL RELATIF
```
Di Next.js 16 route handler (server/Node.js), `fetch` tidak mendukung URL relatif (terverifikasi di `next/dist/server/lib/patch-fetch.js` — tidak ada resolve base URL) → **throw `TypeError: Failed to parse URL`** → semua pemanggil server menangkapnya dengan `console.warn` → jurnal `order_created`, `purchase`, `expense_paid` **diam-diam tidak pernah dibuat**.

### Dampak
- Order dibuat via API → tidak ada Dr Piutang / Cr Penjualan di buku besar
- PO received / PO paid → tidak ada jurnal inventori & hutang
- Hanya `finance/payments` (client) yang jurnalnya benar-benar jalan

### ✅ Implementasi
- `createJournalEntry` menerima `baseUrl` opsional: di browser pakai relative (seperti sekarang), di server pakai `process.env.NEXT_PUBLIC_BASE_URL`
- Pemanggil server (`api/orders`, `api/purchase-orders/[id]`) meneruskan base URL

---

## BUG-010 — Tanda saldo terbalik di laporan keuangan

**Severity:** 🔴 Kritis (✅ FIXED 2026-08-11)
**File:** `src/lib/ledger.ts:51`

### Akar masalah
```ts
const balance = a.normal_side === 'credit' ? -raw : raw
```
Kolom `accounts.normal_side` **tidak pernah diisi** (migration 058:14-15 menyebutnya "kolom mati", seed 048/049 tidak memasukkannya) → NULL untuk semua akun → semua akun dianggap normal-debit → **liability/equity/revenue saldo terbalik tanda**.

### Dampak
- Neraca: Aset ≠ Liabilitas + Ekuitas (tidak pernah balance)
- Laba Rugi: pendapatan negatif → terlihat rugi padahal untung
- Neraca Saldo: selalu "tidak seimbang"
- Buku Besar: hutang/modal/pendapatan minus

### ✅ Implementasi
- Hitung tanda dari `a.type` (konsisten dengan halaman CoA):
  - `asset` / `expense` → debit-normal (`debit − credit`)
  - `liability` / `equity` / `revenue` → credit-normal (`credit − debit`)
- `normal_side` jadi fallback jika terisi

---

## BUG-011 — PO received jurnal pakai QUANTITY sebagai nominal

**Severity:** 🟠 Tinggi (✅ FIXED 2026-08-11)
**File:** `src/app/api/purchase-orders/[id]/route.ts:93`

```ts
amount: materialQty   // qty (mis. 5 meter) dipakai sebagai NOMINAL rupiah jurnal!
```
Jurnal `purchase` (Dr Persediaan / Cr Hutang) mencatat "5" bukan Rp — korup buku besar skala qty. Diperbaiki: jurnal `purchase` memakai `currentPO.actual_cost` (nominal rupiah), qty hanya untuk stock.

---

## BUG-012 — Refund rusak 3 lapis

**Severity:** 🟠 Tinggi (✅ FIXED 2026-08-11 — lihat ringkasan tabel)
**File:** `finance/payments/page.tsx:369-406` + migration 003:53-54 / 055:242-243

1. Refund insert `payments type='refund'` **tanpa jurnal reversal** & tanpa kurangi `dp_amount/lunas_amount`
2. `returns.update({refund_status:'completed'})` **DIJAMIN GAGAL** — policy `FOR UPDATE USING (auth.role() IN ('admin','finance','owner'))` padahal `auth.role()` cuma mengembalikan `'authenticated'`/`'anon'` → **dead policy**
3. Tanpa cek `refund_amount <= yang sudah dibayar` → retry setelah error = **refund dobel**

### Rencana fix
- Jurnal refund (Dr Refund Payable / Cr Kas) + kurangi dp/lunas + jadikan flow transaksional
- Perbaiki policy returns pakai subquery ke `users.role` (bukan `auth.role()`)
- Guard idempotency (jangan proses 2×)

---

## BUG-013 — Hutang & piutang off-ledger

**Severity:** 🟠 Tinggi (✅ FIXED 2026-08-11 — lihat ringkasan tabel)
**File:** `finance/hutang/page.tsx:151-183`, `finance/piutang/*`

- **Bayar hutang**: cuma update `paid_amount` + status — tidak ada jurnal Dr Hutang / Cr Kas, tidak ada update saldo kas → uang keluar "hilang" dari pembukuan
- **Buat piutang faktur** (manual & TikTok): cuma insert tabel `piutang` — tanpa jurnal Dr Piutang / Cr Penjualan

### Rencana fix
- Satu RPC/helper transaksional `payDebt` (jurnal + saldo kas + riwayat)
- Auto-jurnal saat faktur piutang dibuat

---

## BUG-014 — Piutang tidak pernah bisa lunas

**Severity:** 🟠 Tinggi (✅ FIXED 2026-08-11 — lihat ringkasan tabel)
**File:** `finance/piutang/*` (faktur, payment, process)

- `piutang.paid_amount` / `return_amount` **tidak pernah di-write** di seluruh `src/` (grep = 0) → faktur piutang pending selamanya
- Kolom `remaining` (dipakai TikTok) mati — semua UI baca `amount − paid − return`
- Halaman `piutang/process` tombol **"Proses Retur" tanpa onClick** (dead button)
- `piutang/payment` menampilkan payments ORDER (bukan faktur piutang)

### Rencana fix
- Implementasi aksi bayar per faktur (jurnal Dr Kas / Cr Piutang + update `paid_amount`)
- Implementasi handler retur + update `return_amount`
- Konsolidasi `remaining` vs `amount−paid−return`

---

## BUG-015 — Filter periode DEAD di laporan

**Severity:** 🟡 Sedang (✅ FIXED 2026-08-11 — lihat ringkasan tabel)
**File:** 8/10 laporan di `finance/laporan/*` & `owner/laporan/*` + `mutasi-kas`/`umur-hutang`/`umur-piutang`

- `useEffect(() => { fetchData() }, [])` — array kosong → ganti tanggal tidak memicu reload
- `umur-hutang`/`umur-piutang`/`mutasi-kas`: query bahkan mengabaikan tanggal → PDF header "Periode" bohong
- As-of date = hari ini, bukan `endDate` → tidak reproducible

### Rencana fix
- `useEffect(..., [startDate, endDate])` di semua laporan (pola sudah benar di `performa-tag` & `kronologi-hpp`)
- Umur hutang/piutang: aging dari `due_date`, sisa = amount − paid − return, filter status aktif

---

## BUG-016 — Neraca tidak balance

**Severity:** 🟡 Sedang (✅ FIXED 2026-08-11 — lihat ringkasan tabel)
**File:** `finance/laporan/neraca/page.tsx`

- Tanpa **laba berjalan** (Σ revenue − Σ expense) di ekuitas → A = L + E tidak pernah bisa balance saat ada profit
- Tidak ada closing entry; filter periode salah secara konsep (neraca = as-of-date, bukan rentang aktivitas)

### Rencana fix
- Tambah baris "Laba Berjalan" di bagian ekuitas
- Pertimbangkan as-of-date `endDate` (bukan selisih rentang)

---

## BUG-017 — Komisi marketplace TikTok hilang

**Severity:** 🟡 Sedang (✅ FIXED 2026-08-11/12 — komisi & breakdown fee TikTok, lihat BUG-017/BUG-038/BUG-039)
**File:** `api/tiktok/sync-orders/route.ts:102-104`, `api/tiktok/sync-finance/route.ts:113-143`

- `commission_fee: 0` hardcode; `platform_fee` diambil dari `platform_discount` (diskon, bukan biaya); `net_amount = total − shippingFee` (komisi menguap)
- Settlement net masuk `piutang` tanpa jurnal (Dr Piutang / Cr Penjualan; Dr Beban Komisi / Cr Piutang; Dr Kas / Cr Piutang)
- Mapping `exchange_rate_diff` (048:120) debit=credit=5301 → net-zero; tidak dipakai siapa pun

### Rencana fix
- Catat breakdown komisi/bebas platform dari API TikTok
- Auto-jurnal settlement 3 langkah (gross → komisi → net)
- Repurpose `exchange_rate_diff` → 'Beban Biaya Lain E-commerce' (keputusan Near 2026-08-11)

---

## BUG-018 — `exec_sql` backdoor di DB

**Severity:** 🔴 Kritis (✅ FIXED — terverifikasi mati 404 di live, tidak ada di `src/`)
**File:** migration `055_fix_remaining_schema_drift.sql:396-404`

```sql
CREATE OR REPLACE FUNCTION exec_sql(query TEXT) RETURNS void ... SECURITY DEFINER ... EXECUTE query
```
Fungsi eksekusi SQL arbitrer **tanpa role check**, dibuat migration 055. Migration 059 mencabut akses tabel dari `anon` tapi **tidak mencabut fungsi ini**. Tidak dipakai `src/` sama sekali → hanya backdoor.

### Rencana fix (di Supabase SQL editor / migration 060+)
```sql
DROP FUNCTION IF EXISTS public.exec_sql;
-- atau minimal:
REVOKE ALL ON FUNCTION public.exec_sql FROM PUBLIC, anon, authenticated;
```

---

## BUG-019 — RLS & role check keuangan longgar

**Severity:** 🔴 Kritis (✅ FIXED 2026-08-11/12 — migration 067 + 072, lihat BUG-035)
**File:** migration 001/018-026 (policy `FOR ALL authenticated`), `api/journal/route.ts:28-33`, migration 055:381-392 (RPC kas)

- `payments`, `journal_entries`, `journal_lines`, `accounts`, `hutang`, `piutang`, `cash_accounts` → **semua yang login** bisa baca/tulis
- `POST /api/journal` cuma cek login, tanpa role check; body mentah, `is_auto` bisa di-spoof
- RPC `update_cash_account_balance` SECURITY DEFINER tanpa role check — saldo kas bisa diubah sembarang dari browser

### Rencana fix
- RLS role-based: SELECT semua authenticated; INSERT/UPDATE/DELETE hanya finance/admin/owner (subquery `users.role`)
- `api/journal`: role check + zod + `is_auto` ditentukan server + rate limit
- REVOKE EXECUTE RPC dari anon/authenticated, GRANT hanya finance/admin

---

## BUG-020 — FALSE POSITIVE (verified): NUMERIC concat tidak terjadi

**Severity:** ❌ Bukan bug — dihapus dari prioritas
**File:** (klaim audit) `finance/reports`, `laporan/*` — **F-35 & F-72**

### Hasil verifikasi runtime (2026-08-11, read-only ke DB live)
- Query REST semua kolom NUMERIC (`orders`, `order_items`, `payments`, `products`, `materials`, `bom`, `production_reports`, `style_rates`, `cash_accounts`, `piutang`, `journal_lines`, `accounts`, `inventory_movements`) → **semua `typeof = number`** (JSON number, bukan string)
- `typeof price = number` via node runtime; agregasi `sum` juga number
- `+` di JS pada number = penjumlahan aritmetika — **tidak ada concat** `'0'+'250000'`
- `Number()` di `ledger.ts` aman dipertahankan (defensif)

**Kesimpulan:** F-35 & F-72 di `audit-finance.md` adalah **false positive**. PostgREST/supabase-js pada konfigurasi ini selalu mengembalikan NUMERIC sebagai number.

---

## BUG-035 s/d BUG-055 — Sesi 3–6 (2026-08-12)

Detail ringkas — implementasi lengkap di ringkasan tabel di atas, `todo.md`, dan commit `5cd8d45` (072/073) / `4277557` (security) / `2f72c53` (sesi 5) / `7b15790`–`598d43b` (sesi 6).

| ID | Fix | Bukti |
|---|---|---|
| BUG-035 | RLS hardening 067/071 no-op (nama policy salah) → permissive lama di-drop + ENABLE RLS tiktok/survey_logs + hardening accounts/hutang/piutang/cash_accounts | migration `072`, `000_full_schema.sql` = live (58 tabel, 58 RLS) |
| BUG-036 | `order_logs_action_check` + `payment_verified` (+ data live: production_completed, status_changed) | migration `072` |
| BUG-037 | Kolom drift codebase↔schema disinkronkan (order_date, shipping_address, actual_date, piutang.description, accounts.normal_side, hutang.remaining, landing_settings.key, survey_logs.user_id) | migration `072` |
| BUG-038 | Settlement TikTok "main net" → piutang gross + 3 jurnal idempotent + breakdown fee | migration `073` |
| BUG-039 | Mapping settlement: `settlement_amount`=gross, `revenue_amount`=net (dulu settlement dipakai sebagai kas masuk) | migration `073` (verifikasi payload live) |
| BUG-040 | Fail-open DELETE order `?? 'admin'` → deny | commit `4277557` |
| BUG-041 | `consume-materials` tanpa role check | commit `4277557` |
| BUG-042 | Surveys fail-open + POST tanpa role gate | commit `4277557` |
| BUG-043 | install-bookings PUT mass-assignment + `actual_date` tidak tersimpan | commit `4277557` |
| BUG-044 | po-delivery GET tanpa auth; journal GET bocor | commit `4277557` |
| BUG-045 | TikTok webhook non-timing-safe | commit `4277557` |
| BUG-046 | TikTok OAuth callback mati; rate limit IP spoofable | commit `4277557` |

---

## BUG-058 s/d BUG-067 — Sesi 8 (2026-08-13): Audit Menyeluruh + Verifikasi Live

Audit 4 agent paralel (API security, server lib, UI/pipeline, schema/RLS) + **verifikasi live** (login `penjahit` via supabase-js persis aplikasi + service_role cek kolom, read-only). Semua temuan di bawah sudah diverifikasi ke kode & live — BUKAN false positive.

### ✅ SEMUA FIXED (sesi 9, 2026-08-13 — setelah sesi 8 audit)
- **BUG-058** → `createJournalEntry` terima `supabase` server client → RPC `create_journal_atomic` langsung.
- **BUG-059** → migration 078 role-based RLS (5 tabel inti) + revoke grant anon.
- **BUG-060** → auto-DP jurnal `payment_received`; cancel reverse jurnal nyata.
- **BUG-061** → migration 077 `orders.scheduled_installation_time TIME`.
- **BUG-062** → guard transisi PO + idempotency jurnal.
- **BUG-063** → webhook Xendit dihapus (Xendit tidak dipakai).
- **BUG-064/065/066/067** → fix UI.
- **Fitur** → settlement TikTok full (fee+ongkir+adjustment di-jurnal) → E Wallet Tiktok (1104, rename dari Xendit Cash).

### KRITIS — Uang / boundary
- **BUG-058** — Jurnal dari server-context mati: `src/utils/journal/create.ts:31-42` (`createJournalEntry`) selalu `fetch(baseUrl/api/journal)` TANPA cookie; `src/app/api/journal/route.ts:36-40` wajib session → 401. Pemanggil server (xendit/webhook:142-176, purchase-orders PUT:109-147, orders POST:85-95, tiktok sync-*) semua kena → jurnal tidak pernah dibuat. Fix: beri `createJournalEntry` opsional `supabase` server client → panggil RPC `create_journal_atomic` langsung.
- **BUG-059** — RLS inti masih permissive: schema `000_full_schema.sql:1095-1181` `FOR ALL (auth.role()='authenticated')` utk orders/customers/materials/suppliers/install_bookings (tidak disentuh hardening 10.7). Diverifikasi LIVE: login `penjahit` → SELECT semua tabel tsb ada rows. Fix butuh rutekan write client ke API role-gated dulu (refactor besar) — keputusan scope.
- **BUG-060** — `admin/orders/page.tsx:311-343`: auto-record DP insert row `payments` tapi HANYA jurnal `order_created` (komentar bilang "order_created + payment_received harus dibuat dari SEMUA jalur", kode tidak). `handleCancel` (`admin/orders/[id]`) reverse `payment_received` walau tak pernah ada → kas fiktif.
- **BUG-061** — Verifikasi service_role: kolom `orders.scheduled_installation_time` TIDAK ADA di live. `admin/orders/[id]/page.tsx:428-436` update kolom tsb → 42703, `console.error` saja (diam-diam), `scheduled_installation_date` pun tak tersimpan.
- **BUG-062** — `purchase-orders/[id]/route.ts:52-153`: PUT `status='received'` tanpa guard status sebelumnya → `increment_stock_gudang` + jurnal `purchase` bisa dobel; `paid` tanpa `received` → jurnal hutang_paid tanpa hutang.
- **BUG-063** — `xendit/webhook/route.ts:95-97`: `alreadyProcessed` langsung 200 idempotent tanpa cek jurnal/order; bila attempt-1 jurnal gagal (liat BUG-058), retry skip selamanya → order tak pernah lunas.

### SEDANG/RENDAH — UI (terverifikasi kode)
- **BUG-064** — `gudang/qc/page.tsx:490-514`: blok `mobile-only` di dalam tab `qc` merender `pendingReturns` (retur), bukan item QC (`items.filter(i => !i.ready)` di blok desktop 515+).
- **BUG-065** — `admin/shipping/page.tsx:346`: tombol "Input Resi" utk `status==='ready' || 'packed'`, tapi `VALID_STATUS_TRANSITIONS` (`api/orders/[id]/route.ts:14`) menolak `ready→shipped` → 400.
- **BUG-066** — `installer/schedule/page.tsx:571`: teks korup "Setelah提交, status booking改为...".
- **BUG-067** — `gudang/stock-opname:290`, `finance/stock-opname:122`: `formatRp(totalDiff)` padahal totalDiff = jumlah qty (unit), bukan uang.

### SCHEMA FILE BASI (bukan bug kode — live sudah punya kolom, tinggal sync `000_full_schema.sql`)
`production_reports` (meter_gorden/poni_lurus/poni_gel/notes), `lembur_records` (staff_id/jam/keterangan), `suppliers` (contact_person/phone/email/notes — dibuktikan E2E finance.spec buat supplier & pass), `surveys.signature_name`, `inventory_movements.notes`, `customers.email`, RLS `purchase_orders` (live LEBIH ketat dari file). Semua diverifikasi service_role OK.

### FALSE POSITIVE (diverifikasi — JANGAN difix)
- Public read `install_bookings`: anon (tanpa login) → 42501 → policy "Public can read" TIDAK live.
- Bocor `payments`/`journal_entries` ke staff: sesuai "All staff read" di 10.7 (by design).
- Drift production_reports/lembur/suppliers/surveys/inventory_movements/customers = "fitur rusak": live SUDAH punya kolomnya.

### KANDIDAT (belum 100% diverifikasi — perlu keputusan produk)
TikTok double-booking revenue (`sync-to-main-orders` vs `sync-finance` idempotency key beda); mapping `payment_status` TikTok salah field (order AWAITING_SHIPMENT tak masuk main orders); steam rework via jalur gudang macet (steam_job lama status `revision` tak diganti); piutang retur cap beda (dengan/tanpa fee); hutang delete tanpa guard paid; race finance pay (rollback jurnal refund tidak ikut rollback).

### ✅ BUG-069 s/d BUG-073 — FIXED (sesi 12, 2026-08-13)
- **BUG-069** — TikTok double-booking → model **akrual**: `sync-to-main-orders` hapus jurnal `payment_received` (hanya `order_created` = revenue + row payments utk gate pipeline); `sync-finance`/`create-piutang` hapus jurnal `order_created` (hanya `ecommerce_fee` + `piutang_received` = kas NET). Revenue ×1, kas ×1, fee ×1. Guard idempotency pindah ke `tiktok_sync_order_created`.
- **BUG-070** — `sync-orders`: `payment_status` diambil dari field payment TikTok (`order.payment_status`/`order.payment?.payment_status`), bukan lifecycle `order.status` → order dibayar (mis. AWAITING_SHIPMENT) langsung masuk pipeline. Fallback COMPLETED/DELIVERED→PAID.
- **BUG-071** — steam rework macet: `gudang/production` guard cari steam_job `.eq('status','pending')` (abaikan row `revision` stale) → rework tidak stuck.
- **BUG-072** — hutang delete: tolak hapus jika `paid`/`cancelled`/`paid_amount>0`/`return_amount>0` (mirror handleSave).
- **BUG-073** — finance `handlePay`: jurnal gagal → rollback penuh (hapus payment row) + `ordErr` (race) → hapus payment row (mirror handleRefund).

## Audit Finance — Referensi Lengkap

Temuan lengkap (76 item: F-01 s/d F-76) ada di **`audit-finance.md`**. BUG-009/010/011 = temuan baru yang tidak ada di audit tersebut (N-1/N-2/N-3). Prioritas eksekusi: lihat `todo.md` + rekomendasi P0-P4 di `audit-finance.md`.

## Catatan Tambahan (bukan bug, tapi terkait)

1. **Penjahit bypass API**: `penjahit/jobs/page.tsx:165` langsung update `orders.status='steam'` dari client (auto-transition) — tidak lewat API role check. Sengaja (auto), tapi tidak ada audit role.
2. **Installer bypass**: `installer/checklist/page.tsx:116-118` langsung update `install_bookings.status='done'` dari client.
3. **Gate foto**: `admin/orders/[id]` mewajibkan upload foto untuk **semua** transisi (bukan hanya stage wajib foto), sehingga owner upload ulang bukti yang sudah ada.
