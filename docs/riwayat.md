# Riwayat Perbaikan & Bug — KJ Homedecor

> Satu dokumen konsolidasi: **riwayat perbaikan per fase** + **tracker bug lengkap (BUG-001 s/d BUG-131)** + **audit modul finance** + **backlog**.
> File ini menggabungkan `bug.md`, `todo.md`, `audit-finance.md`, dan bagian "Riwayat Perbaikan" README (dikonsolidasi 2026-08-13, sesi 37).
>
> Cara pakai: cari bug berdasarkan ID (tabel di bawah) → status & cara fix langsung terlihat di kolom "Cara Fix". Untuk konteks fase, lihat "Riwayat Perbaikan per Fase". Untuk temuan audit finance, lihat bagian "Audit Modul Finance".

## 📖 Cara Membaca Dokumen Ini (WAJIB dibaca agent sebelum kerja)

1. **Status**: `✅ Fixed` = selesai & terverifikasi (tsc/build/vitest/E2E sesuai konteks) · `❌` = bukan bug (false positive) · `⏳` = ditunda. Jangan anggap bug sudah mati kalau status tidak ✅.
2. **Metode final terkunci**: setiap concern punya SATU metode final (daftar di `AGENTS.md` blok `single-source-of-truth-rules`). Entri lama yang memakai pola berbeda (mis. rollback manual client) = **sejarah — jangan dihidupkan kembali**; kerjakan lewat metode final yang ada.
3. **Format entri baru (wajib ikuti)**: `BUG-<ID> | gejala singkat + lokasi (file:baris) | status + tanggal | METODE + ALASAN + bukti verifikasi`. Tulis ambigu = agent berikutnya salah mengambil keputusan.
4. **Analisis TIDAK boleh dari migration lama** (`001`–`062`) atau dari ingatan — cek live via Supabase MCP dulu (`supabase_execute_sql` / `supabase_list_tables`), lihat aturan `AGENTS.md`.
5. **Sebelum menulis fix baru**: cek tabel BUG — kalau bug mirip sudah dicatat, **verifikasi ulang**, jangan fix 2× dengan metode beda.

---

## 1. Riwayat Perbaikan per Fase

### 2026-08-15 — Sesi 51: Chart dashboard kosong (data) — Omzet per Sumber & Tren 12 Bulan
- **Admin "Omzet per Sumber" kosong**: query `data.orders` hanya `select('id, status, payment_status')` — `source` & `total_amount` tidak diambil → `revenueBySource` menjumlahkan `undefined` → semua bar 0. Fix: tambah `source, total_amount` ke select. Terverifikasi: 13/13 bar height > 0.
- **Owner "Tren Omzet 12 Bulan" kosong**: `loadTrend` mengelompokkan hanya tahun kalender `year-1` (2025) padahal live hanya punya paid order 2022 & 2026 → semua titik 0. Fix: **jendela 12 bulan berakhir di periode terpilih** (trailing 12 bulan).
- Test `mobile-charts.spec` diperkuat: assert bar chart admin punya bar height > 0.
- **Verifikasi**: tsc + build + vitest 27/27 + E2E chromium 38/38 (sekali run sempat flaky 5 gagal karena dev recompile lambat 11 menit — lolos penuh di run berikutnya).

### 2026-08-15 — Sesi 52: Audit ulang menyeluruh (22 temuan, 3 wave) — Wave 1–3 selesai
- **Wave 1 — kebenaran angka (12 fix, semuanya ✅)**: finance/payments stat `neq('payment_status','cancelled')` (cancelled ikut terhitung); admin/customers `c.phone.includes` null-crash; kronologi-omzet (reset page via effect terpisah, filter cancelled/returned, boundary `T00:00:00`); performa-tag filter cancelled; umur-piutang select `invoice_number` + filter `invoice_date` (ganda 500); mutasi-kas label "Mutasi (Periode)" (web+PDF); owner trend deps `[period.year, period.month]`; pdf-brand font per-doc WeakSet (anti-font bocor antar dokumen); survey-pdf `getBrandRgb()`; use-order-detail payKeyRef reset saat modal tutup + qty return ≤0 ditolak; finance aging anchor kosong jangan '>90'.
- **HIGH (dikonfirmasi live): constraint `piutang_status_check` & `hutang_status_check` hanya `('pending','paid','cancelled')`** — halaman faktur/hutang/process men-set `'partial'` → bayar/retur SEBAGIAN selalu gagal 23514 (pesan menyesatkan, data live bersih karena semua gagal). Fix: constraint diperluas ke `'partial'`; INSERT 'partial' terverifikasi live.
- **Wave 2 — keamanan & konsolidasi metode final**:
  - **RPC atomic baru (7)** — `pay_piutang_atomic`, `pay_hutang_atomic`, `retur_piutang_atomic`, `save_piutang_atomic`, `save_hutang_atomic` (create/update/delete), `process_tiktok_order_atomic`, `cancel_tiktok_order_atomic`. Semua SECURITY DEFINER + `actor_is_active_with_role` (session-bound) + `create_journal_atomic` dalam SATU transaksi. Client `finance/piutang/faktur`, `finance/hutang`, `finance/piutang/process` di-refactor ke RPC (hapus jalur insert/update langsung + createSimpleJournal + rollback manual = 2 sumber kebenaran). `admin/orders` create → `POST /api/orders` + `add_order_payment_atomic` (drop `dp_amount` dari body POST — RPC yang mengelola, kalau ikut di-insert sisa tagihan = 0 → RPC menolak).
  - **Overload usang `add_order_payment_atomic` (4-arg & 6-arg) di-DROP di live** — PostgREST PGRST203 "could not choose best candidate" saat named args parsial. Final = 7-arg (dgn `p_date`).
  - **PUT `/api/orders/[id]` role lock**: field non-status dibatasi per role — admin/owner/finance semua; gudang hanya `packed_at` (di-set saat ready→packed); lainnya ditolak (sebelumnya installer/penjahit bisa ubah courier/tracking/notes order mana pun = IDOR).
  - **sync-to-main-orders → RPC TikTok** dengan BLOCK on error: `process_tiktok_order_atomic` (order + payment `verified_by NULL` + jurnal order_created idempotent + `order_items` HANYA saat order baru — `v_was_new`, sync ulang tidak duplikat) & `cancel_tiktok_order_atomic` (void payment + reversal jurnal + order_logs; perbaiki `SELECT ... INTO` 3 kolom→2 variabel yang menimpa nomor order dengan status).
  - **Installer submitRevision → `PUT /api/install-bookings/[id]`** (RPC advance_install_booking_status + cascade order; sebelumnya update langsung + insert order_logs terpisah).
  - **Housekeeping**: create-staff komentar eksplisit "owner by-design" (keputusan bisnis — jangan ditandai audit lagi); setup-accounts password min 8; rate limit consume-materials & notifications PATCH; seo upload-robots/sitemap cek `status='active'`.
- **Wave 3 (UX mobile & housekeeping) — selesai**:
  - **Pagination di LUAR `.desktop-only`** (5 halaman: hutang, faktur, journal, cash, cash/mutation) — MobileCards di-slice `page*pageSize` tanpa kontrol halaman → user HP terkunci 10 baris pertama (BUG-129).
  - **Reset page saat search/filter** berubah (setPage(0)) di 4 halaman ber-search/filter.
  - **Dead exports dihapus**: `formatDateFromISO`, `generateOrderNumber` (`src/lib/utils.ts`, 0 caller — sudah diverifikasi grep).
  - **upload.ts guard JSON = false-positive (verified)**: MIME whitelist (ALLOWED_TYPES) + magic bytes sudah menolak `application/json` (`{`/`[` tidak lolos) — tidak ada perubahan kode, dicatat agar audit berikutnya tidak menandai lagi.
  - **csv.ts**: `exportToCSV`/`generateCSVTemplate` + BOM `\uFEFF` (Excel Windows baca karakter Indonesia benar); `parseCSV` kini split RECORD stateful (newline di dalam field ber-quote tidak memecah record) + buang BOM input (BUG-130).
- **BUG-131 — font brand & logo gagal dimuat di web/PDF (CORS CDN)**: header mobile terlihat beda dari PDF karena font brand TTF **tidak pernah termuat** — CDN `link.kjhomedecor.com` TIDAK mengirim header `Access-Control-Allow-Origin` (diverifikasi: HEAD/GET fresh + Origin header → ACAO kosong) → browser memblokir `@font-face` & `fetch` cross-origin. Header web jatuh ke fallback **Inter**, PDF (jsPDF `fetch`) jatuh ke **helvetica**, logo CDN (`brand_logo_url`) juga gagal → laporan tanpa logo. Fix: route proxy **`/api/brand-asset`** (GET `?kind=font|logo`) — fetch asset dari CDN **server-side** (tidak kena CORS) + return `Access-Control-Allow-Origin: *` + `Cache-Control`; sumber URL tetap `landing_settings` (satu sumber kebenaran). `BrandFontLoader` `@font-face src` → proxy, `registerBrandFont` (PDF) → proxy, `loadLogo` (PDF) → proxy + fallback sekali `/kjlogo.png` bila CDN mati. **Verifikasi**: proxy 200 (logo image/png 30KB, font font/ttf 22KB) + `document.fonts.load('16px BrandFont')` → status `loaded` (sebelumnya unloaded) + E2E 38/38.
- **Wave 3 selesai — semua 22 temuan audit sesi 52 tuntas + BUG-131 (CORS asset).**
- **Verifikasi**: tsc + build + vitest 27/27 + **E2E chromium 38/38** (1× flaky timeout `goto /gudang/qc` = dev-recompile lambat — lolos penuh di run ulang) + live: constraint 'partial' OK, index idempotency `payments_idempotency_unique` & `journal_entries_idempotency_unique` ada, 7 RPC terpasang & grant authenticated. Riwayat: BUG-125 (constraint 'partial'), BUG-126 (overload PGRST203), BUG-127 (role lock IDOR PUT orders), BUG-128 (jalur paralel piutang/hutang/TikTok → RPC atomic), BUG-129 (pagination mobile), BUG-130 (csv BOM/parse).

### 2026-08-15 — Sesi 50: Chart recharts tidak render di mobile (lebar 0) — ganti ResponsiveContainer ke ChartBox terukur
- **Gejala**: semua 8 grafik dashboard (admin 3, finance 2, owner 3) tidak muncul di viewport mobile — `ResponsiveContainer` recharts **v3.8.1** render SVG dengan lebar 0 (container 324px tapi svg 0px) → chart kosong. Terverifikasi via Playwright emulasi iPhone 12.
- **Fix**: komponen baru `src/components/ui/ChartBox.tsx` (`useContainerWidth` via ResizeObserver + fallback lebar window) — chart menerima **width eksplisit** (`width={w}`), tidak lagi bergantung pengukuran internal recharts. 8 blok chart diganti (admin/finance/owner).
- **Bonus**: grid dashboard `minmax(350px,1fr)` → `minmax(min(100%,350px),1fr)` (tidak overflow di layar <350px).
- **Test permanen baru**: `tests/e2e/mobile-charts.spec.ts` — emulasi iPhone 12 → /admin, /finance, /owner → assert svg render width > 100px.
- **Verifikasi**: tsc + build + vitest 27/27 + E2E chromium **38/38** (37 + 1 mobile-charts; hasil emulasi: admin 3×324px, finance 2×324px, owner 342/342/332px — sebelumnya 0).

