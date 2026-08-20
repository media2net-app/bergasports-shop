-- Newsletter subscriber status / consent / locale + campaigns for admin sends

alter table public.newsletter_subscribers
  add column if not exists locale text,
  add column if not exists status text not null default 'active',
  add column if not exists consent_at timestamptz not null default now(),
  add column if not exists unsubscribed_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

alter table public.newsletter_subscribers
  drop constraint if exists newsletter_subscribers_status_check;

alter table public.newsletter_subscribers
  add constraint newsletter_subscribers_status_check
  check (status in ('active', 'unsubscribed'));

create index if not exists newsletter_subscribers_status_idx
  on public.newsletter_subscribers (status);

alter table public.newsletter_subscribers enable row level security;

create table if not exists public.newsletter_campaigns (
  id text primary key,
  subject text not null,
  title text,
  body_html text not null,
  status text not null default 'draft',
  recipient_count integer not null default 0,
  sent_count integer not null default 0,
  fail_count integer not null default 0,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint newsletter_campaigns_status_check
    check (status in ('draft', 'sending', 'sent', 'failed'))
);

create index if not exists newsletter_campaigns_created_at_idx
  on public.newsletter_campaigns (created_at desc);

alter table public.newsletter_campaigns enable row level security;

comment on table public.newsletter_campaigns is
  'Admin-composed newsletter campaigns sent via outbound email to active subscribers.';
