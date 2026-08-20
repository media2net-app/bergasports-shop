-- Optional subscriber name + campaign scheduling

alter table public.newsletter_subscribers
  add column if not exists name text;

alter table public.newsletter_campaigns
  add column if not exists scheduled_at timestamptz;

alter table public.newsletter_campaigns
  drop constraint if exists newsletter_campaigns_status_check;

alter table public.newsletter_campaigns
  add constraint newsletter_campaigns_status_check
  check (status in ('draft', 'scheduled', 'sending', 'sent', 'failed'));

create index if not exists newsletter_campaigns_scheduled_due_idx
  on public.newsletter_campaigns (scheduled_at)
  where status = 'scheduled' and scheduled_at is not null;

comment on column public.newsletter_campaigns.scheduled_at is
  'When status=scheduled, cron /api/cron/newsletter sends the campaign at or after this time.';
