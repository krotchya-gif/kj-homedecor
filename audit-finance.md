# Audit Modul Finance — KJ Homedecor

> Tanggal: 2026-08-11
> Scope: 36 halaman finance (~11.000 baris) + 15 migration accounting + `lib/ledger.ts` + `api/journal` + `utils/journal/create.ts`
> Metode: 3 subagent paralel (Kas & Bank + Hutang/Piutang; Akuntansi & Pembayaran; Laporan + Schema) + verifikasi manual temuan CRITICAL oleh parent.
> Sumber: `main` @ 99af185 (dengan fix pipeline sebelumnya)

## Ringkasan Eksekutif

**76 temuan: 14 🔴 CRITICAL, 21 🟡 HIGH, 27 🟠 MEDIUM, 14 🟢 LOW**
*(73 temuan dari audit 3 subagent + 3 temuan tambahan selisih settlement marketplace F-74/F-75/F-76 dari sesi tanya-jawab dengan Near)*

Modul finance punya pondasi akuntansi yang bagus (double-entry `journal_entries`/`journal_lines`, validasi balance, RPC kas) tapi **implementasinya setengah nyambung** — 3 masalah akar:

1. **RLS semua tabel keuangan = `FOR ALL authenticated`** → siapa pun yang login (penjahit, installer, gudang) bisa baca-tulis buku besar, jurnal, dan pembayaran. Semua "gate" di UI bersifat **kosmetik** — bisa di-bypass via supabase client.
2. **Double-entry tidak konsisten antar jalur** — sebagian transaksi bikin jurnal (cash income/expense/transfer, payment via finance), sebagian TIDAK (order dari halaman admin, Xendit, hutang, piutang faktur, refund, payroll, aset). Jurnal dibuat 2 query terpisah tanpa transaksi atomik.
3. **Laporan keuangan punya bug fundamental** — filter periode tidak pernah refetch, kolom `normal_side` tidak ada (saldo liability/equity/revenue terbalik tanda), neraca tidak balance, agregasi NUMERIC string tanpa `Number()` (concat!), dan 4 sumber kebenaran berbeda antar laporan.

---

## 🔴 CRITICAL (14)

### A. Keamanan & RLS

| # | File | Deskripsi | Dampak | Fix |
|---|------|-----------|--------|-----|
| F-01 | `migrations/001:458-461, 018:18, 019:11, 020:13, 021:18, 022:20, 023:15, 025:29-30, 026:31-32` | RLS SEMUA tabel accounting (`payments`, `journal_entries`, `journal_lines`, `accounts`, `account_mappings`, `cash_accounts`, `hutang`, `piutang`) = `FOR ALL TO authenticated USING (true)` tanpa cek role aplikasi | Staff non-finance bisa baca buku besar & manipulasi jurnal/pembayaran langsung dari client; laporan bisa dipalsukan tanpa jejak | Policy role-based: SELECT semua authenticated; INSERT/UPDATE/DELETE hanya finance/admin/owner via helper yang baca `users.role` |
| F-02 | `api/journal/route.ts:28-33` | POST `/api/journal` cuma cek login, TANPA role check; body diterima mentah (lines bebas, `is_auto` bisa di-spoof); `error.message` Supabase diteruskan ke client | User non-finance bisa bikin jurnal fiktif yang langsung mengubah neraca/laba-rugi; bocor detail skema DB | Cek role finance/admin; whitelist; `is_auto` ditentukan server; error generik; rate limit |
| F-03 | `migrations/055:396-404` | `exec_sql(query TEXT) SECURITY DEFINER` — eksekusi SQL arbitrer, TIDAK di-revoke dari PUBLIC/anon/authenticated di migration manapun | **Backdoor total**: siapa pun yang tahu nama fungsi bisa baca semua data / drop tabel / bypass RLS | `REVOKE ALL ON FUNCTION public.exec_sql FROM PUBLIC, anon, authenticated` — atau drop (tidak dipakai di src/) |
| F-04 | `migrations/055:381-392` | RPC `update_cash_account_balance` SECURITY DEFINER tanpa cek role, dipanggil langsung dari browser dengan `p_amount` dari input user | User authenticated bisa menaikkan/menurunkan saldo kas sesuka hati tanpa jurnal | REVOKE EXECUTE dari anon/authenticated; GRANT hanya finance/admin; SET search_path |

### B. Gate approval & pembayaran

