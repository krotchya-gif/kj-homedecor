# Flow 06 — Pembelian (Purchase Request → PO → Delivery → Stok)

> Alur pengadaan material/supplier: dari permintaan pembelian sampai barang masuk & stok bertambah.

## Aktor
| Role | Bisa apa |
|---|---|
| Gudang | Buat purchase request (PR), terima delivery |
| Owner/Admin | Approve PR, buat purchase order (PO), catat biaya |
| Finance | Bayar PO (hutang ke supplier) |

## Langkah-langkah

1. **Purchase Request (PR)** — Gudang buat permintaan material yang stoknya menipis:
   - Pilih material, jumlah, kebutuhan (untuk order/produksi)
   - Status: `pending`
2. **Approve PR** — Owner/Admin setujui → bisa lanjut ke PO
3. **Purchase Order (PO)** — dibuat dari PR yang disetujui:
   - Pilih supplier, biaya aktual, status PO
   - PO tercatat → muncul di **Hutang** ke supplier
4. **Bayar PO** (Finance) — catat pembayaran:
   - Upload bukti (invoice/transfer) → status PO: paid
   - Hutang supplier ter-update
5. **Delivery / Terima barang** (Gudang):
   - Konfirmasi barang diterima → **stok material bertambah** otomatis
   - Harga beli terakhir tersimpan → dipakai hitung **HPP** (harga rata-rata)
6. **Riwayat Harga** — semua harga beli material tercatat (untuk evaluasi harga)

## Aturan
- PR/PO tidak bisa dobel approve
- Stok bertambah **hanya** saat delivery dikonfirmasi (bukan saat PO dibuat)
- Semua transaksi tercatat di audit + jurnal (hutang)

## Status ringkas
`PR pending → PR approved → PO dibuat → PO paid → Delivery → Stok masuk`
