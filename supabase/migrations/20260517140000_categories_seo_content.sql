-- Optional per-category SEO copy (overrides auto-generated templates when set)

alter table public.categories
  add column if not exists seo_intro text,
  add column if not exists seo_footer_html text;

comment on column public.categories.seo_intro is
  'Short intro above product grid; plain text.';
comment on column public.categories.seo_footer_html is
  'Extended SEO block below grid; safe HTML allowed when set in admin.';
