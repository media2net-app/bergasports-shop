-- SEO-friendly product URLs (/product/{slug})
ALTER TABLE products ADD COLUMN IF NOT EXISTS slug TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS products_slug_unique_idx ON products (slug)
WHERE slug IS NOT NULL AND slug <> '';

CREATE INDEX IF NOT EXISTS products_slug_lookup_idx ON products (slug);
