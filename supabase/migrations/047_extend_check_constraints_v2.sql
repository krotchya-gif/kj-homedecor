-- Migration 047: Extend CHECK constraints for Pipeline V2 + installation lifecycle
-- Date: 2026-06-02
-- Reason: Codebase evolved but CHECK constraints in DB not updated, causing
--          400 Bad Request on INSERT/UPDATE.
--
-- Broken constraints fixed:
-- 1. orders.status: missing 'steam' (Pipeline V2 stage between production -> ready)
-- 2. install_bookings.status: missing 'pending', 'in_progress', 'revision'
--    (booking lifecycle: pending -> scheduled -> in_progress -> done,
--     OR pending -> revision -> reschedule)
-- 3. qc_records.result: missing 'revision' (UI has 3 options: pass/fail/revisi)
-- 4. users.role: add 'laundry' (Role type di types/index.ts include 'laundry'
--    untuk forward compatibility — meski belum dipakai di code saat ini)

BEGIN;

-- 1. orders.status — add 'steam' (QC jahitan penjahit)
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS chk_order_status;
ALTER TABLE public.orders ADD CONSTRAINT chk_order_status
  CHECK (status IN ('new','sorted','production','steam','ready','payment_ok','packed','shipped','done','returned','cancelled'));
-- Note: urutan juga di-update sesuai Pipeline V2 visual order
-- new -> sorted -> production -> steam -> ready -> payment_ok -> packed -> shipped -> done

-- 2. install_bookings.status — add pending, in_progress, revision
ALTER TABLE public.install_bookings DROP CONSTRAINT IF EXISTS install_bookings_status_check;
ALTER TABLE public.install_bookings ADD CONSTRAINT install_bookings_status_check
  CHECK (status IN ('pending','scheduled','in_progress','done','revision','cancelled'));

-- 3. qc_records.result — add 'revision' (UI has Pass/Fail/Revisi options)
ALTER TABLE public.qc_records DROP CONSTRAINT IF EXISTS qc_records_result_check;
ALTER TABLE public.qc_records ADD CONSTRAINT qc_records_result_check
  CHECK (result IN ('pass','fail','revision'));

-- 4. users.role — add 'laundry' (forward compatibility dengan Role type)
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin','gudang','penjahit','finance','installer','owner','laundry'));

COMMIT;
