-- Phase 6D (BUG-109): aktifkan Realtime utk tabel notifications (NotificationBell polling → live).
-- Guard: tambahkan hanya jika belum menjadi anggota publication supabase_realtime.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;
