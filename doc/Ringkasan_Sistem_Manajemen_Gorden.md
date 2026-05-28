# KJ Homedecor — Panduan Sistem (User Manual)

> Dokumen ini adalah panduan penggunaan aplikasi KJ Homedecor untuk seluruh staff dan owner. Setiap role memiliki akses ke fitur yang berbeda sesuai tanggung jawabnya.

---

## 1. Cara Login

1. Buka browser, kunjungi `/login`
2. Masukkan email dan password yang sudah dibuat oleh Admin
3. Klik **Masuk**
4. Sistem akan otomatis mengarahkan ke dashboard sesuai role Anda

**Catatan:**
- Setelah 5x percobaan login gagal, akun terkunci selama 5 menit
- Akun dibuat oleh **Admin** — hubungi admin jika belum punya akses
- Setiap role melihat menu dan fitur yang berbeda

---

## 2. Role & Akses

| Role | Dashboard | Tanggung Jawab Utama |
|------|-----------|---------------------|
| **Owner** | `/owner` | Overview bisnis, HPP, lihat semua data |
| **Admin** | `/admin` | Pesanan, katalog, pelanggan, booking, laporan |
| **Finance** | `/finance` | Pembayaran, hutang, piutang, jurnal |
| **Gudang** | `/gudang` | Produksi, stok, QC, lembur |
| **Penjahit** | `/penjahit` | Job jahit, laporan meter |
| **Installer** | `/installer` | Jadwal pemasangan, checklist |

---

## 3. Panduan per Role

---

### 👑 OWNER (`/owner`)

Owner punya akses ke seluruh data bisnis dalam mode read-only (kecuali HPP Calculator).

#### Overview (`/owner`)
Layar utama yang menampilkan:
- **Real-time Hari Ini** — pesanan baru hari ini + omzet (auto-refresh)
- **Instalasi Aktif** — jumlah yang sedang dipasang + terjadwal
- **Omzet bulan ini** — total penjualan kotor
- **Jumlah pesanan** — berapa pesanan masuk
- **Grafik omzet per platform** — dari Shopee, Tokopedia, offline, dll
- **Distribusi platform** — pie chart proporsi marketplace
- **Tren 12 bulan** — line chart omzet bulanan
- **Produk terlaris** — top 5 produk paling banyak terjual
- **Pipeline status** — jumlah pesanan per status (baru, produksi, selesai, dll)
- **Filter bulan/tahun** — ubah periode untuk melihat data berbeda
- **Export CSV** — download data laporan dalam format CSV

#### Marketplace (`/owner/marketplace`)
- Pilih bulan dan tahun
- Lihat breakdown pesanan per platform (Shopee, Tokopedia, TikTok, dll)
- Total omzet per marketplace
- Distribusi dan perbandingan antar platform

#### HPP (`/owner/hpp`)
Kalkulator Harga Pokok Produksi. **Ini satu-satunya fitur owner yang bisa mengubah data.**

**Cara menggunakan:**
1. Pilih produk dari dropdown
2. Sistem otomatis memuat **Bill of Materials (BOM)** — daftar material yang dibutuhkan
3. Edit jumlah material jika perlu (tekan tombol **+ Tambah**)
4. Masukkan **Biaya Produksi/Jasa** (upah jahit, ongkos pasang, dll)
5. Atur **Markup %** — persentase keuntungan yang diinginkan
6. Sistem langsung menghitung:
   - **Biaya Material** — total harga material
   - **HPP** — harga pokok produksi
   - **Margin** — selisih HPP dan harga jual
   - **Harga Jual** — hasil kalkulasi
7. Tekan **Simpan BOM & Update Harga Jual** untuk menyimpan

**Mode Kalkulasi:**
- **Auto (BOM)** — HPP dihitung dari material + biaya produksi
- **Manual** — Override HPP langsung (jika know-how dari supplier)

#### Materials (`/owner/materials`)
- Daftar seluruh material dengan stok gudang, stok toko, dan minimum stok
- Warna **merah + "Stok Rendah"** jika stok di bawah minimum
- Navigasi halaman (pagination) untuk data banyak

