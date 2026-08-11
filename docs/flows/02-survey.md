# Flow 02 — Survey Gorden

> Aplikasi survey untuk tim survey di lokasi customer. Hasil langsung masuk database, Admin/Owner bisa pantau real-time.

## Aktor & hak akses
| Role | Bisa apa |
|---|---|
| Owner | Semua: lihat/edit/hapus semua survey, statistik per surveyor, download PDF |
| Admin | Lihat semua survey, edit, download PDF, copy, kirim WhatsApp |
| Surveyor | Buat survey baru, edit **milik sendiri**, upload foto, kirim hasil — **tidak bisa lihat punya surveyor lain** |

## Langkah-langkah

1. **Siapkan akun** (Owner): Pengaturan → Staff → tambah user role **Surveyor** / **Admin**
2. **Login** surveyor → dashboard: total survey hari ini / bulan ini / keseluruhan
3. **Survey Baru** → isi **Info Client**:
   - Nama client, alamat, tanggal survey (default hari ini), nama surveyor (otomatis dari akun)
4. **Tambah Ruangan** (➕ tanpa batas) — tiap ruangan:
   - Nama ruangan (Ruang Tamu, Kamar Utama, dll)
   - Foto ruangan (kamera/galeri, bisa lebih dari 1)
   - Lebar × Tinggi **(cm)**
   - **Model gorden** (dropdown): Smokring, Double Smokring, Rel Kait, Kupu-kupu, Horizontal Blind, Roller Blind, Vertical Blind
   - Jenis kain + foto kain · jenis vitras + foto vitras
   - Rel gorden, rel vitras, hook (input manual)
   - Catatan (rel lama masih dipakai, perlu rel baru, ada AC, dinding beton, high ceiling, motorized, dll)
5. **Simpan Survey** → data + foto masuk database, status **Tersimpan**
   - 🔔 Admin & Owner dapat **notifikasi** otomatis (lonceng pojok kanan atas)
   - GPS lokasi tersimpan otomatis · foto dikompres otomatis
6. **Riwayat Survey** (filter: nama client, surveyor, tanggal, status):
   - **Lihat Detail** — lengkap per ruangan
   - **Edit** — perbaiki data
   - **📋 Copy** — format rapi ke clipboard → tinggal paste di WhatsApp
   - **💬 Kirim WhatsApp** — isi chat otomatis, tinggal pilih nomor tujuan
   - **📄 Download PDF** — "FORM HASIL SURVEY GORDEN": logo, info client, tiap ruangan (foto + ukuran + model + kain + vitras + rel + hook + catatan), tanda tangan surveyor
7. **Status lanjutan** (Admin/Owner): Tersimpan → **Diproses** → **Selesai** (untuk follow-up produksi)

## Fitur pendukung
- **Auto-save draft** selama mengisi (tidak hilang kalau HP tertutup)
- **Nomor survey otomatis**: `KJ-20260811-001` (tahunbulantanggal-urutan)
- **Activity log**: riwayat perubahan tiap survey
- **Tanda tangan digital** surveyor (bukti survey dilakukan)

## Format Copy/WA
```
Nama Client: ...
Alamat: ...
Tanggal: ...
Surveyor: ...
━━━━━━━━━━━━━━
RUANGAN 1
Nama Ruangan: ...
Ukuran: 200 × 250 cm
Model Gorden: Smokring
Jenis Kain: ...
Jenis Vitras: ...
Rel Gorden: ...
Rel Vitras: ...
Hook: ...
Catatan: ...
```
