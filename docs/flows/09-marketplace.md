# Flow 09 — Marketplace (TikTok Shop & Shopee)

> Sinkronisasi pesanan dari TikTok Shop & Shopee ke sistem KJ Homedecor.

## TikTok Shop (custom app)
1. **Pesanan masuk** — order TikTok disinkronkan otomatis ke sistem (order_number, customer, item)
2. **Pembayaran** — status pembayaran TikTok dicerminkan (paid/refund)
3. **Produksi & kirim** — order TikTok mengikuti pipeline normal (Flow 01)
4. **Update status ke TikTok** — saat order selesai/terkirim, status dikirim balik ke TikTok (jika fitur aktif)
5. **Fulfillment** — nomor resi dikirim ke TikTok untuk pelacakan

## Shopee Open Platform
1. **Pesanan masuk** — order Shopee disinkronkan (source = Shopee)
2. **Sinkronisasi status** — status order dipantau dari Shopee (paid, cancelled, dst)
3. **Proses internal** — setelah masuk, mengikuti pipeline normal

## Catatan teknis
- Source order ditandai: `TIKTOK_SHOP | SHOPEE | OFFLINE | LANDING_PAGE`
- Sinkronisasi memakai **API resmi** masing-masing platform (token tersimpan di environment)
- Order dari marketplace tetap harus **lunas** sebelum dikemas/dikirim (payment gate sama)

## Menangani error sinkronisasi
- Gagal sync → dicatat & order tetap bisa diproses manual (input ulang)
- Token kedaluwarsa → refresh token / hubungi dukungan platform