| # | File | Deskripsi | Dampak | Fix |
|---|------|-----------|--------|-----|
| F-05 | `payments/page.tsx:165-172` + `admin/orders/[id]/page.tsx:372` | Gate approval bisa di-bypass: `payments.insert` memakai `verified_by = currentUser` (self-verification), status order di-update langsung via client (bypass `/api/orders/[id]` yang punya role check + payment gate lunas) | Siapa pun yang login bisa catat pembayaran fiktif, tandai verified, atau set order `packed/shipped/done` tanpa lunas | Semua mutasi lewat API route/RPC dengan cek role; pisahkan peran input vs verifikator (2 pihak) |
| F-06 | `payments/page.tsx:317-352` + `:121` | `handleQcApprove` (GAP-6) MASIH ADA **dan broken**: tab QC difilter `payment_status !== 'paid'` tapi handler menolak order belum lunas → tombol Approve SELALU gagal; duplikat peran Gudang (steam→ready) | Alur steam→ready macet lewat UI ini; segregation of duties rusak; bypass foto bukti & role check API | **Hapus** `handleQcApprove` + tab QC dari payments. Transisi steam→ready sudah otomatis dari Gudang (fix pipeline) |
| F-07 | `payments/page.tsx:354-391` + `migrations/055:242-243` | Alur refund rusak: (a) refund insert `type='refund'` TANPA jurnal reversal & tanpa kurangi dp/lunas; (b) update `returns.refund_status='completed'` DIJAMIN gagal karena policy `FOR UPDATE USING (auth.role() IN ('admin','finance','owner'))` — auth.role() cuma return 'authenticated'/'anon' → **dead policy**; (c) tanpa cek sisa piutang | Kas keluar tidak terjurnal, piutang tidak terhapus, refund tampak sukses padahal return tidak selesai | Jurnal refund (Dr Refund Payable / Cr Kas) + kurangi jumlah terbayar; perbaiki policy returns pakai helper role app; bungkus transaksional |

### C. Double-entry tidak konsisten

| # | File | Deskripsi | Dampak | Fix |
|---|------|-----------|--------|-----|
| F-08 | `admin/orders/page.tsx` (insert langsung) vs `api/orders/route.ts:66-79` | Jurnal `order_created` (Dr Piutang / Cr Penjualan) HANYA dibuat di POST `/api/orders`. Order dari halaman admin & TikTok sync (`api/tiktok/sync-to-main-orders/route.ts:56`) TANPA jurnal | Jurnal `payment_received` (Cr Piutang) mengkredit piutang yang tidak pernah didebit → saldo piutang negatif; revenue marketplace tidak diakui | Satu titik pembuatan order (RPC SECURITY DEFINER) yang selalu bikin jurnal + backfill order existing + unique (reference_type, reference_id) |
| F-09 | `hutang/page.tsx:151-183` | Pembayaran hutang hanya update `paid_amount` + status tabel hutang. TIDAK ada jurnal (Dr Hutang / Cr Kas), tidak ada `update_cash_account_balance`, tidak ada row payments | Uang keluar bayar supplier tidak tercatat di kas/laba-rugi; neraca tidak balance; cash flow salah; hutang tampak lunas tanpa jejak | Catat atomik: jurnal + update saldo kas + riwayat payments dalam satu RPC |
| F-10 | `piutang/faktur/page.tsx:101-148`, `piutang/payment/page.tsx:29-38`, `piutang/process/page.tsx:98-113` | **Alur piutang putus total**: tidak ada satupun kode yang menambah `piutang.paid_amount`; halaman payment hanya menampilkan payments order (bukan faktur piutang); tombol 'Proses Retur' tanpa onClick | Faktur piutang tidak pernah bisa dibayar/diretur → piutang pending selamanya; saldo tidak pernah berkurang | Implementasi lengkap: aksi bayar per faktur (jurnal Dr Kas / Cr Piutang + RPC) + handler retur |
| F-11 | `laundry-payroll/page.tsx:102-112` + `assets/page.tsx` (seluruh) | Payroll `markAsPaid` TANPA jurnal beban gaji; aset TANPA jurnal pembelian & penyusutan (depreciation ada di daftar TRANSACTION_TYPES tapi tidak pernah dipakai); `current_value` input manual tanpa validasi | Gaji keluar tidak masuk laba-rugi; nilai aset tidak pernah masuk neraca; penyusutan tidak diakui | Jurnal Dr Beban Gaji/Cr Kas saat paid; jurnal aset + penyusutan berkala; validasi current_value ≤ purchase_value |
| F-12 | `payments/page.tsx:177-184` + `migrations/049:22-25` | Jurnal `payment_received` SELALU debit 'Xendit Cash' (1104) — mapping statis per transaction_type; form pembayaran tidak punya pilihan akun kas | Pembayaran tunai/BCA/Mandiri dijurnal ke Xendit Cash → saldo buku besar salah total | Tambah pilihan cash account di form; jurnal pakai akun terpilih; mapping jadi fallback |
| F-13 | `api/xendit/create-payment/route.ts:63-69` + `api/xendit/webhook/route.ts:37,50-58` | Alur Xendit: create-payment insert 1 row intent (tanpa verified_by), webhook insert row ke-2 (tanpa verified_by/verified_at, TANPA jurnal), paymentType selalu 'lunas' saat PAID walau DP parsial | `getVerifiedPayment` tidak menemukan payment Xendit → finance input manual ulang → duplikasi row + jurnal ganda; type 'lunas' salah; 2 row per transaksi | Webhook: isi verified_by (system) + bikin jurnal; hapus insert intent; tentukan type dari sisa tagihan |

