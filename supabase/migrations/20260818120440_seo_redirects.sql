-- SEO 301-redirects (oude WordPress/WooCommerce-URL's → nieuwe shop-paden).
-- Alleen via Prisma/server; niet exposen op de Data API.

create table if not exists public.seo_redirects (
  id bigint generated always as identity primary key,
  source_path text not null,
  destination_path text not null,
  status_code smallint not null default 301,
  kind text not null default 'static',
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seo_redirects_source_path_key unique (source_path),
  constraint seo_redirects_status_code_chk check (status_code in (301, 302, 307, 308)),
  constraint seo_redirects_source_not_empty_chk check (char_length(source_path) > 0),
  constraint seo_redirects_dest_not_empty_chk check (char_length(destination_path) > 0)
);

comment on table public.seo_redirects is
  'Pad-mapping voor 301-redirects bij de WP/Woo-cutover. source_path is genormaliseerd (lowercase, geen trailing slash).';

create index if not exists seo_redirects_lookup_idx
  on public.seo_redirects (source_path)
  where enabled;

create index if not exists seo_redirects_kind_idx
  on public.seo_redirects (kind);

alter table public.seo_redirects enable row level security;
