-- Manual / imported metrics per paid channel (campaigns, spend, ROI inputs)
create table if not exists public.marketing_channel_insights (
  channel text primary key check (
    channel in ('tiktok', 'meta', 'google_ads', 'google_merchant', 'email')
  ),
  ad_spend_ron numeric not null default 0,
  attributed_revenue_ron numeric not null default 0,
  impressions bigint not null default 0,
  clicks bigint not null default 0,
  conversions int not null default 0,
  campaigns jsonb not null default '[]'::jsonb,
  notes text,
  updated_at timestamptz not null default now()
);