### D. Laporan keuangan

| # | File | Deskripsi | Dampak | Fix |
|---|------|-----------|--------|-----|
| F-14 | `lib/ledger.ts:51` + `migrations/048:70-95` | `fetchAccountBalances` menghitung saldo dengan `a.normal_side === 'credit' ? -raw : raw`, tapi kolom `normal_side` TIDAK ADA di migration manapun (hanya komentar di 055:410 + DROP NOT NULL di 058:15) → NULL di semua akun | Semua akun dianggap normal-debit: saldo liability/equity/revenue **terbalik tanda** (Modal negatif, Pendapatan negatif) → laba-rugi & neraca-saldo salah fundamental tanpa error | Tambah kolom `normal_side` (migration + backfill per type: asset/expense='debit', liability/equity/revenue='credit') ATAU hitung tanda dari `a.type` |

---

## 🟡 HIGH (21)

| # | File | Deskripsi | Dampak | Fix |
|---|------|-----------|--------|-----|
| F-15 | `finance/page.tsx:79-88` | Revenue bulanan = order `payment_status='paid'` TANPA filter status verifikasi (`payment_ok`) & TANPA exclude `cancelled` | Omzet overstated: order baru (belum di-approve finance) & cancelled tetap dihitung | Hitung hanya `status IN ('payment_ok',...)` AND paid AND != cancelled; atau pakai payments verified |
| F-16 | `finance/page.tsx:101-104` | Total Piutang dashboard = FULL `total_amount` order partial | Piutang overstated sebesar DP; 2 sumber kebenaran piutang paralel (orders vs tabel piutang) | Sisa = total − sudah dibayar; jadikan tabel piutang satu-satunya sumber |
| F-17 | `finance/page.tsx:111-119` | Aging piutang dari `created_at`, bukan `due_date` (kolom due_date ada di tabel piutang 022) | Umur piutang salah → keputusan penagihan menyesatkan | Pakai due_date; fallback created_at |
| F-18 | `cash/transfer/page.tsx:97-107` | Update saldo transfer pakai nilai stale state client (read-modify-write tanpa lock) | Race condition → lost update; saldo tidak sinkron dengan jurnal | Pakai RPC `update_cash_account_balance` ± seperti income/expense atau satu fungsi SQL atomik |
| F-19 | `cash/income/page.tsx:82-105` & `cash/expense/page.tsx:82-104` | Jurnal (POST /api/journal) lalu RPC saldo kas dipanggil TERPISAH dari client; RPC gagal → cuma warning, jurnal tetap ada | Kas bon permanen: jurnal tanpa pergerakan saldo, divergen tanpa rekonsiliasi | Satu transaksi server-side (jurnal + saldo atomik); job rekonsiliasi |
| F-20 | `cash/page.tsx:84-93` | Saldo kas bisa di-set manual (Saldo Awal + edit balance) tanpa jurnal | Kas bisa diciptakan/dihilangkan tanpa transaksi; saldo tidak bisa dipercaya | Hapus balance dari form; saldo awal via jurnal pembuka (Dr Kas / Cr Modal) |
| F-21 | `piutang/faktur/page.tsx:101-138` & `hutang/page.tsx:97-132` | Edit faktur/tagihan bebas ubah amount walau sudah ada pembayaran / lunas / cancelled | Sisa bisa jadi negatif; status salah; angka bisa dimanipulasi | Blokir edit jika paid_amount > 0 / status paid/cancelled; hitung ulang status |
| F-22 | `cash/page.tsx:87-92` + income/expense/transfer/mutation | Akun kas bisa dibuat TANPA `account_id` (COA opsional) padahal `journal_lines.account_id NOT NULL` | Transaksi pada akun tanpa COA gagal FK; Mutasi Kas tidak pernah menampilkan apa pun | Wajibkan account_id (client + DB NOT NULL) |
| F-23 | `laundry-payroll/page.tsx:61-100` | `generatePayroll` menimpa payroll berstatus 'paid'; pakai rate aktif saat ini untuk periode lampau (tanpa versioning) | Gaji yang sudah dibayar bisa diubah ulang; histori periode lampau berubah saat rate berubah | Tolak update jika paid; snapshot rate per periode |
| F-24 | `admin/orders/[id]/page.tsx:898-904` + `admin/orders/page.tsx:317` + `piutang/payment/page.tsx:32` | Multi-entry point pembayaran: finance (jurnal), admin detail & list & piutang (insert payments TANPA jurnal) | Mayoritas pembayaran via admin tidak masuk jurnal → buku besar tidak mencerminkan kas masuk | Satu helper/RPC transaksional `createPaymentWithJournal` untuk SEMUA jalur |
| F-25 | `accounts/accounts/page.tsx:61-71` + `settings/page.tsx:73-87` | Dua sumber kebenaran saldo kas: neraca (journal_lines) vs cash_accounts.balance (RPC); settings menimpa balance tanpa jurnal | Neraca & mutasi kas divergen; saldo awal tidak terjurnal → neraca tidak balance di awal | Saldo awal via jurnal; jadikan journal_lines satu-satunya sumber |
| F-26 | `laporan/umur-hutang/page.tsx:68-76, 91-103` | Query hutang tanpa filter status & tanpa kurangi paid/return | Total hutang overstatement (invoice lunas tetap dihitung) | Filter `.in('status',['pending','partial'])`; sisa = amount − paid − return |
| F-27 | `laporan/umur-piutang/page.tsx:59-68, 84-88` | Umur piutang baca orders `.neq('payment_status','paid')` + total_amount PENUH (tidak kurangi dp/lunas); tabel piutang tidak dipakai | Piutang overstatement sebesar DP; tidak konsisten dengan akun 1201 di neraca | Sisa = total − dp − lunas per order |
| F-28 | `migrations/048:120` | Seed mapping `exchange_rate_diff`: debit = credit = 5301 (Beban Selisih Kurs) | Jurnal selisih kurs net-to-zero; fitur mati secara akuntansi | Set akun berbeda (Dr Kas / Cr Selisih Kurs) |
| F-29 | `finance/reports/page.tsx:127` | `doc.setTextColor('var(--neutral-600)')` — jsPDF tidak menerima CSS variable | Export PDF di halaman Laporan **rusak** (error saat klik) | Ganti nilai konkret `doc.setTextColor(100,100,100)` |
| F-30 | `migrations/055:410, 058:15` + `finance/reports/page.tsx:13,110-116` | Tarif upah penjahit (gorden 500/m, vitras 300/m) di-hardcode frontend | Rekap upah salah kalau tarif berubah; tidak auditable | Simpan di tabel wage_rates dengan effective_date |
| F-31 | `finance/reports/page.tsx:81 (source)` vs `performa-tag/page.tsx:84 (source_tag)` | Dua kolom berbeda untuk sumber order (`source` CHECK vs `source_tag` TEXT bebas) | Breakdown platform di dua laporan tidak pernah cocok | Satukan ke satu kolom |
| F-32 | `laporan/*` (neraca, laba-rugi, buku-besar, neraca-saldo, daftar-jurnal, mutasi-kas, umur-hutang, umur-piutang) — `useEffect([])` | Filter periode TIDAK pernah refetch — 8/10 halaman laporan selalu ALL-TIME walau user pilih 'Bulan Ini' | Laporan periodik menyesatkan; kesalahan fundamental | `useEffect(..., [startDate, endDate])` (pola sudah benar di performa-tag:78-80 & kronologi-hpp:72-74) |
| F-33 | `mutasi-kas/page.tsx:61` | Mutasi Kas baca `cash_accounts.balance` — hanya di-update income/expense manual; alur payment tidak pernah menyentuhnya | Saldo kas di laporan hampir selalu 0/statis, TIDAK sama dengan neraca | Hitung live dari journal_lines (seperti ledger.ts) |
| F-34 | `neraca/page.tsx:78-83` | Neraca tidak memasukkan **laba berjalan** ke ekuitas; tidak ada closing entry | Aset ≠ Liabilitas + Ekuitas saat profit ≠ 0; neraca hampir pasti tidak balance | Tambah baris Laba Berjalan di ekuitas (Σrevenue − Σexpense) |
| F-35 | `mutasi-kas, umur-hutang, umur-piutang, performa-tag, reports` | PostgREST NUMERIC = STRING; halaman menjumlahkan tanpa `Number()` → **string concatenation** ('0'+'250000' = '0250000') | Total hutang/piutang/revenue per tag/omzet SALAH (contoh: 550.000 tampil 250.000.300.000) | Bungkus semua nilai dengan `Number()` atau agregasi SQL |

