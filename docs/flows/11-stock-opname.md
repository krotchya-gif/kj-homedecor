# Flow 11 — Stock Opname (Cocok Fisik Stok)

> Cocokkan stok yang tercatat di sistem vs jumlah fisik di gudang/toko.
> Gudang buat & kirim sesi (`/gudang/stock-opname`); **Finance** setujui & terapkan selisih (`/finance/stock-opname`).

## Tujuan
- Menemukan selisih antara **stok sistem** (`materials.stock_gudang`) dengan **hitung fisik**.
- Mencatat selisih secara resmi (audit trail di `stock_opname_sessions` + `stock_opname_items`) + mutasi `adjustment`.

## Langkah-langkah (Gudang)
1. Buka **Gudang → Stock Opname**
2. Klik **"Buat Sesi Baru"**
3. Isi catatan sesi (opsional)
4. **Centang material** yang mau dihitung fisik
5. Isi kolom **"Hitung Fisik"** — selisih otomatis terhitung (`hitung fisik − stok sistem`)
6. Klik **"Buat Sesi"** → sesi tersimpan berstatus **Dibuka**
7. Setelah yakin, klik **"Kirim"** → status menjadi **Diajukan** (menunggu verifikasi Finance)

## Langkah-langkah (Finance)
1. Buka **Finance → Stock Opname**
2. Lihat sesi berstatus **Diajukan**
3. Klik **"Approve"** → RPC `approve_stock_opname`:
   - menerapkan selisih ke `materials.stock_gudang` (floor 0)
   - mencatat `inventory_movements` type `adjustment` per material
   - status sesi → **Disetujui** (+ approved_by/approved_at)

## Status sesi
| Status | Arti |
|---|---|
| `open` (Dibuka) | Masih bisa dibatalkan |
| `submitted` (Diajukan) | Dikirim ke Finance — menunggu verifikasi |
| `approved` (Disetujui) | Disetujui — selisih sudah diterapkan ke stok |
| `cancelled` (Dibatalkan) | Dibatalkan, tidak diproses |

## Aturan
- Gudang/Admin/Owner bisa buat & kirim sesi; **hanya Finance/Admin/Owner** yang bisa approve (role check di RPC `approve_stock_opname`).
- Approve idempoten — sesi yang sudah Disetujui tidak bisa di-approve ulang (tidak dobel stok).
