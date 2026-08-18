-- Editable transactional email templates (order + marketing)

create table if not exists public.email_templates (
  key text primary key,
  category text not null,
  name text not null,
  description text,
  subject text not null,
  title text not null,
  body_html text not null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists email_templates_category_idx
  on public.email_templates (category);

alter table public.email_templates enable row level security;
