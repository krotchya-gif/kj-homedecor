# Flow 07 — Pengiriman (Packing → Input Resi → Terkirim)

> Alur packing & kirim order: dari order Siap sampai Terkirim + bukti resi & foto.

## Aktor
| Role | Bisa apa |
|---|---|
| Gudang | Packing (Siap → Dikemas) via tombol "Kemas" di halaman QC Per-Item |
| Admin/Gudang/Installer | Input resi + foto bukti (Dikemas → Terkirim) |
| Owner | Semua tahap |

## Langkah-langkah

1. **Packing** — order status **Siap** → Gudang buka **QC Per-Item** → blok "📦 Siap Dikemas":
   - Order dengan semua item lulus QC tampil di blok itu
   - Klik **Kemas** → order pindah: Siap → **Dikemas**
   - Muncul di halaman **Pengiriman** (tab "Dikemas")
2. **Input Resi** — Admin/Gudang/Installer klik "Input Resi" pada order dikemas:
   - Pilih **kurir** (JNE, J&T, SiCepat, dll)
   - Isi **nomor resi**
   - Upload **foto bukti kirim** (wajib — bukti accountability)
   - Simpan → order pindah: Dikemas → **Terkirim**
   - Toast sukses muncul; kalau jaringan gagal → pesan error & tombol pulih (tidak stuck)
3. **Selesai** — dikonfirmasi setelah customer terima (lihat Flow 01)

## Tampilan halaman Pengiriman
- **Tab filter**: Siap Kirim / Dikemas / Terkirim
- Setiap order menampilkan kurir, resi, foto bukti
- Foto bukti tersimpan di storage (Supabase — permanen, tidak hilang saat deploy)

## Aturan
- **Foto wajib** untuk tahap yang butuh bukti: sortir, steam/QC, kirim (resi), jadwal pasang
- Semua perubahan terekam di audit log
- Gate pembayaran: order harus lunas sebelum Dikemas/Terkirim
