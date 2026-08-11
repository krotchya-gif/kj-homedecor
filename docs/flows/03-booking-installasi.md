# Flow 03 — Booking & Pemasangan (Order Pasang)

> Alur order dengan klasifikasi **Pasang** — setelah barang jadi, dijadwalkan pemasangan oleh installer.

## Aktor
| Role | Bisa apa |
|---|---|
| Admin | Kelola booking, assign installer |
| Installer | Terima jadwal, lapor hasil pemasangan |
| Owner | Semua tahap |

## Pipeline order Pasang (10 tahap)
`Baru → Cek Bayar → Sudah Disortir → Produksi → Steam/QC → Siap → Dikemas → **Terjadwal → Pemasangan** → Selesai`

## Langkah-langkah

1. **Order dibuat** dengan jenis **Pasang** (alur sama seperti Flow 01 sampai tahap Dikemas)
2. **Jadwalkan Pasang** (dari status Dikemas):
   - Admin klik "Lanjut: Jadwalkan Pasang"
   - Pilih tanggal & jam, pilih **installer** (dari daftar user role Installer)
   - Order pindah: Dikemas → **Terjadwal**
   - Wajib upload foto (jadwal/alamat pasang)
3. **Installer bekerja**:
   - Installer lihat jadwal di halaman Booking/Pemasangan
   - Mulai pemasangan → **Pemasangan**
   - Selesai pasang → upload foto hasil → **Selesai**
   - Kalau butuh revisi → dikembalikan ke tahap perbaikan
4. **Selesai** — order ditutup

## Aturan
- Satu order hanya boleh punya **satu jadwal aktif** (idempotent — tidak dobel booking)
- Semua perubahan terekam di audit log
- Installer hanya melihat jadwal yang ditugaskan padanya

## Catatan
- Bedanya dengan order Kirim: order Pasang tidak pernah masuk tahap "Terkirim" — barang diantar sekalian dipasang sesuai jadwal.
