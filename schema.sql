-- BeanLedger Schema
-- Extracted from roast-planner-4.jsx working prototype

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
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products (SKUs with bag sizes)
CREATE TABLE products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  lbs REAL NOT NULL,
  group_id TEXT NOT NULL REFERENCES roast_groups(id) ON DELETE CASCADE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at DATE NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders (per production date)
CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  qty INTEGER NOT NULL,
  production_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Leftovers (roasted coffee remaining per group)
CREATE TABLE leftovers (
  group_id TEXT PRIMARY KEY REFERENCES roast_groups(id) ON DELETE CASCADE,
  lbs REAL NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Batch size overrides (optional custom batch weights)
CREATE TABLE batch_overrides (
  batch_type TEXT PRIMARY KEY CHECK (batch_type IN ('standard', 'dark', 'decaf')),
  weight_lbs REAL NOT NULL
);

-- Production summaries (saved snapshots per date)
CREATE TABLE production_summaries (
  id TEXT PRIMARY KEY,
  production_date DATE NOT NULL,
  summary JSONB NOT NULL,
  saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_products_group ON products(group_id);
CREATE INDEX idx_orders_product ON orders(product_id);
CREATE INDEX idx_orders_date ON orders(production_date);
CREATE INDEX idx_summaries_date ON production_summaries(production_date);

-- Default batch sizes (can be overridden)
-- standard: 20.2 lb
-- dark: 19.8 lb
-- decaf: 10.73 lb
