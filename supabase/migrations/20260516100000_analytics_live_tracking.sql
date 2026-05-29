-- Live visitor analytics (admin Live View)

create table if not exists public.analytics_sessions (
  id uuid primary key default gen_random_uuid(),
  visitor_id text not null,
  session_id text not null unique,
  country_code text,
  city text,
  region text,
  latitude double precision,
  longitude double precision,
  user_agent text,
  referrer text,
  current_path text not null default '/',
  current_product_id bigint,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists analytics_sessions_last_seen_idx
  on public.analytics_sessions (last_seen_at desc);

create index if not exists analytics_sessions_first_seen_idx
  on public.analytics_sessions (first_seen_at desc);

create table if not exists public.analytics_page_views (
  id uuid primary key default gen_random_uuid(),
  session_id text not null references public.analytics_sessions (session_id) on delete cascade,
  path text not null,
  product_id bigint,
  viewed_at timestamptz not null default now()
);

create index if not exists analytics_page_views_viewed_at_idx
  on public.analytics_page_views (viewed_at desc);

create index if not exists analytics_page_views_path_idx
  on public.analytics_page_views (path);

create index if not exists analytics_page_views_product_idx
  on public.analytics_page_views (product_id)
  where product_id is not null;

alter table public.analytics_sessions enable row level security;
alter table public.analytics_page_views enable row level security;
