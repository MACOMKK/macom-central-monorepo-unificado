create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;
do $$
declare
  existing_job_id bigint;
begin
  select jobid
    into existing_job_id
  from cron.job
  where jobname = 'servicos-lembrete-aprovacoes-hourly'
  limit 1;

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;
end
$$;
select cron.schedule(
  'servicos-lembrete-aprovacoes-hourly',
  '0 * * * *',
  $$
    select net.http_post(
      url := 'https://jbqacvlpgqhpvncjhoom.supabase.co/functions/v1/servicos-lembrete-aprovacoes',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhc2UiLCJyZWYiOiJqYnFhY3ZscGdxaHB2bmNqaG9vbSIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzc4MTE5OTUwLCJleHAiOjIwOTM2OTU5NTB9.aE39m_f6Mk3EysJ9jdPLLeeMM89Pcm0N9gDv9JZV6ao',
        'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhc2UiLCJyZWYiOiJqYnFhY3ZscGdxaHB2bmNqaG9vbSIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzc4MTE5OTUwLCJleHAiOjIwOTM2OTU5NTB9.aE39m_f6Mk3EysJ9jdPLLeeMM89Pcm0N9gDv9JZV6ao'
      ),
      body := '{}'::jsonb
    ) as request_id;
  $$
);
