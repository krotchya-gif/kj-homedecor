-- Phase 2 (BUG-093): TikTok OAuth `state` = random nonce single-use, bukan shop_id.
-- Sebelumnya state = settings.id (predictable) — attacker yang tahu shop_id bisa
-- memanipulasi callback. Nonce random disimpan di kolom ini, dicocokkan & dihapus
-- setelah callback dipakai (anti replay).
ALTER TABLE public.tiktok_shop_settings ADD COLUMN IF NOT EXISTS oauth_state TEXT;
