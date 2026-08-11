# User Credentials — KJ Homedecor

> 🔗 **Project URL**: `https://glblgsfenarnztawtpmu.supabase.co`
> ⚠️ File ini WAJIB disinkronkan setiap ada perubahan akun (lihat juga `docs/flows/10-staff-akses.md`).

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