---

## 🟠 MEDIUM (26)

| # | File | Deskripsi |
|---|------|-----------|
| F-36 | `cash/income:75, cash/expense:75, cash/transfer:71` | Tidak ada validasi amount > 0 — pemasukan/pengeluaran negatif atau 0 lolos (jurnal tetap balance dgn minus) |
| F-37 | `cash/mutation/page.tsx:76-92` | Running balance mulai dari 0, tidak dihubungkan dengan saldo aktual cash_accounts.balance → kolom 'Saldo' menyesatkan |
| F-38 | `hutang/page.tsx:151-183` | Pembayaran hutang read-modify-write tanpa lock; hutang 'cancelled' masih bisa dibayar |
| F-39 | `hutang/page.tsx:592-618` | Field 'Catatan' (payForm.notes) dikumpulkan tapi TIDAK PERNAH disimpan — tidak ada riwayat pembayaran per invoice |
| F-40 | `piutang/payment/page.tsx:29-38` | Read-only, limit 50 tanpa pagination; Search import tidak dipakai; menampilkan payments order bukan faktur piutang |
| F-41 | `piutang/process/page.tsx:25-33` | Menampilkan SEMUA piutang (termasuk paid/cancelled); angka mentah tanpa formatRp |
| F-42 | `piutang/faktur/page.tsx:469-483` | Field 'Order ID (opsional)' free-text tanpa validasi ke tabel orders → insert gagal FK |
| F-43 | Semua file (formatRp) + mutation/channel | Uang NUMERIC di DB dihitung float JS client; maximumFractionDigits:0 menyembunyikan desimal |
| F-44 | `piutang/retur/page.tsx:55-69` | Mobile card menampilkan return_amount dengan label 'Jumlah' (relasi piutang tidak di-select) |
| F-45 | `cash/page.tsx:200-202` | Mobile card saldo mentah tanpa formatRp |
| F-46 | `finance/page.tsx:151-159` | StatCard 'Total Pesanan' termasuk cancelled |
| F-47 | `api/journal/route.ts:109-116` | GET limit tanpa cap atas |
| F-48 | `payments/page.tsx:158-218` | handlePay validasi dari state `selected` yang basi (tidak re-fetch seperti handleApprove) — bisa overpay / status salah |
| F-49 | `accounts/accounts/page.tsx:61-71` | N+1 query (1 query journal_lines per akun) + penjumlahan float JS |
| F-50 | `accounts/mapping/page.tsx:39-57` + `mapping-difference:58-95` | UI mapping dobel konflik: mapping-difference insert 'exchange_rate_diff' UNIQUE → error 23505 (broken); TRANSACTION_TYPES tidak memuat 'exchange_rate_diff' |
| F-51 | `assets/page.tsx` (seluruh) | Modul aset terpisah total dari akuntansi: tanpa jurnal pembelian/penyusutan; current_value input manual tanpa validasi |
| F-52 | `payments/page.tsx:529-553` | Tab Refund mobile me-render `filtered` (daftar ORDER) bukan refundList — copy-paste bug |
| F-53 | `payments/page.tsx:91-119, 420-451` | Fetch hanya halaman aktif (20 baris); search/filter & stat card dihitung dari halaman aktif saja — angka menyesatkan |
| F-54 | `api/journal/route.ts:35,93-96` | Tanpa idempotency key; retry/klik ganda → jurnal ganda |
| F-55 | `laundry-payroll/page.tsx:42-55,64-73` | Payroll dari laundry_orders (assigned_to + kg) tanpa verifikasi kerja aktual; RLS semua-authenticated → kg bisa diedit siapa pun (inflasi gaji) |
| F-56 | `api/journal/route.ts:73,89,95` + `payments:173,218` | `error.message` Supabase dikirim mentah ke client |
| F-57 | `api/journal/route.ts:58-90` | Insert journal_entries + lines 2 query terpisah; 'rollback' manual delete — bukan transaksi atomik DB |
| F-58 | `laporan/buku-besar/page.tsx:47-56, 275-308` | 'Buku Besar' sebenarnya cuma ringkasan saldo per akun — TIDAK ada detail transaksi |
| F-59 | `laporan/daftar-jurnal/page.tsx:32` | Limit 100 entry tanpa pagination — jurnal lama tidak muncul |
| F-60 | `laporan/performa-tag/page.tsx:73` | Limit 500 order; revenue per tag & grand total dihitung dari subset → understated |
| F-61 | `laporan/performa-tag:69-73, kronologi-hpp:63-66, umur-piutang:59-68, neraca:69, mutasi-kas:61` | 4 sumber kebenaran berbeda antar laporan (journal_lines vs orders vs cash_accounts vs hutang) — tidak ada rekonsiliasi |

