-- 059_revoke_anon_privileges.sql
-- Tujuan: tutup kebocoran PII & privilege berlebih untuk role anon (publik tanpa login)
-- Konteks: publishable key (ada di bundle browser) bisa dipakai siapa saja.
--   Sebelumnya anon punya SELECT/INSERT/UPDATE/DELETE di orders, customers, users,
--   accounts, journal_entries — dan policy SELECT install_bookings = true
--   (publik bisa baca customer_name, customer_phone, address semua booking).

-- 1) install_bookings: anon HANYA boleh INSERT (form booking) + baca kolom jadwal
--    (dipakai halaman /booking untuk slot occupied). Kolom PII tidak bisa dibaca anon.
REVOKE SELECT ON public.install_bookings FROM anon;
GRANT SELECT (scheduled_date, scheduled_time) ON public.install_bookings TO anon;
GRANT INSERT ON public.install_bookings TO anon;

-- 2) Tabel internal: hapus SEMUA privilege anon — tidak ada alur publik yang memakainya
--    (semua akses lewat API routes dengan service role / session authenticated).
REVOKE ALL ON public.orders FROM anon;
REVOKE ALL ON public.customers FROM anon;
REVOKE ALL ON public.users FROM anon;
REVOKE ALL ON public.accounts FROM anon;
REVOKE ALL ON public.journal_entries FROM anon;
REVOKE ALL ON public.journal_lines FROM anon;

-- Catatan: products & landing_settings sengaja tetap SELECT publik (katalog + konten landing).