### 2026-08-15 — Sesi 49: Header PDF — font brand 20pt + gap logo 6mm; E2E timeout 240s
- **Nama brand di header semua PDF naik ke 20pt** (sebelumnya 14pt — terlalu kecil dengan font custom) + **gap konsisten 6mm** antara logo dan nama brand (`drawLogo` kini mengembalikan lebar logo; `textX = 14 + logoW + 6` — otomatis menyesuaikan rasio logo apa pun).
- **E2E timeout global 180s → 240s** (pipeline penuh + dev-mode recompile bisa melewati 180s → flaky timeout; pipeline-pasang & finance sempat timeout 1× tapi lolos saat dijalankan ulang — bukan bug kode).
- **Verifikasi**: tsc + build + vitest 27/27 + E2E chromium 37/37 + smoke PDF.

### 2026-08-15 — Sesi 48: Upload logo brand (web + PDF header/watermark)
- Kolom `landing_settings.brand_logo_url` (default `/kjlogo.png`); **Admin → Landing Settings → Brand** kini punya **Upload Logo** (PNG/JPG/WEBP transparan ≤2MB via folder `banners`) + preview + URL manual + hapus.
- **PDF** (`pdf-logo.ts` dinamis): header & watermark memakai `brand_logo_url` dari settings (fallback `/kjlogo.png`); cache per URL.
- **Web**: logo navbar landing (`ScrollNav`) & footer landing memakai logo brand (fallback `/kjlogo.png`).
- **Verifikasi**: tsc + build + vitest 27/27 + E2E chromium 37/37 (finance.spec sempat flaky, lolos saat dijalankan ulang).

