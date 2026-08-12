# Flow 11 — Stock Opname (Cocok Fisik Stok)

> Cocokkan stok yang tercatat di sistem vs jumlah fisik di gudang/toko.
> Akses: **Gudang** (`/gudang/stock-opname`) — hasil diverifikasi nanti oleh Finance.

## Tujuan
- Menemukan selisih antara **stok sistem** (`materials.stock_gudang`) dengan **hitung fisik**.
- Mencatat selisih secara resmi (audit trail di `stock_opname_sessions` + `stock_opname_items`).

## Langkah-langkah (Gudang)
1. Buka **Gudang → Stock Opname**
2. Klik **"Buat Sesi Baru"**
3. Isi catatan sesi (opsional)
4. **Centang material** yang mau dihitung fisik
5. Isi kolom **"Hitung Fisik"** — selisih otomatis terhitung (`hitung fisik − stok sistem`)
6. Klik **"Buat Sesi"** → sesi tersimpan berstatus **Dibuka**
7. Sesi masih bisa **dibatalkan** selama berstatus Dibuka
8. Setelah yakin, klik **"Kirim"** → status menjadi **Diajukan** (menunggu verifikasi)

## Status sesi
| Status | Arti |
|---|---|
| `open` (Dibuka) | Masih bisa diedit/dibatalkan |
| `submitted` (Diajukan) | Dikirim untuk verifikasi — tidak bisa diubah lagi |
| `approved` (Disetujui) | Disetujui Finance *(diterapkan ke stok — pengembangan berikutnya)* |
| `cancelled` (Dibatalkan) | Dibatalkan, tidak diproses |

## Aturan
- Hanya role **Gudang** (dan admin/owner) yang bisa membuka/mengirim sesi (proxy + RLS `stock_opname_*`).
- Selisih stok **belum diterapkan otomatis** — sesi yang diajukan menunggu verifikasi.

## Catatan pengembangan
- RPC `approve_stock_opname` belum dibuat — approval Finance + penerapan selisih ke stok adalah pengembangan berikutnya.
- Tabel: `stock_opname_sessions`, `stock_opname_items` (sudah ada di schema).
