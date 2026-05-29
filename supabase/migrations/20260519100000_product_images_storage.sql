-- Product catalog images (mirrored from external URLs into Supabase Storage)

CREATE TABLE IF NOT EXISTS public.product_image_assets (
  source_url TEXT PRIMARY KEY,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  content_type TEXT,
  byte_size INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_image_assets_created_at_idx
  ON public.product_image_assets (created_at DESC);

ALTER TABLE public.product_image_assets ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.product_image_assets IS 'Deduped mirror map: external image URL → Supabase Storage public URL';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  15728640,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 15728640,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']::text[];

CREATE POLICY "Public read product images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'product-images');
