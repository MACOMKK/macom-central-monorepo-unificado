alter table public.push_subscriptions
  add column if not exists tipo_dispositivo text,
  add column if not exists sistema_operacional text,
  add column if not exists navegador text;
