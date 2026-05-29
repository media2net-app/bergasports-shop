create table if not exists public.marketing_cron_runs (
  id bigint generated always as identity primary key,
  job text not null default 'win_back',
  ran_at timestamptz not null default now(),
  candidates int not null default 0,
  sent int not null default 0,
  ok boolean not null default true,
  detail text
);

create index if not exists marketing_cron_runs_job_ran_at_idx
  on public.marketing_cron_runs (job, ran_at desc);
