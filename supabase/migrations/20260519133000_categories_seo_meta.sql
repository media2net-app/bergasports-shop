-- Unique <title> and meta description per shop category (optional overrides)

alter table public.categories
  add column if not exists seo_meta_title text,
  add column if not exists seo_meta_description text;

comment on column public.categories.seo_meta_title is
  'Override HTML <title> / Open Graph title for /{slug} category listing; plain text, ~60 chars.';
comment on column public.categories.seo_meta_description is
  'Override meta description for category listing; plain text, aim ≤155 chars.';
