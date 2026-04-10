-- User-defined CSV import formats
-- Each tenant can define their own formats for parsing CSV imports.
-- The config JSONB stores the column mapping (productNameColumn,
-- quantityColumn, aggregate) used by the generic parser.
CREATE TABLE csv_formats (
  id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  config JSONB NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  PRIMARY KEY (id, tenant_id)
);

-- Format names should be unique per tenant
CREATE UNIQUE INDEX csv_formats_name_tenant_idx ON csv_formats(name, tenant_id);
CREATE INDEX idx_csv_formats_tenant ON csv_formats(tenant_id);
