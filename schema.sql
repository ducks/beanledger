-- BeanLedger Schema
-- Extracted from roast-planner-4.jsx working prototype

-- Tenants (roaster companies)
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Users (belong to tenants)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);

-- Sessions table for authentication
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- Roast groups (coffee families with shared roast profile)
CREATE TABLE roast_groups (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  tag TEXT NOT NULL,
  batch_type TEXT NOT NULL CHECK (batch_type IN ('standard', 'dark', 'decaf')),
  roast_loss_pct REAL NOT NULL DEFAULT 0,
  type TEXT NOT NULL CHECK (type IN ('blend', 'single_origin')),
  components JSONB DEFAULT '[]',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at DATE NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE
);

-- Products (SKUs with bag sizes)
CREATE TABLE products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  lbs REAL NOT NULL,
  group_id TEXT NOT NULL REFERENCES roast_groups(id) ON DELETE CASCADE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at DATE NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE
);

-- Orders (per production date)
CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  qty INTEGER NOT NULL,
  production_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE
);

-- Leftovers (roasted coffee remaining per group)
CREATE TABLE leftovers (
  group_id TEXT PRIMARY KEY REFERENCES roast_groups(id) ON DELETE CASCADE,
  lbs REAL NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE
);

-- Batch size overrides (optional custom batch weights)
CREATE TABLE batch_overrides (
  batch_type TEXT PRIMARY KEY CHECK (batch_type IN ('standard', 'dark', 'decaf')),
  weight_lbs REAL NOT NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE
);

-- Production summaries (saved snapshots per date)
CREATE TABLE production_summaries (
  id TEXT PRIMARY KEY,
  production_date DATE NOT NULL,
  summary JSONB NOT NULL,
  saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_products_group ON products(group_id);
CREATE INDEX idx_orders_product ON orders(product_id);
CREATE INDEX idx_orders_date ON orders(production_date);
CREATE INDEX idx_summaries_date ON production_summaries(production_date);

-- Tenant filtering indexes (for multi-tenant performance)
CREATE INDEX idx_roast_groups_tenant ON roast_groups(tenant_id);
CREATE INDEX idx_products_tenant ON products(tenant_id);
CREATE INDEX idx_orders_tenant ON orders(tenant_id);
CREATE INDEX idx_leftovers_tenant ON leftovers(tenant_id);
CREATE INDEX idx_batch_overrides_tenant ON batch_overrides(tenant_id);
CREATE INDEX idx_production_summaries_tenant ON production_summaries(tenant_id);

-- Default batch sizes (can be overridden)
-- standard: 20.2 lb
-- dark: 19.8 lb
-- decaf: 10.73 lb
