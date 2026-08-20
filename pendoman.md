# 📖 Manual Book — KJ Homedecor

> Panduan penggunaan **lengkap** untuk semua orang yang memakai aplikasi.
> Ditulis dengan **bahasa sederhana** — siapa mengerjakan apa, di halaman mana, dan bagaimana.
> Terakhir diperbarui: **2026-08-19** · Riwayat perbaikan & bug: `docs/riwayat.md` · Alur teknis: `docs/flows/`

---

## Daftar Isi

1. [Pengenalan & Aturan Dasar](#1-pengenalan--aturan-dasar)
2. [Peran & Halaman Masing-masing](#2-peran--halaman-masing-masing)
3. [Alur Pesanan dari Awal sampai Selesai](#3-alur-pesanan-dari-awal-sampai-selesai)
4. [Panduan per Peran](#4-panduan-per-peran)
5. [Membuat Produk & Menentukan Harga](#5-membuat-produk--menentukan-harga)
6. [Menerima & Menyetujui Pembayaran](#6-menerima--menyetujui-pembayaran)
7. [Pembelian & Stok Bahan](#7-pembelian--stok-bahan)
8. [Dokumen Pesanan (Invoice, Faktur, Surat Jalan)](#8-dokumen-pesanan-invoice-faktur-surat-jalan)
9. [Laporan Keuangan](#9-laporan-keuangan)
10. [Website (Landing & SEO)](#10-website-landing--seo)
11. [Marketplace TikTok](#11-marketplace-tiktok)
12. [Reset Data (Mulai dari Nol)](#12-reset-data-mulai-dari-nol)
13. [Tanya-Jawab (FAQ)](#13-tanya-jawab-faq)

---

## 1. Pengenalan & Aturan Dasar

Aplikasi ini dipakai untuk mengurus toko gorden dari **pesanan masuk → dijahit → dikirim/dipasang → selesai**, termasuk urusan **uang, bahan baku, gaji, dan website**.

### 3 aturan wajib diingat

1. **Harus login dulu** — belum login = diarahkan ke halaman masuk.
2. **Setiap orang hanya membuka halamannya sendiri** — penjahit tidak bisa membuka halaman gudang, dst.
3. **Setiap perubahan pesanan tercatat otomatis** — siapa, kapan, menjadi apa. Transparan.

**Owner** boleh mengerjakan semua hal (darurat), tapi sebaiknya tiap orang mengerjakan tugasnya sendiri agar rapi.

---

## 2. Peran & Halaman Masing-masing

| Peran | Halaman | Tugas pokok |
|---|---|---|
| **Owner** | `/owner` | Melihat semua, tentukan harga jual, laporan, reset data |
| **Admin** | `/admin` | Buat pesanan, katalog, jadwal pasang, staff, website |
| **Finance** | `/finance` | Terima bayar, approve cek bayar, urus uang & laporan |
| **Gudang** | `/gudang` | Sortir, produksi, QC, kemas, stok |
| **Penjahit** | `/penjahit` | Mengerjakan jahitan |
| **Installer** | `/installer` | Mengantar & memasang gorden |
| **Surveyor** | `/surveyor` | Mengukur ruangan pelanggan |
| **Laundry** | `/laundry` | Mengerjakan tugas laundry |

> 💡 Gudang tidak bisa membuka `/admin` — tidak masalah, semua alat kerja gudang ada di halamannya sendiri.

---

## 3. Alur Pesanan dari Awal sampai Selesai

### Pesanan "Kirim" (dikirim) — 9 tahap
```
Baru → Cek Bayar → Sudah Disortir → Produksi → Steam/QC → Siap → Dikemas → Terkirim → Selesai
```

### Pesanan "Pasang" (dipasang di rumah) — 10 tahap
```
Baru → Cek Bayar → Sudah Disortir → Produksi → Steam/QC → Siap → Dikemas → Terjadwal Pasang → Sedang Dipasang → Selesai
```

### Siapa mengerjakan tiap tahap?

| Tahap | Pengerja | Halaman | Syarat |
|---|---|---|---|
| Baru → **Cek Bayar** | Finance | `/finance/payments` | Sudah ada pembayaran masuk + **foto bukti** |
| Cek Bayar → **Sudah Disortir** | Gudang | halaman gudang | **Wajib foto** barang |
| Sudah Disortir → **Produksi** | Gudang | halaman gudang | Otomatis dibuat kerjaan penjahit |
| Produksi → **Steam/QC** | Otomatis | — | Saat penjahit lapor selesai |
| Steam/QC → **Siap** | Gudang | `/gudang/steam` | Klik **"Pass"** + foto → otomatis Siap ✅ |
| Steam/QC → Produksi (revisi) | Gudang | `/gudang/steam` | Klik **"Gagal"** + foto + alasan → kembali ke penjahit |
| Siap → **Dikemas** | Gudang | `/gudang/qc` | Semua item lolos QC → tombol **"Kemas"** |
| Dikemas → **Terkirim** | Installer/Admin | `/installer/schedule` / `/admin/shipping` | Kurir + **wajib foto resi** |
| Dikemas → **Terjadwal Pasang** | Admin | detail pesanan | Pilih tanggal + installer (khusus Pasang) |
| Terjadwal → **Sedang Dipasang** | Installer | `/installer/schedule` | — |
| Sedang Dipasang → **Selesai** | Installer | `/installer/checklist` | Checklist + foto → otomatis Selesai |
| Terkirim → **Selesai** | Admin | detail pesanan | — |

### Aturan penting

- **Belum lunas = tidak bisa dikemas/dikirim/selesai.** Pesanan wajib lunas penuh sebelum barang keluar.
- **Foto wajib** di tahap: Sudah Disortir, Steam/QC, Terkirim (foto + resi). **Foto bukti pembayaran** (DP/lunas) juga wajib — di form buat pesanan (jika DP), form pembayaran finance, dan order detail.
- Semua transisi tercatat di riwayat pesanan (audit trail).

---

## 4. Panduan per Peran

### 4.1 Owner

Halaman `/owner` — melihat & mengatur bisnis.

| Menu | Kegunaan |
|---|---|
| **Dashboard** | Ringkasan: pesanan hari ini, pemasangan berjalan, omzet 12 bulan, produk terlaris |
| **HPP** | ⭐ Menentukan **harga jual** produk (lihat bagian 5) |
| **Material** | Mengisi bahan baku + harga beli |
| **Supplier** | Daftar pemasok + Purchase Order (PO) + riwayat harga |
| **Marketplace** | Performa penjualan per platform (Shopee/Tokopedia/TikTok/offline) |
| **TikTok Shop** | Menghubungkan toko TikTok, sync order & settlement |
| **Staff** | Melihat daftar karyawan (kelola akun di Admin → Staff) |
| **Laporan Keuangan** | 10 laporan (laba rugi, neraca, buku besar, dst) + PDF |

**Tugas utama:** hitung HPP & tentukan harga jual, baca laporan, bantu pekerjaan yang kosong.

---

### 4.2 Admin

Halaman `/admin` — pusat kegiatan toko.

| Menu | Kegunaan |
|---|---|
| **Pesanan** | ⭐ Buat pesanan baru (Kirim/Pasang), cari, filter status |
| **Detail Pesanan** | Alur (anak tangga), upload foto, cetak dokumen, jadwal pasang, batalkan, return, catat pembayaran |
| **Booking** | Kalender jadwal pasang + pilih installer |
| **Katalog** | Produk, kategori (bisa upload gambar — tampil di kartu kategori landing), banner |
| **Pelanggan** | Database pelanggan + WhatsApp |
| **Shipping** | Input resi + foto untuk pesanan kirim |
| **Laundry** | Buat tugas laundry + atur tarif/kg |
| **Staff** | Buat/ubah/nonaktifkan akun karyawan |
| **Landing Settings** | Atur tampilan website (hero: isi video → video tampil / image fallback, tema: pilih preset warna atau custom, WhatsApp, trust badges) |
| **Portfolio / SEO / Reports** | Konten website, SEO (meta, sitemap, robots), laporan penjualan |
| **Surveys** | Melihat semua survey dari surveyor |
| **TikTok Shop** | Sync order TikTok → link ke pesanan utama |

**Tugas utama Admin:**
- Membuat pesanan (pelanggan, produk, total, DP, Kirim/Pasang)
- Mengurus katalog — **jangan isi harga jual** (tugas Owner)
- Menjadwalkan pemasangan (tanggal + installer)
- Input resi untuk pesanan kirim
- Mengelola staff & website

---

### 4.3 Finance

Halaman `/finance` — semua urusan uang.

| Menu | Kegunaan |
|---|---|
| **Payments** | ⭐ Terima pembayaran (DP/lunas), **Approve Cek Bayar**, refund |
| **Cash** | Pemasukan, pengeluaran, transfer antar rekening, mutasi |
| **Hutang** | Utang ke supplier + pembayarannya |
| **Piutang** | Uang belum dibayar (per channel: TikTok/Shopee/offline) |
| **Akun & Jurnal** | Chart of Accounts, pemetaan akun, jurnal |
| **Aset** | Daftar aset toko |
| **Laundry Payroll** | Gaji karyawan laundry |
| **Rekonsiliasi** | Cek kesesuaian catatan keuangan |
| **Stock Opname** | Menyetujui hasil hitung stok fisik dari Gudang |
| **Marketplace/TikTok/Shopee** | Settlement marketplace → catat ke pembukuan: `/finance/tiktok`, `/finance/shopee` (filter Start/End tanggal), overview `/owner/marketplace` |
| **Laporan (10)** | Laporan keuangan + PDF |

**Tugas utama Finance:**
- **Approve Cek Bayar** = "saya sudah pastikan uangnya masuk". Hanya Finance yang bisa.
- Menerima DP/pelunasan (nominal tidak boleh melebihi sisa tagihan).
- Pesanan **belum lunas tidak bisa dikemas/dikirim** — Finance harus terima pelunasan dulu.

> Detail alur cek bayar: bagian 6.

---

### 4.4 Gudang

Halaman `/gudang` — produksi & penyimpanan.

| Menu | Kegunaan |
|---|---|
| **Produksi** | ⭐ Daftar kerjaan jahit: tunjuk penjahit, mulai, selesaikan (bahan otomatis terpakai) |
| **Steam & QC Jahitan** | Cek hasil jahitan: **Pass** → otomatis Siap; **Gagal** → kembali ke penjahit |
| **QC Per-Item & Retur** | Cek barang satu per satu → blok "Siap Dikemas" → tombol **Kemas**; verifikasi retur |
| **Posisi Stok** | Stok bahan/produk, tambah/kurang (dengan alasan), mutasi, barang masuk |
| **Alerts** | Stok menipis → 1-klik buat Purchase Request |
| **Lembur** | Catat lembur |
| **Stock Opname** | Hitung stok fisik vs sistem → kirim ke Finance untuk disetujui |
| **Reports** | Riwayat mutasi stok |

**Alur kerja gudang (urut):**
1. **Sortir** pesanan + foto barang
2. **Mulai produksi** → kerjaan penjahit otomatis dibuat
3. **Tunjuk penjahit**
4. Setelah penjahit selesai → **Steam/QC**: Pass (→ Siap) atau Gagal (→ revisi)
5. **QC per-item** → semua lolos → **Kemas**
6. Kelola stok & buat permintaan beli saat bahan menipis

---

### 4.5 Penjahit

Halaman `/penjahit`.

| Menu | Kegunaan |
|---|---|
| **Jobs** | ⭐ Daftar jahitan saya: **Mulai** → kerjakan → **Selesai** + isi meter |
| **Reports** | Rekap bulan ini |
| **History** | Riwayat jahitan selesai |

**Aturan:** hanya melihat jahitan yang ditugaskan; begitu klik Selesai → pesanan otomatis ke Steam/QC; kalau ditolak (Gagal QC), ada alasan → kerjakan ulang.

---

### 4.6 Installer

Halaman `/installer`.

| Menu | Kegunaan |
|---|---|
| **Schedule** | ⭐ Jadwal saya: mulai pasang, selesai, laporkan masalah |
| **Checklist** | Daftar cek pemasangan + foto hasil |
| **Reports** | Rekap pemasangan |

**Tugas:**
- Kirim: `Dikemas → Terkirim` — isi resi + foto
- Pasang: `Terjadwal → Sedang Dipasang → Selesai` — pasang di rumah + foto
- Ada masalah di lokasi? **Laporkan Masalah** → pesanan kembali diperbaiki

---

### 4.7 Surveyor

Halaman `/surveyor`.

| Menu | Kegunaan |
|---|---|
| **Survey Baru** | ⭐ Catat pengukuran: pelanggan, foto ruangan, ukuran cm, model gorden, kain, catatan, tanda tangan |
| **Riwayat Survey** | Lihat/edit survey saya, salin ke WhatsApp, unduh PDF |

**Aturan:** hanya melihat survey sendiri; setelah disimpan → notifikasi ke Admin/Owner (lonceng pojok kanan); hasil survey dipakai Admin saat membuat pesanan.

---

### 4.8 Laundry

Halaman `/laundry` — karyawan laundry.

| Menu | Kegunaan |
|---|---|
| **Tugas Laundry** | ⭐ Terima tugas → kerjakan → **Lapor Selesai** + berat aktual (kg) |

**Aturan:**
- Hanya melihat tugas yang ditugaskan kepada saya (Admin yang menunjuk)
- **Berat yang dilaporkan = dasar gaji** — isi jujur sesuai timbangan
- Gaji dihitung otomatis di **Finance → Laundry Payroll** (berat × tarif/kg)

**Soal payroll:**
- "Generate Payroll" = hitung upah per karyawan (berat aktual × tarif)
- Payroll yang **sudah Lunas bersifat final** — tidak bisa digenerate ulang bulan itu
- Tugas selesai **setelah payroll dibayar** → masuk **bulan berikutnya** (tidak hilang)

> Admin juga bisa melihat & membuat tugas laundry di **Admin → Laundry**.

---

## 5. Membuat Produk & Menentukan Harga

> Alur ini pernah membingungkan. Sekarang jelas:

```
LANGKAH 1 — Owner isi BAHAN BAKU (material)
  /owner/materials → "+ Material" → nama, satuan (meter), HARGA BELI, stok

LANGKAH 2 — Admin buat NAMA PRODUK (tanpa harga!)
  /admin/catalog/products → "+ Produk" → nama, kategori, gambar
  → kolom "Harga Jual" DIKOSONGKAN
  → muncul badge oranye "HPP belum dihitung"

LANGKAH 3 — Owner hitung HARGA JUAL (HPP)
  /owner/hpp → pilih produk → tambahkan bahan + jumlah
  → sistem hitung: harga pokok = (bahan × jumlah) + biaya
                   harga jual = harga pokok + untung
  → Simpan → badge hijau "HPP: Rp ..."

LANGKAH 4 — OTOMATIS MUNCUL DI WEBSITE
  Produk berharga langsung tampil di katalog
```

| Pekerjaan | Pengerja | Halaman |
|---|---|---|
| Isi bahan + harga beli | Owner | `/owner/materials` |
| Buat nama produk (tanpa harga) | Admin | `/admin/catalog/products` |
| Hitung HPP & harga jual | Owner | `/owner/hpp` |
| Kategori & banner | Admin | `/admin/catalog/*` |

> ⚠️ Produk tanpa harga (0) **tidak muncul** di katalog website — bukan error, berarti Owner belum tentukan harganya.

---

## 6. Menerima & Menyetujui Pembayaran

### Status pembayaran

| Status | Artinya |
|---|---|
| `pending` | Belum ada pembayaran |
| `partial` | Sudah DP (sebagian) |
| `paid` | Sudah lunas |

### Alur

```
1. Admin buat pesanan → boleh isi DP (otomatis tercatat utk pembukuan)
   - WAJIB upload foto bukti pembayaran (DP & pelunasan) — tanpa foto tidak bisa simpan
   - Catatan: tercatat BUKAN berarti disetujui.
2. Finance /finance/payments:
   - pastikan ada pembayaran masuk + foto bukti (klik foto untuk perbesar)
   - klik "Approve" = uang sudah masuk & foto bukti sesuai
   - pesanan maju: Baru → Cek Bayar
3. Aturan:
   - Tercatat otomatis ≠ disetujui. Pesanan TIDAK maju tanpa klik Finance.
   - Pesanan tanpa DP = TIDAK BISA maju sampai Finance terima DP/lunas + approve.
   - Pesanan belum lunas TIDAK BISA dikemas/dikirim/selesai.
   - Setiap catat pembayaran (DP/lunas) WAJIB foto bukti — di form pembayaran finance maupun order detail.
```

### Contoh

| Situasi | Terjadi |
|---|---|
| Admin buat + DP lunas | Tercatat otomatis. Finance Approve → Cek Bayar |
| Admin buat + DP sebagian | Tercatat DP. Finance Approve → Cek Bayar. Pelunasan wajib sebelum dikemas |
| Tanpa DP | Tidak maju — Finance terima DP/lunas dulu, baru Approve |
| Siap tapi belum lunas | Finance terima pelunasan → baru bisa dikemas |

---

## 7. Pembelian & Stok Bahan

### Alur beli (ketika stok menipis)

```
1. Gudang melihat peringatan di /gudang/alerts → klik "Buat Permintaan"
   → tercipta Purchase Request (PR)
2. Admin dashboard → setujui PR (approve/reject)
3. Owner/supplier → buat Purchase Order (PO): pilih supplier + barang + harga
4. PO dikirim → status "Dikirim" → barang datang → "Diterima" (stok otomatis masuk)
5. Bayar PO → "Dibayar" (jurnal hutang otomatis tercatat)
```

### Stok & mutasi

- **Posisi stok** `/gudang/stock`: tambah/kurang stok (dengan alasan), lihat mutasi, barang masuk.
- **Stock Opname** `/gudang/stock-opname`: buat sesi, hitung fisik, selisih otomatis → **Kirim** → Finance **Approve** di `/finance/stock-opname` → stok disesuaikan.

> Semua perubahan stok tercatat di riwayat mutasi.

---

## 8. Dokumen Pesanan (Invoice, Faktur, Surat Jalan)

Di **detail pesanan** (Admin) ada tombol PDF:

| Tombol | Isi | Dipakai |
|---|---|---|
| **Invoice** | Tagihan (DP & sisa bayar) | Minta bayar |
| **Packing List** | Daftar barang dikemas | Saat packing |
| **Faktur** | Faktur resmi + tanda tangan | Pelanggan butuh dokumen resmi |
| **Surat Jalan** | Barang + alamat + tanda tangan diterima | Ikut barang |

> Nomor dokumen pakai nomor pesanan: `KJ-FAKTUR-ORD-2026-0001`, dst.

---

## 9. Laporan Keuangan

**Finance** & **Owner** punya 10 laporan yang sama (beda label saja):

| Laporan | Isi |
|---|---|
| Neraca | Posisi keuangan (aset, utang, modal) |
| Laba Rugi | Profit & loss |
| Buku Besar | Per akun |
| Daftar Jurnal | Semua jurnal |
| Mutasi Kas | Perubahan saldo kas/bank |
| Kronologi Omzet | Penjualan per periode |
| Neraca Saldo | Debit-kredit per akun |
| Performa Per Tag | Laba rugi per marketplace |
| Umur Piutang | Piutang per umur (30/60/90+ hari) |
| Umur Hutang | Utang per umur |

Semua bisa di-filter tanggal & diunduh PDF.

### Rekonsiliasi
`/finance` → Akuntansi → Rekonsiliasi — cek apakah catatan cocok:
- Kartu **hijau** ✅ = selisih Rp 0 (sehat)
- Kartu **merah** ⚠️ = ada selisih (perlu diperiksa)
- Hanya **melihat** (tidak bisa mengubah)

---

## 10. Website (Landing & SEO)

### Landing Settings
`/admin/landing-settings` — atur tampilan halaman depan website:
- Hero (judul, subtitle, tombol, gambar/video)
- Nomor WhatsApp + pesan otomatis
- **Tema warna** (preset siap pakai atau warna custom)
- **Trust badges** (ikon kepercayaan di hero)
- Social media, kontak, kategori, why-us, portfolio, CTA
- **Brand** — nama toko, singkatan, warna, **font (TTF)** & **logo**; dipakai di website **dan semua PDF** (laporan, invoice, faktur, surat jalan, survey). Font/logo di-upload sendiri; tanpa upload = pakai bawaan.

> Perubahan langsung tampil di website setelah disimpan. Hanya Admin/Owner yang bisa.

### SEO
`/admin/seo`:
- **Meta title / description / keywords** → tampil di Google
- **Meta Pixel / GA4** → tracking pengunjung
- **sitemap.xml & robots.txt** → upload; disimpan di **database** (aman saat website di-redeploy), diakses di `/sitemap.xml` & `/robots.txt`

---

## 11. Marketplace TikTok & Shopee

### Admin (`/admin/tiktok` & `/admin/shopee`)
- **Sync Orders** — tarik pesanan dari marketplace ke daftar
- **Link to Main Orders** — ubah pesanan marketplace (yang sudah dibayar platform) menjadi pesanan utama di sistem

### Owner (`/owner/tiktok` & `/owner/shopee`)
- Hubungkan/putuskan koneksi toko (OAuth) — **multi-toko** (Tambah Toko / Authorize / Re-authorize / Hapus)
- **Sync Orders** · **Sync Settlement/Escrow** (uang masuk, tampil sebagai "Settlement / Pencairan Dana") · **Buat Piutang** (khusus TikTok, catat tagihan channel)
- **Tanggal Mulai Sync** per toko — data sebelum tanggal ini (sudah diinput manual/saldo awal) tidak ikut tersinkronkan
- Lihat pesanan & settlement per bulan (gross → fee → net)
- Token kedaluwarsa → **Re-authorize**

> Pembayaran TikTok masuk akun **E-Wallet Tiktok**, Shopee masuk **E-Wallet Shopee** di pembukuan. Pesanan marketplace yang sudah lunas langsung masuk pipeline (status sortir), tanpa perlu approve cek bayar.
>
> **Koneksi Shopee pertama kali:** daftar di `open.shopee.com` (Shopee Open Platform) → buat aplikasi → isi redirect URL `https://kjhomedecor.com/api/shopee/auth` → bind toko → di `/owner/shopee` klik **Tambah Toko** → masukkan **Partner ID** & **Partner Key** → klik **Authorize** → lalu gunakan tombol Sync Orders / Sync Settlement / Link to Main Orders.

### Finance (`/finance/tiktok` & `/finance/shopee`)
- **Catat Settlement** TikTok/Shopee ke pembukuan (Dr E-Wallet / Cr Piutang + fee per kategori) — akses juga `/owner/marketplace` (overview) & `/owner/tiktok` (whitelist khusus finance).
- Halaman Shopee punya filter **Start/End tanggal** (2026-08-20): membatasi tampilan & tombol Sync Settlement berdasar rentang `escrow_release_time` — kosongkan untuk tampilkan/sync semua.

---

## 12. Reset Data (Mulai dari Nol)

> ⚠️ **HANYA OWNER. Tidak bisa dibatalkan!**

`/owner` → **Pengaturan → Reset Data Transaksional**.

**Dihapus:** pesanan, pembayaran, jurnal, hutang/piutang, pelanggan, laundry, produksi/QC, survey, purchase order, data TikTok/Shopee, aset — **saldo kas & stok direset ke 0**.

**Tetap ada:** akun login, produk, bahan, supplier, BOM, tarif, tampilan website, pengaturan marketplace.

**Cara:**
1. Klik "Reset Data" → baca peringatan → "Lanjutkan"
2. Ketik **`RESET`** → tombol "Ya, Reset Data" aktif
3. Data terhapus. Isi ulang saldo awal & stok (checklist di bawah).

### Checklist setelah reset (mulai dari nol)
1. Login sesuai peran (password di `USER.md`)
2. **Saldo awal kas/bank** → `Finance → Pengaturan` (tab Saldo Awal) → isi & Simpan (jurnal pembuka otomatis)
3. **Stok awal** → `Gudang → Stock Opname` → buat sesi → isi fisik → Kirim → Finance **Approve**
   (alternatif: mutasi barang masuk di `Gudang → Stock`)
4. **TikTok** → `/owner/tiktok` → cek koneksi; token kedaluwarsa → Re-authorize
5. **Shopee** → `/owner/shopee` → Tambah Toko → Authorize (bila akun sudah tersedia)
6. **Tanggal Mulai Sync** (TikTok & Shopee) → set di kartu toko (`/owner/tiktok` & `/owner/shopee`) — data sebelum tanggal tersebut dianggap sudah diinput manual & tidak ikut sync
7. **Mulai transaksi** → buat pesanan di `/admin/orders`, ikuti alur (bagian 3)

---

## 13. Tanya-Jawab (FAQ)

**1. Kenapa gudang tidak bisa lihat halaman admin?**
Halaman admin khusus Admin/Owner. Gudang punya semua alat kerjanya di halaman gudang sendiri.

**2. Pesanan nyangkut di Steam/QC padahal sudah upload foto?**
Bukan cuma foto — klik tombol **"Pass"** di `/gudang/steam`. Begitu Pass, otomatis jadi **Siap**.

**3. Pesanan nyangkut di "Dikemas"?**
- Kirim → Installer/Admin isi resi (`/installer/schedule` atau `/admin/shipping`)
- Pasang → Admin klik "Jadwalkan Pasang" di detail pesanan

**4. Kenapa admin harus kosongkan harga produk?**
Admin tidak tahu biaya produksi. Harga jual ditentukan **Owner** lewat HPP. Produk tanpa harga disembunyikan dari website.

**5. Klik "Approve" tapi ditolak "Belum ada pembayaran"?**
Pesanan dibuat tanpa DP. Finance harus **terima DP/pelunasan dulu**, baru bisa Approve.

**6. Sudah lunas tapi tetap tidak bisa dikemas?**
Pastikan pesanan sudah **Siap**: Steam/QC Pass + semua item lolos QC per-item → baru tombol **Kemas** muncul.

**7. Siapa yang bisa membatalkan pesanan?**
Admin/Owner di detail pesanan (saat status Baru atau Sudah Disortir), dengan alasan. Pembayaran di-void & jurnal dibalik otomatis.

**8. Yang bertugas tidak ada — siapa yang mengerjakan?**
Owner bisa mengerjakan tahap apa pun (darurat).

**9. Lonceng notifikasi itu apa?**
Notifikasi dalam aplikasi — saat ini memberi tahu Admin/Owner kalau ada survey baru. Muncul **langsung** (real-time) tanpa refresh.

**10. Pesanan dari TikTok/Shopee caranya beda?**
Tidak. Marketplace masuk otomatis (pembayaran dijamin platform) dan langsung lanjut ke sortir.

**11. Karyawan laundry bisa login sendiri?**
Bisa! Login di `/laundry`: terima tugas, lapor selesai + berat. Berat = dasar gaji.

**12. Cara dapat Faktur / Surat Jalan?**
Detail pesanan → tombol **Faktur** / **Surat Jalan** → PDF ter-download.

**13. Reset data berbahaya?**
Berbahaya kalau asal klik — semua transaksi hilang permanen. Hanya Owner, harus ketik `RESET`. Data master (produk, bahan, akun, karyawan) aman.

**14. Harga di katalog website berubah sendiri?**
Harga jual di-set Owner via HPP. Katalog otomatis menampilkan produk berharga. Kalau salah, periksa HPP produk di `/owner/hpp`.

**15. Kenapa sitemap/robots saya tidak berubah padahal sudah upload?**
Sitemap & robots disimpan di database. Setelah upload, tunggu sebentar (cache ~1 menit) lalu cek `/sitemap.xml` & `/robots.txt`.

---

*Manual book: 2026-08-15 · Sesuai kode aplikasi yang berjalan · Riwayat perbaikan & bug: `docs/riwayat.md` · Panduan per role singkat: `USER.md`*
