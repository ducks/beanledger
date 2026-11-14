-- Existing catalog remains on legacy matching until explicitly reviewed.
ALTER TABLE products
  ADD COLUMN packaging_mode TEXT NOT NULL DEFAULT 'legacy'
    CHECK (packaging_mode IN ('legacy', 'tracked', 'untracked')),
  ADD COLUMN packaging_type_id UUID,
  ADD CONSTRAINT products_packaging_choice CHECK (
    (packaging_mode = 'tracked' AND packaging_type_id IS NOT NULL) OR
    (packaging_mode <> 'tracked' AND packaging_type_id IS NULL)
  ),
  ADD CONSTRAINT products_packaging_tenant_fk
    FOREIGN KEY (packaging_type_id, tenant_id)
    REFERENCES packaging_types(id, tenant_id) ON DELETE RESTRICT;

-- One resolver for projections and completion. Untracked never falls back.
CREATE VIEW product_packaging AS
SELECT p.id AS product_id, p.tenant_id, p.packaging_mode,
       ROUND(p.lbs * 453.59237)::integer AS size_grams,
       pt.id AS packaging_type_id
FROM products p
LEFT JOIN packaging_types pt ON pt.tenant_id = p.tenant_id AND pt.active
  AND ((p.packaging_mode = 'tracked' AND pt.id = p.packaging_type_id)
    OR (p.packaging_mode = 'legacy' AND pt.size_grams = ROUND(p.lbs * 453.59237)::integer));