#### Products (`/owner/products`)
- Daftar seluruh produk dengan category, SKU, harga, dan stok toko
- Klik baris untuk melihat detail produk

#### Staff (`/owner/staff`)
- Daftar seluruh staff dan role mereka
- Status aktif/nonaktif
- Jumlah order yang ditangani per staff

#### Suppliers (`/owner/suppliers`)
- Daftar supplier dengan tab **Supplier** dan tab **Purchase Orders (PO)**
- Tambah supplier baru
- Tambah Purchase Order — link ke supplier, material yang dipesan, dan biaya

---

### 🧑‍💼 ADMIN (`/admin`)

Admin mengelola operasional sehari-hari: pesanan, katalog, dan pelanggan.

#### Home (`/admin`)
Dashboard dengan:
- **Stat cards** — pesanan hari ini, total omzet, customer baru
- **Chart** — pesanan per status, omzet per platform, tren 30 hari
- **Progress pesanan** — kartu pesanan dengan progress bar dan foto
- **Live updates** — data refresh otomatis saat ada perubahan pesanan

#### Katalog (`/admin/catalog`)

**Products (`/admin/catalog/products`)**
- Daftar produk dengan search
- Tambah produk baru (nama, kategori, SKU, harga, deskripsi, gambar)
- Edit produk — klik baris untuk membuka modal edit
- Hapus produk
- Upload gambar produk (max 5MB → dikompres jadi 1MB)

**Categories (`/admin/catalog/categories`)**
- Tambah, edit, hapus kategori produk
- Kategori determines penempatan di landing page

**Banners (`/admin/catalog/banners`)**
- Upload banner untuk landing page
- Atur urutan banner
- Aktif/nonaktifkan banner

#### Orders (`/admin/orders`)
- Daftar pesanan dengan filter status
- Pagination (20 per halaman)
- Search pesanan
- **Tambah Pesanan:**
  1. Pilih sumber (Shopee, Tokopedia, Offline, dll)
  2. Pilih klasifikasi (**Kirim** = kirim saja, **Pasang** = perlu instalasi)
  3. Masukkan nominal dan DP
  4. Pilih atau buat customer baru
  5. Tambah item pesanan (produk, quantity, ukuran, meter gorden, dll)
  6. Simpan

**Order Detail (`/admin/orders/[id]`)**
- **Pipeline visual** — tahap pesanan (Baru → Diurut → Bayar OK → Produksi → Steam → Siap → Dikemas → Dikirim → Selesai)
- **Estimasi Selesai** — panel showing stage X/Y + estimated completion date
- **Update status** — klik tombol panah untuk avanzare ke tahap berikutnya (dengan validasi pembayaran)
- **Upload foto** — setiap perubahan status bisa disertai foto bukti
- **Invoice PDF / Packing List PDF** — generate dan download langsung dari halaman ini
- **Item list** — tambah/hapus item pesanan dengan **BOM auto-suggest** (auto-load material yang dibutuhkan saat pilih produk)
- **Meter input** — input meter gorden, vitras, roman, kupu-kupu, poni
- **Preparation checklist** — centang hardware yang sudah siap (besi, endcup, rollet, dll)
- **Activity log** — riwayat semua aksi pada pesanan (who, when, what)
- **Laundry detail** — jika ada item laundry, detail proses laundry ditampilkan

#### Customers (`/admin/customers`)
- Daftar pelanggan dengan search
- Tambah pelanggan baru (nama, telepon, alamat, catatan)
- Edit data pelanggan
- Tombol **WhatsApp** — langsung chat pelanggan via WhatsApp

#### Booking (`/admin/booking`)
- Kalender penjadwalan instalasi (admin) + form booking management
- Booking publik di `/booking` — customer bisa pilih tanggal & waktu sendiri
- Time slot picker (9 pagi - 5 sore) dengan indikator slot yang sudah terbooking
- Submit booking → simpan ke `install_bookings` + buka WhatsApp untuk konfirmasi
- Reminder WhatsApp otomatis

#### Booking Calendar Public (`/booking`)
- Halaman publik untuk customer buat janji survey/pemasangan
- Pilih tanggal → pilih jam (slot yang sudah terbooking tidak bisa dipilih)
- Form: nama, WhatsApp, alamat (untuk pemasangan), catatan
- Submit → simpan + direct ke WhatsApp

