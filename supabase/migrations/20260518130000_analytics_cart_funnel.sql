-- Cart / checkout funnel fields for live analytics

alter table public.analytics_sessions
  add column if not exists cart_items_count integer not null default 0,
  add column if not exists cart_open boolean not null default false,
  add column if not exists checkout_active boolean not null default false;

create index if not exists analytics_sessions_cart_active_idx
  on public.analytics_sessions (last_seen_at desc)
  where cart_items_count > 0;

create index if not exists analytics_sessions_checkout_active_idx
  on public.analytics_sessions (last_seen_at desc)
  where checkout_active = true;
