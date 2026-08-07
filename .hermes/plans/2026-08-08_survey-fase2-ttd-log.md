# Survey Fase 2 — Tanda Tangan Digital + Activity Log

> Mode plan — eksekusi berurutan tanpa berhenti. Skip mode offline (keputusan user).

## Goal
1. **Tanda tangan digital**: surveyor tanda tangan di canvas (step review) → simpan ke `surveys.signature` → tampil di detail survey & PDF (sebagai bukti, sesuai SRS).
2. **Activity log**: tabel `survey_logs` mencatat siapa buat/ubah/hapus survey kapan → tampil di detail survey.

## Migration 062 (satu file, dua fitur)
```sql
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS signature TEXT;
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS signature_name TEXT;
CREATE TABLE IF NOT EXISTS survey_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,           -- created / updated / deleted / linked_order
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_survey_logs_survey ON survey_logs(survey_id, created_at DESC);
ALTER TABLE survey_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS survey_logs_admin_all ON survey_logs;
CREATE POLICY survey_logs_admin_all ON survey_logs FOR ALL TO authenticated
  USING (is_admin_or_owner()) WITH CHECK (is_admin_or_owner());
DROP POLICY IF EXISTS survey_logs_surveyor_insert ON survey_logs;
CREATE POLICY survey_logs_surveyor_insert ON survey_logs FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM surveys s WHERE s.id = survey_id AND s.surveyor_id = auth.uid()));
DROP POLICY IF EXISTS survey_logs_surveyor_read ON survey_logs;
CREATE POLICY survey_logs_surveyor_read ON survey_logs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM surveys s WHERE s.id = survey_id AND s.surveyor_id = auth.uid()) OR is_admin_or_owner());
```
Catatan: `is_admin_or_owner()` sudah ada (migration 060). Surveyor baca log survey miliknya; admin/owner semua.

## Task 1 — SignaturePad component
`src/components/ui/SignaturePad.tsx` — canvas touch/mouse, tombol Bersihkan, expose `getDataUrl()` / controlled `value`+`onChange` (resize ke max-width 800px, format PNG). Pitfall: devicePixelRatio untuk ketajaman; pointer events; jangan lintas gambar aneh.

## Task 2 — SurveyForm: tanda tangan di step review
- State `signature` (dataURL) + `signatureName` (default nama surveyor).
- Render di step review: box "Tanda Tangan Surveyor (bukti)" + SignaturePad + input nama.
- Payload simpan (POST & PATCH): tambah `signature`, `signature_name`.

## Task 3 — API surveys: simpan + log
- `api/surveys/route.ts` POST: terima `signature`/`signature_name` → insert; setelah sukses log `created` (non-blocking, console.error kalau gagal).
- `api/surveys/[id]/route.ts` PATCH: update + log `updated`; DELETE: log `deleted` (sebelum delete — survey_id masih ada).

## Task 4 — Detail survey: tampilkan signature + riwayat log
- Section "Tanda Tangan" (gambar + nama + tanggal) kalau `survey.signature`.
- Section "Riwayat Aktivitas": fetch `survey_logs` (survey_id, user:users(name), action, created_at) → list. Label aksi Bahasa Indonesia: created=Survey dibuat, updated=Data diubah, deleted=Survey dihapus, linked_order=Di-link ke order.

## Task 5 — PDF: signature
`survey-pdf.ts`: ganti teks "Tanda tangan Surveyor: ______" → `doc.addImage(signature, 'PNG', ...)` kalau ada (fallback teks kalau tidak / load gagal).

## QA
- Migration via Management API → verifikasi kolom+tabel.
- tsc + build + commit `feat(survey): tanda tangan digital + activity log` + push.
- Restart server 3002 + verifikasi browser (buat survey dengan tanda tangan → detail → PDF).
