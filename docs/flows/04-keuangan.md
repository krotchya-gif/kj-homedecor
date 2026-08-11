# Flow 04 — Keuangan (Kas, Pembayaran, Hutang, Piutang)

> Semua alur uang: kas masuk/keluar, pembayaran order, hutang & piutang, refund.

## Aktor
| Role | Bisa apa |
|---|---|
| Finance | Input pembayaran, approve, catat kas, kelola hutang/piutang, refund |
| Admin | Approve pembayaran (escape hatch), input pembayaran |
| Owner | Semua + laporan keuangan |

## 1. Kas Masuk / Kas Keluar
1. Buka menu **Kas** → pilih **Kas Masuk** / **Kas Keluar**
2. Isi: akun kas, kategori, nominal, keterangan, tanggal
3. Simpan → saldo akun kas otomatis ter-update + jurnal otomatis (double-entry)

**Transaksi antar akun (Transfer):** pilih akun asal + tujuan + nominal → kedua saldo ter-update otomatis.

> ⚠️ Validasi: nominal harus > 0 dan akun kas wajib dipilih (kalau tidak, muncul pesan).

## 2. Pembayaran Order (Opsi A — finance approve di depan)
1. **Input pembayaran** (Finance/Admin): nominal → status pembayaran: pending/partial/paid
   - Nominal tidak boleh melebihi sisa tagihan (ditolak)
   - ⚡ Jika Admin buat order dengan DP → otomatis tercatat di tabel pembayaran (jejak akuntansi)
2. **Approve (Cek Bayar)**: Finance klik "Approve Pembayaran" di halaman Finance → Pembayaran:
   - Klik Approve = verifikasi manual Finance bahwa pembayaran sudah masuk (DP/lunas)
   - Order pindah: Baru → Cek Bayar (bisa lanjut sortir/produksi)
   - ⚠️ Gate: order **harus lunas** sebelum Dikemas/Terkirim/Selesai
   - ⚠️ Order belum lunas: **hanya Finance** yang bisa approve / input pelunasan — admin tidak bisa bypass
3. Catatan: nominal pembayaran **tidak boleh melebihi sisa tagihan** (ditolak)

## 3. Hutang (ke supplier)
1. Buka **Finance → Hutang**: daftar hutang dari purchase order / pembelian
2. **Bayar hutang**: pilih hutang → isi nominal → saldo kas ter-update + hutang berkurang
   - ⚠️ Validasi: nominal tidak boleh lebih dari sisa hutang
3. Riwayat pembayaran hutang tercatat per transaksi

## 4. Piutang (dari marketplace)
1. **Finance → Piutang**: daftar faktur marketplace (TikTok/Shopee) yang belum dibayar platform
2. **Proses / retur**: pantau status faktur — dibayar / retur
3. Retur → **Refund** dicatat (nominal tidak melebihi yang sudah dibayar)

## 5. Laporan Keuangan
- Owner/Finance: laporan kas, laba, HPP, piutang/hutang per periode
- Export: CSV / PDF / cetak (scoped ke konten)

## Aturan penting
- Semua transaksi uang memakai **Decimal / validasi nominal** (hindari angka bulat salah)
- Saldo akun kas di-update via **stored procedure** (atomik — tidak bisa dobel)
- Setiap transaksi tercatat di **jurnal** (double entry) untuk laporan
