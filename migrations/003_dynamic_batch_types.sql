-- Remove CHECK constraints that limit batch types to hardcoded values
-- This allows dynamic batch type management

-- Drop the CHECK constraint on roast_groups.batch_type
ALTER TABLE roast_groups DROP CONSTRAINT IF EXISTS roast_groups_batch_type_check;

-- Drop the CHECK constraint on batch_overrides.batch_type
ALTER TABLE batch_overrides DROP CONSTRAINT IF EXISTS batch_overrides_batch_type_check;

-- Fix batch_overrides to be properly multi-tenant
-- Drop the old primary key
ALTER TABLE batch_overrides DROP CONSTRAINT IF EXISTS batch_overrides_pkey;

-- Make batch_type + tenant_id the composite primary key (only if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'batch_overrides_pkey' AND conrelid = 'batch_overrides'::regclass
  ) THEN
    ALTER TABLE batch_overrides ADD PRIMARY KEY (batch_type, tenant_id);
  END IF;
END $$;

-- Make tenant_id NOT NULL (it might have been nullable before)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'batch_overrides' AND column_name = 'tenant_id' AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE batch_overrides ALTER COLUMN tenant_id SET NOT NULL;
  END IF;
END $$;