---

## 🟢 LOW (12)

| # | File | Deskripsi |
|---|------|-----------|
| F-62 | `api/orders/route.ts:76-78` | Jurnal order_created gagal → cuma console.warn; order tanpa jurnal berjalan diam-diam |
| F-63 | `settings/page.tsx:83-86` | Toast sukses DAN error sekaligus saat sebagian update gagal |
| F-64 | `payments/page.tsx:1174-1186` | Tanggal pembayaran bebas backdate/forwarddate tanpa batasan |
| F-65 | `journal/auto/page.tsx:33-34` | Jurnal Otomatis limit 50 tanpa pagination & tanpa view detail lines |
| F-66 | `accounts/accounts:148 + assets:148` | Hapus akun/aset yang direferensikan journal_lines → error FK mentah ke client |
| F-67 | `neraca/page.tsx:14-15` (formatRp) | maximumFractionDigits:0 menyembunyikan selisih kecil |
| F-68 | `performa-tag:71 & kronologi-hpp:65` | Filter `endDate + 'T23:59:59'` — timezone shift UTC vs lokal |
| F-69 | `umur-hutang/page.tsx:92` | days negatif (invoice_date masa depan) masuk bucket '<30' tanpa peringatan |
| F-70 | `payments/page.tsx:317-352` | Label/action handleQcApprove menyesatkan (lihat F-06) |
| F-71 | `piutang/channel/page.tsx:43-45` | Agregasi channel float JS |
| F-72 | `finance/reports/page.tsx:101-106` | Akumulasi meter penjahit string concat (lihat F-35) |
| F-73 | `laporan/kronologi-hpp` (seluruh) | Misnamed: 'Kronologi HPP' isinya daftar order (harga jual) — bukan HPP. Rename ATAU implementasi HPP sungguhan |

