# Flow 03 — Booking & Pemasangan (Order Pasang)

> Alur order dengan klasifikasi **Pasang** — setelah barang jadi, dijadwalkan pemasangan oleh installer.

## Aktor
| Role | Bisa apa |
|---|---|
| Admin | Kelola booking, assign installer |
| Installer | Terima jadwal, lapor hasil pemasangan |
| Owner | Semua tahap |

## Pipeline order Pasang (10 tahap)
`Baru → Cek Bayar → Sudah Disortir → Produksi → Steam/QC → Siap → Dikemas → **Terjadwal Pasang → Sedang Dipasang** → Selesai`

## Langkah-langkah

1. **Order dibuat** dengan jenis **Pasang** (alur sama seperti Flow 01 sampai tahap Dikemas)
2. **Jadwalkan Pasang** (dari status Dikemas) — **1 langkah dari order detail**:
   - Admin klik "Lanjut: Jadwalkan Pasang"
   - Muncul modal: pilih **tanggal** + **jam** (opsional) + **installer** (dari daftar user role Installer)
   - Simpan → order pindah: Dikemas → **Terjadwal Pasang** + booking installer otomatis dibuat/di-update
   - Installer langsung melihat jadwal di halaman Jadwal Pemasangan (realtime)
   - Foto jadwal/alamat **opsional** (tidak wajib di halaman ini)
3. **Installer bekerja**:
   - Installer lihat jadwal di halaman Booking/Pemasangan (hanya jadwal yang ditugaskan padanya)
   - Mulai pemasangan → **Sedang Dipasang**
   - Selesai pasang → upload foto hasil → **Selesai**
   - Kalau butuh revisi → laporkan masalah (kembali ke tahap perbaikan)
4. **Selesai** — order ditutup

## Aturan
- Satu order hanya boleh punya **satu jadwal aktif** (idempotent — tidak dobel booking)
- Semua perubahan terekam di audit log
- Installer hanya melihat jadwal yang ditugaskan padanya
- Info installer + tanggal terlihat di order detail (blok "Jadwal Pasang")

## Status ringkas
`Dikemas → (modal: tanggal + installer) → Terjadwal Pasang → Sedang Dipasang → Selesai`

## Catatan
- Bedanya dengan order Kirim: order Pasang tidak pernah masuk tahap "Terkirim" — barang diantar sekalian dipasang sesuai jadwal.
