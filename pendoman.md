# 📖 Panduan Pemakaian Aplikasi — KJ Homedecor

> Panduan ini menjelaskan **siapa mengerjakan apa, di halaman mana, dan kapan**.
> Ditulis dengan bahasa sederhana supaya mudah dipahami semua orang.
> Terakhir diperbarui: 2026-08-11.

---

## Daftar Isi

1. [Ringkasan Singkat](#1-ringkasan-singkat)
2. [Peran & Halaman Masing-masing](#2-peran--halaman-masing-masing)
3. [Alur Pesanan dari Awal sampai Selesai](#3-alur-pesanan-dari-awal-sampai-selesai)
4. [Panduan per Peran](#4-panduan-per-peran)
   - [Pemilik (Owner)](#41-pemilik-owner)
   - [Admin](#42-admin)
   - [Bagian Keuangan (Finance)](#43-bagian-keuangan-finance)
   - [Gudang](#44-gudang)
   - [Penjahit](#45-penjahit)
   - [Pemasang (Installer)](#46-pemasang-installer)
   - [Surveyor](#47-surveyor)
   - [Laundry](#48-laundry)
5. [Cara Membuat Produk & Menentukan Harga](#5-cara-membuat-produk--menentukan-harga)
6. [Cara Cek Pembayaran (Approve)](#6-cara-cek-pembayaran-approve)
7. [Tanya-Jawab (FAQ)](#7-tanya-jawab-faq)

---

## 1. Ringkasan Singkat

Aplikasi ini dipakai untuk mengurus toko gorden dari **pesanan masuk → dijahit → dikirim/dipasang → selesai**, termasuk urusan uang dan bahan baku.

**3 hal penting yang wajib diingat:**

1. **Harus login dulu** — kalau belum login, semua halaman kerja otomatis dibawa ke halaman login.
2. **Setiap orang hanya bisa buka halamannya sendiri** — contoh: penjahit tidak bisa buka halaman gudang.
3. **Setiap perubahan pesanan tercatat otomatis** — siapa yang mengubah, kapan, dan jadi apa. Jadi tidak ada yang bisa "mengelak" 😄

**Pemilik (Owner)** bisa mengerjakan semua hal (darurat). Tapi sebaiknya tiap orang mengerjakan tugasnya sendiri supaya rapih.

---

## 2. Peran & Halaman Masing-masing

| Peran | Alamat halaman | Tugas pokok |
|---|---|---|
| Pemilik (Owner) | `/owner` | Melihat semuanya, mengatur harga jual, laporan keuangan |
| Admin | `/admin` | Membuat pesanan, mengurus katalog, mengatur jadwal pasang |
| Keuangan (Finance) | `/finance` | Menerima pembayaran, menyetujui cek bayar, mengurus uang |
| Gudang | `/gudang` | Sortir, produksi, cek kualitas (steam/QC), mengemas, stok bahan |
| Penjahit | `/penjahit` | Mengerjakan jahitan |
| Pemasang (Installer) | `/installer` | Mengantar & memasang gorden |
| Surveyor | `/surveyor` | Mengukur ruangan pelanggan |
| Laundry | (tidak punya halaman sendiri) | Dicatat lewat menu Admin → Laundry |

> **Penting:** Gudang tidak bisa membuka halaman admin (`/admin`). Tapi itu tidak masalah — semua kerjaan gudang sudah bisa diselesaikan di halaman gudang sendiri (lihat bagian 4.4).

---

## 3. Alur Pesanan dari Awal sampai Selesai

### Pesanan "Kirim" (dikirim ke rumah pelanggan) — 9 tahap

```
Baru → Cek Bayar → Sudah Disortir → Produksi → Steam/QC → Siap → Dikemas → Terkirim → Selesai
```

### Pesanan "Pasang" (dipasang langsung di rumah) — 10 tahap

```
Baru → Cek Bayar → Sudah Disortir → Produksi → Steam/QC → Siap → Dikemas → Terjadwal Pasang → Sedang Dipasang → Selesai
```

### Siapa yang mengerjakan tiap tahap?

| Tahap | Yang mengerjakan | Di halaman mana | Syarat |
|---|---|---|---|
| Baru → **Cek Bayar** | Finance | `/finance/payments` | Sudah ada pembayaran masuk (DP/lunas) |
| Cek Bayar → **Sudah Disortir** | Gudang | halaman gudang | **Wajib foto** barang pesanan |
| Sudah Disortir → **Produksi** | Gudang | halaman gudang | Otomatis dibuatkan kerjaan untuk penjahit |
| Produksi → **Steam/QC** | Otomatis | — | Saat penjahit melapor selesai |
| Steam/QC → **Siap** | Gudang | `/gudang/steam` | **Wajib foto** hasil jahitan. Begitu klik **"Pass"**, otomatis jadi Siap ✅ |
| Steam/QC → **Produksi (revisi)** | Gudang | `/gudang/steam` | Kalau jahitan jelek: klik **"Gagal"** + foto + alasan → kembali ke penjahit |
| Siap → **Dikemas** | Gudang | `/gudang/qc` | Semua item sudah lulus cek. Klik tombol **"Kemas"** |
| Dikemas → **Terkirim** | Pemasang / Admin | `/installer/schedule` atau `/admin/shipping` | Pilih kurir + **wajib foto resi** |
| Dikemas → **Terjadwal Pasang** | Admin | detail pesanan | Pilih tanggal + pemasang (khusus pesanan Pasang) |
| Terjadwal → **Sedang Dipasang** | Pemasang | `/installer/schedule` | — |
| Sedang Dipasang → **Selesai** | Pemasang | `/installer/checklist` | Isi checklist + foto hasil |
| Terkirim → **Selesai** | Admin | detail pesanan | — |

### Foto bukti (wajib di tahap tertentu)

| Tahap | Foto yang wajib |
|---|---|
| Sudah Disortir | Foto barang pesanan |
| Steam/QC | Foto hasil jahitan (pass maupun gagal) |
| Terkirim | Foto + nomor resi |
| Terjadwal Pasang | Tidak wajib (boleh) |

---

## 4. Panduan per Peran

### 4.1 Pemilik (Owner)

Halaman `/owner` — untuk melihat dan mengatur bisnis.

| Menu | Kegunaan |
|---|---|
| **Dashboard** | Ringkasan: pesanan baru hari ini, pemasangan berjalan, pendapatan 12 bulan, produk terlaris |
| **TikTok Shop** | Menghubungkan toko TikTok (jika dipakai) |
| **HPP** | ⭐ **Menentukan harga jual produk** (lihat bagian 5) |
| **Material** | Mengisi bahan baku + harga belinya |
| **Supplier** | Daftar pemasok bahan + riwayat harga |
| **Top Produk** | Produk yang paling laku |
| **Laporan (10)** | Laporan uang: laba rugi, neraca, buku besar, dll. Bisa diunduh PDF |

**Tugas utama Owner:**
- Menghitung biaya produksi & menetapkan **harga jual** produk
- Membaca laporan keuangan
- Membantu pekerjaan yang tidak ada penanggung jawabnya (darurat saja)

### 4.2 Admin

Halaman `/admin` — pusat kegiatan toko.

| Menu | Kegunaan |
|---|---|
| **Pesanan** | ⭐ Membuat pesanan baru (Kirim/Pasang), melihat daftar pesanan |
| **Detail Pesanan** | Melihat alur pesanan (gambar anak tangga), mengunggah foto, cetak invoice/packing list |
| **Booking** | Kalender jadwal pasang + menunjuk pemasang (untuk pesanan yang belum dijadwalkan) |
| **Katalog** | Mengelola produk, kategori, banner |
| **Pelanggan** | Daftar pelanggan + chat WhatsApp |
| **Shipping** | Mengantar kiriman: isi resi + foto |
| **Laundry** | Mencatat layanan laundry |
| **Staff** | Membuat akun karyawan baru |
| **Landing Settings** | Mengatur tampilan halaman depan website |
| **Portfolio / SEO / Reports** | Konten website & laporan |

**Tugas utama Admin:**
- **Membuat pesanan** (nama pelanggan, produk, total, DP, jenis Kirim/Pasang)
- **Mengurus katalog** — tetapi **jangan mengisi harga jual** (itu tugas Owner, lihat bagian 5)
- **Menjadwalkan pemasangan** (pilih tanggal + pemasang)
- Mengisi resi untuk pesanan kirim

### 4.3 Bagian Keuangan (Finance)

Halaman `/finance` — semua urusan uang.

| Menu | Kegunaan |
|---|---|
| **Payments** | ⭐ Menerima pembayaran (DP/pelunasan), **menyetujui Cek Bayar**, mengembalikan uang (refund) |
| **Cash** | Mencatat uang masuk/keluar, transfer antar rekening |
| **Hutang** | Utang ke pemasok + pembayarannya |
| **Piutang** | Uang yang belum dibayar (misalnya dari TikTok/Shopee) |
| **Accounts & Journal** | Pengaturan pembukuan |
| **Laundry Payroll** | Gaji karyawan laundry |
| **Laporan (10)** | Laporan keuangan + PDF |

**Tugas utama Finance:**
- **Menyetujui Cek Bayar** — klik "Approve" artinya: *"saya sudah memastikan uangnya masuk"*. Hanya Finance yang bisa melakukan ini.
- **Menerima pembayaran** (DP / pelunasan). Nominal tidak boleh lebih dari sisa tagihan.
- **Menerima pelunasan** kalau pesanan belum lunas — wajib sebelum barang dikemas.

> Lihat bagian 6 untuk alur cek bayar selengkapnya.

### 4.4 Gudang

Halaman `/gudang` — tempat produksi & penyimpanan.

| Menu | Kegunaan |
|---|---|
| **Production** | ⭐ Daftar kerjaan jahit: **menunjuk penjahit**, mulai, selesaikan (bahan otomatis terpakai) |
| **Steam/QC** | ⭐ Mengecek hasil jahitan: **"Pass"** = bagus → pesanan otomatis jadi **Siap**. **"Gagal"** = jelek → kembali ke penjahit |
| **QC Per-Item** | Cek barang satu per satu + blok **"📦 Siap Dikemas"** → tombol **"Kemas"** |
| **Retur** | Menerima barang yang dikembalikan pelanggan |
| **Stock** | Melihat stok bahan, menambah/mengurangi stok, mutasi |
| **Alerts** | Peringatan stok menipis → langsung buat permintaan beli |
| **Lembur** | Mencatat lembur |

**Alur kerja gudang (urut):**
1. **Sortir** pesanan + foto barang
2. **Mulai produksi** → otomatis muncul kerjaan untuk penjahit
3. **Tunjuk penjahit** untuk mengerjakan
4. Setelah penjahit selesai → **cek jahitan di Steam/QC**:
   - Bagus → **Pass** → pesanan otomatis jadi **Siap** (tidak perlu ke mana-mana lagi)
   - Jelek → **Gagal** + alasan → penjahit yang sama mengerjakan ulang
5. **Cek barang per item** di QC Per-Item
6. Kalau semua sudah lolos → klik **"Kemas"** → pesanan jadi **Dikemas**

> 💡 Gudang **tidak perlu membuka halaman admin**. Semua langkah di atas selesai di halaman gudang sendiri.

### 4.5 Penjahit

Halaman `/penjahit`.

| Menu | Kegunaan |
|---|---|
| **Jobs** | ⭐ Daftar jahitan untuk saya: klik **"Mulai"** → kerjakan → klik **"Selesai"** |
| **Reports** | Ringkasan hasil bulan ini |
| **History** | Riwayat jahitan yang sudah selesai |

**Aturan penjahit:**
- Hanya melihat **jahitan yang ditugaskan** kepada saya
- Begitu klik "Selesai", pesanan **otomatis** lanjut ke tahap Steam/QC — penjahit tidak mengubah apa-apa
- Kalau jahitan ditolak (gagal QC): ada alasan tertulis → **kerjakan ulang** jahitan itu

### 4.6 Pemasang (Installer)

Halaman `/installer`.

| Menu | Kegunaan |
|---|---|
| **Schedule** | ⭐ Jadwal pemasangan saya (terbaru otomatis): mulai pasang, selesai, laporkan masalah |
| **Checklist** | Daftar cek pemasangan + foto hasil |
| **Reports** | Ringkasan pemasangan per periode |

**Tugas pemasang:**
- Pesanan **Kirim**: `Dikemas → Terkirim` — isi nomor resi + foto
- Pesanan **Pasang**: `Terjadwal → Sedang Dipasang → Selesai` — pasang di rumah pelanggan + foto hasil
- Kalau ada masalah di lokasi: klik **"Laporkan Masalah"** → pesanan kembali diperbaiki

### 4.7 Surveyor

Halaman `/surveyor`.

| Menu | Kegunaan |
|---|---|
| **Survey Baru** | ⭐ Mencatat hasil pengukuran: nama pelanggan, foto ruangan, ukuran (cm), model gorden, kain, catatan |
| **Riwayat Survey** | Melihat/edit survey saya, salin ringkasan ke WhatsApp, unduh PDF |

**Aturan surveyor:**
- Hanya bisa melihat **survey buatan sendiri**
- Setelah disimpan, Admin/Owner mendapat notifikasi (lonceng di pojok kanan atas)
- Hasil survey dipakai Admin sebagai acuan saat membuat pesanan

### 4.8 Laundry

- Karyawan laundry **tidak punya halaman sendiri** — dicatat lewat menu **Admin → Laundry**
- Gajinya diurus di **Finance → Laundry Payroll**

---

## 5. Cara Membuat Produk & Menentukan Harga

> Bagian ini dulu sering membingungkan. Sekarang alurnya sudah jelas:

```
LANGKAH 1 — Owner mengisi BAHAN BAKU (material)
  Halaman /owner/materials → tombol "+ Material"
  Isi: nama bahan (misal: kain bludru), satuan (meter), HARGA BELI, stok
  (bisa juga impor dari file Excel/CSV)

LANGKAH 2 — Admin membuat NAMA PRODUK (tanpa harga!)
  Halaman /admin/catalog/products → tombol "+ Produk"
  Isi: nama produk (misal: "Gordyn A"), kategori, gambar, dll
  → kolom "Harga Jual" DIKOSONGKAN. Admin bukan yang menentukan harga!
  → di daftar produk muncul tulisan oranye: "HPP belum dihitung"

LANGKAH 3 — Owner menghitung HARGA JUAL
  Halaman /owner/hpp → pilih produk "Gordyn A"
  → tambahkan bahan baku + jumlah yang dipakai untuk 1 produk
  → sistem menghitung otomatis:
        Harga pokok = (harga bahan × jumlah) + biaya produksi
        Harga jual   = harga pokok + untung (contoh: +30%)
  → klik "Simpan" → harga jual produk terpasang
  → di daftar produk muncul tulisan hijau: "HPP: Rp ..."

LANGKAH 4 — OTOMATIS MUNCUL DI WEBSITE
  Produk yang sudah punya harga langsung tampil di katalog website
```

### Rangkuman: siapa mengerjakan apa

| Pekerjaan | Yang mengerjakan | Halaman |
|---|---|---|
| Mengisi bahan baku + harga beli | Owner | `/owner/materials` |
| Membuat nama produk (**tanpa harga**) | Admin | `/admin/catalog/products` |
| Menghitung HPP & menentukan harga jual | Owner | `/owner/hpp` |
| Mengatur kategori & banner | Admin | `/admin/catalog/*` |
| Produk tampil di website | Otomatis | setelah harga ditentukan |

> ⚠️ Kalau harga produk masih kosong/0, produk **tidak muncul** di katalog website. Ini bukan error — berarti Owner belum menentukan harganya.

---

## 6. Cara Cek Pembayaran (Approve)

### Status pembayaran

| Status | Artinya |
|---|---|
| `pending` | Belum ada pembayaran |
| `partial` | Sudah bayar DP (sebagian) |
| `paid` | Sudah lunas (DP + pelunasan = total) |

### Alurnya

```
1. Admin membuat pesanan
   → boleh mengisi DP. Kalau DP diisi, otomatis tercatat (untuk pembukuan).
     Catatan: tercatat BUKAN berarti sudah disetujui.
   → status pembayaran jadi: lunas / DP / belum bayar

2. Finance menyetujui di /finance/payments
   → pastikan sudah ada pembayaran masuk (DP/lunas)
   → klik "Approve" = saya sudah memastikan uangnya masuk
   → pesanan berubah: Baru → Cek Bayar (lanjut ke gudang)

3. Aturan terakhir:
   - Tercatat otomatis ≠ disetujui. Pesanan TIDAK pernah maju tanpa klik Finance.
   - Pesanan BELUM LUNAS → HANYA Finance yang bisa menyetujui atau menerima pelunasan.
   - Pesanan belum lunas TIDAK BISA dikemas, dikirim, atau diselesaikan.
     (Tidak ada yang bisa memaksa, termasuk Admin.)
```

### Contoh kasus

| Situasi | Yang terjadi |
|---|---|
| Admin buat pesanan + DP lunas | Tercatat otomatis. Finance klik Approve → langsung Cek Bayar |
| Admin buat pesanan + DP sebagian | Tercatat DP. Finance Approve → Cek Bayar. Nanti Finance terima pelunasan (wajib sebelum dikemas) |
| Admin buat pesanan tanpa DP | Belum ada catatan. Finance harus terima DP/lunasan dulu → baru bisa Approve |
| Pesanan Siap tapi belum lunas | Finance terima pelunasan dulu → baru bisa dikemas |

---

## 7. Tanya-Jawab (FAQ)

**1. Kenapa gudang tidak bisa lihat halaman admin / detail pesanan?**
Karena halaman admin khusus Admin dan Owner. Gudang sudah punya semua alat kerjanya sendiri di halaman gudang — termasuk mengecek jahitan (Steam/QC) dan mengemas. Jadi tidak perlu akses ke halaman admin.

**2. Pesanan nyangkut di Steam/QC, padahal gudang sudah upload foto?**
Itu seharusnya tidak terjadi lagi. Caranya: di `/gudang/steam`, klik tombol **"Pass"** (bukan sekadar upload foto). Begitu Pass diklik, pesanan otomatis menjadi **Siap**.

**3. Pesanan nyangkut di "Dikemas" — siapa yang melanjutkan?**
- Pesanan **Kirim** → Pemasang/Admin mengisi nomor resi (di `/installer/schedule` atau `/admin/shipping`).
- Pesanan **Pasang** → Admin klik "Jadwalkan Pasang" di detail pesanan, pilih tanggal + pemasang.

**4. Kenapa admin harus mengosongkan harga produk?**
Karena Admin tidak tahu biaya produksinya. Harga jual ditentukan **Owner** lewat perhitungan biaya bahan + untung (HPP). Produk tanpa harga otomatis disembunyikan dari website sampai Owner menentukannya.

**5. Klik "Approve" tapi ditolak "Belum ada pembayaran tercatat"?**
Artinya pesanan tidak punya DP (dibuat tanpa DP). Finance harus **menerima DP/pelunasan dulu**, baru bisa klik Approve.

**6. Pesanan sudah lunas tapi tetap tidak bisa dikemas?**
Pastikan pesanannya sudah status **Siap**: Steam/QC sudah Pass (otomatis jadi Siap), semua barang sudah lolos QC per-item — baru tombol "Kemas" muncul di `/gudang/qc`.

**7. Siapa yang bisa membatalkan pesanan?**
Admin/Owner, lewat detail pesanan (hanya saat status Baru atau Sudah Disortir), disertai alasan.

**8. Kalau orang yang bertugas tidak ada, siapa yang mengerjakan?**
Owner (sebagai penanggung jawab terakhir) bisa mengerjakan tahap apa pun. Tapi sebaiknya tiap orang mengerjakan bagiannya masing-masing.

**9. Lonceng notifikasi di pojok kanan atas itu apa?**
Pemberitahuan di dalam aplikasi — saat ini dipakai untuk memberi tahu Admin/Owner kalau ada survey baru.

**10. Pesanan dari TikTok/Shopee caranya beda?**
Tidak. Pesanan marketplace masuk otomatis (pembayarannya sudah dijamin platform) dan langsung lanjut ke tahap sortir seperti biasa.

---

*Panduan: 2026-08-11 · Dibuat sesuai kode aplikasi yang berjalan · Riwayat perbaikan bug: lihat `bug.md`*
