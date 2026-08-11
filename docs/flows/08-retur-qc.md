# Flow 08 — QC & Retur

> Alur kualitas: QC gagal → retur → barang masuk stok / dimusnahkan / refund.

## Aktor
| Role | Bisa apa |
|---|---|
| Gudang | QC (pass/fail), proses retur |
| Finance | Refund |
| Owner | Semua tahap |

## 1. QC Steam/QC (lihat juga Flow 05)
1. Gudang upload foto hasil jahitan → **Lolos** (order → Siap) atau **Gagal** (order → revisi)
2. Semua keputusan + foto terekam di audit log

## 2. Retur (dari QC / customer)
1. **Inisiasi retur** — status order: `return_initiated` (dengan alasan & foto)
2. **Barang masuk stok** — Gudang konfirmasi barang dikembalikan:
   - `return_stock_in` → **stok toko bertambah** otomatis
   - (atau) **Dimusnahkan** → `return_disposed` — stok tidak bertambah
3. **Refund** — Finance catat pengembalian dana:
   - `refund_issued` + nominal (tidak boleh lebih dari yang sudah dibayar)
   - Saldo kas ter-update (jurnal otomatis)

## Aturan
- Retur wajib ada alasan + bukti foto
- Stok hanya bertambah saat `return_stock_in` (bukan saat retur diinisiasi)
- Refund ≤ total yang sudah dibayar customer (validasi)
- Semua langkah terekam di audit log order

## Status ringkas
`return_initiated → return_stock_in | return_disposed → refund_issued (jika ada)`
