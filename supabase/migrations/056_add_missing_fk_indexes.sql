-- Migration 056: Add missing foreign key indexes
-- Fixes High #9
--
-- Adds indexes on foreign key columns and frequently queried columns
-- to improve JOIN performance across the schema.

BEGIN;

-- Orders
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

-- Order items
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);

-- Production jobs
CREATE INDEX IF NOT EXISTS idx_production_jobs_order_id ON public.production_jobs(order_id);
CREATE INDEX IF NOT EXISTS idx_production_jobs_penjahit_id ON public.production_jobs(penjahit_id);

-- Payments
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);

-- QC records
CREATE INDEX IF NOT EXISTS idx_qc_records_order_id ON public.qc_records(order_id);

-- Customers
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);

COMMIT;
