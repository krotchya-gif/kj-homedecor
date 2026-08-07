# Audit Komprehensif KJ Homedecor — Fitur, Halaman, CRUD, Flow + Update user.md

> **For Hermes:** Jalankan sesuai fase di bawah. Metodologi mengikuti skill `project-audit` (Phase 0-7).

**Goal:** Verifikasi SEMUA fitur & halaman KJ Homedecor (138 route, 31 API, 7 role) — CRUD tiap modul, detail tiap halaman, dan flow utama bisnis — lalu update `user.md` (daftar akun + role access) sesuai kondisi aktual production.

**Repo:** `D:\web\okky\kj-homedecor` · Branch `main` · Supabase `glblgsfenarnztawtpmu`

---

## Konteks awal (sudah terverifikasi read-only 2026-08-06)

**Route map (138 halaman):**
- Publik: `/`, `/booking`, `/catalog`, `/products/[slug]`, `/setup`, `/(auth)/login`
- `admin` (18): dashboard, catalog(+banners/categories/products), orders(+[id]), customers, booking, portfolio, reports, seo, shipping, staff, laundry, landing-settings, **surveys (baru)**
- `finance` (34): accounts(3), assets, cash(4), hutang(3), journal(+auto+reports 5), laporan(11), laundry-payroll, payments, piutang(5), reports, settings
- `gudang` (10): production, qc, steam, stock(+opname), lembur, alerts, reports
- `installer` (4): schedule, checklist, reports
- `owner` (20+): hpp, laporan(11), marketplace, materials, products, staff, suppliers(+price-history), tiktok(+migrate), **surveys (baru)**
- `penjahit` (4): jobs, history, reports
- `surveyor` (5, BARU): dashboard, survey/new, survey/[id], survey/[id]/edit, history

**API (31):** customers, orders(+[id]+consume-materials), products, materials, suppliers, purchase-requests(+[id]), purchase-orders(+[id]), journal, landing-settings, install-bookings(+[id]), upload, admin/create-staff, setup-accounts, gudang/po-delivery, seo(2), tiktok(7), xendit(2), webhooks/tiktok, **surveys(+[id])**

**Temuan user.md (PERLU UPDATE):**
1. Daftar akun tidak sinkron: `users` table production = 7 row (2 owner, admin, gudang, finance, penjahit, **QA a surveyor = sampah QA**). Tidak ada user `installer` walau route /installer ada (4 halaman).
2. Role Access table belum punya `surveyor` (fitur baru) & `installer`.
3. **Akun QA tersisa di production**: `QA a` (role surveyor, users table) + `qa-survey-a-1786028467998@test.local` (auth.users) — cleanup script gagal silent (tidak cek error delete). WAJIB dihapus.

---

## Fase 0 — Prerequisites
- `npm run build` exit 0 · `git status` bersih · `git log --oneline -5`
- `timeout 120 graphify update .` (pastikan graph.json fresh)
- Skim `graphify-out/GRAPH_REPORT.md` untuk arsitektur terkini

## Fase 1 — Inventaris & verifikasi halaman per role
Untuk SETIAP role (admin, finance, gudang, installer, owner, penjahit, surveyor):
1. Cocokkan route map vs `NAV_BY_ROLE` di `DashboardSidebar.tsx` & `DashboardTopNav.tsx` (item menu yang TIDAK ter-link = halaman mati — contoh: `finance/journal/reports/*` sudah diketahui mati, cek yang lain)
2. Verifikasi tiap halaman: buka via dev server lokal (`next dev` port 3100, backend production) + `browser_console` (0 JS error) + Performance API (0 request ≥400)
   - ⚠️ Halaman dashboard butuh login — pakai akun test role owner (buat via `sb.auth.admin.createUser`, pola skill), cookie sesi `base64-` + `sb-<ref>-auth-token` (format skill) — ATAU login via UI sekali per Playwright context
3. Tabel output audit per role: `Halaman → Status (OK/Error/Gap) → Catatan`

## Fase 2 — Inventaris CRUD per modul
Untuk tiap modul (orders, customers, products/catalog, materials, suppliers, purchase, booking, payments/cash/jurnal/hutang/piutang/aset, laundry, gudang production/qc/steam/stock, installer, tiktok, landing/seo, survey):
1. Inventory operasi write: `grep -rn "\.insert(\|\.update(\|\.delete(\|\.rpc("` per modul (src/app + src/components + src/lib)
2. Cocokkan dengan API route (`src/app/api/<modul>/`) — modul yang CRUD client-side langsung vs via API (konsistensi pola)
3. **Cek error handling tiap operasi write** — pola skill: `if (error)` wajib ada + pesan asli; tanpa cek = silent fail (gejala "data gak masuk"). Scan: `grep -rn "await supabase" | grep -v "if (error)\|if (err)"`
4. Output: `Modul → Operasi (C/R/U/D) → Via (API/client) → Error handling (✅/❌)`

