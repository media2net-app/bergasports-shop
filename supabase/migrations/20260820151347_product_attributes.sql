-- Globale WooCommerce productattributen + termen (eigenschappenbeheer).

create table if not exists public.product_attributes (
  id integer primary key,
  name text not null,
  slug text not null unique,
  type text not null default 'select',
  order_by text,
  has_archives boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists product_attributes_sort_idx
  on public.product_attributes (sort_order, name);

alter table public.product_attributes enable row level security;

create table if not exists public.product_attribute_terms (
  id integer primary key,
  attribute_id integer not null references public.product_attributes(id) on delete cascade,
  name text not null,
  slug text not null,
  menu_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (attribute_id, slug)
);

create index if not exists product_attribute_terms_attr_order_idx
  on public.product_attribute_terms (attribute_id, menu_order);

alter table public.product_attribute_terms enable row level security;

comment on table public.product_attributes is
  'Globale WooCommerce-attributen (pa_*); id = WC attribute id waar mogelijk.';

comment on table public.product_attribute_terms is
  'Termen/opties per globaal attribuut; id = WC term id waar mogelijk.';
