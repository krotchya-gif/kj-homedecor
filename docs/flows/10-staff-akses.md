# Flow 10 — Staff & Hak Akses

> Kelola pengguna (staff) dan role akses di aplikasi.

## Aktor
| Role | Bisa apa |
|---|---|
| Owner | **Semua**: tambah/ubah/hapus staff, aktif/nonaktifkan akun, semua menu |
| Admin | Kelola order/pelanggan/produk **+ kelola staff** (menu Admin → Staff; API dibatasi admin/owner) |
| Role lain | Hanya menu sesuai perannya |

## Role yang tersedia
| Role | Menu utama |
|---|---|
| `owner` | Semua menu + kelola staff |
| `admin` | Pesanan, katalog, pelanggan, booking, pengiriman, laundry, **staff**, dll |
| `finance` | Pembayaran, kas, hutang, piutang, laporan |
| `gudang` | Sortir, produksi, steam/QC, packing, pembelian |
| `penjahit` | Job produksi miliknya |
| `installer` | Jadwal pemasangan |
| `surveyor` | Survey (hanya milik sendiri) |
| `laundry` | Melayani laundry — punya **dashboard sendiri** (`/laundry`); gaji di Finance → Laundry Payroll |

## Langkah-langkah
1. Owner/Admin buka **Admin → Staff** (`/admin/staff`) — halaman kelola akun (buat/edit/hapus)
2. **Tambah staff**: nama, email, password (**min 8 karakter**), pilih role
3. Staff langsung bisa **login** dengan email + password tersebut
4. **Ubah**: nama/role/status (aktif/nonaktif)
5. **Nonaktifkan akun** → staff tidak bisa login lagi (aktifkan kembali kapan saja)
6. **Hapus** → akun dihapus

> ℹ️ **Owner → Staff** (`/owner/staff`) adalah halaman **lihat daftar staff** (read-only): nama, role, status, jumlah per role. Kelola akun tetap di **Admin → Staff** (tombol "Kelola Staff" mengarah ke sana). Kolom email tidak ditampilkan di daftar (email hanya dipakai untuk login).

## Aturan
- **Owner** + **Admin** bisa kelola staff (API dicek di server — bukan hanya UI)
- Password wajib minimal 8 karakter (divalidasi di server)
- Staff tidak boleh mengubah role/hak akses sendiri
- `USER.md` di repo = daftar akun & role — **wajib disinkronkan** setiap ada perubahan

## Keamanan
- Semua halaman dashboard dilindungi `proxy.ts` (login wajib + role per halaman)
- Surveyor hanya melihat data miliknya (RLS `surveyor_id = auth.uid()`)
- Admin/Owner melihat semua
- API mutasi diberi role check (admin/owner/gudang/finance sesuai konteks) — audit security `docs/riwayat.md` BUG-021/031/040–046
