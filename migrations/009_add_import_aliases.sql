-- Import aliases: map CSV product names to existing products
-- Useful for rotating subscriptions (e.g., "Single Origin Subscription" -> current week's coffee)
CREATE TABLE import_aliases (
  id TEXT NOT NULL,
  alias_name TEXT NOT NULL,
  product_id TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  PRIMARY KEY (id, tenant_id),
  FOREIGN KEY (product_id, tenant_id) REFERENCES products(id, tenant_id) ON DELETE CASCADE
);

-- Alias names should be unique per tenant (only one alias per CSV name)
CREATE UNIQUE INDEX import_aliases_name_tenant_idx ON import_aliases(alias_name, tenant_id);
CREATE INDEX idx_import_aliases_tenant ON import_aliases(tenant_id);
