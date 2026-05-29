-- AI generated product images + public storage bucket

CREATE TABLE IF NOT EXISTS public.ai_generated_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id INTEGER,
  product_name TEXT,
  template_id TEXT NOT NULL,
  shop_category_slug TEXT,
  source_image_url TEXT,
  reference_image_url TEXT,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  prompt TEXT NOT NULL,
  overlay JSONB,
  include_flags JSONB,
  installed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_generated_images_product_id_idx ON public.ai_generated_images (product_id);
CREATE INDEX IF NOT EXISTS ai_generated_images_created_at_idx ON public.ai_generated_images (created_at DESC);

ALTER TABLE public.ai_generated_images ENABLE ROW LEVEL SECURITY;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ai-generated',
  'ai-generated',
  true,
  10485760,
  ARRAY['image/png', 'image/jpeg', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "Public read ai-generated images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'ai-generated');
