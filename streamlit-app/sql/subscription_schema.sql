-- Run in Supabase SQL editor before enabling paid subscriptions.

alter table if exists public.users
  add column if not exists plan text default 'free',
  add column if not exists subscription_status text default 'inactive',
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists checkout_session_id text,
  add column if not exists current_period_end timestamptz;

create index if not exists idx_users_plan on public.users(plan);
create index if not exists idx_users_subscription_status on public.users(subscription_status);
create index if not exists idx_users_stripe_customer on public.users(stripe_customer_id);
create index if not exists idx_users_stripe_subscription on public.users(stripe_subscription_id);
