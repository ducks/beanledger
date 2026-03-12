-- Remove CHECK constraints that limit batch types to hardcoded values
-- This allows dynamic batch type management

-- Drop the CHECK constraint on roast_groups.batch_type
ALTER TABLE roast_groups DROP CONSTRAINT IF EXISTS roast_groups_batch_type_check;

-- Drop the CHECK constraint on batch_overrides.batch_type
ALTER TABLE batch_overrides DROP CONSTRAINT IF EXISTS batch_overrides_batch_type_check;

-- Fix batch_overrides to be properly multi-tenant
-- Drop the old primary key
ALTER TABLE batch_overrides DROP CONSTRAINT IF EXISTS batch_overrides_pkey;

-- Make batch_type + tenant_id the composite primary key
ALTER TABLE batch_overrides ADD PRIMARY KEY (batch_type, tenant_id);

-- Make tenant_id NOT NULL (it might have been nullable before)
ALTER TABLE batch_overrides ALTER COLUMN tenant_id SET NOT NULL;
