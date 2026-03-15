-- Add CASCADE DELETE to foreign key constraints
-- This allows deleting roast groups that have products

-- Drop and recreate products foreign key with CASCADE DELETE
ALTER TABLE products
  DROP CONSTRAINT IF EXISTS products_group_id_tenant_fkey;

ALTER TABLE products
  ADD CONSTRAINT products_group_id_tenant_fkey
  FOREIGN KEY (group_id, tenant_id)
  REFERENCES roast_groups(id, tenant_id)
  ON DELETE CASCADE;