### 2026-08-15 — Sesi 47: Brand dinamis (nama, singkatan, warna, font) dari Admin → web + semua PDF
- **Konsep** (permintaan user): nama brand bisa diubah & dipakai SEMUA tempat termasuk penamaan invoice — contoh "Calysta Store" → singkatan "CS" untuk nama file & nomor dokumen. Diatur di **Admin → Landing Settings → Brand** (kolom baru `landing_settings`: `brand_name`, `brand_short`, `brand_color`, `brand_font_url`; default KJ Homedecor / KJ / #b37a60 / `/bright-darling-sans.ttf`).
- **Upload font baru**: folder `fonts` (ttf/otf/woff/woff2, ≤5MB, admin/owner) di `/api/upload` (magic bytes: TTF `00 01 00 00`/`true`, OTF `OTTO`, WOFF/WOFF2) + `scripts/upload.php` (**wajib di-copy ke hosting** — tambah `fonts` ke allowed_folders/folder_mimes/allowed_mimes/max_sizes).
- **PDF (semua 18 generator, satu sumber)**: helper `src/lib/pdf-brand.ts` (`getBrandSettings` cache + `hexToRgb` + `registerBrandFont`); `report-pdf.ts` memakai nama/warna/font brand di header, tabel & footer. **Batasan jsPDF**: font dipakai hanya jika TTF (OTF/WOFF fallback Helvetica). Nama file dokumen & nomor faktur/surat jalan pakai singkatan brand (`cs-invoice-…`, `CS-FAKTUR-…`). Font brand default = `public/bright-darling-sans.ttf` (TrueType valid — glyph OK).
- **Web**: nama brand di dashboard topnav, halaman login, alt logo & footer landing, meta `apple-mobile-web-app-title`; injeksi `@font-face` dinamis + CSS var `--brand-color` via `src/components/brand/BrandFontLoader.tsx` (`useBrandSettings` hook).
- **Verifikasi**: tsc + build + vitest 27/27 + E2E chromium 37/37 + smoke PDF (fallback brand/font/logo aman di Node).
- **Fix upload font di hosting (lanjutan)**: `finfo` di server file mengembalikan MIME `font/sfnt` untuk TTF kecil sehingga ditolak `allowed_mimes`. Solusi final di `scripts/upload.php`: untuk folder `fonts`, validasi MIME dari finfo **di-bypass** (cukup ekstensi + **magic bytes font** yang tetap dicek — TTF `00 01 00 00`/`true`, OTF `OTTO`, WOFF/WOFF2). Terverifikasi live: POST `bright-darling-sans.ttf` → `{success:true, url:.../uploads/fonts/*.ttf}` HTTP 200 + GET 200. **Catatan**: setiap perubahan `scripts/upload.php` wajib di-copy manual ke hosting.

### 2026-08-15 — Sesi 46: Logo + watermark di SEMUA PDF + penyatuan gaya (brand #b37a60)
- **Logo KJ** (`public/kjlogo.png`, transparan) dipasang di semua PDF: header kiri atas (tinggi 11mm) di samping "KJ Homedecor" + **watermark logo transparan di tengah dokumen** (opacity 9%, semua halaman). Helper baru `src/lib/pdf-logo.ts` (`loadLogo` cache per sesi, `drawLogo`, `drawWatermark`) — fail-safe: logo gagal dimuat → PDF tetap jalan tanpa logo.
- **Brand disesuaikan ke warna logo #b37a60** (179,122,96): judul, header tabel, garis aksen di semua PDF (sebelumnya #cc7030 / biru / coklat campur-campur).
- **Penyatuan gaya PDF** (cek lintas generator): `invoice.ts` (Invoice/PackingList/Faktur/SuratJalan) & `survey-pdf.ts` kini memakai header standar `drawDocHeader` — **band oranye/biru dihapus** (gaya putih + judul brand seperti laporan), tabel seragam brand (hapus biru `[30,64,175]` & coklat `[120,90,60]`), + nomor halaman/watermark (`addPageNumbers`) yang sebelumnya tidak ada.
- `createReportDoc` & `addPageNumbers` jadi **async** (logo dimuat dulu) — 13 generator laporan di-await.
- **Verifikasi**: tsc + build + vitest 27/27 + E2E chromium 37/37 + smoke render PDF (multi-halaman, fallback logo aman di Node).

### 2026-08-15 — Sesi 45: Jurnal tampil langsung + widget dashboard overview (admin/finance/owner)
- **Halaman Jurnal disederhanakan**: `/finance/journal` (sebelumnya hub dengan 1 kartu) kini **langsung menampilkan daftar jurnal** — tabel Tanggal · Deskripsi · Reference · Baris · Debit · Kredit, urut terbaru, **pagination 50 baris/halaman** (komponen `<Pagination>`), + tombol link ke "Laporan Daftar Jurnal (PDF)". `/finance/journal/auto` → redirect (bookmark lama aman). Label "input manual" yang keliru dihapus.
- **Admin dashboard** + 2 widget: **Perlu Tindakan** (survey baru, order menunggu sortir, siap dikemas, booking pending — link langsung) & **Booking Pasang Terdekat** (5 booking `scheduled` terdekat; data `installBookings` sebelumnya di-fetch tapi tidak pernah dirender; query kini juga mencakup status `pending`).
- **Finance dashboard** + 4 widget: **Perlu Tindakan** (order menunggu approve bayar + refund pending), **Saldo Kas & Bank ringkas** (+total), **Piutang Menua** (5 faktur terlama + umur hari — `agingData` yang tadinya dead code kini dirender), **Status Rekonsiliasi mini** (4 pasang sumber, badge seimbang/selisih + link).
- **Owner dashboard** + 2: **Omzet MoM** (bulan ini vs bulan lalu, Rp + %, panah ▲▼ di kartu Omzet Bulan Ini) & **Status Rekonsiliasi mini** (banner + link detail).
- **Verifikasi**: tsc + build + vitest 27/27 + E2E chromium 37/37.

### 2026-08-15 — Sesi 44: Normalisasi urutan tabel (baru→lama) + perapian semua PDF laporan + rekonsiliasi readable
- **Normalisasi urutan tabel data**: `penjahit/jobs` & `order_logs` (aktivitas order) dibalik ke `desc` (terbaru di atas); modal detail buku besar ditampilkan `[...detailLines].reverse()` (saldo berjalan per baris tetap benar — pola yang sama dengan `finance/cash/mutation`). **Tetap ascending (bukan data riwayat)**: `installer/schedule` & `installer/checklist` (jadwal terdekat dulu), foto progress (desain stepper), `ledger.ts` (saldo berjalan).
- **Helper PDF baru `src/lib/report-pdf.ts`** (single-source-of-truth): header konsisten ("KJ Homedecor" + judul + periode + "Dicetak:"), warna brand #cc7030, **nomor halaman di footer**. Semua 13 generator PDF laporan dipindah ke helper.
- **Isi PDF dilengkapi**: `finance/reports` + Breakdown per Platform (jumlah + omzet) + Lembur; `umur-piutang` + rincian per pelanggan (pelanggan, invoice, tanggal, sisa, umur); `umur-hutang` kolom **sisa tagihan** (bukan amount penuh); `neraca` + baris Selisih + status seimbang; `neraca-saldo` + status seimbang; `kronologi-omzet` PDF ambil **semua data periode** (bukan hanya halaman aktif) + TOTAL; `daftar-jurnal` lebar kolom ≤ A4 + TOTAL debit/kredit; `admin/reports` & `gudang/reports` + TOTAL row, gudang urutan deterministik + lebar 8 kolom.
- **Bug fix**: `setTextColor('var(--neutral-600)')` (CSS var invalid di jsPDF) di admin & gudang reports → nilai RGB konkret.
- **Rekonsiliasi readable**: "Sumber A/B" → label jelas (mis. "Piutang (tabel faktur & settlement)" vs "Sisa tagihan (orders belum lunas)"), badge "✓ Seimbang / ⚠️ Ada Selisih", baris kesimpulan ("Semua sumber data seimbang"), dan penjelasan bahasa awam per kartu.
- **Verifikasi**: tsc + build + vitest 27/27 + E2E chromium 37/37 + smoke render helper PDF (4 halaman, nomor halaman OK).

### 2026-08-14 — Sesi 43: Settlement TikTok Shop — fee per kategori + RPC atomic
- **Konteks**: audit live menemukan **0 jurnal TikTok** (revenue/beban/kas E-Wallet belum pernah dibukukan), 106 piutang legacy `pending` (overstatement Total Piutang Rp107,77 jt), 105 order `source='tiktok'` tanpa jurnal, dan logika settlement **duplikat** (sync-finance & create-piutang berisi piutang+jurnal sama, non-atomic).
- **Keputusan user**: (1) **tanpa backfill** — hanya statement baru yg diproses (data di-reset saat handover; `reset_transactional_data` sudah truncate `tiktok_shop_statements/orders`, `piutang`, `journal_*` dan pertahankan seed accounts/account_mappings); (2) **potongan dipecah per kategori** (komisi/ongkir/penyesuaian) + akun **Beban Iklan** untuk pencatatan manual (TikTok Ads tidak ada di statement settlement); (3) piutang settle → `status='paid'` (tidak muncul di Total Piutang).
- **Implementasi**: akun COA baru seed `5204 Beban Iklan`, `5302 Beban Komisi Marketplace`, `5303 Beban Ongkir`, `5304 Beban Penyesuaian Marketplace`; mapping baru `ecommerce_commission/shipping/adjustment` (Dr beban/Cr 1201) + `tiktok_settlement_received` (Dr 1104 E-Wallet/Cr 1201); mapping lama `ecommerce_fee` nonaktif. RPC **`process_tiktok_settlement_atomic(p_statement_id, p_actor)`** = SATU metode final: role-gate `actor_is_active_with_role`, lock + idempotent (piutang_id / invoice duplikat → link ulang), validasi balance `gross = net + Σ potongan` (tidak balance → tolak), piutang `paid`, jurnal per kategori (arah sesuai tanda — aman utk fee negatif 98/106 di live) + kas E-Wallet. `sync-finance` & `create-piutang` jadi tipis (panggil RPC; error → BLOCK). Override hardcoded `E_WALLET_TIKTOK_ACCOUNT_ID` dihapus (pindah ke mapping).
- **Verifikasi**: tsc + build + vitest 27/27 + E2E chromium 37/37; **live integration test 20/20** (statement uji: piutang paid, 4 jurnal arah benar, komisi negatif dibalik, idempotent, spoof ditolak, saldo 1104 naik sesuai net, cleanup bersih + saldo dipulihkan). Advisories tanpa ERROR baru.

### 2026-08-14 — Sesi 42: Audit ulang keamanan + atomicitas (BUG-120 s/d BUG-123)
- **Temuan audit ulang** (setelah Phase 1-8): klaim "semua money-write sudah atomic & tidak dari browser" ternyata tidak benar. Empat kelas masalah: (1) **RPC atomic percaya `p_actor` dari client** → spoofing role (user biasa kirim uuid admin → lolos role check); (2) retry/timeout bisa **double-pay / dobel jurnal** (belum ada idempotency key di payments; return bisa diproses ulang → stok dobel); (3) policy publik `install_bookings` `WITH CHECK (true)` → anon bisa mengisi field internal (installer_id/order_id/status/source); (4) jalur gudang/shipping/finance/survey masih direct-write client (non-atomic; sebagian pasti gagal di RLS baru karena role operasional tak punya izin UPDATE).
- **P0 — anti spoof**: helper `actor_is_active_with_role(p_actor, roles)` (SECURITY DEFINER, session-bound) dipakai SEMUA RPC atomic (`add_order_payment_atomic`, `cancel_order_atomic`, `process_order_return_atomic`, `adjust_stock_atomic`, `receive_purchase_order_atomic`, `update_survey_atomic`, `create_journal_atomic`, `advance_install_booking_status`). Role check dari `auth.uid()`, bukan dari parameter; `service_role` tetap boleh kirim actor (jalur server route yang sudah autentikasi sendiri).
- **P0 — idempotency & guard**: `payments.idempotency_key` (UNIQUE) + return idempotent saat retry; guard status `cancelled/returned` di payment; guard `already-returned`/`already-cancelled`; `payments.voided_at` (flag, bukan parsing notes); `create_journal_atomic` → idempotency key WAJIB + `ON CONFLICT` race-safe + `created_by` terikat session + validasi line eksplisit (tolak negatif/dua sisi/0-0).
- **P0 — booking publik**: drop policy `"Public can insert install_bookings"` → RPC `create_public_booking` (hanya field publik; status/source/installer/order/customer dipaksa server).
- **P1 — RPC atomic baru**: `process_refund_atomic` (payment refund + jurnal sales_return + orders + returns dalam 1 transaksi), `schedule_installation_atomic` (booking + orders + cascade status), `add_order_item_atomic` / `remove_order_item_atomic` (item + hitung ulang total + log), `save_hpp_bom_atomic` (BOM + HPP + harga), `link_survey_atomic`, `resolve_return_atomic` (verifikasi retur oleh gudang — RLS returns UPDATE = finance).
- **P1 — klien diseragamkan**: finance/payments (bayar & refund) → RPC; booking publik → RPC; gudang/qc retur → RPC; gudang/production auto-steam → API route (`auto_transition` diperluas utk gudang); admin/shipping packed → API route; order detail (schedule/item/link survey) → RPC + idempotency key per sesi modal; surveyor link → RPC; owner/hpp → RPC; admin/orders → rollback payment saat jurnal gagal (pola BUG-073).
- **P2 — schema**: UNIQUE `cash_accounts.account_id` (anti double-update saldo); `order_totals` tidak menghitung payment void (`voided_at IS NULL`); `order_totals` security_invoker; REVOKE anon dari semua RPC atomik (sisa anon-executable hanya `create_public_booking` & `get_public_booking_slots` yang memang publik); regenerasi `src/types/database.ts`; sync `000_full_schema.sql` = live.
- **Verifikasi**: tsc + build + vitest 27/27; E2E chromium **37/37 pass** (3 kegagalan awal di-fix: constraint `order_logs` aksi baru, guard schedule saat order `packed`, UNIQUE akun COA → UI filter + E2E buat akun sendiri); advisories: ERROR `security_definer_view` hilang.

### 2026-08-13 — Sesi 41: Fix realtime double-subscribe di mobile (BUG-119)
- **BUG-119**: error `cannot add postgres_changes callbacks after subscribe()` saat buka sidebar di mobile — NotificationBell di-mount 2× (fixed + drawer) di client singleton. Fix Opsi C: bell hanya di `DashboardLayoutClient`; posisi mobile `top:64px`; drawer tanpa bell.

### 2026-08-13 — Sesi 40: Fix upload pipeline foto 400 (BUG-118)
- **BUG-118**: upload pipeline (wajib foto) gagal 400 setelah pindah CDN — hasil kompresi `browser-image-compression` ber-nama `blob` → ekstensi `blob` ditolak CDN. Fix: ekstensi dari **deteksi magic bytes**, bukan `file.name`. Terverifikasi upload PNG name `blob` → CDN 200.

### 2026-08-13 — Sesi 39: Upload kembali ke CDN lokal hosting (BUG-117)
- **BUG-117**: `/api/upload` dikembalikan dari Supabase Storage (`kj-uploads`, blob `.blob`, kuota free 5GB) → **`link.kjhomedecor.com/upload.php`** (subdomain Hostinger, `public_html/link/uploads/`, file asli, persistent). Route jadi proxy ke const `CDN_UPLOAD_URL`; semua validasi dipertahankan; hapus `SUPABASE_SERVICE_ROLE_KEY` dari route. Siapkan `scripts/upload.php` (tambah folder `survey` + magic video) utk dicopy ke Hostinger. 189 foto testing di storage tidak dimigrasi (keputusan user). Verifikasi: upload PNG → URL CDN + file 200.

### 2026-08-13 — Sesi 38: Sync schema = live + fix laundry order_id (migration 088)
- **BUG-116**: tambah kolom `laundry_orders.order_id` di live (dipakai codebase tapi tidak ada → insert laundry dari order detail gagal 42703); sync `000_full_schema.sql` = live untuk 5 tabel (`laundry_orders`, `landing_settings`, `material_price_history`, `assets`, `order_progress_photos`) — kolom legacy live & kolom yang dipakai codebase (`landing_settings.value`, `material_price_history.created_at`) kini tercatat di schema. **Verifikasi user-level**: INSERT laundry + order_id sukses; tsc + build + vitest 27/27.

### 2026-08-13 — Sesi 37: Audit menyeluruh + migration 087 (hardening)
- Hardening RLS katalog/BOM/users (write → admin/owner, SELECT staff aktif); `REVOKE anon` helper `is_finance_role` & `rls_auto_enable`; cleanup duplikat `cash_accounts` (19 baris Kas → 1); drop 7 index tak terpakai + tambah 15 index FK hot; `order_totals` → security_invoker; `SET search_path` 3 fungsi. **Verifikasi user-level**: penjahit INSERT ditolak 42501, admin sukses.

### 2026-08-13 — Sesi 36: Rapi & manual book final
- `scroll-behavior: smooth` dipindah ke layout; `pendoman.md` ditulis ulang jadi manual book (13 bab + 15 FAQ); `USER.md` & `docs/flows/README.md` jadi referensi manual book.

### 2026-08-13 — Sesi 35: Phase 6F — Dead code cleanup final
- Hapus 8 route API tanpa caller produksi + `clientError`; drop 3 tabel dead (`packing_checklists`, `return_requests`, `order_preparation_checklist`) + 4 RPC dead; update `reset_transactional_data` (migration 086). **Dipertahankan**: `low_stock_alerts`/`order_material_consumption` (RPC produksi) & `rls_auto_enable` (event trigger ensure_rls).

### 2026-08-13 — Phase 6B: Refactor monolit `admin/orders/[id]` (Sesi 29–33)
- **6B-1 (Sesi 29):** `LOG_ACTION` map & `DEFAULT_CHECKLIST` → `lib/order-detail.ts` (`getOrderLogAction`), unit test +3 (27 total).
- **6B-2 (Sesi 30):** ekstrak 5 modal → `components/orders/` (Schedule, Photo, Cancel, Return, Payment). Page 3.561 → 2.923 baris.
- **6B-3/3d (Sesi 31–32):** ekstrak `OrderPipelineStepper`, `OrderSurveySection`, `OrderSummarySection`, `OrderItemsTable`, `PreparationChecklist`, `AddItemModal`. Page → 1.490 baris.
- **6B-4 (Sesi 33):** semua state & handlers → `useOrderDetail(id)` hook; page jadi komposisi murni **505 baris** (−85%). Verifikasi browser 10/10.

### 2026-08-13 — Phase 6A/C/D: dead SDK, dedup nav, notifikasi realtime (Sesi 26–28)
- **6A:** hapus `src/lib/tiktok-shop-sdk/` (1.971 file, 0 import) + deps `request`/`@types/request`; integrasi tetap via `lib/tiktok.ts`.
- **6C:** shared `components/reports/ReportsNav.tsx` (dedup nav laporan finance/owner).
- **6D:** migration 085 aktifkan Realtime `notifications`; `NotificationBell` polling 30s → `postgres_changes`.

### 2026-08-13 — Phase 5: UI cepat (Sesi 24)
- Pagination admin/portfolio & admin/laundry; `theme_preset` → `custom` saat warna diedit; `handleSave` landing deteksi 0-rows; kredensial default dihapus dari setup; teks korup installer diperbaiki.

### 2026-08-13 — Phase 4: Akurasi laporan (Sesi 23)
- "Kronologi HPP" → **"Kronologi Omzet"** (nama jujur) + pagination server-side; akhir bulan dinamis (fix bulan 30 hari); helper `piutangSisa()` satu sumber kebenaran; admin/reports filter periode ke server (tanpa `.limit(200)`).

### 2026-08-13 — Phase 3: Integritas akuntansi (Sesi 22)
- Rollback jurnal diseragamkan pola BUG-073 di semua jalur (refund/hutang/piutang/payroll/aset); hardcoded UUID akun → helper `getAccountIdByCode`; `accounts/accounts` pakai `fetchAccountBalances` (hapus double-count); PO paid di owner/suppliers → jurnal `hutang_paid` idempotent; `markAsPaid` payroll + idempotency_key.

### 2026-08-13 — Phase 2: Hardening API (Sesi 21)
- Rate limit 9 route sensitif; `create-staff` (status active, password min 8, anti-enumeration, role laundry); TikTok OAuth `state` → random nonce single-use (migration 084).

### 2026-08-13 — Phase 1: Keamanan PII & fail-closed (Sesi 20)
- GET `orders/[id]`, `install-bookings` (+[id]), `materials`, `suppliers`, `purchase-*` di-role-gate server-side; cek `status='active'`; fail-open `role ?? 'admin'` → fail-closed. Tambah SOP Bug-Fix di `AGENTS.md`.

### 2026-08-13 — Sesi 19: Landing settings & SEO + Laundry + Owner/Staff
- RLS `landing_settings` admin/owner-only (migration 083); sitemap & robots disimpan di DB + route publik baca dari DB; trust badges tampil; preset `modern` hex; 5 field tanpa UI dihapus. Fix `laundry_orders_status_check` (migration 082 — task laundry bisa diterima); payroll toast jelas (paid = final). `/owner/staff` — kolom Email dihapus, urutan role rapi.

### 2026-08-13 — Sesi 18: Full E2E suite per role
- 10 spec E2E (laundry, surveyor, penjahit, HPP/BOM, shipping-resi, finance-payments, gudang, admin-ops, owner, finance-ext) + baseline 5 spec — render semua halaman kunci pass.

### 2026-08-13 — Sesi 17: Search pesanan + landing theme DB + SEO
- Search & sort pesanan server-side (RPC `search_orders`, migration 081); BUG-078 landing theme/konten dari DB (merge kolom + value JSON); SEO meta dari DB (`generateMetadata`).

### 2026-08-13 — Sesi 16: Bersihkan Xendit + fix refund
- Migration 080 drop kolom legacy `payments.xendit_*` + index; fix `payments_type_check` tambah `'refund'` (sebelumnya insert refund dijamin gagal 23514).

### 2026-08-13 — Sesi 15: Format tanggal + pagination + supplier 3 tab
- Helper `formatDateDDMMYYYY()` di 16 file; pagination semua tabel (komponen `<Pagination>`); `/owner/suppliers` → 3 tab (Suppliers | Purchase Orders | Riwayat Harga), route price-history dihapus.

### 2026-08-13 — Sesi 14: TikTok Shop untuk Admin
- Halaman `/admin/tiktok` (tabel order tersync + 2 tombol + filter + pagination); nav admin grup Operasional; migrasi order detail ke PUT API ditunda (item besar).

### 2026-08-13 — Sesi 12: Fix bug kandidat + UI TikTok + datepicker
- BUG-069 TikTok double-booking → model akrual (revenue ×1, kas ×1, fee ×1); BUG-070 payment_status dari field payment; BUG-071 steam rework; BUG-072 hutang delete guard; BUG-073 finance pay rollback; label tombol TikTok; pagination settlement; BUG-075 datepicker timezone.

### 2026-08-13 — Sesi 10: Reset data hardening + SEO + dead code audit
- Migration 079 rewrite `reset_transactional_data` (TRUNCATE 41 tabel + verifikasi + guard seed); `seo_settings` di-drop; BUG-068 `generateMetadata` async baca DB; UI `/owner/settings` tampilkan counts; schema sync; dead code terdokumentasi.

### 2026-08-13 — Sesi 9: E Wallet Tiktok + Xendit removal + fix BUG-058..067
- Migration 077 akun 1104 `Xendit Cash` → `E Wallet Tiktok`; Xendit dihapus (route + env); BUG-058 jurnal server-path via RPC langsung; settlement TikTok full (fee+ongkir+adjustment terjurnal); BUG-060 auto-DP jurnal; BUG-062 guard transisi PO; BUG-059 migration 078 RLS role-based 5 tabel inti + revoke anon; BUG-064/065/066/067 fix UI.

### 2026-08-13 — Sesi 7: Simulasi E2E pipeline + fitur
- Auth setup 8 role → storageState; spec `catalog-bom`, `pipeline-kirim` (9 tahap), `pipeline-pasang` (10 tahap), `finance`; smoke → 27/27 pass; BUG-056 pipeline produksi macet; BUG-057 installer upload foto 403.

### 2026-08-12 — Sesi 6: Backlog tersisa
- `is_auto` jurnal; `piutang.remaining` satu sumber; setup-accounts rate limit + anti-race; Xendit webhook validasi; sync-to-main-orders error → BLOCK; jurnal webhook silent-fail → 500; TikTok webhook multi-secret; deps mati dihapus; `NAV_BY_ROLE` sentralisasi (`config/nav.tsx`); owner/laporan dedup (shared component, hemat ~2.300 baris); `type='income'` → `'revenue'` (migration 074); fitur Stock Opname UI; RPC `approve_stock_opname` (075); sync-orders pagination; GET `/api/orders` & `/api/customers` role-gate; sync-finance log sensitif dipangkas.

### 2026-08-12 — Sesi 5: Tests, role check POST, upload, docs
- Vitest suite (16 test): state machine orders + `getClientIp`/`signTikTokRequest`; route POST role-gate (customers/materials/products/suppliers/install-bookings/orders → admin/owner; purchase-requests → gudang/admin/owner); `/api/upload` scope folder per role; docs sync.

### 2026-08-12 — Sesi 4: Security API
- Fail-open DELETE order → deny; `consume-materials` + role check; surveys fail-open → deny; install-bookings PUT whitelist field + `actual_date` tersimpan; po-delivery GET + auth; journal GET dibatasi finance/admin/owner; TikTok webhook timing-safe; OAuth callback hapus gate `getUser()`; rate limit `getClientIp()` anti-spoof.

### 2026-08-12 — Sesi 3: Schema↔live sync, RLS hardening, TikTok fee
- `000_full_schema.sql` = kondisi live (58 tabel, 58 RLS, policy nama = live); migration 072 kolom drift + `order_logs_action_check`; RLS hardening 067/071 akhirnya efektif (DROP policy nama benar); survey_logs RLS; migration 073 breakdown fee + mapping BENAR (`settlement_amount`=gross, `revenue_amount`=net) + 3 jurnal idempotent + anti-double; webhook stop auto-piutang; UI owner/tiktok kolom Revenue/Fee/Settlement.

### 2026-08-12 — Sesi 2: Sinkronisasi final & klarifikasi
- `000_full_schema.sql` (1.426 → 2.115 baris) = satu-satunya referensi schema = live; verifikasi live semua kolom/tabel/RPC; koreksi klaim 4 fungsi audit (tidak ada di live / nama beda / belum diimplementasi); login semua role 200 (recursion users fixed).

### 2026-08-12 — Sesi 1: Finance hardening, fitur baru & laundry
- Role check API; fail-open dihapus; redaksi error (toClientError); migration 067 RLS role-based + revoke 5 RPC; migration 070 `users_role_check` + laundry; jurnal atomik `create_journal_atomic` (064/066); DP jujur; refund → `sales_return`; TikTok order+payment+jurnal; rekonsiliasi sumber piutang = tabel `piutang`; satu jalur booking → order; payment gate packing; auto-create steam_job; **Reset Data** (owner, double-confirm); **Faktur & Surat Jalan PDF**; **Flow Laundry** (`/laundry` + payroll kg_actual).

### 2026-08-11 — Pipeline, Payment & Katalog
- BUG-001/002/003/007: Steam Pass auto-advance ke Siap; tombol Kemas di gudang; admin escape hatch; prefill foto; modal Jadwalkan Pasang + auto-create booking. BUG-004: DP admin auto-catat ke `payments`; approve finance = verifikasi final. BUG-008: harga jual bukan tanggung jawab admin — di-set Owner via HPP; produk tanpa harga tersembunyi dari katalog. Docs: `pendoman.md`, `bug.md`, `docs/flows/` disinkronkan.

### 2026-07-18 — Audit & proxy migration
- `middleware.ts` → `proxy.ts`; auth helpers (`requireAuth`, `requireRole`, `requireAuthRole`, `checkRateLimit`); setup proteksi, mass assignment, IDOR, upload validation; migrations RLS 053-058.

### 2026-06-02 — Pipeline V2
- `payment_ok` di depan, steam revision loop, 3 QC distinct.

---

## 2. Status Bug — Tabel Lengkap (BUG-001 s/d BUG-131)

> Semua bug sudah **Fixed** kecuali BUG-020 (bukan bug — false positive). Bagian detail Gejala/Akar per bug sudah diringkas ke kolom "Cara Fix".

| ID | Bug | Status | Cara Fix |
|---|---|---|---|
| BUG-001 | Pipeline macet di Steam/QC — gudang tidak bisa advance | ✅ Fixed | Steam Pass auto-update `orders.status='ready'` (guard idempoten) |
| BUG-002 | Pipeline macet di Kemas (ready → packed) — gudang tidak bisa advance | ✅ Fixed | Tombol "Kemas" di `/gudang/qc` per order ready |
| BUG-003 | Role admin diblokir di stage production/steam/ready | ✅ Fixed | Admin = escape hatch semua stage (align API) |
| BUG-004 | Approve pembayaran (Cek Bayar) gagal jika DP diinput admin | ✅ Fixed (Opsi B) | DP admin auto-catat ke tabel `payments`; approve finance = verifikasi final |
| BUG-005 | Role drift: TS `Role` vs DB CHECK constraint vs pemakaian app | ✅ Fixed | Tambah `'surveyor'` ke TS Role type; seragam 8 role |
| BUG-006 | `x-pathname` header diklaim tapi tidak pernah di-set | ✅ Fixed | `proxy.ts` set header |
| BUG-007 | Pipeline pasang: booking installer tidak terhubung dari order detail | ✅ Fixed | Modal "Jadwalkan Pasang" + auto-create/update `install_bookings` |
| BUG-008 | Harga jual produk diinput admin (tebakan) padahal belum tahu HPP | ✅ Fixed (Opsi A) | Harga jual = tanggung jawab Owner via HPP; produk tanpa harga tersembunyi dari katalog |
| BUG-009 | **Pembukuan server mati**: `createJournalEntry` pakai URL relatif → jurnal order/PO tak pernah dibuat | ✅ Fixed | `createJournalEntry` terima `baseUrl`; pemanggil server meneruskan base URL |
| BUG-010 | **Tanda saldo terbalik** di laporan keuangan (normal_side NULL) | ✅ Fixed | Hitung tanda dari `a.type` (asset/expense debit, liability/equity/revenue credit) |
| BUG-011 | **PO received jurnal pakai QUANTITY** sebagai nominal | ✅ Fixed | Jurnal `purchase` pakai `actual_cost` (nominal rupiah), qty hanya untuk stock |
| BUG-012 | Refund rusak 3 lapis (tanpa jurnal, dead policy, refund dobel) | ✅ Fixed | Jurnal refund + kurangi dp/lunas + policy returns diperbaiki + guard idempotency |
| BUG-013 | Hutang & piutang off-ledger (bayar/buat tak pernah bikin jurnal) | ✅ Fixed | Helper transaksional + auto-jurnal faktur |
| BUG-014 | `piutang.paid_amount/return_amount` tak pernah di-write → tak bisa lunas | ✅ Fixed | Aksi bayar per faktur (jurnal) + handler retur + konsolidasi `remaining` |
| BUG-015 | Filter periode DEAD di 8/10 laporan (`useEffect([])`) | ✅ Fixed | `useEffect(..., [startDate, endDate])` + aging dari due_date |
| BUG-016 | Neraca tidak balance (tanpa laba berjalan) | ✅ Fixed | Tambah baris "Laba Berjalan" di ekuitas |
| BUG-017 | Komisi marketplace TikTok hilang (`commission_fee: 0` hardcode) | ✅ Fixed | Breakdown komisi/beban platform + auto-jurnal settlement 3 langkah |
| BUG-018 | `exec_sql` backdoor (SECURITY DEFINER) di DB | ✅ Fixed (migration 063) | Drop/revoke — terverifikasi mati 404 di live |
| BUG-019 | RLS tabel keuangan `FOR ALL authenticated` + journal tanpa role check | ✅ Fixed | RLS role-based + role check + zod + REVOKE RPC |
| BUG-020 | **FALSE POSITIVE (verified)**: F-35/F-72 "NUMERIC string concat" | ❌ Bukan bug | PostgREST NUMERIC = `number` di runtime; `+` = aritmetika |
| BUG-021 | **Security API**: create-staff fail-open, PO no-auth, upload MIME spoofable, dll | ✅ Fixed | Role gate + validasi + redaksi error |
| BUG-022 | **Pembukuan bocor**: payment admin & Xendit & faktur & payroll & aset & saldo awal tanpa jurnal | ✅ Fixed | Jurnal di semua jalur + jurnal pembuka saldo awal |
| BUG-023 | **UI finance**: handleQcApprove dead, refund tab salah, kas tanpa validasi, transfer race, dll | ✅ Fixed | Fix per item (BUG-025 rinci) |
| BUG-024 | **Drift**: Role type tanpa surveyor, x-pathname, proxy map, sidebar, finance akses marketplace | ✅ Fixed | Seragamkan; proxy whitelist finance ke `/owner/marketplace` & `/owner/tiktok` |
| BUG-025 | **Sisa audit F-31..F-71** (dua kolom sumber, statistik halaman-aktif, buku besar, kas tidak live, dll) | ✅ Fixed (migration 064) | RPC `create_journal_atomic` (entry+lines+saldo kas SATU transaksi + idempotency) |
| BUG-026 | **F-18 booking installer tidak cascade ke orders** | ✅ Fixed | Semua status booking lewat 1 jalur (API → RPC `advance_install_booking_status`) + role check |
| BUG-027 | **F-2 DP order = `paid` palsu + gate tanpa-DP** | ✅ Fixed | DP tidak isi `lunas_amount` fiktif; order `pending` diblokir advance (UI+API, kecuali finance) |
| BUG-028 | **F-16/F-17 pipeline gate bocor** (packing tanpa cek lunas, regresi status) | ✅ Fixed | Gate `paid` di gudang/qc & admin/shipping; guard `.eq('status')`; auto-create steam_job |
| BUG-029 | **F-13/14 e-commerce off-ledger** (TikTok paid tanpa payment/jurnal) | ✅ Fixed | sync-to-main-orders + payment + jurnal idempotent; cancel reversal |
| BUG-030 | **F-9 refund menciptakan piutang** (Dr Piutang/Cr Kas) | ✅ Fixed | Mapping `sales_return` (Dr Penjualan Retur/Cr Kas) + retur piutang berjurnal |
| BUG-031 | **Security API lanjutan**: TikTok auth/sync tanpa role check, mass-assignment, users write bebas | ✅ Fixed | Role check TikTok/PR/staff; redaksi error 26 route; deny |
| BUG-032 | **RLS & RPC hardening**: policy permisif + RPC stock tanpa role check | ✅ Fixed (migration 067) | RLS role-based + REVOKE PUBLIC/anon + role check 5 RPC |
| BUG-033 | **`users_role_check` hilang role laundry** → insert laundry gagal 23514 | ✅ Fixed (migration 070) | Drop + recreate constraint lengkap |
| BUG-034 | **F-61 sumber piutang ganda** (orders vs tabel piutang) | ✅ Fixed | Sumber utama = tabel `piutang` + halaman rekonsiliasi read-only |
| BUG-035 | **RLS hardening 067/071 no-op** — DROP policy nama salah | ✅ Fixed (migration 072) | Drop nama benar + ENABLE RLS tiktok/survey_logs + hardening accounting |
| BUG-036 | **`order_logs_action_check` menolak `payment_verified`** | ✅ Fixed (migration 072) | Constraint = union codebase + data live |
| BUG-037 | **Kolom live hilang dari schema reference** | ✅ Fixed (migration 072) | Sinkron `000_full_schema.sql` = kondisi live |
| BUG-038 | **Settlement TikTok "main net"** — fee tidak pernah masuk jurnal | ✅ Fixed (migration 073) | Piutang gross + 3 jurnal idempotent + breakdown fee |
| BUG-039 | **Mapping settlement terbalik** (`settlement_amount` gross dipakai sebagai kas) | ✅ Fixed (migration 073) | Kas = `revenue_amount` (net); settlement = revenue + fee |
| BUG-040 | **Fail-open DELETE order** `?? 'admin'` | ✅ Fixed | Deny kalau profil tak ada / non-admin-owner aktif |
| BUG-041 | **`consume-materials` tanpa role check** | ✅ Fixed | +role check gudang/admin/owner |
| BUG-042 | **Surveys fail-open** + POST tanpa role gate | ✅ Fixed | role `?? null` → deny; POST/GET surveyor/admin/owner |
| BUG-043 | **install-bookings PUT mass-assignment** + `actual_date` tidak tersimpan | ✅ Fixed | Whitelist field; installer tetap hanya status |
| BUG-044 | **po-delivery GET tanpa auth** & **journal GET login-only** | ✅ Fixed | GET + auth/role; journal GET finance/admin/owner |
| BUG-045 | **TikTok webhook non-timing-safe** (`!==` string compare) | ✅ Fixed | `crypto.timingSafeEqual` |
| BUG-046 | **TikTok OAuth callback mati** (getUser null → 401); **rate limit IP spoofable** | ✅ Fixed | Hapus gate callback; `getClientIp()` anti-spoof |
| BUG-047 | **Route POST login-only tanpa role check** (customers/materials/products/suppliers/install-bookings/orders/PR) | ✅ Fixed | POST → admin/owner; PR → gudang/admin/owner |
| BUG-048 | **`/api/upload`** — service client module-scope + semua role upload 100MB | ✅ Fixed | Service client pindah ke handler + scope folder per role |
| BUG-049 | **Jurnal `is_auto` selalu false** — flag dibuang server | ✅ Fixed | `is_auto` diterima body + divalidasi schema |
| BUG-050 | **`piutang.remaining` dua sumber** — di-write 4 tempat tak pernah dibaca | ✅ Fixed | Hapus write → satu sumber derived (`amount−paid−return−fee`) |
| BUG-051 | **setup-accounts**: race bootstrap + bocor kredensial | ✅ Fixed | Rate limit semua path + double-check + kredensial tidak di-echo |
| BUG-052 | **Xendit webhook**: amount tidak divalidasi; jurnal gagal hanya log | ✅ Fixed | Validasi ≤ sisa + idempotency; jurnal gagal → 500 (retry) |
| BUG-053 | **sync-to-main-orders**: error `continue` (order hilang); existing tanpa jurnal tak diperbaiki | ✅ Fixed | Error → BLOCK; `ensurePaymentAndJournal` + repair |
| BUG-054 | **TikTok webhook single-secret** | ✅ Fixed | Per-shop via `shop_cipher` di DB, fallback env |
| BUG-055 | **Accounts `type='income'`** di luar CHECK | ✅ Fixed (migration 074) | `income → revenue` + VALIDATE constraint |
| BUG-056 | **Pipeline macet di produksi** — consume-materials sebelum update status | ✅ Fixed | Pindah consume-materials SETELAH status `done` |
| BUG-057 | **Installer tidak bisa upload foto checklist** (folder evidence 403) | ✅ Fixed | Tambah `installer` ke `FOLDER_ROLES.evidence` |
| BUG-058 | **Jurnal server-path 100% gagal 401** (fetch tanpa cookie) | ✅ Fixed | `createJournalEntry` panggil RPC `create_journal_atomic` langsung (bypass HTTP) |
| BUG-059 | **RLS permissive orders/customers/materials/suppliers/install_bookings** | ✅ Fixed (migration 078) | Role-based RLS 5 tabel + revoke grant anon; diverifikasi user-level |
| BUG-060 | **DP auto-catat tanpa jurnal `payment_received`**; cancel bikin jurnal hantu | ✅ Fixed | Auto-DP + jurnal idempotent; cancel reverse jurnal yang benar-benar ada |
| BUG-061 | **`orders.scheduled_installation_time` TIDAK ada di live** | ✅ Fixed (migration 077) | `ADD COLUMN IF NOT EXISTS` + sync schema |
| BUG-062 | **PO PUT `received`/`paid` bisa dobel** | ✅ Fixed | Guard transisi + idempotent submit + idempotency key jurnal |
| BUG-063 | **Xendit webhook retry balas 200 tanpa repair** | ✅ Fixed | Webhook Xendit DIHAPUS (Xendit tidak dipakai) — bug mati bersama route |
| BUG-064 | **QC mobile tab render daftar RETUR** (copy-paste) | ✅ Fixed | Render item QC pending |
| BUG-065 | **`/admin/shipping` tombol Input Resi utk order `ready`** (API menolak) | ✅ Fixed | Gate tombol hanya `packed` |
| BUG-066 | **Teks korup Mandarin** di modal installer | ✅ Fixed | Perbaiki string |
| BUG-067 | **Stock Opname selisih diformat `formatRp`** ("Rp-3") | ✅ Fixed | Format angka qty, bukan uang |
| BUG-068 | **Form `/admin/seo` menulis meta tapi `layout.tsx` HARDCODED** | ✅ Fixed | `generateMetadata()` async baca `landing_settings`, fallback hardcoded |
| BUG-069 | **TikTok double-booking revenue** (order & settlement 2×) | ✅ Fixed (model akrual) | Order path = revenue; Settlement path = kas+beban. Revenue/kas/fee ×1 |
| BUG-070 | **Order TikTok AWAITING_SHIPMENT tak masuk main orders** | ✅ Fixed | `payment_status` dari field payment TikTok, fallback COMPLETED/DELIVERED→PAID |
| BUG-071 | **Steam rework macet** (steam_job stale tak diganti) | ✅ Fixed | Guard cari `.eq('status','pending')` |
| BUG-072 | **Hutang delete tanpa guard paid** | ✅ Fixed | Tolak hapus paid/cancelled/paid_amount>0/return_amount>0 |
| BUG-073 | **Finance pay race / tanpa rollback** | ✅ Fixed · **sejarah** (superseded BUG-123) | `handlePay`: jurnal gagal → hapus payment row (rollback penuh); `ordErr` → hapus row. **CATATAN**: pola manual ini TIDAK dipakai lagi — jalur sudah pindah ke RPC `add_order_payment_atomic` (transaksi atomic). Jangan menulis ulang rollback manual di client |
| BUG-074 | **Dropdown/select tidak ikut tema dark** | ✅ Fixed | CSS global `select` + `var(--surface)/var(--input-border)` di 8 titik |
| BUG-075 | **Tampilan tanggal mentah YYYY-MM-DD** | ✅ Fixed | Helper `formatDateDDMMYYYY()` di 16 file |
| BUG-078 | **Landing theme preset & konten tidak berubah** | ✅ Fixed | Merge kolom terpisah (utama) + value JSON (fallback) |
| BUG-079 | **Search pesanan kosong** — `.or()` tidak dukung kolom relasi | ✅ Fixed (migration 081) | RPC `search_orders` filter di SQL, return `{rows,total}` |
| BUG-080 | **Task laundry tak bisa diterima** — constraint tanpa `in_progress` | ✅ Fixed (migration 082) | Drop + recreate constraint lengkap |
| BUG-081 | **RLS `landing_settings` terbuka** | ✅ Fixed (migration 083) | Policy write → `is_admin_or_owner_sd()` |
| BUG-082 | **Upload sitemap/robots "failed" padahal sukses** | ✅ Fixed | Kontrak `{ success: true }`; isi disimpan ke DB |
| BUG-083 | **Trust badges tidak tampil di landing** | ✅ Fixed | `ScrollHero` terima prop `trustBadges` dari DB |
| BUG-084 | **Preset tema `modern` berisi CSS-var** bukan hex | ✅ Fixed | Preset → hex nyata |
| BUG-085 | **`/owner/staff` kosong** — `order_logs(count)` ambigu (PGRST201) | ✅ Fixed | `select('*')`; kolom Email dihapus; urutan role lengkap 8 + badge |
| BUG-086 | **GET `orders/[id]` tanpa role gate** (PII pelanggan bocor) | ✅ Fixed (Phase 1) | Role-gate server-side: admin/owner/finance/gudang + active |
| BUG-087 | **GET `install-bookings` & `[id]` tanpa role/ownership** | ✅ Fixed (Phase 1) | Koleksi: admin/owner/finance semua, installer miliknya; `[id]` mirror PUT |
| BUG-088 | **Komentar usang "RLS users terbuka"** | ✅ Fixed (Phase 1) | Verifikasi live → komentar diperbaiki, tanpa migration redundant |
| BUG-089 | **GET bebas materials/suppliers/PR/PO** + tanpa cek active | ✅ Fixed (Phase 1) | Role-gate pengadaan/finance + cek `status='active'` |
| BUG-090 | **Client fail-open `role ?? 'admin'`** (login/layout/survey) | ✅ Fixed (Phase 1) | Fail-closed: role null → signout/redirect |
| BUG-091 | **Rate limit hanya 1/33 route** | ✅ Fixed (Phase 2) | `checkRateLimit` di 9 route sensitif |
| BUG-092 | **`create-staff` lemah** (status, password min 6, enumeration, role laundry absen) | ✅ Fixed (Phase 2) | Cek active; password min 8; error redaksi; role laundry lengkap |
| BUG-093 | **TikTok OAuth `state` = shop id (predictable)** | ✅ Fixed (Phase 2, migration 084) | Nonce random single-use di kolom `oauth_state` |
| BUG-094 | **Asimetri rollback jurnal finansial** (sebagian hanya toast warning) | ✅ Fixed (Phase 3) · **sejarah** (superseded BUG-123) | Seragamkan pola BUG-073 di SEMUA jalur (refund/hutang/piutang/payroll/aset). **CATATAN**: pola manual ini TIDAK dipakai lagi — jalur sudah pindah ke RPC atomic (`process_refund_atomic` dll). Jangan menulis ulang |
| BUG-095 | **Hardcoded UUID akun + double-count saldo** di `accounts/accounts` | ✅ Fixed (Phase 3) | `getAccountIdByCode` (lookup by code) + `fetchAccountBalances` (satu sumber) |
| BUG-096 | **PO paid tanpa jurnal di `owner/suppliers`** | ✅ Fixed (Phase 3) | `updatePOStatus('paid')` → jurnal `hutang_paid` idempotent + rollback |
| BUG-097 | **`markAsPaid` payroll tanpa idempotency_key** | ✅ Fixed (Phase 3) | `laundry_payroll_paid:<id>` + rollback penuh |
| BUG-098 | **`kronologi-hpp` misnamed + `.limit(200)`** | ✅ Fixed (Phase 4) | Rename "Kronologi Omzet" + pagination server-side (range+count, default 50) |
| BUG-099 | **`lte '...-31'` di owner/marketplace** (bulan 30 hari terpotong) | ✅ Fixed (Phase 4) | Akhir bulan dinamis `new Date(year, month, 0)` + batas T00:00/T23:59 |
| BUG-100 | **Rumus sisa piutang berpotensi divergen** | ✅ Fixed (Phase 4) | Helper `piutangSisa()` di `lib/ledger.ts` (satu sumber kebenaran) |
| BUG-101 | **`admin/reports` `.limit(200)` + filter client** | ✅ Fixed (Phase 4) | Filter periode ke server (`gte/lte` current+prev utk MoM) |
| BUG-102 | **`admin/portfolio` (`.limit(50)`) & `admin/laundry` (`.limit(100)`) tanpa pagination** | ✅ Fixed (Phase 5) | Portfolio server-side 12/halaman; Laundry client-side 20/halaman |
| BUG-103 | **`theme_preset` tidak berubah ke `custom` saat edit warna** | ✅ Fixed (Phase 5) | `updateThemeColor()` set preset custom bila tak cocok |
| BUG-104 | **`handleSave` landing tak deteksi "0 rows updated"** | ✅ Fixed (Phase 5) | Cek `count` → 0 = toast error |
| BUG-105 | **Kredensial default hardcoded di `setup/page.tsx`** | ✅ Fixed (Phase 5) | Default dihapus → field kosong |
| BUG-106 | **Karakter Cina korup di installer checklist** | ✅ Fixed (Phase 5) | Ganti string; sisa Cina di SDK = komentar dead code (sudah dihapus) |
| BUG-107 | **Dead code `tiktok-shop-sdk/` (1.971 file, 0 import)** | ✅ Fixed (Phase 6A) | Hapus permanen + deps `request`/`@types/request` |
| BUG-108 | **Nav laporan keuangan duplikat** (finance/owner copy-paste) | ✅ Fixed (Phase 6C) | Shared `ReportsNav.tsx` (prop `basePath`) |
| BUG-109 | **Notifikasi polling 30s (bukan realtime)** | ✅ Fixed (Phase 6D, migration 085) | Realtime `postgres_changes` (INSERT, filter user) |
| BUG-110 | **Monolit `admin/orders/[id]`** — LOG_ACTION & checklist inline | ✅ Fixed (Phase 6B-1) | Pindah ke `lib/order-detail.ts` + unit test (+3, 27 total) |
| BUG-111 | **Monolit order detail — 5 modal besar inline** | ✅ Fixed (Phase 6B-2) | Ekstrak ke `components/orders/`; page 3.561 → 2.923 baris |
| BUG-112 | **Monolit order detail — section render besar inline** | ✅ Fixed (Phase 6B-3) | Ekstrak `OrderPipelineStepper`/`OrderSurveySection`/`OrderSummarySection` |
| BUG-113 | **Monolit order detail — OrderItems + AddItemModal + Checklist** | ✅ Fixed (Phase 6B-3d) | Ekstrak `OrderItemsTable`/`PreparationChecklist`/`AddItemModal`; page → 1.490 baris |
| BUG-114 | **Monolit order detail — seluruh state & handlers inline** | ✅ Fixed (Phase 6B-4) | Semua state+handlers → `useOrderDetail(id)` hook; page **505 baris** (−85%) |
| BUG-115 | **RLS katalog publik terbuka** (products/categories/banners/portfolio_posts/bom); helper bisa dieksekusi anon; users SELECT semua authenticated | ✅ Fixed (migration 087) | Write katalog/bom → `is_admin_or_owner_sd()`; REVOKE anon/PUBLIC helper; users SELECT → `is_staff_active_sd()`. **Verifikasi**: penjahit ditolak 42501, admin sukses |
| BUG-116 | **`laundry_orders.order_id` tidak ada di live** — schema & TS type (`LaundryOrder.order_id`) memakai kolom ini, tapi live hanya punya `item/qty/price/notes` → insert item laundry di order detail (`use-order-detail.ts:610`) **pasti gagal 42703**. Drift lawan arah: kolom legacy live (`assets.purchase_cost`, `order_progress_photos.caption`, `material_price_history.old_cost/new_cost/changed_by`, `laundry_orders.item/qty/price/notes`) tidak ada di schema file; `landing_settings.value` & `material_price_history.created_at` dipakai codebase tapi hilang dari schema | ✅ Fixed (migration 088, 2026-08-13) | (1) `ADD COLUMN order_id UUID REFERENCES orders(id) ON DELETE SET NULL` + index. (2) Sync `000_full_schema.sql` = live (5 tabel: laundry_orders, landing_settings, material_price_history, assets, order_progress_photos). **Verifikasi user-level**: INSERT laundry + order_id sebagai admin → sukses, data uji dibersihkan. tsc + build + vitest 27/27 |
| BUG-117 | **Upload file salah tempat** — commit `f133189` memindahkan `/api/upload` dari file lokal (disk) ke **Supabase Storage bucket `kj-uploads`** (blob `.blob`, kuota free 5GB tidak cukup utk foto progres 2MB × 7 progres × banyak order). Padahal plan benar = upload ke **`link.kjhomedecor.com/upload.php`** (subdomain → `public_html/link/uploads/{folder}/`, satu akun Hostinger, file asli, persistent saat redeploy — 143 gambar produk sudah di sana sejak migrasi 0046bda) | ✅ Fixed (2026-08-13) | `/api/upload` → proxy ke const `CDN_UPLOAD_URL = 'https://link.kjhomedecor.com/upload.php'` (pertahankan semua validasi: auth/role/MIME/magic bytes/size/rate limit); hapus `SUPABASE_SERVICE_ROLE_KEY` & `BUCKET` dari route. Siapkan `scripts/upload.php` (tambah folder `survey` + magic video) utk dicopy ke Hostinger. 189 foto testing di storage TIDAK dimigrasi (keputusan user — data uji) |
| BUG-118 | **Upload pipeline foto gagal 400 setelah pindah CDN** — `browser-image-compression` menghasilkan **Blob** (name `blob`) → route hitung `ext = file.name.split('.').pop()` = `"blob"` → filename `xxx.blob` → CDN `upload.php` tolak ekstensi tak dikenal → `400 Invalid file type`. Produk (tanpa kompresi, nama asli `xxx.jpg`) tetap jalan; pipeline wajib foto (kompresi) gagal | ✅ Fixed (2026-08-13) | Ekstensi file kini dari **deteksi magic bytes** (`detectMime` → jpg/png/webp/pdf/mp4/webm), fallback `file.type`, bukan `file.name`. Terverifikasi: file PNG name `blob` → `xxx.png` → CDN HTTP 200. tsc + build + vitest 27/27 |
| BUG-119 | **Error realtime di mobile saat buka sidebar** — `NotificationBell` di-mount 2× di client singleton (`createBrowserClient` cache): bell fixed `DashboardLayoutClient:36` + bell di mobile drawer `DashboardTopNav:120`. Saat buka drawer, instance ke-2 subscribe channel `notifications-realtime` yang sama → `cannot add postgres_changes callbacks after subscribe()` | ✅ Fixed (2026-08-13) | **Opsi C**: hapus bell dari drawer mobile (drawer tetap ThemeToggle + Logout); bell desktop (satu-satunya) di mobile turun ke `top:64px; right:12px` (media query 768) agar tidak menimpa hamburger. Satu instance → tidak ada bentrok channel. tsc + build + vitest 27/27 |
| BUG-120 | **RPC atomic percaya `p_actor` dari client** — semua RPC baru (payment/cancel/return/stock/PO/survey/journal) validasi role via `WHERE id = p_actor`; user authenticated bisa kirim `p_actor` = uuid admin/owner/finance → lolos role check (spoofing). `advance_install_booking_status` punya pola sama (`p_staff_id`). `create_journal_atomic.p_created_by` juga bisa dipalsukan | ✅ Fixed (2026-08-14) | Helper `actor_is_active_with_role()` (SECURITY DEFINER): `service_role` → role check dari param (jalur server); authenticated → `p_actor` **wajib** `auth.uid()`. Semua RPC di atas + `create_journal_atomic` (created_by = auth.uid()) dipatch. **Verifikasi**: build + E2E 37/37 |
| BUG-121 | **Retry/timeout bisa double-pay & dobel jurnal** — (1) `add_order_payment_atomic` tanpa idempotency key: submit ulang setelah timeout mencatat payment kedua (sisa tagihan masih cukup utk DP parsial); (2) `process_order_return_atomic` tanpa guard: return diproses 2× → stok produk masuk 2×; (3) `cancel_order_atomic` bisa dijalankan ulang (jurnal reversal memang idempotent, tapi log/void diulang); (4) `create_journal_atomic` menerima key NULL → retry bikin jurnal baru + pre-check race (bukan ON CONFLICT) | ✅ Fixed (2026-08-14) | `payments.idempotency_key` (UNIQUE, retry → return idempotent); guard `already-returned` (status), `already-cancelled`, status `cancelled/returned` ditolak utk payment; `payments.voided_at` di cancel; `create_journal_atomic`: key WAJIB + `ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING`. Client: key per sesi modal (`useRef`, reset saat sukses) di order-detail & finance/payments. **Verifikasi**: E2E pipeline kirim/pasang 9-10 tahap pass |
| BUG-122 | **Booking publik terbuka field internal** — policy `"Public can insert install_bookings" FOR INSERT WITH CHECK (true)`: anon bisa insert field internal (`order_id`, `customer_id`, `installer_id`, `status`, `source`) — spoof booking terkait order/installer | ✅ Fixed (2026-08-14) | Policy di-**DROP**; ganti RPC `create_public_booking` (SECURITY DEFINER, GRANT anon) yang hanya menerima field publik (nama/HP/alamat/tanggal/jam/type/notes) dan memaksa `status='pending'`, `source='website'`, installer/order/customer = NULL. `booking/page.tsx` pindah ke RPC. **Verifikasi**: advisories anon-executable hanya tinggal 2 fungsi publik yang memang disengaja |
| BUG-123 | **Jalur operasional masih direct-write client (non-atomic / bakal gagal di RLS baru)** — (1) `finance/payments` bayar & refund multi-step client (jurnal yatim saat gagal di tengah); (2) `gudang/production` auto-steam direct `orders.update` (gudang tak punya izin UPDATE orders); (3) `gudang/qc` resolve retur direct write (RLS returns UPDATE = finance); (4) `admin/shipping` packed direct update (bypass API transition); (5) `surveyor` link survey direct update (RLS orders UPDATE = admin/owner); (6) order detail: schedule/items/link survey non-atomic; (7) owner/hpp BOM non-atomic | ✅ Fixed (2026-08-14) | RPC atomic baru: `process_refund_atomic`, `resolve_return_atomic` (gudang), `schedule_installation_atomic` (booking+orders+cascade packed→scheduled), `add/remove_order_item_atomic`, `save_hpp_bom_atomic`, `link_survey_atomic`. Jalur lain → `PUT /api/orders/[id]` (auto_transition gudang production→steam). Semua klien diarahkan; idempotency key payment per sesi modal; admin/orders rollback payment saat jurnal gagal. **Verifikasi**: E2E 37/37 + tsc + build + vitest 27/27 |
| BUG-124 | **`order_logs` check constraint menolak aksi baru** — RPC atomic memakai aksi `item_added`, `item_removed`, `survey_linked`, `installation_scheduled`; live punya **2 constraint duplikat** (`chk_action` + `order_logs_action_check`) yang tidak mengizinkannya → semua transaksi RPC baru rollback (ketangkap E2E: item order tidak pernah muncul) | ✅ Fixed (2026-08-14) | Drop 2 constraint duplikat; buat 1 constraint `order_logs_action_check` dengan daftar lengkap + 4 aksi baru; sync `000_full_schema.sql`. **Verifikasi**: E2E pipeline kirim/pasang pass (item gorden tampil) |
| BUG-125 | **Constraint `piutang_status_check`/`hutang_status_check` tidak punya `'partial'`** — halaman faktur/hutang/process meng-set status `'partial'` (bayar/retur sebagian) tapi live hanya `('pending','paid','cancelled')` → SEMUA bayar/retur sebagian gagal `23514` dgn pesan menyesatkan; data live bersih karena selalu gagal (hidden bug) | ✅ Fixed (2026-08-15) | Constraint diperluas ke `'partial'` (migration wave2 + sync schema file). **Verifikasi**: INSERT `status='partial'` live sukses; E2E finance (bayar hutang+piutang) pass |
| BUG-126 | **Overload usang `add_order_payment_atomic` bikin PGRST203** — 3 varian live (4-arg, 6-arg, 7-arg); client panggil named-args parsial (tanpa `p_date`) → PostgREST "could not choose the best candidate function" → auto-payment admin/orders gagal (ketangkap E2E: toast "auto-payment gagal") | ✅ Fixed (2026-08-15) | DROP 2 overload lama; final = 7-arg (`p_date`). **Verifikasi**: E2E pipeline kirim/pasang pass (create order + auto-DP) |
| BUG-127 | **PUT `/api/orders/[id]` bebas field non-status (IDOR)** — role operasional (installer/penjahit/surveyor) bisa ubah `courier/tracking_number/notes/installed_at` order mana pun; gudang perlu `packed_at` saat kemas | ✅ Fixed (2026-08-15) | Role lock per field: admin/owner/finance = semua; gudang = `packed_at`; lain = ditolak 403. Status tetap via role matrix. **Verifikasi**: E2E 38/38 (gudang kemas tetap jalan) |
| BUG-128 | **Jalur paralel piutang/hutang & TikTok non-atomic** — faktur/hutang/process: insert/update langsung client + `createSimpleJournal` + rollback manual (2 sumber kebenaran, divergen saat 2 finance bersamaan); `sync-to-main-orders`: insert order+payment+jurnal multi-step dengan swallow error & duplikasi item saat repair; cancel TikTok hanya update status (payment/jurnal tidak di-void) | ✅ Fixed (2026-08-15) | 7 RPC atomic baru (pay/save/retur piutang-hutang + process/cancel TikTok) via `create_journal_atomic` + `actor_is_active_with_role`; client di-refactor; sync route BLOCK on error; item TikTok hanya saat order baru (`v_was_new`); cancel void payment + reversal jurnal. **Verifikasi**: E2E 38/38 + tsc + build + vitest 27/27 |
| BUG-129 | **Pagination tidak tampil di mobile** — 5 halaman finance (hutang, faktur, journal, cash, cash/mutation) menaruh `<Pagination>` di dalam `.data-table.desktop-only`; daftar mobile (`MobileCards`) di-slice `page*pageSize` tanpa kontrol halaman → user HP terkunci di 10 baris pertama; search/filter juga tidak reset page → "halaman kosong" saat hasil filter pendek | ✅ Fixed (2026-08-15) | Pagination dipindah keluar `.desktop-only` (render desktop + mobile); `setPage(0)` di onChange search/filter (4 halaman). **Verifikasi**: tsc + build + vitest 27/27 + E2E 38/38 |
| BUG-130 | **CSV export mojok di Excel Windows & parse pecah saat newline dalam quote** — `exportToCSV`/template tanpa BOM `\uFEFF` → karakter Indonesia (Rp, é) garbled; `parseCSV` split `/\r?\n/` polos → field ber-quote berisi newline dipecah jadi record salah | ✅ Fixed (2026-08-15) | BOM prepend di `downloadCSV`; `parseCSV` pakai `splitCSVRecords` stateful (menghormati quote saat split record) + buang BOM input. **Verifikasi**: tsc + build + E2E 38/38 (ImportModal customers/products/materials/suppliers tetap jalan) |
| BUG-131 | **Font brand & logo tidak termuat (CORS CDN)** — CDN `link.kjhomedecor.com` tanpa `Access-Control-Allow-Origin` → browser blokir `@font-face` & `fetch` cross-origin: header mobile tampil Inter (bukan TTF brand), PDF nama brand helvetica, logo `brand_logo_url` hilang dari laporan (sebelumnya `/kjlogo.png` same-origin jalan) | ✅ Fixed (2026-08-15) | Proxy **`/api/brand-asset`** (`?kind=font|logo`): fetch CDN server-side (tanpa CORS) + ACAO `*` + cache; `BrandFontLoader`/`registerBrandFont`/`loadLogo` pakai proxy; `loadLogo` fallback `/kjlogo.png` bila CDN mati. **Verifikasi**: proxy 200 (png 30KB / ttf 22KB), `document.fonts.load('16px BrandFont')` → `loaded`, E2E 38/38 |

---

## 3. Dead Code — Status Aktual (2026-08-13)

- **Route API DIHAPUS** (migration 086 / sesi 35, keputusan user — tidak ada caller produksi, UI berjalan via Supabase client langsung): `api/customers`, `api/landing-settings`, `api/materials`, `api/products`, `api/suppliers`, `api/purchase-orders` (+`[id]`), `api/purchase-requests` (+`[id]`), `api/install-bookings` (base). **Dipertahankan** (dipakai): `api/orders` base (smoke test), `api/orders/[id]`, `api/install-bookings/[id]`, `api/notifications`, `api/surveys`, `api/journal`, `api/upload`, `api/seo/*`, `api/tiktok/*`, `api/setup-accounts`, `api/admin/create-staff`, `api/gudang/po-delivery`, `api/webhooks/*`.
- **Tabel DI-DROP** (086): `packing_checklists`, `return_requests`, `order_preparation_checklist` (singular). **Dipertahankan**: `low_stock_alerts`, `order_material_consumption` (ditulis RPC produksi aktif `consume_materials_for_production`). `seo_settings` di-drop migration 079.
- **RPC DI-DROP** (086): `decrement_stock_gudang`, `get_material_stock`, `get_product_stock`, `update_cash_account_balance`. **Dipertahankan**: `rls_auto_enable` (dipanggil event trigger `ensure_rls` utk RLS otomatis).
- **Export DIHAPUS**: `clientError` (`src/lib/api-errors.ts`) — nol referensi.
- **Schema drift fix:** `users.email` dihapus dari `000_full_schema.sql` (tidak ada di live).
- **Upload** (BUG-117, sesi 39): `api/upload` kini **proxy ke CDN** `link.kjhomedecor.com/upload.php` (file asli di `public_html/link/uploads/`). **Supabase Storage bucket `kj-uploads` TIDAK dipakai lagi** (sisa blob `.blob` & file uji probe tetap ada di live — tidak dimigrasi, data testing). `scripts/upload.php` = versi terbaru utk dicopy ke Hostinger (tambah folder `survey`).

---

## 4. Audit Modul Finance

> Snapshot audit **2026-08-11** (76 temuan: F-01 s/d F-76). **Semua temuan sudah ditangani** di sesi-sesi berikutnya (lihat tabel BUG & riwayat fase). Dokumen ini diringkas dari `audit-finance.md` asli; detail per baris tidak dipertahankan.

### Ringkasan Eksekutif
76 temuan: **14 🔴 CRITICAL, 21 🟡 HIGH, 27 🟠 MEDIUM, 14 🟢 LOW** (73 dari 3 subagent paralel + 3 temuan settlement marketplace F-74/F-75/F-76). Tiga masalah akar:
1. **RLS semua tabel keuangan = `FOR ALL authenticated`** → siapa pun login bisa baca-tulis buku besar/jurnal/pembayaran (gate UI kosmetik).
2. **Double-entry tidak konsisten antar jalur** — sebagian transaksi bikin jurnal, sebagian tidak; jurnal 2 query terpisah tanpa transaksi atomik.
3. **Laporan keuangan bug fundamental** — filter periode tak refetch, `normal_side` mati, neraca tidak balance, agregasi NUMERIC, 4 sumber kebenaran berbeda.

### 🔴 CRITICAL (14)
| Area | Temuan inti | Status fix |
|---|---|---|
| A. Keamanan & RLS | F-01 RLS semua tabel accounting permissive · F-02 `/api/journal` tanpa role check · F-03 `exec_sql` backdoor · F-04 RPC saldo kas tanpa role | BUG-018/019/032/035/059 + migration 063/067/072/078 |
| B. Gate approval | F-05 gate approval bypassable (self-verification) · F-06 `handleQcApprove` broken · F-07 refund rusak + dead policy returns | BUG-012/027/028 + refund transaksional |
| C. Double-entry | F-08 jurnal order hanya di API · F-09 bayar hutang tanpa jurnal · F-10 piutang putus total · F-11 payroll/aset tanpa jurnal · F-12 jurnal selalu debit Xendit Cash · F-13 alur Xendit duplikat | BUG-022/034/038/058/060 + migration 064/073/077 |
| D. Laporan | F-14 `normal_side` NULL → tanda saldo terbalik | BUG-010 (hitung dari `a.type`) |

### 🟡 HIGH (21)
F-15 revenue tanpa filter · F-16 piutang dashboard overstatement · F-17 aging dari created_at · F-18 transfer race · F-19 jurnal+RPC terpisah → kas bon · F-20 saldo kas bisa di-set manual · F-21 edit faktur bebas · F-22 akun kas tanpa COA · F-23 generatePayroll menimpa paid · F-24 multi-entry payment tanpa jurnal · F-25 dua sumber saldo kas · F-26 umur-hutang overstatement · F-27 umur-piutang overstatement · F-28 mapping selisih kurs net-zero · F-29 PDF `setTextColor(CSS var)` rusak · F-30 tarif upah hardcode · F-31 dua kolom sumber order · F-32 filter periode DEAD · F-33 mutasi-kas baca balance statis · F-34 neraca tanpa laba berjalan · F-35 agregasi NUMERIC (→ **false positive**, BUG-020)

→ **Semua fixed**: BUG-015/016/017/020/022/025/026/027/028/030/034 + migration 064/073.

### 🟠 MEDIUM (26)
F-36 validasi amount · F-37 running balance · F-38 hutang race/cancelled · F-39 catatan pay tak tersimpan · F-40 piutang/payment read-only · F-41 process tampil semua · F-42 Order ID free-text · F-43 float JS · F-44 mobile retur · F-45 mobile saldo · F-46 stat pesanan termasuk cancelled · F-47 GET limit tanpa cap · F-48 handlePay state basi · F-49 N+1 accounts · F-50 mapping-difference UNIQUE error · F-51 aset terpisah dari akuntansi · F-52 refund tab mobile salah · F-53 fetch halaman aktif saja · F-54 jurnal tanpa idempotency · F-55 payroll tanpa verifikasi · F-56 error.message mentah · F-57 jurnal non-atomik · F-58 buku besar tanpa detail · F-59 daftar-jurnal limit 100 · F-60 performa-tag limit 500 · F-61 4 sumber kebenaran

→ **Semua fixed**: BUG-023/025/034/050 + migration 064.

### 🟢 LOW (12)
F-62 jurnal order warn saja · F-63 toast ganda · F-64 tanggal bebas backdate · F-65 jurnal-auto limit 50 · F-66 FK error mentah · F-67 formatRp desimal · F-68 timezone endDate · F-69 days negatif · F-70 handleQcApprove label · F-71 agregasi channel float · F-72 concat (→ **false positive**) · F-73 kronologi-hpp misnamed

→ **Semua fixed**: BUG-075/098 + helper `formatDateDDMMYYYY`/`piutangSisa`.

### 🆕 Temuan Tambahan: Selisih Settlement Marketplace (F-74/75/76)
- **F-74**: `exchange_rate_diff` (mapping 'Selisih kurs' seed) TIDAK dipanggil di mana pun + debit=credit net-zero. → **Repurpose** jadi 'Beban Biaya Lain E-commerce' (keputusan Near), jurnal komisi dibuat (migration 073).
- **F-75**: komisi & biaya marketplace tidak pernah dicatat (`commission_fee: 0` hardcode, `net_amount` tidak kurangi komisi). → Fixed (BUG-017/038/039): breakdown fee dari API TikTok, jurnal 3 langkah.
- **F-76**: settlement TikTok bikin piutang dari NET tanpa jurnal & tanpa relasi ke order gross. → Fixed (BUG-029/069): model akrual — order = revenue, settlement = kas+beban; piutang gross + unique reference.
- **Keputusan Near (2026-08-11)**: `exchange_rate_diff` diganti 'Beban Biaya Lain E-commerce'; halaman "Proses Retur" diimplementasikan (retur TikTok lewat sini); tombol approve #2 (cek lunas) TIDAK perlu dibuat (gate `packed` sudah otomatis di API, input lunas = approve natural); kolom & akun buku besar korporat dipertahankan; "Kronologi HPP" → "Omzet Penjualan per Periode"; mapping tetap 2 halaman; saldo awal perlu jurnal pembuka; rename sidebar (Transfer Internal Kas, Cek Pembayaran).
- **Catatan akses**: role **finance** diberi akses `/owner/marketplace` & `/owner/tiktok` via whitelist proxy (2026-08-12, `src/proxy.ts:81-87`) — tanpa membuka seluruh `/owner`.

### ✅ Yang Sudah Bagus (dipertahankan)
`/api/journal` validasi balance + rollback · `ledger.ts` saldo live dari journal_lines · validasi nominal pembayaran · validasi asal≠tujuan transfer · HMAC + unique index idempotensi · migration 059 revoke anon · optimistic update + rollback · audit log `order_logs` · payment gate di `/api/orders/[id]`.

### Rekomendasi Prioritas (semua sudah dieksekusi)
- **P0 (keamanan)**: drop `exec_sql` ✓ · RLS role-based + journal role check ✓ · hapus `handleQcApprove` ✓ · perbaiki policy returns ✓
- **P1 (kebenaran laporan)**: `normal_side` ✓ · filter periode ✓ · concat ✓ · neraca + laba berjalan ✓
- **P2 (double-entry)**: satu helper pembayaran ✓ · backfill jurnal + unique reference ✓ · Xendit webhook ✓ · hutang/piutang/payroll/aset → jurnal ✓ · cash account di form ✓
- **P3 (housekeeping)**: rename kronologi ✓ · fix PDF ✓ · tarif upah ✓
- **P4 (settlement)**: hapus/replace `exchange_rate_diff` ✓ · fitur 'Beban Komisi/Biaya Marketplace' ✓

---

## 5. Backlog / Belum Selesai (prioritas berikutnya)

| # | Item | Priority | Catatan |
|---|---|---|---|
| 1 | **E2E suite (chromium)** | 🟠 High | ✅ `tests/e2e/` — **38/38 pass** (2026-08-15): login 8 role, security (penjahit redirect + API 403), pipeline kirim 9 tahap, pasang 10 tahap, finance, katalog/BOM, mobile-charts (sesi 50), dsb. Jalankan: `npx playwright test --project=chromium` (butuh dev server / auth setup live) |
| 2 | **Dual modal system** (`Modal` 36× vs `dialog` 3×) | ⏳ Ditunda | Keduanya jalan; konsolidasi = risiko regresi UI (nilai 0). `dialog` utk konfirmasi, `Modal` utk ringan |
| 3 | **Duplikasi kecil** | 🟢 Low | `formatRp` ✅ (42 file → import `lib/utils`). `STATUS_COLORS` ganda: yang di `gudang/production/page.tsx` & `finance/payments/page.tsx` = **dipakai**; yang di `src/lib/order-detail.ts` = **dead code** (jangan dipakai sebagai referensi warna status) |
| 4 | **Unique `invoice_number` piutang non-tiktok** | 🟢 Low | ✅ migration 076 + cek duplikat di faktur page |

---

## 6. Catatan Tambahan (bukan bug, tapi terkait)

> ⚠️ **Diperbarui 2026-08-14 (sesi 42)** — 3 catatan lama di bawah ini **SUDAH TIDAK BERLAKU** dan sengaja dihapus agar tidak menyesatkan agent:
> 1. ~~"Penjahit bypass API langsung update orders.status"~~ → **SALAH**: `penjahit/jobs/page.tsx` kini lewat `PUT /api/orders/[id]` dengan `auto_transition: true` (role check server-side; tanpa ini penjahit gagal karena RLS orders UPDATE = admin/owner).
> 2. ~~"Installer bypass langsung update install_bookings"~~ → **SALAH**: `installer/checklist/page.tsx` kini lewat `PUT /api/install-bookings/[id]` (server-side role/ownership check).
> 3. ~~"Gate foto untuk semua transisi"~~ → **SALAH**: sudah sejak Phase 2/3 hanya stage `PHOTO_REQUIRED_STAGES` (sorted/steam/shipped/scheduled) yang wajib foto; transisi lain tidak wajib.

Catatan yang masih berlaku:

1. **Auto-transition produksi tanpa foto (disengaja)**: `production → steam` oleh **penjahit** (`penjahit/jobs`) dan **gudang** (`gudang/production`) memakai `auto_transition: true` di `PUT /api/orders/[id]` — meng-skip kewajiban foto stage `steam`. Role tetap di-gate (`production->steam` di role matrix); hanya kewajiban foto yang di-skip untuk transisi otomatis ini. Jangan hapus bypass foto ini tanpa persetujuan — alurnya akan macet di produksi (BUG-056 pernah terjadi).
2. **Rollback manual client = sejarah**: operasi finansial yang punya RPC atomic (`create_journal_atomic`, `add_order_payment_atomic`, `pay_piutang_atomic`, `pay_hutang_atomic`, `retur_piutang_atomic`, `save_piutang_atomic`, `save_hutang_atomic`, `process_refund_atomic`, `cancel_order_atomic`, `process_order_return_atomic`, `resolve_return_atomic`, `process_tiktok_order_atomic`, `cancel_tiktok_order_atomic`) TIDAK boleh ditulis ulang sebagai multi-step client + rollback manual (lihat BUG-073/094/123/128 dan `AGENTS.md` blok `single-source-of-truth-rules`).
3. **Constraint `order_logs.action`**: daftar aksi ada di `order_logs_action_check` (live) — aksi baru untuk log order WAJIB ditambahkan ke constraint (dan `000_full_schema.sql`) sebelum dipakai RPC/klien, kalau tidak transaksi rollback (BUG-124).
4. **Brand asset CDN tanpa CORS (BUG-131)**: `link.kjhomedecor.com` tidak mengirim `Access-Control-Allow-Origin` → SEMUA pemakaian font/logo di web & PDF WAJIB lewat proxy **`/api/brand-asset?kind=font|logo`** (server-side fetch). JANGAN `fetch()` langsung ke URL CDN dari browser (pasti diblokir → fallback Inter/helvetica/logo hilang).

---

## 7. Sebelum Commit

```bash
npx tsc --noEmit
npm run build
git add -A
git commit -m "..."
```

_Dokumen konsolidasi: 2026-08-15 (sesi 52) · Menggantikan `bug.md`, `todo.md`, `audit-finance.md`_
