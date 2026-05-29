-- Homepage „Produse populare” — run in Supabase SQL Editor if not applied via migration.

alter table public.products
  add column if not exists featured_on_homepage boolean not null default false;

create index if not exists products_featured_on_homepage_idx
  on public.products (featured_on_homepage, updated_at desc)
  where featured_on_homepage = true;
