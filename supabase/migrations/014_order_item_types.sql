-- Add item_type and laundry link to order_items
ALTER TABLE order_items ADD COLUMN item_type TEXT DEFAULT 'gorden';
ALTER TABLE order_items ADD COLUMN linked_laundry_id UUID REFERENCES laundry_orders(id);
