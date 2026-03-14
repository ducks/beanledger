-- Migration 001: Add multi-tenant authentication
-- Adds tenants and users tables, tenant_id to all data tables

-- Tenants (roaster companies)
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Users (belong to tenants)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Add tenant_id to existing tables
ALTER TABLE roast_groups ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE leftovers ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE batch_overrides ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE production_summaries ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Create indexes for tenant filtering (performance)
CREATE INDEX IF NOT EXISTS idx_roast_groups_tenant ON roast_groups(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_tenant ON products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_orders_tenant ON orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leftovers_tenant ON leftovers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_batch_overrides_tenant ON batch_overrides(tenant_id);
CREATE INDEX IF NOT EXISTS idx_production_summaries_tenant ON production_summaries(tenant_id);

-- Migration for existing data:
-- Create a default tenant for existing data
-- This assumes you have existing data that needs to be preserved
-- If starting fresh, skip this section

DO $$
DECLARE
  default_tenant_id UUID;
BEGIN
  -- Only create default tenant if there's existing data
  IF EXISTS (SELECT 1 FROM roast_groups LIMIT 1) THEN
    -- Create default tenant
    INSERT INTO tenants (name) VALUES ('Default Roaster')
    RETURNING id INTO default_tenant_id;

    -- Assign all existing data to default tenant
    UPDATE roast_groups SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
    UPDATE products SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
    UPDATE orders SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
    UPDATE leftovers SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
    UPDATE batch_overrides SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
    UPDATE production_summaries SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;

    RAISE NOTICE 'Created default tenant with ID: %', default_tenant_id;
    RAISE NOTICE 'You can create a user for this tenant with:';
    RAISE NOTICE 'INSERT INTO users (username, email, password_hash, tenant_id) VALUES (''admin'', ''admin@example.com'', ''<hash>'', ''%'');', default_tenant_id;
  END IF;
END $$;

-- Make tenant_id NOT NULL now that existing data is migrated
DO $$
BEGIN
  -- Only set NOT NULL if column exists and isn't already NOT NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'roast_groups' AND column_name = 'tenant_id' AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE roast_groups ALTER COLUMN tenant_id SET NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'tenant_id' AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE products ALTER COLUMN tenant_id SET NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'tenant_id' AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE orders ALTER COLUMN tenant_id SET NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leftovers' AND column_name = 'tenant_id' AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE leftovers ALTER COLUMN tenant_id SET NOT NULL;
  END IF;
END $$;
-- batch_overrides and production_summaries can stay nullable for now

-- Sessions table for authentication
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
