-- Keys that were global become tenant-scoped, matching the catalog tables,
-- so an id chosen by one tenant can never collide with another's. The
-- planner never relied on global uniqueness; routes already filter by
-- tenant_id everywhere.

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_pkey;
ALTER TABLE orders ADD PRIMARY KEY (id, tenant_id);

ALTER TABLE imports DROP CONSTRAINT IF EXISTS imports_pkey;
ALTER TABLE imports ADD PRIMARY KEY (id, tenant_id);

-- One snapshot per day per tenant, upserted by the server on completion.
DELETE FROM production_summaries a
  USING production_summaries b
  WHERE a.production_date = b.production_date
    AND a.tenant_id = b.tenant_id
    AND a.saved_at < b.saved_at;
ALTER TABLE production_summaries DROP CONSTRAINT IF EXISTS production_summaries_pkey;
ALTER TABLE production_summaries ADD PRIMARY KEY (production_date, tenant_id);

-- At most one active roast day per tenant, enforced by the database rather
-- than a check-then-insert in the route.
CREATE UNIQUE INDEX IF NOT EXISTS production_days_one_active_idx
  ON production_days (tenant_id) WHERE status = 'active';
