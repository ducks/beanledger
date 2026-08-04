-- Packaging inventory is keyed by normalized bag capacity, not product. Grams
-- support both metric and imperial entry without relying on floating-point
-- pounds as an identifier. A 12 oz product normalizes to a 340 g bag.
CREATE TABLE packaging_types (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  size_grams INTEGER NOT NULL CHECK (size_grams > 0),
  on_hand_count INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  PRIMARY KEY (id, tenant_id)
);

CREATE UNIQUE INDEX packaging_types_size_tenant_idx
  ON packaging_types(tenant_id, size_grams);
CREATE INDEX packaging_types_tenant_idx ON packaging_types(tenant_id);

-- A committed snapshot of what was consumed when a roast day was completed.
-- Keeping all three counts makes historical reports independent of later
-- restocks and inventory corrections.
CREATE TABLE packaging_usage (
  production_date DATE NOT NULL,
  packaging_type_id UUID NOT NULL,
  starting_count INTEGER NOT NULL,
  filled_count INTEGER NOT NULL CHECK (filled_count >= 0),
  ending_count INTEGER NOT NULL,
  committed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  PRIMARY KEY (production_date, packaging_type_id, tenant_id),
  FOREIGN KEY (production_date, tenant_id)
    REFERENCES production_days(production_date, tenant_id) ON DELETE CASCADE,
  FOREIGN KEY (packaging_type_id, tenant_id)
    REFERENCES packaging_types(id, tenant_id) ON DELETE RESTRICT
);

CREATE INDEX packaging_usage_tenant_date_idx
  ON packaging_usage(tenant_id, production_date);
