# KJ Homedecor — Todo / Sesi Audit & Perbaikan

> **Branch:** `main` · Update terakhir: 2026-08-11

---

## ✅ Selesai (2026-08-11 — Sesi Pipeline, Payment & Katalog)

### 🔄 Pipeline Order — tidak macet lagi
1. ✅ **BUG-001** Steam QC Pass → order **otomatis** jadi `Siap` (`gudang/steam`)
2. ✅ **BUG-002** Tombol **"Kemas"** di `gudang/qc` (Siap → Dikemas) — gudang tanpa akses /admin
3. ✅ **BUG-003** Admin = escape hatch semua stage (align API) — 🔒 hilang
4. ✅ **BUG-004** DP admin **auto-catat** ke tabel `payments`; approve finance = verifikasi final; aturan cek bayar terakhir
5. ✅ **BUG-007** Modal **"Jadwalkan Pasang"** di order detail (tanggal + installer) → auto-create/update `install_bookings` — koneksi ke installer pulih
6. ✅ Prefill foto bukti di modal advance (tidak upload ulang)

### 🏷️ Harga Produk (BUG-008)
7. ✅ Harga jual **bukan tanggung jawab admin** — di-set Owner via `/owner/hpp`
8. ✅ Badge status HPP di list produk admin (🟠 belum dihitung / ✅ HPP)
9. ✅ Katalog publik & landing filter `price > 0`; detail produk fallback "Harga: Hubungi via WhatsApp"
10. ✅ Import CSV produk: price tidak wajib

### 📚 Dokumentasi
11. ✅ `pendoman.md` — panduan penggunaan per role (bahasa sederhana)
12. ✅ `bug.md` — tracker bug (BUG-001 s/d BUG-008)
13. ✅ `docs/flows/` 01-10 — disinkronkan dengan kode aktual
14. ✅ `README.md`, `USER.md`, `todo.md` — diperbarui

---

## ✅ Selesai (2026-07-18 — Sesi Audit)

- `middleware.ts` → `proxy.ts` (Next.js 16) + prefix matching
- Auth helpers (`src/lib/auth.ts`): `requireAuth`, `requireRole`, `requireAuthRole`, `checkRateLimit`
- Setup endpoint proteksi, mass assignment, IDOR, upload validation
- Recharts polish (gradient, animasi, donut) di 3 dashboard
- Migrations RLS 053-058, `.env.example`

---

## ⏳ Belum Selesai (prioritas berikutnya)

| # | Item | Priority | Catatan |
|---|---|---|---|
| 1 | **Security Fase 1** — auth & role check di API yang bocor | 🔴 High | `purchase-orders` (no auth), `gudang/po-delivery` (fail-open), `seo/upload-*` (no auth), `surveys/[id]` (no role), `create-staff` (fail-open) |
| 2 | **SECURITY DEFINER RPC migration 059** | 🟠 Medium | Role check di 5 function (stock, consume, advance booking, cash balance) — 058 hanya dokumentasi |
| 3 | **exec_sql backdoor** | 🔴 High | `exec_sql(query TEXT)` di migration 055 — cek apakah sudah ada di DB live; kalau ada: DROP / REVOKE |
| 4 | **Role drift** | 🟡 Medium | TS `Role` (laundry, tanpa surveyor) ≠ DB post-060 (surveyor, tanpa laundry) → `requireAuthRole(['surveyor'])` error TS |
| 5 | **Server-side price validation** | 🟡 Medium | `orders/route.ts` POST masih terima `total_amount` dari client |
| 6 | **Role laundry** | 🟡 Medium | Tidak punya dashboard sendiri (nav kosong untuk role ini) |
| 7 | **TikTok webhook fail-open** | 🟠 High | Kalau `TIKTOK_APP_SECRET` kosong, verifikasi di-skip → webhook tidak aman |
| 8 | **TikTok auth/route GET rusak** | 🟡 Medium | Service client + `getUser()` selalu null → OAuth callback mati |
| 9 | **`x-pathname` header** | 🟢 Low | Diklaim di layout tapi tidak pernah di-set proxy.ts |
| 10 | **Duplikasi** | 🟢 Low | `NAV_BY_ROLE` 2× (Sidebar vs TopNav, sudah drift); owner/laporan = salinan finance/laporan (~2.2k baris) |
| 11 | **Dead deps** | 🟢 Low | `pg` (0 usage), `request` (deprecated, cuma SDK generated), `shadcn` di dependencies |
| 12 | **Tests** | 🟡 Medium | vitest/playwright mengarah ke `tests/` yang tidak ada — perlu buat ulang suite |

---

## 📋 Sebelum Commit

```bash
npx tsc --noEmit
npm run build
git add -A
git commit -m "..."
```