---

## 🆕 Temuan Tambahan (sesi 2026-08-11): Selisih Settlement Marketplace

> Konteks: Near menanyakan apakah `exchange_rate_diff` sebenarnya dimaksudkan untuk selisih
> settlement e-commerce (komisi, iklan, biaya lain yang dipotong marketplace sebelum dana
> settlement masuk rekening). Verifikasi manual kode dilakukan — hasilnya: **konsep Near benar,
> tapi fitur di kode bukan itu**, dan yang lebih penting **selisih komisi tidak pernah dicatat**.
>
> ⚠️ **Koreksi konteks (sesi yang sama):** fitur marketplace/TikTok Shop TIDAK hanya di Owner.
> Halaman kelola (sync/settings) memang di `/owner/tiktok` + `/owner/marketplace` (RBAC `/owner`
> = owner only), TAPI data settlement-nya tampil di dashboard Finance: `/finance/piutang/channel`
> (agregasi per channel), `/finance/piutang/faktur` (field `channel`), `/finance/laporan/performa-tag`
> (laba rugi per tag/marketplace), dan halaman owner/tiktok punya link ke `/finance/piutang`
> (owner/tiktok/page.tsx:1051). → Fix F-75/F-76 harus konsisten di KEDUA sisi:
> Owner sebagai sumber data (sync + jurnal komisi), Finance sebagai konsumen (laporan channel).
>
> 📝 **Catatan akses (2026-08-11, belum dieksekusi):** Role **finance juga perlu akses**
> halaman `/owner/marketplace` & `/owner/tiktok` — saat ini RBAC proxy (`src/proxy.ts:52-60`)
> `/owner` = `['owner']` saja → finance di-redirect ke `/finance`. Keputusan: buka akses
> marketplace/TikTok utk finance (bisa via whitelist path khusus di proxy, ATAU tambah 'finance'
> ke ROLE_DASHBOARD_MAP['/owner'] — perlu pertimbangan: kalau buka seluruh /owner, finance juga
> bisa akses /owner/staff, /owner/hpp, /owner/materials, /owner/laporan — mungkin terlalu luas;
> whitelist `/owner/marketplace` + `/owner/tiktok` lebih aman). **EKSEKUSI MENYUSUL** — Near minta
> dicatat dulu, dikerjakan bareng batch fix berikutnya.

## 📝 Keputusan & Klarifikasi Near (2026-08-11, sesi bahasa sederhana)

Berikut keputusan Near soal rekomendasi penyederhanaan — **belum dieksekusi, dicatat dulu**:

