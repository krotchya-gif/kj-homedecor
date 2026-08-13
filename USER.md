# User Credentials — KJ Homedecor

> 🔗 **Project URL**: `https://glblgsfenarnztawtpmu.supabase.co`
> ⚠️ File ini WAJIB disinkronkan setiap ada perubahan akun (lihat juga `docs/flows/10-staff-akses.md`).
> 📖 **Panduan penggunaan lengkap** (manual book per role & per fitur, bahasa sederhana): [`pendoman.md`](./pendoman.md)

## Akun Test (dipakai di lingkungan development)

| Email | Username | Role | Password |
|---|---|---|---|
| `cici.yunita124@gmail.com` | Cici Yunita | `owner` | `kosongaja` |
| `owner@kjhomedecor.com` | Owner KJ | `owner` | `owner123` |
| `admin@kjhomedecor.com` | Admin KJ | `admin` | `admin456` |
| `gudang@kjhomedecor.com` | admin gudang | `gudang` | `gudang789` |
| `finance@kjhomedecor.com` | admin Finance | `finance` | `finance321` |
| `penjahit@kjhomedecor.com` | admin penjahit | `penjahit` | `penjahit654` |
| `installer@kjhomedecor.com` | admin installer | `installer` | `installer123` |
| `surveyor@kjhomedecor.com` | admin surveyor | `surveyor` | `surveyor123` |
| `laundry@kjhomedecor.com` | Admin Laundry | `laundry` | `laundry123` |

> Akun baru bisa dibuat via menu **Staff** (Admin/Owner → `/admin/staff` atau `/owner/staff`).

## Role Access

| Role | Akses |
|---|---|
| **owner** | Semua menu + kelola staff + HPP (penentu harga jual) + laporan keuangan |
| **admin** | Order, katalog (tanpa harga jual), booking + assign installer, laundry, staff, landing setting, SEO, survey |
| **finance** | Approve cek bayar, payments, kas, hutang, piutang, jurnal, aset, payroll, laporan |
| **gudang** | Produksi, assign penjahit, steam/QC (auto→Siap), Kemas, stock, lembur, alerts |
| **penjahit** | Job miliknya, history, reports |
| **installer** | Jadwal pasang (yang ditugaskan), input resi, checklist, laporan |
| **surveyor** | Survey milik sendiri: buat/lihat/edit, foto, copy WA, kirim WA, PDF |
| **laundry** | Tugas laundry miliknya: terima task, lapor selesai + berat aktual (dasar gaji) |

> Ubah password setelah login pertama.

---

## Checklist Pertama Kali Pakai (setelah Reset Data)

1. **Reset Data** — login sebagai Owner → `/owner/settings` → klik **Reset Data** → ketik `RESET`.
   Data transaksional dihapus; staff, COA, produk, material, supplier, tarif & konten landing dipertahankan.
2. **Login akun** — gunakan akun di tabel di atas sesuai peran.
3. **Saldo awal kas/bank** — otomatis diarahkan ke `Finance → Pengaturan` (tab *Saldo Awal Kas/Bank*).
   Isi saldo awal Kas, Bank BCA, Mandiri, E-Wallet Tiktok, dsb → Simpan (jurnal pembuka dibuat otomatis).
4. **Stok awal** — Gudang → Stock Opname: buat sesi, input hitung fisik, kirim → Finance **Approve** (stok masuk).
   Alternatif: mutasi stok masuk di `Gudang → Stock`.
5. **(Opsional) TikTok** — `/owner/tiktok` → cek koneksi; jika token kedaluwarsa klik **Re-authorize**.
6. **Mulai transaksi** — buat pesanan di `/admin/orders`, lanjut pipeline produksi → pengiriman.

> Urutan ini juga dicatat di `pendoman.md`.
