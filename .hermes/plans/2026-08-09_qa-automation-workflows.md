# QA Automation — 12 Workflow KJ Homedecor

Tanggal: 2026-08-09 · Target: `localhost:3002` (server asisten, build `171a619`) · DB: production Supabase `glblgsfenarnztawtpmu`

## Cara baca
- Setiap workflow = **alur bisnis lengkap** + **positif case** (jalur sukses) + **negatif case** (validasi menolak aksi salah).
- Negatif case WAJIB diverifikasi: aksi ditolak, **tidak ada data berubah** (count sama), toast/error muncul dengan pesan asli.
- Data test diberi marker `QA-<WF>-<n>` dan **dibersihkan otomatis** setelah run (via service role API).
- Role login: `owner@kjhomedecor.com` (bisa semua halaman), `surveyor`, `finance`, `gudang`, `installer`, `penjahit` (kredensial di `user.md`).

---

## WF1 — Order Pipeline (role: admin/owner/gudang/finance/installer)
**Alur**: Buat order → Cek Bayar (finance approve) → Sudah Sortir → Produksi → Steam/QC → Siap → Dikemas → Terkirim → Selesai. Klasifikasi: Kirim vs Pasang.

**Positif case:**
1. Buat order lengkap (pelanggan + item + total) → muncul di list dengan nomor order (BUKAN "null")
2. Order offline → status "Cek Bayar" → finance approve bayar → "Sudah Sortir"
3. Gudang lanjutkan: Produksi → Steam/QC → Siap → Dikemas → Terkirim → Selesai (tiap langkah status badge berubah)
4. Order pasang: Dikemas → otomatis muncul di Booking & Pemasangan
5. Detail order menampilkan item, total, status log

**Negatif case:**
1. Simpan order tanpa pelanggan → ditolak, toast error (pesan asli, bukan generic)
2. Kirim/lanjutkan order yang belum lunas → ditolak (payment gate "order hanya bisa lanjut jika paid")
3. Lanjut status dari status yang tidak valid (mis. lompat Baru→Siap) → ditolak
4. Hapus order yang sudah ber-status → tidak tersedia / ditolak

## WF2 — Pembayaran & Verifikasi (role: finance/owner)
**Alur**: Order butuh bayar → finance verifikasi bukti DP/Lunas → status bayar berubah → tracking ter-update.

**Positif case:**
1. Verifikasi DP → payment status "Bayar DP" + stat card "BAYAR DP" naik
2. Verifikasi Lunas → "LUNAS" + total piutang turun
3. Record pembayaran punya `verified_by` (finance yang approve)
4. Order lunas → bisa lanjut ke produksi/kirim

**Negatif case:**
1. Approve tanpa bukti/record pembayaran → ditolak
2. Refund lebih besar dari total yang dibayar → ditolak (toast)
3. Verifikasi ulang record yang sudah verified → tidak dobel

## WF3 — Survey Gorden (role: surveyor/admin/owner)
**Alur**: Surveyor buat survey (klien + ruangan + foto + GPS) → auto-save draft → ttd digital → tersimpan → admin link ke order → hasil masuk invoice.

**Positif case:**
1. Buat survey lengkap (klien + 1 ruangan dengan ukuran) → auto-save draft muncul ("Draft tersimpan")
2. Simpan final + tanda tangan → status "Tersimpan", detail tampil ttd + riwayat aktivitas
3. Admin link survey ke order → order terisi "Hasil Survey" + badge "sudah ada survey"
4. Export PDF survey (ada ttd di footer)
5. Surveyor hanya lihat survey miliknya; admin/owner lihat semua

**Negatif case:**
1. Simpan final tanpa nama klien → ditolak
2. Ruangan tanpa ukuran (lebar/tinggi 0) → peringatan/tolak
3. Surveyor hapus survey orang lain → ditolak (RLS)
4. Link ke order yang sudah punya survey → dicegah/dikonfirmasi

## WF4 — Booking & Pemasangan (role: admin/installer)
**Alur**: Booking (dari publik/order pasang/manual) → admin jadwalkan installer → installer kerjakan → Selesai / Revisi.

**Positif case:**
1. Tambah booking manual lengkap → muncul di list + kalender
2. Jadwalkan installer + tanggal → status "Terjadwal"
3. Installer selesaikan → status "Selesai"
4. Revisi dengan alasan → status "Revisi" + alasan tercatat
5. Order pasang yang dikemas → auto masuk booking

**Negatif case:**
1. Booking tanpa customer → ditolak
2. Jadwalkan tanpa installer → ditolak
3. Revisi tanpa alasan → ditolak
4. Ubah status booking survey (order_id NULL) → TIDAK error 500 "tidak ditemukan" (regresi migration 061)

## WF5 — Produksi (role: gudang/penjahit)
**Alur**: Order produksi → buat job → assign penjahit → penjahit mulai → submit laporan → job selesai.

**Positif case:**
1. Order di status produksi → buat job → muncul di daftar job
2. Assign penjahit → penjahit lihat job di dashboard-nya
3. Penjahit mulai job → status berubah
4. Submit laporan (meter gorden/vitras/roman) → job "Selesai"

