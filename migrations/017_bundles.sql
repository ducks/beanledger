CREATE TABLE bundles (
  id text NOT NULL,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  contents_mode text NOT NULL CHECK (contents_mode IN ('fixed', 'rotating')),
  quantity_mode text NOT NULL CHECK (quantity_mode IN ('bags', 'packs')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id, tenant_id)
);
CREATE UNIQUE INDEX bundles_import_name ON bundles (tenant_id, lower(btrim(name)));

-- Append-only revisions: editing a lineup never rewrites its prior selections.
CREATE TABLE bundle_revisions (
  id text NOT NULL,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  bundle_id text NOT NULL,
  cycle_start date,
  components jsonb NOT NULL CHECK (jsonb_typeof(components) = 'array'),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id, tenant_id),
  FOREIGN KEY (bundle_id, tenant_id) REFERENCES bundles(id, tenant_id) ON DELETE CASCADE
);
CREATE INDEX bundle_revisions_lookup ON bundle_revisions (tenant_id, bundle_id, cycle_start, created_at DESC);

CREATE TABLE bundle_import_lines (
  id text NOT NULL,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  import_id text NOT NULL,
  bundle_id text NOT NULL,
  revision_id text NOT NULL,
  source_record integer NOT NULL,
  source_name text NOT NULL,
  source_quantity integer NOT NULL CHECK (source_quantity > 0),
  snapshot jsonb NOT NULL,
  PRIMARY KEY (id, tenant_id),
  FOREIGN KEY (import_id, tenant_id) REFERENCES imports(id, tenant_id) ON DELETE CASCADE,
  FOREIGN KEY (bundle_id, tenant_id) REFERENCES bundles(id, tenant_id),
  FOREIGN KEY (revision_id, tenant_id) REFERENCES bundle_revisions(id, tenant_id)
);
CREATE INDEX bundle_import_lines_revision ON bundle_import_lines (tenant_id, revision_id);
ALTER TABLE orders ADD COLUMN bundle_line_id text;
ALTER TABLE orders ADD FOREIGN KEY (bundle_line_id, tenant_id)
  REFERENCES bundle_import_lines(id, tenant_id) ON DELETE CASCADE;
