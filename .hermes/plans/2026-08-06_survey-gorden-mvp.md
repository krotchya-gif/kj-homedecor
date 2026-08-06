# Aplikasi Survey Gorden — MVP Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Membangun aplikasi Survey Gorden (web/mobile-friendly) sesuai SRS 2026-08-03: tim survey mencatat hasil survey per ruangan (foto, ukuran, model, kain, rel, hook, catatan) → tersimpan ke DB, terpantau Admin/Owner, bisa Copy WA / Kirim WhatsApp / Download PDF — dan hasilnya masuk ke invoice order.

**Architecture:** Fitur ini jadi role baru `surveyor` di dashboard existing (Next.js 16 App Router + Supabase + TanStack Query). Route group `(dashboard)/surveyor/*` untuk tim survey; halaman `(dashboard)/admin/surveys` & `(dashboard)/owner/surveys` untuk manajemen. Schema DB **sudah ada di production** (migration 060): `surveys`, `survey_rooms`, `survey_room_photos`, RLS (surveyor own-only), RPC `generate_survey_number()`, `orders.survey_id`. Blok HASIL SURVEY di invoice sudah dirender. Tinggal UI + utility + routing.

**Tech Stack:** Next.js 16, Supabase (client/server), jsPDF + autotable (PDF survey — sudah dipakai di invoice/laporan), `browser-image-compression` (sudah ada di `src/lib/upload.ts`), motion/PageHeader/SectionCard/StatCard/Modal (pattern UI existing).

---

## Current Context (sudah selesai — JANGAN diulang)

| Item | Status |
|---|---|
| Migration `060_survey_schema.sql` (tabel survey + role + RLS + RPC) | ✅ SUDAH dijalankan di production & terverifikasi |
| `orders.survey_id` + index | ✅ ada |
| Type `Survey` / `SurveyRoom` / `SurveyRoomPhoto` di `src/types/index.ts` + `Order.survey?` | ✅ ada |
| Blok HASIL SURVEY GORDEN di `src/lib/invoice.ts` (render `order.survey.rooms`) | ✅ ada |
| Query relasi survey di `admin/orders/[id]/page.tsx` (`survey:surveys(*, surveyor:users(name), rooms:survey_rooms(*, photos:...))`) | ✅ ada |

## File yang WAJIB sinkron saat tambah role baru (pola existing — 5 tempat)

1. `src/middleware.ts` — `ROLE_DASHBOARD_MAP` (route→allowed roles) + `dashboards` (redirect)
2. `src/app/(dashboard)/layout.tsx` — `ROLE_DASHBOARD_MAP` (role→default route)
3. `src/app/(auth)/login/page.tsx` — `ROLE_DASHBOARDS` (role→route setelah login)
4. `src/components/dashboard/DashboardSidebar.tsx` — `NAV_BY_ROLE`
5. `src/components/dashboard/DashboardTopNav.tsx` — `NAV_BY_ROLE` (duplikat Sidebar!)

---

## Fase A — Fondasi role `surveyor` & routing

### Task A1: Middleware — izinkan `/surveyor` untuk role surveyor & owner

**Files:** Modify `src/middleware.ts:49-56` & `src/middleware.ts:67-74`

**Step 1:** Tambah ke `ROLE_DASHBOARD_MAP`:
```ts
'/surveyor': ['surveyor', 'owner'],
```
**Step 2:** Tambah ke `dashboards` redirect map:
```ts
surveyor: '/surveyor',
```
**Step 3:** Verifikasi: `npx tsc --noEmit` exit 0.
**Step 4:** Commit: `feat(survey): route /surveyor di middleware (role surveyor + owner)`

### Task A2: Layout dashboard — default route surveyor

**Files:** Modify `src/app/(dashboard)/layout.tsx:8-15`

**Step 1:** Tambah `surveyor: '/surveyor'` ke `ROLE_DASHBOARD_MAP` di layout.
**Step 2:** Verifikasi tsc + commit `feat(survey): default route surveyor di dashboard layout`

### Task A3: Login — redirect surveyor ke /surveyor

**Files:** Modify `src/app/(auth)/login/page.tsx` (`ROLE_DASHBOARDS`)

**Step 1:** Tambah `surveyor: '/surveyor'` ke map `ROLE_DASHBOARDS`.
**Step 2:** tsc + commit `feat(survey): login redirect role surveyor`

### Task A4: Sidebar & TopNav — menu surveyor (dua file!)

**Files:** Modify `src/components/dashboard/DashboardSidebar.tsx` & `src/components/dashboard/DashboardTopNav.tsx` (keduanya punya `NAV_BY_ROLE:51`)

