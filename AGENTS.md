<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:postgres-rls-rules -->

# Aturan RLS PostgreSQL (jangan diulang — pelajaran dari BUG-035)

## ❌ LARANGAN UTAMA: jangan pernah pakai subquery langsung ke tabel yang SAMA di dalam policy RLS

```sql
-- ❌ SALAH — menyebabkan INFINITE RECURSION (42P17):
-- Postgres mengevaluasi RLS untuk subquery tsb → policy dipanggil lagi → loop.
-- Akibat: SEMUA query ke tabel tsb error 500 dari sisi user login,
-- aplikasi terlihat "login loop" / stuck.
CREATE POLICY "Admin manage users" ON public.users
  FOR ALL USING (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin','owner'));

-- ❌ SALAH juga — ini BENAR-BENAR terjadi (migration 067, difix di 071):
DROP POLICY IF EXISTS "Admin manage users" ON public.users;
CREATE POLICY "Admin manage users" ON public.users
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND status = 'active' AND role IN ('admin','owner'))
  ) WITH CHECK (...sama...);
```

## ✅ POLA YANG BENAR: helper `SECURITY DEFINER` (bypass RLS di dalam fungsi)

```sql
-- Helper: SECURITY DEFINER + SET search_path = public
CREATE OR REPLACE FUNCTION public.is_admin_or_owner_sd()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND status = 'active' AND role IN ('admin','owner')
  );
$$;
REVOKE ALL ON FUNCTION public.is_admin_or_owner_sd() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin_or_owner_sd() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_admin_or_owner_sd() TO authenticated;

-- Policy pakai helper (BUKAN subquery langsung)
DROP POLICY IF EXISTS "Admin manage users" ON public.users;
CREATE POLICY "Admin manage users" ON public.users
  FOR ALL USING (public.is_admin_or_owner_sd())
  WITH CHECK (public.is_admin_or_owner_sd());
```

## Aturan tambahan

1. **Semua helper role**: pola `is_finance_role()` (migration 063) & `is_admin_or_owner_sd()` (migration 071) = `SECURITY DEFINER` + `REVOKE PUBLIC/anon` + `GRANT authenticated`.
2. **Jangan pernah** membuat policy yang melakukan SELECT ke tabel yang di-policy-kan (tabel sama), langsung atau transitif.
3. **Test selalu dari sisi user** (bukan service_role): `SELECT * FROM <tabel>` dengan user biasa — service_role bypass RLS sehingga tidak akan pernah menangkap recursion.
4. Setelah ubah policy: jalankan query user-level sebelum push (mis. via `supabase db push` lalu test SELECT dengan token user).
5. Gejala khas jika melanggar: `42P17 infinite recursion detected in policy`, aplikasi stuck di halaman login, semua akun gagal masuk — padahal login API level (auth/v1/token) berhasil.

<!-- END:postgres-rls-rules -->

<!-- BEGIN:migration-vs-live-db-rules -->

# JANGAN baca file migrasi per-file sebagai referensi schema (pelajaran dari BUG-035 & drift berulang)

## ❌ LARANGAN: `supabase/migrations/*.sql` TIDAK PERNAH sama dengan DB live

- File migrasi sering dijalankan **manual / sebagian / tidak urut** di SQL Editor Supabase, lalu ada perbaikan lagi di SQL Editor langsung. Hasilnya: **live DB ≠ jumlah migrasi**.
- Banyak perubahan dibuat **langsung di dashboard SQL** tanpa migration (contoh: tabel `notifications`, kolom `piutang.remaining`, fungsi produksi `process_return_refund` dll — hanya ada di live).
- Sudah terjadi berkali-kali: audit berdasarkan file migrasi menghasilkan temuan **false-positive** (mis. klaim "kolom hilang" padahal ada di live, klaim "RLS terbuka" padahal sudah di-patch manual).

## ✅ YANG BENAR sebagai referensi

1. **`supabase/migrations/000_full_schema.sql`** = SATU-SATUNYA referensi schema di repo. File ini harus selalu dijaga agar = kondisi live (bukan kumpulan patch per-file).
2. Kalau butuh kepastian kondisi live: jalankan **query read-only via service role** (`information_schema.columns`, `pg_policies`, `pg_proc`) — bukan menebak dari migration.
3. Kalau menemukan kolom/tabel/policy yang dipakai codebase tapi tidak ada di `000_full_schema.sql`: **UPDATE file itu** (tambahkan `CREATE TABLE IF NOT EXISTS` / `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` / policy final) — bukan cuma mencatat.
4. Saat menambah kolom/tabel baru lewat migration: **langsung sinkronkan `000_full_schema.sql`** di commit yang sama.

## Pengecualian

- Migration **baru** yang kita buat sendiri (063+ ke atas) BISA dibaca — karena kita yang menulisnya dan sudah di-push ke live.
- Migration lama (`001`–`062`) hanya untuk **sejarah**; jangan dijadikan dasar analisis.

<!-- END:migration-vs-live-db-rules -->

