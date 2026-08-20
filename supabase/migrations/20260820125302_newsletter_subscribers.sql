-- Newsletter signups (footer / opt-in) linked to a welcome coupon code
create table if not exists public.newsletter_subscribers (
  id text primary key,
  email text not null,
  source text not null default 'footer',
  coupon_code text,
  created_at timestamptz not null default now()
);

create unique index if not exists newsletter_subscribers_email_uidx
  on public.newsletter_subscribers (lower(email));

create index if not exists newsletter_subscribers_created_at_idx
  on public.newsletter_subscribers (created_at desc);

alter table public.marketing_email_log
  drop constraint if exists marketing_email_log_kind_check;

alter table public.marketing_email_log
  add constraint marketing_email_log_kind_check
  check (kind in ('welcome', 'post_purchase', 'win_back', 'newsletter'));