**Step 1:** Tambah entri `surveyor` di KEDUA file (ikon dari lucide-react):
```ts
surveyor: [
  { label: 'Dashboard', href: '/surveyor', icon: <LayoutDashboard size={18} /> },
  { label: 'Survey Baru', href: '/surveyor/survey/new', icon: <ClipboardPlus size={18} /> },
  { label: 'Riwayat Survey', href: '/surveyor/history', icon: <History size={18} /> }
],
```
**Step 2:** Cek `ROLE_LABELS` (TopNav:193) — tambah `surveyor: 'Surveyor'` kalau ada map label.
**Step 3:** tsc + commit

### Task A5: Upload folder `survey` di union type

**Files:** Modify `src/lib/upload.ts:12-21` (union `folder`)

**Step 1:** Tambah `| 'survey'` ke union folder di `uploadToLocal`.
**Step 2:** tsc + commit

---

## Fase B — Utility survey (format teks & PDF)

### Task B1: `src/lib/survey.ts` — format teks copy/WA (SRS section 10 & 11)

**Files:** Create `src/lib/survey.ts`

**Step 1:** Tulis fungsi `formatSurveyText(survey: Survey): string` — format PERSIS SRS:
```
Nama Client: ...
Alamat: ...
Tanggal: ...
Surveyor: ...
━━━━━━━━━━━━━━
RUANGAN 1
Nama Ruangan: ...
Ukuran: ... × ... cm
Model Gorden: ...
Jenis Kain: ...
Jenis Vitras: ...
Rel Gorden: ...
Rel Vitras: ...
Hook: ...
Catatan: ...
```
(loop per room, `room_name` wajib fallback `'-'`, ukuran hanya tampil kalau width/height ada)

**Step 2:** Fungsi `buildWhatsAppUrl(survey: Survey, phone?: string): string` → `https://wa.me/<phone>?text=<encodeURIComponent(formatSurveyText)>` — tanpa phone = `https://wa.me/?text=...` (user pilih tujuan sendiri, sesuai SRS 11).

**Step 3:** Verifikasi cepat: `node -e` test dengan object Survey dummy (jangan import TS — test via `npx tsx` atau cukup tsc + inspect output manual nanti di UI).

**Step 4:** Commit `feat(survey): util format hasil survey (copy text + wa.me)`

### Task B2: `src/lib/survey-pdf.ts` — PDF FORM HASIL SURVEY (SRS section 12)

**Files:** Create `src/lib/survey-pdf.ts`