#### Portfolio (`/admin/portfolio`)
- CRUD posting untuk halaman inspirasi/desain
- Upload multiple gambar per posting
- Atur judul dan deskripsi

#### Reports (`/admin/reports`)
- Pilih tahun dan bulan
- **Stat cards** — Total Pesanan, Total Omzet, Rata-rata Order dengan **MoM growth badges** (persentase naik/turun vs bulan lalu)
- **Pipeline Funnel** — visual jumlah pesanan per status
- **Per Marketplace** — breakdown omzet dan jumlah pesanan per platform
- **Produk Terlaris** — top 10 produk berdasarkan revenue
- **Export CSV** — download data mentah
- **Export PDF** — generate laporan PDF siap cetak

#### Shipping (`/admin/shipping`)
- Kelola pengiriman pesanan
- Input nomor resi dan pilih kurir (JNE, J&T, SiCepat, dll)

#### Staff (`/admin/staff`)
- Buat akun staff baru (email, password, nama, role)
- Pilih role: Admin, Gudang, Finance, Penjahit, Installer
- Semua staff dibuat oleh Admin

#### Landing Settings (`/admin/landing-settings`)
- Edit judul hero, subtitle, nomor WhatsApp
- Edit trust badges
- Edit social media links
- Semua perubahan langsung terlihat di landing page publik

#### SEO (`/admin/seo`)
- Edit metadata SEO: title, description, keywords
- Upload robots.txt dan sitemap

#### Laundry (`/admin/laundry`)
- Kelola pesanan laundry (bukan laundry sendiri, melainkan laundry untuk customer)
- Set tarif per kg
- Input order laundry baru
- Update status: Pending → Diproses → Selesai

---

### 💰 FINANCE (`/finance`)

Finance mengelola keuangan: pembayaran, hutang, piutang, dan jurnal.

#### Home (`/finance`)
Ringkasan modul finance yang tersedia.

#### Payments (`/finance/payments`)
- Input pembayaran DP dan pelunasan per pesanan
- Validasi: pesanan tidak bisa dikirim sebelum lunas
- Approve pembayaran — Finance menyetujui sebelum pesanan berlanjut

#### Hutang (`/finance/hutang`)
- Kelola hutang ke supplier
- Update status: Pending → Dibayar
- Upload bukti transfer

#### Piutang (`/finance/piutang`)

**Overview (`/finance/piutang`)**
- Ringkasan piutang keseluruhan

**Channel (`/finance/piutang/channel`)**
- Piutang di-breakdown per channel/marketplace

**Faktur (`/finance/piutang/faktur`)**
- Buat dan kelola faktur piutang
- Input: customer, channel, nomor faktur, tanggal, jumlah, order reference

**Payment (`/finance/piutang/payment`)**
- Catat pembayaran piutang dari customer

**Process (`/finance/piutang/process`)**
- Proses piutang: penagihan, seguimiento

**Retur (`/finance/piutang/retur`)**
- Kelola retur dari customer
- Kondisi barang: baik (masuk stok lagi) atau rusak (di-dispose)
- Refund tracking

#### Akun (`/finance/accounts`)

**Chart of Accounts (`/finance/accounts/accounts`)**
- Daftar akun perkiraan (1001 Kas, 1101 Piutang, dll)
- Tambah, edit, hapus akun

**Categories (`/finance/accounts/categories`)**
- Kategori akun (Asset, Liability, Equity, Revenue, Expense)

**Mapping (`/finance/accounts/mapping`)**
- Mapping transaksi ke akun yang benar

**Mapping Difference (`/finance/accounts/mapping-difference`)**
- Selisih mapping yang perlu diresolve

#### Kas & Bank (`/finance/cash`)
- Kelola posisi kas dan bank
- Transaksi kas masuk/keluar

#### Aset (`/finance/assets`)
- Kelola aset perusahaan
- Pencatatan aset tetap

#### Jurnal (`/finance/journal`)

**General Journal (`/finance/journal`)**
- Input jurnal manual
- Daftar entries dengan akun, deskripsi, debit, kredit

