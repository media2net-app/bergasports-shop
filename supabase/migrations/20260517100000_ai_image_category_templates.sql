-- Category → AI image template mappings (admin only, service role via API)

CREATE TABLE IF NOT EXISTS public.ai_image_category_templates (
  category_slug TEXT PRIMARY KEY,
  template_id TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_image_category_templates ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.ai_image_category_templates IS
  'Maps shop category slugs to AI image template ids for auto-selection in admin.';
