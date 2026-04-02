-- Fix leftovers primary key to be composite (group_id, tenant_id)
-- The original schema intended this but the PK was only on group_id,
-- breaking multi-tenancy (all tenants shared the same leftover rows)

-- Drop the old primary key
ALTER TABLE leftovers DROP CONSTRAINT leftovers_pkey;

-- Add the correct composite primary key
ALTER TABLE leftovers ADD PRIMARY KEY (group_id, tenant_id);

-- Re-insert any missing tenant-specific leftovers that were blocked by the old PK
-- (tenants whose leftovers were silently dropped due to group_id conflicts)
