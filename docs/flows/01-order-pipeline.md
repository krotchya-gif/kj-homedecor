# Flow 01 — Pipeline Pesanan (Order)

> Alur utama order dari dibuat sampai selesai. Berlaku untuk semua sumber: TikTok Shop, Shopee, Offline, Landing Page.

## Aktor & peran
| Role | Bisa apa |
|---|---|
| Admin | Buat order, escape hatch (bisa lanjut semua tahap), input resi |
| Owner | Semua tahap (escape hatch) |
| Finance | Approve pembayaran (Cek Bayar), input pembayaran, refund |
| Gudang | Sortir, produksi, steam/QC (auto → Siap), packing (tombol Kemas) |
| Penjahit | Ambil job produksi, lapor hasil |
| Installer | Input resi (kirim), pemasangan (untuk order "Pasang") |

## Status pipeline (9 tahap — order Kirim)
`Baru → Cek Bayar → Sudah Disortir → Produksi → Steam/QC → Siap → Dikemas → Terkirim → Selesai`

Order **Pasang** punya 10 tahap: ... Dikemas → **Terjadwal Pasang → Sedang Dipasang** → Selesai.

## Langkah-langkah

1. **Order dibuat** — Admin klik "Buat Pesanan" di halaman Pesanan:
   - Ketik nama pelanggan (bisa langsung ketik nama baru → otomatis dibuat, atau pilih dari dropdown)
   - Isi No. HP & alamat, sumber, jenis (Kirim/Pasang), total, DP
   - Status awal: **Baru**
   - ⚡ Jika admin input DP > 0 → **wajib upload foto bukti pembayaran** (tanpa foto tidak bisa simpan) → otomatis tercatat di tabel pembayaran (jejak akuntansi). Ini BUKAN approve — Finance tetap harus klik Approve.
2. **Approve pembayaran (Cek Bayar)** — Finance klik "Approve Pembayaran" di halaman Finance → Pembayaran:
   - Finance melihat **riwayat pembayaran + foto bukti** (klik untuk perbesar) di modal order
   - Klik Approve = verifikasi manual Finance bahwa pembayaran (DP/lunas) **sudah masuk + foto bukti sesuai**
   - Order pindah: Baru → **Cek Bayar**
   - ⚠️ Order belum lunas → Finance yang wajib input pelunasan (juga **wajib foto bukti**); hanya Finance yang bisa approve
   - ⚠️ Gate: order **harus lunas (paid)** sebelum bisa Dikemas/Terkirim/Selesai
3. **Sortir (Sudah Disortir)** — Gudang/Admin:
   - Upload foto barang pesanan (wajib 1 foto)
   - Order pindah: Cek Bayar → **Sudah Disortir**
4. **Produksi** — Gudang klik "Lanjut: Mulai Produksi":
   - Otomatis dibuatkan **job produksi** untuk penjahit (idempotent — tidak dobel)
   - Penjahit ambil job → kerjakan → lapor selesai
5. **Steam/QC** — Gudang (halaman Steam & QC Jahitan):
   - Upload foto hasil jahitan (wajib)
   - Lolos → **otomatis** order pindah ke **Siap** (gudang tidak perlu buka order detail)
   - Gagal → revisi (dikembalikan ke penjahit, order kembali ke Produksi)
6. **Packing (Dikemas)** — Gudang:
   - Di halaman **QC Per-Item**, blok "📦 Siap Dikemas" (order Siap + semua item lulus QC) → klik **Kemas**
   - Order pindah: Siap → **Dikemas**
7. **Input Resi (Terkirim)** — Admin/Gudang/Installer:
   - Pilih kurir + isi resi + upload foto bukti kirim (wajib)
   - Order pindah: Dikemas → **Terkirim**
8. **Selesai** — dikonfirmasi setelah customer terima

## Aturan penting
- Setiap pindah status dicatat ke **audit log** (siapa, kapan, dari-ke).
- Foto progress tersimpan per tahap & bisa dilihat dari stepper di detail order.
- **Batalkan order**: tombol merah "Batalkan" → status **Batal** (dengan alasan).
- Payment gate ditegakkan di UI (admin/order detail + API route).
- Order **Pasang** tidak pernah masuk "Terkirim" — setelah Dikemas lanjut ke **Jadwalkan Pasang** (lihat Flow 03).

## Tombol lanjut per tahap (label dinamis)
| Status saat ini | Tombol |
|---|---|
| Baru | Lanjut: Approve Pembayaran |
| Cek Bayar | Lanjut: Sortir |
| Sudah Disortir | Lanjut: Mulai Produksi |
| Produksi | Lanjut: Submit Report |
| Steam/QC | Lanjut: QC Pass |
| Siap | Lanjut: Packing |
| Dikemas (Kirim) | Lanjut: Input Resi |
| Dikemas (Pasang) | Lanjut: Jadwalkan Pasang |
