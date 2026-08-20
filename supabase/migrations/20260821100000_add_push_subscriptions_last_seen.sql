alter table public.push_subscriptions
  add column if not exists last_seen_em timestamptz;
