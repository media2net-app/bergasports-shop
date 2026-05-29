-- Voer dit uit in Supabase → SQL Editor (één keer).
-- Slaat de volledige product-JSON op; primary key = Trendyol/Woo product-id.

create table if not exists public.products (
  id bigint not null primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists products_updated_at_idx on public.products (updated_at desc);

comment on table public.products is 'E-Store House catalogus (sync uit trendyol-products.json)';

alter table public.products enable row level security;

-- Geen policies: alleen de service_role key (server) kan lezen/schrijven via PostgREST.
-- Wil je later de shop vanuit Supabase laten lezen: voeg een SELECT-policy voor anon toe.
