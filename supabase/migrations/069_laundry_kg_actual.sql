-- Migration 069: F-55 Flow Laundry — verifikasi kerja aktual staff
-- Date: 2026-08-12
-- Alur baru: admin input task (kg opsional/estimasi) -> staff laundry TERIMA
-- (in_progress) -> staff LAPOR SELESAI dgn BERAT AKTUAL (kg_actual) -> payroll
-- dihitung dari SUM(kg_actual) per staff per bulan.

BEGIN;

ALTER TABLE public.laundry_orders
  ADD COLUMN IF NOT EXISTS kg_actual NUMERIC,
  ADD COLUMN IF NOT EXISTS reported_by UUID,
  ADD COLUMN IF NOT EXISTS reported_at TIMESTAMPTZ;

COMMIT;
