-- Migration 070: Fix users_role_check — tambah role 'laundry'
-- Date: 2026-08-12
-- Masalah: migration 060 mengganti users_role_check dengan daftar yang TIDAK
-- memuat 'laundry' (padahal 001/000 memuatnya). Kode aplikasi mendukung role
-- laundry (dashboard /laundry) — tapi insert users role=laundry gagal 23514.
-- Fix: drop + recreate dengan daftar LENGKAP (admin, gudang, penjahit,
-- finance, installer, owner, surveyor, laundry).

BEGIN;

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE public.users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin','gudang','penjahit','finance','installer','owner','surveyor','laundry'));

COMMIT;