1. **`exchange_rate_diff` → DIGANTI, bukan dihapus**: repurpose jadi akun/mapping **'Beban Biaya Lain E-commerce'** (komisi, iklan, fee marketplace) + **sekaligus bikin jurnal komisinya** (alur F-75/F-76: gross → komisi → net). Mapping jadi tempat catat; alur jurnal yang bikin datanya masuk.
2. **Halaman "Proses Retur" Piutang**: fungsinya mengurangi piutang saat barang diretur (customer return). Bukan khusus TikTok — tapi settlement TikTok auto-bikin piutang (`channel='tiktok'`), jadi retur TikTok masuk lewat halaman ini. Saat ini tombolnya mati (tanpa onClick) — perlu diimplementasikan.
3. **Tab QC Approve di Finance**: Near menegaskan alur approve finance seharusnya **muncul 2x** mengikuti pipeline:
   - **Approve #1**: `new → payment_ok` (setelah order dibuat / verifikasi DP-bukti bayar) — SUDAH ADA di `handleApprove`
   - **Approve #2**: cek lunas sebelum kirim (`packed → shipped`, setelah barang dikemas) — **SAAT INI OTOMATIS di API route** (gate payment_status='paid' tanpa tombol) → **Near MAU tombol approve manual #2 di finance** → **FITUR BARU yang perlu dibuat**
   - `handleQcApprove` lama (steam→ready, GAP-6) tetap dihapus — bukan approve #2
   - **⚠️ UPDATE (sesi yang sama, setelah diskusi logika):** Setelah cek kode, **tombol approve #2 TIDAK PERLU dibuat**.
     - Gate lunas sebenarnya cek di **`packed`** (bukan `shipped`) — `api/orders/[id]/route.ts:149-156`: order TIDAK bisa pindah ke `packed/shipped/done` kalau `payment_status != 'paid'` → gudang bahkan nggak bisa klik "Dikemas" kalau belum lunas.
     - Input "lunas" di tab Pembayaran (`payments/page.tsx:205-217`) SUDAH update `payment_status='paid'` → gate otomatis terbuka. **Input lunas = approve #2 secara natural**.
     - Jadi yang dikerjakan: (a) pastikan SEMUA jalur ke packed/shipped/done lewat API route (banyak update langsung dari client bisa bypass gate — GAP-5), (b) UI jelas: finance lihat order `ready` belum lunas → input lunas di tab Pembayaran.
4. **Kolom & Akun buku besar korporat** → **DIPERTAHANKAN** (permintaan customer) — jangan dihapus/arsipkan.
5. **Laporan**: "Kronologi HPP" → **ganti makna**: subtitle dari "Harga Pokok Penjualan" jadi **"Omzet Penjualan per Periode"** (ngikutin pola laporan yang sudah ada; TIDAK perlu implementasi HPP sungguhan).
6. **Dashboard Finance satu sumber** → ini prioritas fix bug (filter tanggal, normal_side, concat, neraca balance, dll).
7. **Mapping Akun TETAP 2 halaman** (mapping + mapping-difference): customer sengaja minta terpisah — halaman "Mapping Selisih" khusus untuk **biaya-biaya lain e-commerce**. Jangan digabung; cukup perbaiki bug-nya (insert kedua error UNIQUE 23505).
8. **Pengaturan Saldo** (`/finance/settings`, tab "Saldo Awal Kas/Bank"): memang untuk **input saldo awal** saat pertama kali pakai sistem (deskripsi di kode: "Gunakan fitur ini saat pertama kali menggunakan sistem keuangan"). Perlu dilengkapi **jurnal pembuka** (Dr Kas / Cr Modal) biar neraca balance di awal — saat ini cuma update balance manual tanpa jurnal.
9. **Rename sidebar Finance**:
   - "Transfer Kas" → **"Transfer Internal Kas"**
   - "Pembayaran" → **"Cek Pembayaran"**

