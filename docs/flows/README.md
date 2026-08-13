# 📚 Flow Aplikasi KJ Homedecor

Dokumentasi alur (flow) per modul — **1 file = 1 flow**. Bahasa sederhana, siap dipakai training staff.

> 📖 **Manual book lengkap** (panduan per role & per fitur, bahasa sederhana): [`../../pendoman.md`](../../pendoman.md)
> 🔑 **Akun test & role**: [`../../USER.md`](../../USER.md)
> 🐞 **Riwayat perbaikan, bug tracker & audit**: [`../riwayat.md`](../riwayat.md)

| # | Flow | File |
|---|---|---|
| 1 | **Pipeline Pesanan** — dari Baru sampai Selesai | [01-order-pipeline.md](01-order-pipeline.md) |
| 2 | **Survey Gorden** — surveyor isi di lapangan → Admin/Owner pantau | [02-survey.md](02-survey.md) |
| 3 | **Booking & Pemasangan** — order Pasang, jadwal installer | [03-booking-installasi.md](03-booking-installasi.md) |
| 4 | **Keuangan** — kas, pembayaran, hutang, piutang, refund | [04-keuangan.md](04-keuangan.md) |
| 5 | **Produksi** — job penjahit, steam/QC, material | [05-produksi.md](05-produksi.md) |
| 6 | **Pembelian** — PR → PO → delivery → stok | [06-pembelian.md](06-pembelian.md) |
| 7 | **Pengiriman** — packing → input resi → terkirim | [07-pengiriman.md](07-pengiriman.md) |
| 8 | **QC & Retur** — gagal → retur → stok/refund | [08-retur-qc.md](08-retur-qc.md) |
| 9 | **Marketplace** — TikTok Shop & Shopee sync | [09-marketplace.md](09-marketplace.md) |
| 10 | **Staff & Hak Akses** — kelola akun & role | [10-staff-akses.md](10-staff-akses.md) |
| 11 | **Stock Opname** — cocok stok sistem vs fisik | [11-stock-opname.md](11-stock-opname.md) |
| 12 | **Website (Landing & SEO)** — konten landing, tema, trust badges, sitemap/robots dari DB | _di `pendoman.md` bagian 4.8 & 8_ |

## Peta alur besar (gambaran)

```
                    ┌── Survey (02) ──► info ukuran/ruangan
                    │
Order masuk (09) ──► Buat Order (01) ──► Bayar & Approve (04) ──► Sortir (01)
                    │                                                   │
                    └── Offline/WA (01)                                  ▼
                                                              Produksi (05) ─► Steam/QC (05)
                                                                                 │
                                                  Pasang (03) ◄── Dikemas (07) ◄─ Siap (01)
                                                     │
                                                     ▼
                                            Terkirim / Selesai (01)
                                            Retur/Refund (08) ◄── (jika ada masalah)
```

> Dibuat: 2026-08-11 · Update: 2026-08-13 (sesi 19 — landing/SEO, laundry, owner/staff)
