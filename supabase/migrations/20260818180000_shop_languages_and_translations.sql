-- Shop languages + JSON locale maps on translatable content.
-- Existing NL (and leftover EN news columns) are copied into translations.xx.

create table if not exists public.shop_languages (
  code text primary key,
  name text not null,
  native_name text not null,
  enabled boolean not null default true,
  is_default boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shop_languages_code_chk check (code ~ '^[a-z]{2}$')
);

create unique index if not exists shop_languages_one_default_idx
  on public.shop_languages (is_default)
  where is_default;

create index if not exists shop_languages_enabled_sort_idx
  on public.shop_languages (enabled, sort_order);

alter table public.shop_languages enable row level security;

insert into public.shop_languages (code, name, native_name, enabled, is_default, sort_order)
values ('nl', 'Nederlands', 'Nederlands', true, true, 0)
on conflict (code) do update
  set name = excluded.name,
      native_name = excluded.native_name,
      is_default = true,
      enabled = true;

alter table public.categories
  add column if not exists translations jsonb not null default '{}'::jsonb;

alter table public.site_pages
  add column if not exists translations jsonb not null default '{}'::jsonb;

alter table public.news_posts
  add column if not exists translations jsonb not null default '{}'::jsonb;

alter table public.email_templates
  add column if not exists translations jsonb not null default '{}'::jsonb;

comment on column public.categories.translations is
  'Locale map: {nl:{name,slug,description,seoTitle,seoDescription,seoFooterHtml}, en:{...}}';
comment on column public.site_pages.translations is
  'Locale map: {nl:{title,heading,slug,path,bodyHtml,metaTitle,...}, en:{...}}';
comment on column public.news_posts.translations is
  'Locale map: {nl:{title,slug,excerpt,bodyHtml,seoTitle,...}, en:{...}}';
comment on column public.email_templates.translations is
  'Locale map: {nl:{subject,title,bodyHtml}, en:{...}}';
comment on column public.products.data is
  'Catalog JSON; translatable copy lives in data.translations.{locale}';

-- Categories: seed nl from current columns
update public.categories
set translations = jsonb_build_object(
  'nl', jsonb_strip_nulls(jsonb_build_object(
    'name', name,
    'slug', slug,
    'description', seo_intro,
    'seoTitle', seo_meta_title,
    'seoDescription', seo_meta_description,
    'seoFooterHtml', seo_footer_html
  ))
)
where translations = '{}'::jsonb
   or translations is null;

-- CMS pages
update public.site_pages
set translations = jsonb_build_object(
  'nl', jsonb_strip_nulls(jsonb_build_object(
    'title', title,
    'heading', heading,
    'slug', slug,
    'path', path,
    'bodyHtml', body_html,
    'metaTitle', meta_title,
    'metaDescription', meta_description,
    'ogTitle', og_title,
    'ogDescription', og_description,
    'imageAlt', image_alt,
    'blocks', blocks
  ))
)
where translations = '{}'::jsonb
   or translations is null;

-- News: nl from columns, en from leftover *_en Woo fields
update public.news_posts
set translations = jsonb_strip_nulls(jsonb_build_object(
  'nl', jsonb_strip_nulls(jsonb_build_object(
    'title', title,
    'slug', slug,
    'excerpt', excerpt,
    'bodyHtml', body_html,
    'seoTitle', seo_title,
    'seoDescription', seo_description,
    'ogTitle', og_title,
    'ogDescription', og_description,
    'imageAlt', image_alt
  )),
  'en', case
    when coalesce(title_en, slug_en, excerpt_en, body_html_en) is null then null
    else jsonb_strip_nulls(jsonb_build_object(
      'title', title_en,
      'slug', slug_en,
      'excerpt', excerpt_en,
      'bodyHtml', body_html_en
    ))
  end
))
where translations = '{}'::jsonb
   or translations is null;

-- Email templates
update public.email_templates
set translations = jsonb_build_object(
  'nl', jsonb_build_object(
    'subject', subject,
    'title', title,
    'bodyHtml', body_html
  )
)
where translations = '{}'::jsonb
   or translations is null;

-- Products: nest current NL copy under data.translations.nl without dropping top-level fields
update public.products
set data = jsonb_set(
  coalesce(data, '{}'::jsonb),
  '{translations}',
  jsonb_build_object(
    'nl', jsonb_strip_nulls(jsonb_build_object(
      'name', data->>'name',
      'slug', coalesce(nullif(data->>'slug', ''), slug),
      'shortDescriptionHtml', data->>'wcShortDescriptionHtml',
      'descriptionHtml', data->>'wcDescriptionHtml',
      'specsText', data->>'specsText',
      'seoTitle', data->>'seoTitle',
      'seoDescription', data->>'seoDescription',
      'ogTitle', data->>'ogTitle',
      'ogDescription', data->>'ogDescription',
      'imageAlt', data->>'imageAlt'
    ))
  ),
  true
)
where coalesce(data->'translations', 'null'::jsonb) = 'null'::jsonb
   or data->'translations' = '{}'::jsonb;