| # | File | Deskripsi | Dampak | Fix |
|---|------|-----------|--------|-----|
| F-74 | `migrations/048:118-121` + seluruh `src/` | `exchange_rate_diff` (mapping 'Selisih kurs — bisa debit atau credit (placeholder)') **TIDAK dipanggil di mana pun** di src — hanya baris seed + UI CRUD mapping-difference. Debit=credit ke akun 5301 (Beban Selisih Kurs) → net-zero jika dipakai | Fitur mati; menambah kebingungan (nama 'selisih kurs' vs kebutuhan nyata 'selisih settlement marketplace'); mapping rusak secara akuntansi | **Hapus** row mapping + akun 5301 + halaman mapping-difference, ATAU repurpose jadi 'Selisih Settlement Marketplace' yang benar |
| F-75 | `api/tiktok/sync-orders/route.ts:102-104` | Komisi & biaya marketplace **tidak pernah dicatat**: `commission_fee: 0` (hardcode), `platform_fee` diambil dari `platform_discount` (diskon, bukan biaya), `net_amount = totalAmount - shippingFee` (tidak dikurangi komisi/iklan) | Selisih gross vs net settlement **menguap** dari pembukuan — laba-rugi mencatat penjualan penuh tapi kas masuk net; tidak bisa analisa biaya platform per channel | Catat breakdown: `commission_fee` dari API TikTok, `platform_fee` = komisi+iklan+biaya lain, `net_amount = gross - semua potongan` |
| F-76 | `api/tiktok/sync-finance/route.ts:113-143` + `api/tiktok/create-piutang/route.ts:62` + `api/tiktok/webhook/route.ts:50-79` | Alur settlement TikTok membuat piutang dari `settlement_amount` (NET) **tanpa jurnal** (Dr Piutang / Cr Penjualan, Dr Beban Komisi / Cr Piutang, Dr Kas / Cr Piutang) dan tanpa relasi ke order gross | Revenue order (gross) tidak diakui di jurnal; settlement net masuk piutang tanpa jurnal → neraca/laba-rugi tidak mencerminkan penjualan marketplace | Auto-jurnal settlement 3 langkah (lihat contoh di bawah) + unique reference per statement |

### Alur jurnal yang benar untuk settlement marketplace (contoh)

```
1. Order dibuat (gross)          → Dr Piutang 100.000 / Cr Penjualan 100.000
2. Komisi + biaya marketplace    → Dr Beban Komisi 5.000 / Cr Piutang 5.000
3. Settlement masuk rekening     → Dr Kas 95.000 / Cr Piutang 95.000
```

### Rekomendasi

- **Hapus** `exchange_rate_diff` (F-74) — bukan kebutuhan toko (Rupiah, supplier lokal)
- **Buat** fitur 'Beban Komisi/Biaya Marketplace' yang benar (F-75, F-76) — ini kebutuhan NYATA untuk
  toko yang jualan di TikTok/Shopee: catat komisi per platform, biar laba-rugi jujur
  (jualan 100jt → komisi 5jt → iklan 3jt → settlement 92jt) dan bisa analisa margin per channel

---

## ✅ Yang Sudah Bagus (dipertahankan)

- `/api/journal` memvalidasi balance debit=credit + rollback entry jika lines gagal
- `ledger.ts` menghitung saldo live dari `journal_lines` (bukan kolom balance statis)
- Validasi nominal pembayaran (≤ sisa tagihan) di payments
- Validasi asal ≠ tujuan di transfer
- HMAC Xendit + unique index idempotensi
- RPC `update_cash_account_balance` SECURITY DEFINER (perlu diperketat role, tapi konsep benar)
- Migration 059 revoke privilege anon
- Optimistic update dengan rollback state pada error
- Audit log `order_logs` di hampir semua aksi
- Payment gate di `/api/orders/[id]` (packed/shipped/done wajib paid) — tapi bypassable via client (F-05)

---

## Rekomendasi Prioritas

### P0 (keamanan — lakukan segera)
1. **Drop/revoke `exec_sql`** (F-03) — backdoor total
2. **Perketat RLS semua tabel finance** role-based (F-01) + `api/journal` role check (F-02)
3. **Hapus `handleQcApprove` + tab QC** dari payments (F-06) — sudah digantikan auto-advance gudang
4. **Perbaiki RLS returns** dead policy (F-07) — refund selama ini selalu gagal

### P1 (kebenaran laporan)
5. **Fix `normal_side`** (F-14) — tambah kolom + backfill, atau hitung dari `a.type`
6. **Fix filter periode** `useEffect([startDate, endDate])` di 8 laporan (F-32)
7. **Fix Number() concat** di agregasi (F-35)
8. **Neraca + laba berjalan** (F-34)

### P2 (double-entry konsisten)
9. Satu helper `createPaymentWithJournal` untuk semua jalur (F-24)
10. Backfill jurnal order existing + unique reference (F-08)
11. Xendit webhook: verified_by + jurnal (F-13)
12. Hutang/piutang/payroll/aset → jurnal (F-09, F-10, F-11)
13. Cash account di form pembayaran (F-12)

### P3 (housekeeping)
14. Rename kronologi-hpp (F-73), fix Export PDF (F-29), tarif upah ke DB (F-30), dll.

### P4 (settlement marketplace — kebutuhan e-commerce)
15. **Hapus `exchange_rate_diff`** (F-74) — mati & salah secara akuntansi
16. **Buat fitur 'Beban Komisi/Biaya Marketplace'** (F-75, F-76) — catat komisi/iklan/biaya
    per platform: `commission_fee` dari API, jurnal settlement 3 langkah (gross → komisi → net),
    biar laba-rugi jujur & bisa analisa margin per channel (TikTok/Shopee/Tokopedia)
