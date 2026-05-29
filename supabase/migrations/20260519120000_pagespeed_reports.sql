-- PageSpeed Insights test history (admin Performance page)

create table if not exists public.pagespeed_reports (
  id uuid primary key default gen_random_uuid(),
  strategy text not null check (strategy in ('mobile', 'desktop')),
  url text not null,
  analyzed_url text,
  fetched_at timestamptz not null,
  performance_score smallint,
  accessibility_score smallint,
  best_practices_score smallint,
  seo_score smallint,
  report_json jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists pagespeed_reports_strategy_created_idx
  on public.pagespeed_reports (strategy, created_at desc);

create index if not exists pagespeed_reports_created_idx
  on public.pagespeed_reports (created_at desc);

alter table public.pagespeed_reports enable row level security;

-- No policies: admin API uses service_role only.