**Step 1:** `generateSurveyPDF(survey: Survey)` pakai jsPDF + autoTable:
- Header: judul **"FORM HASIL SURVEY GORDEN"** + `No: ${survey.survey_number}` (brand fill #CC7030 seperti invoice)
- Info client: Nama, Alamat, Tanggal, Surveyor (dari `survey.surveyor?.name`)
- Per room: autoTable 2 kolom [Field, Value] — Ukuran (`${width} × ${height} cm`), Model Gorden, Jenis Kain, Jenis Vitras, Rel Gorden, Rel Vitras, Hook, Catatan; judul room `RUANGAN ${i+1}: ${room_name}` sebagai row header
- Foto: `survey_room_photos[0]` → `doc.addImage` (cuma foto pertama per room, `format: 'JPEG'`, max width 60mm; fetch via `canvas`/`getImageData`? — **pakai pola sederhana: `new Image()` + canvas → dataURL**; kalau gagal load, skip foto diam-diam, jangan crash)
- Footer: `Tanda tangan Surveyor: ______` + tanggal
- `doc.save('survey-' + survey_number + '.pdf')`

**Step 2:** tsc + commit `feat(survey): export PDF hasil survey`

---

## Fase C — Halaman Surveyor (`/surveyor/*`)

### Task C1: Dashboard surveyor — statistik (SRS 4)

**Files:** Create `src/app/(dashboard)/surveyor/page.tsx`

**Step 1:** Fetch dari client: `surveys.select('id, status, survey_date', { count: 'exact' })` → 3 hitungan:
- Total Hari Ini: `.eq('survey_date', today)` (surveyor_id = current user — RLS otomatis membatasi milik sendiri)
- Total Bulan Ini: `.gte('survey_date', firstOfMonth)`
- Total Keseluruhan: `.count()`
**Step 2:** Render pakai `StatCard` (3 kartu: Hari Ini / Bulan Ini / Total) + 2 tombol besar: "➕ Survey Baru" (→ `/surveyor/survey/new`) & "Riwayat Survey" (→ `/surveyor/history`). Pakai `PageHeader` title "Dashboard Survey".
**Step 3:** tsc + build + commit `feat(survey): dashboard surveyor (statistik hari/bulan/total)`

### Task C2: Form Survey Baru — client + ruangan multi (SRS 5, core!)

**Files:** Create `src/app/(dashboard)/surveyor/survey/new/page.tsx`

**Step 1:** State:
```ts
const [client, setClient] = useState({ client_name: '', client_address: '', survey_date: new Date().toISOString().split('T')[0], surveyor_name: '' })
const [rooms, setRooms] = useState<RoomForm[]>([emptyRoom()])  // minimal 1 ruangan
// RoomForm: { room_name, width_cm, height_cm, model_gorden, fabric_name, fabric_photo,
//             vitras_name, vitras_photo, rel_gorden, rel_vitras, hook, notes, photos: string[] }
```
**Step 2:** Tombol `➕ Tambah Ruangan` (append emptyRoom) & `🗑 Hapus Ruangan` per room (jangan hapus kalau cuma 1).
**Step 3:** Field per room (pakai class `form-section`/`form-section-title` existing):
- Nama Ruangan: input text + `<datalist>` opsi (Ruang Tamu, Kamar Utama, Kamar Anak, Ruang Keluarga, Dapur, Kamar Mandi)
- Foto Ruangan: `<input type="file" accept="image/*" capture="environment" multiple>` → loop `uploadToLocal(file, 'survey')` → push URL ke `room.photos`; preview thumbnail (pakai Lightbox kalau mau)
- Lebar (cm) & Tinggi (cm): input number
- Model Gorden: `<select>` — Smokring, Double Smokring, Rel Kait, Kupu-kupu, Horizontal Blind, Roller Blind, Vertical Blind
- Jenis Kain: input text + upload foto kain (`fabric_photo`)
- Jenis Vitras: input text + upload foto vitras
- Rel Gorden / Rel Vitras / Hook: input text (placeholder contoh dari SRS)
- Catatan: textarea (placeholder: Rel lama masih digunakan / Perlu rel baru / Ada AC / ...)
**Step 4:** GPS (SRS 13): tombol "📍 Ambil Lokasi" → `navigator.geolocation.getCurrentPosition` → simpan `gps_lat/gps_lng` (opsional, jangan block kalau ditolak).
**Step 5:** Auto-save draft (SRS 13): `useEffect` debounce 5s → kalau `client.client_name` non-kosong, POST ke API (Task D1) dengan `status: 'draft'`; tampilkan "💾 Draft tersimpan HH:MM". Simpan `survey_id` yang sudah dibuat agar update (bukan insert baru).
**Step 6:** Tombol **"Review & Simpan"** → validasi `client_name` wajib + minimal 1 room dengan `room_name` → setStep('review').

### Task C3: Review sebelum simpan (SRS 6) + simpan final

**Files:** Create `src/app/(dashboard)/surveyor/survey/new/page.tsx` (step review di file yang sama) — ATAU pisah `src/app/(dashboard)/surveyor/survey/review/page.tsx` (state via localStorage/sessionStorage). **Pilih: step state internal di file yang sama** (lebih simpel, tidak perlu persist antar route).

**Step 1:** Layar review menampilkan ringkasan: Nama Client, Alamat, Tanggal, Surveyor, Jumlah Ruangan + list ringkas per ruangan (nama + ukuran + model).
**Step 2:** Tombol **Edit** (kembali ke step form, state tetap) & **Simpan Survey**.
**Step 3:** Simpan final: kalau draft sudah ada id → UPDATE survey + REPLACE rooms (delete by survey_id + re-insert + re-insert photos); kalau baru → INSERT surveys (ambil `survey_number` dari RPC `generate_survey_number` dulu), lalu insert rooms & photos. **WAJIB cek `if (error)` tiap langkah + `alert(error.message)`** (pola skill kj-homedecor).
**Step 4:** Setelah sukses: `status: 'tersimpan'` + redirect ke `/surveyor/survey/[id]` dengan `?saved=1`.

### Task C4: Detail survey + aksi (Copy / WA / PDF / Edit) (SRS 9, 10, 11, 12)

**Files:** Create `src/app/(dashboard)/surveyor/survey/[id]/page.tsx`

**Step 1:** Fetch `surveys.select('*, surveyor:users(name), rooms:survey_rooms(*, photos:survey_room_photos(url, sort_order))').eq('id', id).single()`.
**Step 2:** Render header: `survey_number`, status badge (draft=amber, tersimpan=blue, diproses=purple, selesai=green — pola badge status existing), client info.
**Step 3:** Per room: card `section-card` — nama ruangan, foto (gallery/Lightbox), ukuran, model, kain+foto, vitras+foto, rel, hook, catatan.
**Step 4:** Tombol aksi (SRS 10-12):
- **📋 Copy Hasil Survey** → `navigator.clipboard.writeText(formatSurveyText(survey))` + toast "Tersalin"
- **📱 Kirim WhatsApp** → `window.open(buildWhatsAppUrl(survey), '_blank')`
- **📄 Download PDF** → `generateSurveyPDF(survey)`
- **✏️ Edit** → `/surveyor/survey/[id]/edit` (form sama, prefill) — Task C5
**Step 5:** Edit & Delete: surveyor HANYA punya sendiri (RLS enforce — kalau bukan pemilik, query error → tampilkan "Tidak berhak").

### Task C5: Edit survey (SRS 5 — edit survey milik sendiri)

**Files:** Create `src/app/(dashboard)/surveyor/survey/[id]/edit/page.tsx`

**Step 1:** Reuse form Task C2/C3 (extract ke komponen `src/components/survey/SurveyForm.tsx` kalau terasa duplikat — DRY; prop `initial` + `onSave`). Prefill dari data existing.
**Step 2:** Simpan → UPDATE + REPLACE rooms/photos (sama seperti C3 step 3).
**Step 3:** Verifikasi: setelah save, detail tampil data baru.

### Task C6: Riwayat survey + filter (SRS 8)

**Files:** Create `src/app/(dashboard)/surveyor/history/page.tsx`

**Step 1:** Fetch surveys (surveyor_id = current user; RLS) + join `surveyor:users(name)` + `rooms:survey_rooms(count)`.
**Step 2:** Filter: input Nama Client (`.ilike`), input Tanggal Survey (`.eq`), dropdown status.
**Step 3:** Tabel `.data-table`: No Survey, Nama Client, Surveyor, Jumlah Ruangan, Tanggal, Status + aksi: Lihat (→ detail), Edit, Copy, PDF, WA (ikon, reuse util).
**Step 4:** Pagination sederhana (`.range()`) — 20/halaman.

---

## Fase D — Admin/Owner & link ke order

### Task D1: API survey — CRUD server-side (supaya admin/owner & surveyor pakai jalur sama)

**Files:** Create `src/app/api/surveys/route.ts` (POST create, GET list) & `src/app/api/surveys/[id]/route.ts` (GET, PATCH, DELETE)

**Step 1:** POST: terima `{ client_name, client_address, survey_date, surveyor_id, gps_lat, gps_lng, notes, status, rooms: [...] }` → panggil `generate_survey_number()` (RPC) untuk baru → insert surveys + rooms + photos dalam satu handler, cek error tiap step, rollback kalau gagal (pola `src/app/api/orders/route.ts`).
**Step 2:** PATCH: update header + replace rooms/photos.
**Step 3:** GET: list + filter (`?client_name=&survey_date=&status=&surveyor_id=`), join surveyor + room count. **Role gate**: surveyor → cuma `surveyor_id = auth.uid()` (defense-in-depth di API, walau RLS sudah enforce).
**Step 4:** DELETE: hapus survey (rooms/photos cascade).
**Step 5:** tsc + commit

### Task D2: Halaman Admin & Owner — lihat/edit/hapus semua survey (SRS 2)

**Files:** Create `src/app/(dashboard)/admin/surveys/page.tsx` & `src/app/(dashboard)/owner/surveys/page.tsx` (boleh satu komponen shared `src/components/survey/SurveyList.tsx` dipakai 2 route)

**Step 1:** List semua survey (tanpa filter surveyor — role admin/owner lolos RLS) + filter client/tanggal/status/surveyor.
**Step 2:** Aksi: Lihat detail (buka `/surveyor/survey/[id]` — RLS admin lolos), Edit, Delete (confirm), Copy, PDF, WA.
**Step 3:** Statistik mini di atas (owner): total survey, per surveyor (SRS 13 dashboard statistik) — `surveys.select('surveyor_id', count)` + group by.
**Step 4:** Tambah link di sidebar admin & owner: `{ label: 'Survey', href: '/admin/surveys', icon: <ClipboardList /> }`.

### Task D3: Link survey → order (fitur "masuk lgsg ke invoice")

**Files:** Modify `src/app/(dashboard)/admin/orders/[id]/page.tsx` + `src/app/(dashboard)/surveyor/survey/[id]/page.tsx`

**Step 1:** Di detail order: section "Hasil Survey" — kalau `order.survey_id` ada, tampilkan ringkasan + link ke `/surveyor/survey/[survey_id]`; tombol "Pilih Survey" → modal daftar survey (client_name + tanggal) → PATCH `orders.survey_id`.
**Step 2:** Di detail survey: tombol "Link ke Order" → input order_number/select order → PATCH `orders.survey_id = survey.id`.
**Step 3:** Setelah link, tombol Invoice di order menampilkan blok HASIL SURVEY (sudah otomatis via invoice.ts).

---

## Fase E — QA & closing

### Task E1: QA role surveyor end-to-end

**Step 1:** Buat akun test role surveyor (pola skill kj-homedecor QA auth: `sb.auth.admin.createUser` + insert `users` role surveyor).
**Step 2:** Login → redirect ke `/surveyor` (middleware A1 + layout A2 + login A3).
**Step 3:** Buat survey (2 ruangan + 1 foto) → simpan → muncul di riwayat → copy text → WA URL → PDF (cek tidak error).
**Step 4:** Login owner → buka `/owner/surveys` → lihat survey test → link ke order → generate invoice (cek blok HASIL SURVEY muncul).
**Step 5:** Coba akses survey milik user lain sebagai surveyor → HARUS ditolak (RLS). Hapus akun + data test setelah QA.

### Task E2: Closing

**Step 1:** `npx tsc --noEmit` → `npm run build` (exit 0).
**Step 2:** `timeout 120 graphify update .`
**Step 3:** Commit + `git push origin main` → verifikasi `git rev-parse --short HEAD` == `origin/main`.
**Step 4:** Update skill `kj-homedecor` (section Survey: halaman yang dibuat, pola reuse).

---

## Fitur SRS 13 — keputusan scope

| Fitur | MVP? | Catatan |
|---|---|---|
| Nomor survey otomatis KJ-YYYYMMDD-NNN | ✅ | RPC `generate_survey_number()` sudah di production |
| Status (Draft/Tersimpan/Diproses/Selesai) | ✅ | Kolom ada; draft dari auto-save, tersimpan saat submit, diproses/selesai manual |
| Pencarian client/alamat | ✅ | `.ilike` di list |
| Kamera | ✅ | `capture="environment"` di input file |
| Kompresi foto | ✅ | `uploadToLocal` default compress (browser-image-compression) |
| Auto-save draft | ✅ | Debounce 5s → status draft |
| GPS lokasi | ✅ | `navigator.geolocation` (opsional) |
| Copy/WA/PDF | ✅ | util Fase B |
| Notifikasi admin/owner | ⏳ Fase 2 | Badge count di sidebar admin (survey baru hari ini) — murah, bisa dimasukkan |
| Statistik per surveyor | ✅ ringan | Group count di owner dashboard |
| Mode offline + sinkronisasi | ❌ Fase 2 | Butuh PWA/service worker — di luar MVP web |
| Tanda tangan digital | ❌ Fase 2 | Canvas signature — SRS bilang "sebagai bukti"; tanya user prioritas |
| Activity log | ❌ Fase 2 | Tabel `survey_logs` belum ada |
| Backup cloud | ✅ otomatis | Supabase managed |

## Risks & Open Questions

1. **Nama route**: `/surveyor/survey/[id]` dipakai Admin/Owner juga (RLS lolos) — OK, tapi pastikan tombol "Edit" tidak muncul untuk non-surveyor non-owner (cek role di client).
2. **Auto-save vs RLS**: surveyor insert draft → `surveyor_id = auth.uid()` harus di-set otomatis di client (jangan dari input) — kalau diinput user bisa spoof. Set `surveyor_id` dari `supabase.auth.getUser()` di API (server), BUKAN dari body.
3. **Foto di PDF**: `addImage` butuh dataURL — foto dari Supabase storage/uploadToLocal = URL publik, CORS bisa blokir `canvas.toDataURL`. **Fallback aman: render PDF tanpa foto di MVP** (foto tetap ada di detail survey), atau konversi via fetch → blob → FileReader. Verifikasi dulu saat Task B2; kalau CORS bermasalah, skip foto di PDF + catat di laporan.
4. **`generate_survey_number` dipanggil di API** (server), bukan client — RPC butuh permission; service role aman.
5. **DashboardTopNav & DashboardSidebar punya `NAV_BY_ROLE` duplikat** — edit KEDUANYA (Task A4). Pertimbangkan refactor extract ke `src/lib/nav.ts` (opsional, jangan wajib di MVP).
6. **`ROLE_LABELS`** di TopNav — pastikan surveyor ada, kalau tidak label kosong.
7. **Tanya user**: tanda tangan digital & notifikasi masuk MVP atau fase 2? (default: fase 2)