## Fase 3 — Verifikasi flow utama (detail + urutan + gate)
Untuk tiap flow, baca file sumber + verifikasi state machine konsisten antar file:
1. **Order pipeline**: `new → payment_ok → sorted → production → steam → ready → packed → shipped/done` (+ V3 pasang) — cek `src/lib/orders.ts`, `api/orders/[id]/route.ts`, `admin/orders/[id]/page.tsx`, `finance/payments`, `gudang/steam`, `installer` — transisi valid, role permission (3 tempat: API `ROLE_STATUS_PERMISSIONS`, UI `ROLE_NEXT_ALLOWED`, finance `canApprove`), foto wajib per stage, gate payment packed/shipped/done
2. **Finance pipeline**: payments/cash/hutang/piutang → `createSimpleJournal` → `journal_entries`+`journal_lines` → laporan (buku besar/neraca/laba-rugi/neraca-saldo via `fetchAccountBalances` helper — VERIFIKASI hasil = angka yang sama antara laporan owner & finance) → cash account balance (RPC)
3. **Booking**: form publik → insert `install_bookings` (RLS anon INSERT) → tampil di admin/booking + calendar → konversi ke order?
4. **Survey (baru)**: form → API `/api/surveys` (nomor auto, surveyor_id dari auth) → riwayat/filter → detail → copy/WA/PDF → link ke order → blok HASIL SURVEY di invoice (cek end-to-end dengan data test)
5. **HPP/BOM**: products → bom → materials → hpp_calculated → price markup — verifikasi KAIN ARCELLINE & KAIN HARVEY (price 0 sudah di-fix validasi, cek data aktual sudah benar?)
6. **TikTok sync**: webhook → sync-to-main-orders → order + order_items + piutang (cek status webhook hidup, order terbaru masuk)

Output: `Flow → Langkah → Gate/Rule → Status → Bukti (query/file)`

## Fase 4 — Update user.md (+ cleanup QA)
1. **Hapus sampah QA**: `QA a` (users) + `qa-survey-*-@test.local` (auth.users) via service role — verifikasi `users` = 6 row bersih
2. **Update `user.md`**:
   - Daftar Staff Accounts = kondisi aktual production (6 akun asli; tambah akun baru kalau ada — saat ini TIDAK ada akun surveyor/installer asli)
   - Role Access table: tambah **`surveyor`** (Survey: buat/lihat/edit survey sendiri, copy, WA, PDF) & **`installer`** (Jadwal, checklist, laporan)
   - Catatan gap: route installer ada tapi belum ada akun installer → rekomendasi buat akun test/nyata
3. **Sinkron USER.md** (identik dengan user.md — diff 0) + vault `Notes/Workspace & Projects.md` jika perlu

## Fase 5 — Laporan & rekomendasi
- Laporan audit lengkap (format skill project-audit Phase 7): statistik, arsitektur, role & fitur, keamanan, kekuatan, area perhatian (🔴/🟡/🟢), rekomendasi prioritas
- Simpan ke vault: `Notes/Graphify/kj-homedecor/audit-2026-08-06.md` + append `Daily/YYYY-MM-DD.md`
- `tsc` + `build` + commit + push (kalau ada fix yang ditemukan selama audit — JANGAN fix langsung saat audit, kumpulkan dulu jadi rekomendasi, kecuali bug blocker)

---

## Risks & Open Questions
1. **Audit ini besar** (138 halaman render + 31 API + 7 flow) — butuh beberapa jam; jalankan bertahap per role, user bisa "cek" di tengah.
2. **Halaman mati** yang sudah diketahui (`finance/journal/reports/*`, `laundry/jobs`, `finance/reports`) — verifikasi ulang statusnya, jangan asumsi.
3. **Fix vs audit**: user minta "cek" — audit dulu, fix menyusul (pisah sesi, sesuai skill project-audit pitfall #7). Kecuali user minta langsung fix.
4. **Akun QA cleanup** = operasi delete production — konfirmasi ke user sebelum hapus (walaupun jelas sampah test).
5. **user.md berisi password** — update HANYA daftar akun & role access, jangan ubah password; jangan pernah commit perubahan password baru ke repo.