**Auto Journal (`/finance/journal/auto`)**
- Generate jurnal otomatis dari transaksi (pembayaran, purchase order, dll)

**Laporan Jurnal:**
- Balance (`/finance/journal/reports/balance`)
- Cash Mutation (`/finance/journal/reports/cash-mutation`) — mutasi kas per periode
- COGS Chronology (`/finance/journal/reports/cogs-chronology`) — chronology harga pokok
- Journal List (`/finance/journal/reports/journal-list`) — daftar jurnal per periode
- Ledger (`/finance/journal/reports/ledger`) — buku besar per akun
- Profit & Loss (`/finance/journal/reports/profit-loss`) — laporan laba rugi

#### Laundry Payroll (`/finance/laundry-payroll`)
- Kelola gaji staff laundry
- Input dan tracking pembayaran gaji

#### Reports (`/finance/reports`)
- Pilih bulan dan tahun
- **Revenue** — total omzet, DP, lunas
- **Per Platform** — breakdown penjualan per marketplace
- **Pengupahan Penjahit** — hitung upah berdasarkan meter yang dikerjakan
  - Gorden: Rp 5.000/meter
  - Vitras: Rp 3.000/meter
  - Roman: Rp 6.000/meter
  - Kupu-Kupu: Rp 7.000/meter
  - Poni Lurus: Rp 2.000/meter
  - Poni Gel: Rp 3.000/meter
- **Lembur** — rekap jam lembur per staff
- **Export PDF** — generate laporan lengkap

---

### 🏭 GUDANG (`/gudang`)

Gudang mengelola stok material, produksi, dan quality control.

#### Home (`/gudang`)
Ringkasan modul gudang.

#### Production (`/gudang/production`)
- **Queue produksi** — daftar pesanan yang perlu diproduksi
- **Mulai** — tombol untuk menandai penjahit mulai mengerjakan
- **Selesai** — tombol untuk menandai pesanan selesai diproduksi
- Otomatis terhubung ke pipeline order

#### Steam/Laundry (`/gudang/steam`)
Dua tab dalam satu halaman:

**Tab Laundry:**
- Proses laundry: input berat (kg), meter, deskripsi
- Update status: Pending → Diproses → Selesai

**Tab Steam:**
- Proses steam: input meter steam, deskripsi
- QC check setelah steam

#### Stock (`/gudang/stock`)

**Tab Material:**
- Posisi stok material (stock_gudang dan stock_toko terpisah)
- Filter dan search material
- Lihat minimum stok level

**Tab Produk:**
- Posisi stok produk jadi (stock_toko)

#### Alerts (`/gudang/alerts`)
- Daftar material yang stoknya **di bawah minimum**
- Tampilkan kekurangan jumlah
- **Buat PR** — 1-click untuk membuat Purchase Request ke supplier
- Jika semua stok aman, tampilkan pesan hijau "Semua stok material aman"

#### Lembur (`/gudang/lembur`)
- Input lembur: pilih staff, tanggal, jam mulai, jam selesai, total jam, keterangan
- Rekap lembur per bulan
- Digunakan untuk menghitung biaya overtime di finance

#### QC (`/gudang/qc`)
- Quality control setelah produksi/steam
- **Pass** — produk lolos QC
- **Fail** — produk gagal, perlu revisi
  - Input alasan fail
  - Upload foto bukti
  - Catat revision notes
- Hasil QC langsung terintegrasi dengan pipeline order

#### Reports (`/gudang/reports`)
- Laporan gudang per periode
- Rekap produksi, steam, QC

---

### ✂️ PENJAHIT (`/penjahit`)

Penjahit melihat job yang harus dikerjakan dan melaporkan hasil.

#### Home (`/penjahit`)
Ringkasan job dan statistik pribadi.

#### Jobs (`/penjahit/jobs`)
- **Job queue** — daftar pekerjaan yang perlu dikerjakan
- **Mulai** — mulai kerjakan job (sistem catat waktu mulai)
- **Laporan inline** — input meter yang sudah dikerjakan langsung di halaman ini
- Job dikelompokkan per pesanan