**Negatif case:**
1. Assign tanpa penjahit → ditolak
2. Submit laporan tanpa meter/isi → ditolak
3. Penjahit submit laporan job orang lain → ditolak (realtime/RLS)

## WF6 — Steam & QC (role: gudang)
**Alur**: Laundry/steam record → QC periksa → bagus = Siap; rusak = Return + refund.

**Positif case:**
1. Tambah record steam → muncul di list
2. QC "bagus" → order lanjut "Siap"
3. QC "rusak" → return dibuat + refund tercatat

**Negatif case:**
1. Record steam tanpa item → ditolak
2. QC rusak tanpa catatan/refund → ditolak
3. QC item yang sudah di-QC → tidak dobel

## WF7 — Pengiriman (role: gudang/admin)
**Alur**: Packing + foto → input resi → Terkirim.

**Positif case:**
1. Packing dengan foto → status "Dikemas"
2. Input resi → status "Terkirim"
3. Foto wajib di tahap tertentu (sorted/steam/shipped) — upload jalan

**Negatif case:**
1. Kirim tanpa resi → ditolak
2. Lanjut tanpa foto wajib → ditolak (PHOTO_REQUIRED_STAGES)

## WF8 — Material & Stok (role: gudang/admin/owner)
**Alur**: Stok minim → alert → PR → approve → PO → delivery → stok gudang naik → mutasi.

**Positif case:**
1. Material stok < min → muncul di alert
2. Buat PR dari alert → admin approve → jadi PO
3. PO delivery → stok gudang bertambah (verify via posisi stok)
4. Mutasi gudang→toko → kedua kolom berubah benar

**Negatif case:**
1. Buat PO tanpa material → ditolak
2. Delivery qty 0/negatif → ditolak
3. Mutasi melebihi stok → ditolak (stok tidak minus)

## WF9 — HPP & Laporan Keuangan (role: owner/finance)
**Alur**: BOM per produk → kalkulasi HPP → harga jual; laporan (neraca/laba rugi/buku besar/umur hutang-piutang) → export PDF.

**Positif case:**
1. Hitung HPP produk dengan BOM lengkap → angka benar (material × qty × harga)
2. Simpan HPP → price produk ter-update (≠ 0)
3. Buka neraca/laba rugi → angka dari ledger (BUKAN 0 — regresi fix `a605329`)
4. Export PDF laporan → file ter-download

**Negatif case:**
1. Simpan HPP mode manual dengan harga 0 → ditolak (validasi `a605329`)
2. Simpan HPP tanpa BOM (total material 0) → ditolak
3. Laporan periode kosong → tampil 0/empty state (bukan error)

## WF10 — Hutang & Piutang (role: finance/owner)
**Alur**: Hutang supplier (faktur → bayar) · Piutang customer (faktur → bayar/retur) · agregasi per channel.

**Positif case:**
1. Catat hutang baru → muncul di list + total hutang naik
2. Bayar hutang → paid_amount bertambah, sisa berkurang
3. Buat piutang (faktur) → muncul di list + umur piutang
4. Bayar piutang → sisa berkurang; retur → return_amount bertambah

**Negatif case:**
1. Bayar hutang > sisa → ditolak
2. Bayar piutang > sisa → ditolak
3. Faktur tanpa customer → ditolak

## WF11 — TikTok Shop Sync (role: owner, otomatis)
**Alur**: Webhook TikTok → sync order + line items → buat piutang → statistik.

**Positif case:**
1. Simulasi webhook order valid → order masuk list (sumber TikTok) + order_items terisi
2. Statistik marketplace ter-update (count/revenue)
3. Re-sync idempotent (order tidak dobel)

**Negatif case:**
1. Payload tanpa line_items → order tetap dibuat, item fallback custom_specs
2. Webhook signature salah → ditolak 401
3. Order yang sudah ada → skip (tidak duplikat)

## WF12 — Publik (role: anon)
**Alur**: Landing → katalog → detail produk → booking publik → WhatsApp.

**Positif case:**
1. Landing render (hero, kategori, produk pilihan, portfolio, CTA) — 0 error console
2. Katalog publik → semua produk visible
3. Detail produk → tombol CTA benar (Booking → /booking, Pesan → wa.me)
4. Submit booking publik lengkap → sukses + muncul di admin booking

**Negatif case:**
1. Submit booking tanpa nama → ditolak (validasi form)
2. Tanggal sudah penuh (3 slot) → pesan "Penuh"
3. Halaman 404 → tampil 404 yang benar (bukan error)

---

## Struktur automation
- Runner: `scripts/qa-workflow/run.mjs` (Playwright, data-driven, screenshot + PASS/FAIL per step)
- Config per workflow: `scripts/qa-workflow/config/wfXX-*.mjs`
- Jalankan: `node scripts/qa-workflow/run.mjs wf01` (atau `all`)
- Laporan: `scripts/qa-workflow/reports/<timestamp>/` (per case: step PASS/FAIL + screenshot)
- Cleanup: tiap case tulis beri marker `QA-<WF>` → `cleanup` di akhir config (service role delete)
