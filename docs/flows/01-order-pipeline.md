# Flow 01 — Pipeline Pesanan (Order)

> Alur utama order dari dibuat sampai selesai. Berlaku untuk semua sumber: TikTok Shop, Shopee, Offline, Landing Page.

## Aktor & peran
| Role | Bisa apa |
|---|---|
| Admin | Buat order, sortir (awal), input resi (akhir), escape hatch pembayaran |
| Owner | Semua tahap (escape hatch) |
| Finance | Approve pembayaran (Cek Bayar), input pembayaran, refund |
| Gudang | Sortir, produksi, steam/QC, packing |
| Penjahit | Ambil job produksi, lapor hasil |
| Installer | Pemasangan (untuk order "Pasang") |

## Status pipeline (9 tahap — order Kirim)
`Baru → Cek Bayar → Sudah Disortir → Produksi → Steam/QC → Siap → Dikemas → Terkirim → Selesai`

Order **Pasang** punya 10 tahap: ... Dikemas → **Terjadwal → Pemasangan** → Selesai.

## Langkah-langkah

1. **Order dibuat** — Admin klik "Buat Pesanan" di halaman Pesanan:
   - Ketik nama pelanggan (bisa langsung ketik nama baru → otomatis dibuat, atau pilih dari dropdown)
   - Isi No. HP & alamat, sumber, jenis (Kirim/Pasang), total, DP
   - Status awal: **Baru**
2. **Pembayaran dicatat** — Finance/Admin klik "+ Tambah Pembayaran":
   - Input jumlah (tidak boleh lebih dari sisa tagihan)
   - Status pembayaran: pending → partial (DP) → paid (lunas)
3. **Approve pembayaran (Cek Bayar)** — Finance klik "Approve Pembayaran":
   - Wajib ada bukti (foto transfer) — tersimpan di tabel pembayaran
   - Order pindah: Baru → **Cek Bayar**
   - ⚠️ Gate: order **harus lunas (paid)** sebelum bisa Dikemas/Terkirim/Selesai
4. **Sortir (Sudah Disortir)** — Gudang/Admin:
   - Upload foto barang pesanan (wajib 1 foto)
   - Order pindah: Cek Bayar → **Sudah Disortir**
5. **Produksi** — Gudang klik "Lanjut: Mulai Produksi":
   - Otomatis dibuatkan **job produksi** untuk penjahit (idempotent — tidak dobel)
   - Penjahit ambil job → kerjakan → lapor selesai
6. **Steam/QC** — Gudang:
   - Upload foto hasil jahitan (wajib)
   - Lolos → **Siap** | Gagal → revisi (dikembalikan ke penjahit)
7. **Packing (Dikemas)** — Gudang klik "Lanjut: Packing"
8. **Input Resi (Terkirim)** — Admin/Gudang:
   - Pilih kurir + isi resi + upload foto bukti kirim (wajib)
   - Order pindah: Dikemas → **Terkirim**
9. **Selesai** — dikonfirmasi setelah customer terima

## Aturan penting
- Setiap pindah status dicatat ke **audit log** (siapa, kapan, dari-ke).
- Foto progress tersimpan per tahap & bisa dilihat dari stepper di detail order.
- **Batalkan order**: tombol merah "Batalkan" → status **Batal** (dengan alasan).
- Payment gate ditegakkan dua lapis: UI + API route.

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