#### Reports (`/penjahit/reports`)
- Pilih bulan dan tahun
- **Rekap meter** — total meter per tipe (gorden, vitras, roman, kupu-kupu, poni)
- **Estimasi upah** — hitung otomatis berdasarkan tarif per meter
- Grafik performa bulanan

#### History (`/penjahit/history`)
- Riwayat job yang sudah selesai
- Filter dan lihat job di masa lalu

---

### 🔧 INSTALLER (`/installer`)

Installer mengelola jadwal dan pelaksanaan pemasangan. Installer hanya melihat booking yang di-assign ke dirinya sendiri (berdasarkan login).

#### Home (`/installer`)
Dashboard dengan 3 modul: Jadwal, Checklist, Laporan.

#### Schedule (`/installer/schedule`)
- Daftar booking yang di-assign ke Anda
- Tab **Mendatang** — jadwal yang belum dikerjakan
- Tab **Selesai** — riwayat yang sudah selesai
- Setiap kartu menampilkan:
  - Status badge (Terjadwal / Dikerjakan / Selesai / Dibatalkan)
  - Tipe: 📍 Pasang atau 📦 Kirim
  - Nama, alamat, nomor WhatsApp customer
  - Tanggal dan waktu jadwal
  - Tombol **Mulai Pasang** (saat status Terjadwal)
  - Tombol **Selesai** (saat status Dikerjakan)
- Klik nomor WhatsApp untuk langsung chat customer

#### Checklist (`/installer/checklist`)
- Pilih booking yang akan dikerjakan dari dropdown
- Checklist 8 langkah:
  1. Ukur ulang di lokasi
  2. Pasang bracket/genggam
  3. Pasang gorden/roman
  4. Rapikan kiri-kanan
  5. Pasang ker HEADER
  6. Pastikan fungsi optimal
  7. Bersihkan area kerja
  8. Foto hasil jadi
- Centang setiap langkah yang sudah selesai
- **Wajib upload minimal 3 foto bukti** sebelum bisa submit
- Simpan checklist → otomatis update status booking ke Selesai

#### Laporkan Masalah (`/installer/schedule` — tombol saat di lokasi) ✅ ADA
Jika ada masalah di lokasi (salah ukuran, cacat produk, dll):
1. Installer klik tombol **"Laporkan Masalah"** pada booking (visible saat status = Dikerjakan)
2. Isi formulir: alasan masalah + upload foto bukti (opsional)
3. Status booking berubah ke **"Revision"** + alasan + foto tersimpan
4. Gudang melihat di `/gudang/qc` atau `/gudang/steam` dengan status revision
5. Gudang memperbaiki atau membuat ulang
6. Admin membuatkan jadwal baru
7. Installer mendapat jadwal baru

#### Reports (`/installer/reports`)
- Filter: Semua / Bulan Ini / Bulan Lalu
- **Stat cards:** Total Instalasi dan Nilai Order
- **Tabel lengkap:** tanggal, nama customer, WhatsApp, alamat, produk, meter gorden, nilai order
- Hanya menampilkan booking dengan status Selesai

---

### 🧺 SHARED — LAUNDRY (`/laundry/jobs`)

Semua role bisa mengakses halaman laundry (terutama gudang dan admin).

#### Laundry Jobs (`/laundry/jobs`)
- Queue pesanan laundry
- **Ambil Job** — staff laundry bisa assign job ke dirinya sendiri
- Update status: Pending → Diproses → Selesai
- Input berat (kg) dan catatan

---

## 4. Alur Kerja Lengkap

### Alur Pesanan Baru
```
Customer pesan (via WA/Shopee/Tokopedia/Offline)
    ↓
Admin buat pesanan di /admin/orders
    ↓
Finance verifikasi & approve pembayaran di /finance/payments
    ↓
Gudang mulai produksi di /gudang/production
    ↓
Steam/Laundry (jika ada) di /gudang/steam
    ↓
QC di /gudang/qc
    ↓
Packing & Shipping di /admin/shipping
    ↓
Instalasi (jika tipe=PASANG) di /installer/schedule
    ↓
Selesai ✓
```

