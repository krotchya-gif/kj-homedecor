# Flow 06 — Pembelian (Purchase Request → PO → Delivery → Stok)

> Alur pengadaan material/supplier: dari permintaan pembelian sampai barang masuk & stok bertambah.
> Detail langkah per peran (bahasa awam): `pendoman.md` bagian 7.

## Aktor
| Role | Bisa apa |
|---|---|
| Gudang | Buat purchase request (PR), terima delivery |
| Admin | Approve/reject PR |
| Owner | Buat PO (dari PR approved / manual), tandai dikirim & diterima, bayar PO |

## Langkah-langkah

1. **Purchase Request (PR)** — Gudang buat permintaan material yang stoknya menipis (`/gudang/alerts` → "Buat Permintaan Pembelian"). Status: `pending`.
2. **Approve PR** — Admin setujui/tolak (dashboard `/admin`). PR approved masuk daftar siap-PO.
3. **Purchase Order (PO)** — Owner buat di `/owner/suppliers` tab Purchase Orders, 2 jalur, 1 PR = max 1 PO:
   - **Jalur A**: kotak "PR Disetujui" → "Buat PO" per baris (supplier + actual cost + invoice).
   - **Jalur B**: "Buat PO Manual" (material + qty + supplier + harga) → PR approved otomatis dibuat di belakang layar (rollback jika PO gagal).
4. **Dikirim** — Owner klik "Dikirim" saat supplier mengirim (status `pending` → `delivered`).
5. **Diterima** — Gudang (`/gudang/stock`) atau Owner klik terima → via RPC `receive_purchase_order_atomic`: status `received` + **stok gudang bertambah** + mutasi tercatat.
6. **Bayar** — Owner klik "Bayar" (hanya status `received`) → jurnal `hutang_paid` idempoten + `paid_at/paid_by`. Gagal jurnal → tidak ditandai lunas.

## Aturan
- PR/PO tidak bisa dobel (guard 1 PR = 1 PO di UI).
- Stok bertambah **hanya** saat delivery diterima via RPC (bukan saat PO dibuat; bukan update langsung).
- Bayar wajib jurnal dulu; semua tercatat di audit + jurnal.

## Status ringkas
`PR pending → approved → PO pending → delivered → received → paid`
