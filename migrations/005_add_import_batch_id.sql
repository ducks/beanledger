-- Add import_batch_id to track CSV imports
-- This allows us to delete only imported orders, not manual ones

ALTER TABLE orders ADD COLUMN import_batch_id TEXT;

-- Add index for efficient deletion by batch
CREATE INDEX idx_orders_import_batch ON orders(import_batch_id) WHERE import_batch_id IS NOT NULL;

-- Add comment to explain the column
COMMENT ON COLUMN orders.import_batch_id IS 'UUID identifying which CSV import batch this order came from. NULL for manual orders.';