### Alur Revisi di Lokasi (Installer)
```
Installer tiba di lokasi
    ↓
Ada masalah (salah ukuran / cacat produk / dll)
    ↓
Installer laporkan masalah via tombol "Laporkan Masalah"
    ↓
Isi alasan + upload foto bukti
    ↓
Status booking → "Revision"
    ↓
Gudang dapat list revision di /gudang/qc atau /gudang/steam
    ↓
Gudang perbaiki / buat ulang
    ↓
Admin reschedule booking baru
    ↓
Installer dapat jadwal baru
    ↓
Instalasi ulang ✓
```

### Alur Purchase Request → Purchase Order
```
Gudang cek /gudang/alerts
    ↓
Stok di bawah minimum → Klik "Buat PR"
    ↓
Admin approve PR
    ↓
Finance buat Purchase Order di /owner/suppliers (tab PO)
    ↓
Supplier kirim barang
    ↓
Gudang terima & input ke stok
    ↓
Selesai ✓
```

### Alur Retur
```
Customer ajukan retur
    ↓
Admin proses retur di /admin/orders/[id] atau /finance/piutang/retur
    ↓
Cek kondisi barang:
  → Baik: return to stock (stok_gudang +)
  → Rusak: dispose
    ↓
Refund (jika perlu) via /finance/piutang
    ↓
Selesai ✓
```

---

## 5. Glossary

| Istilah | Penjelasan |
|---------|------------|
| **BOM** | Bill of Materials — daftar material yang dibutuhkan untuk satu produk |
| **HPP** | Harga Pokok Produksi — biaya untuk memproduksi satu unit produk |
| **DP** | Down Payment — uang muka pembayaran dari customer |
| **Piutang** | Uang yang belum dibayar oleh customer (belum lunas) |
| **Hutang** | Uang yang belum dibayar ke supplier |
| **Purchase Request (PR)** | Request pembelian material ke supplier |
| **Purchase Order (PO)** | Order resmi ke supplier setelah PR di-approve |
| **Pipeline** | Tahapan proses pesanan (Baru → Selesai) |
| **Meter Gorden** | Panjang kain gorden dalam meter untuk kalkulasi upah |
| **Steam/QC** | Proses finishing (steam) dan quality control |
| **Pipeline Funnel** | Visualisasi jumlah pesanan per tahap pipeline |

---

## 6. Fitur Tersedia per Role (Ringkasan)

| Fitur | Owner | Admin | Finance | Gudang | Penjahit | Installer |
|-------|-------|-------|---------|--------|----------|-----------|
| Overview Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Orders Management | 👁️ | ✅ | 👁️ | 👁️ | — | 👁️ |
| Order Detail + Pipeline | — | ✅ | — | ✅ | ✅ | ✅ |
| Catalog/Products | 👁️ | ✅ | — | — | — | — |
| Customers | 👁️ | ✅ | — | — | — | — |
| Booking/Schedule | 👁️ | ✅ | — | — | — | ✅ |
| Pembayaran | 👁️ | 👁️ | ✅ | — | — | — |
| Hutang/Piutang | 👁️ | — | ✅ | — | — | — |
| Jurnal & Laporan Keuangan | 👁️ | — | ✅ | — | — | — |
| HPP Calculator | ✅ | — | — | — | — | — |
| Produksi | — | 👁️ | — | ✅ | ✅ | — |
| Stock/Gudang | 👁️ | — | — | ✅ | — | — |
| Low Stock Alerts | 👁️ | — | — | ✅ | — | — |
| Lembur | — | — | ✅ | ✅ | — | — |
| QC | — | 👁️ | — | ✅ | — | — |
| Reports (Admin) | 👁️ | ✅ | — | ✅ | ✅ | ✅ |
| Reports (Finance) | 👁️ | — | ✅ | — | — | — |
| Supplier & PO | ✅ | — | — | — | — | — |
| Staff Management | 👁️ | ✅ | — | — | — | — |
| Landing Settings | — | ✅ | — | — | — | — |
| Laundry Jobs | — | ✅ | — | ✅ | — | — |

**Legenda:** ✅ = akses penuh, 👁️ = lihat saja (read-only), — = tidak punya akses

---

*Last updated: 2026-05-28*
*Document version: 1.0*
*Untuk pertanyaan atau masalah, hubungi admin sistem.*
