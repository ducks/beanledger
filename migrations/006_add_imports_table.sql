-- Create imports table to track CSV import batches
CREATE TABLE imports (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  production_date DATE NOT NULL,
  imported_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  imported_by TEXT,
  order_count INTEGER NOT NULL DEFAULT 0,
  tenant_id UUID NOT NULL REFERENCES tenants(id)
);

CREATE INDEX idx_imports_tenant ON imports(tenant_id);
CREATE INDEX idx_imports_date ON imports(production_date);

COMMENT ON TABLE imports IS 'Tracks CSV import batches for auditing and undo functionality';
