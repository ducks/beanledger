-- Add production_days table to track roast day lifecycle
-- This enables a clearer workflow: Start → Plan → Finish

CREATE TABLE production_days (
  production_date DATE NOT NULL,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('active', 'scheduled', 'completed')),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  PRIMARY KEY (production_date, tenant_id)
);

CREATE INDEX idx_production_days_tenant ON production_days(tenant_id);
CREATE INDEX idx_production_days_status ON production_days(tenant_id, status);

COMMENT ON TABLE production_days IS 'Tracks lifecycle of production days with status workflow';
COMMENT ON COLUMN production_days.status IS 'active: currently working on, scheduled: planned ahead, completed: finished and locked';
