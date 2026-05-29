-- Marketing consent on checkout + idempotent marketing email log
alter table public.orders
  add column if not exists marketing_consent boolean not null default false;

create table if not exists public.marketing_email_log (
  id bigint generated always as identity primary key,
  email text not null,
  kind text not null check (kind in ('welcome', 'post_purchase', 'win_back')),
  order_id bigint references public.orders (id) on delete set null,
  sent_at timestamptz not null default now()
);

create index if not exists marketing_email_log_email_kind_idx
  on public.marketing_email_log (email, kind);

create index if not exists marketing_email_log_sent_at_idx
  on public.marketing_email_log (sent_at desc);
