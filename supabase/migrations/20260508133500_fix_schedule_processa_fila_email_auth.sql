do $$
declare
  existing_job_id bigint;
begin
  select jobid
    into existing_job_id
  from cron.job
  where jobname = 'processa-fila-email-every-minute'
  limit 1;

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;
end
$$;
select cron.schedule(
  'processa-fila-email-every-minute',
  '* * * * *',
  $$
    select net.http_post(
      url := 'https://jbqacvlpgqhpvncjhoom.supabase.co/functions/v1/processa-fila-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhc2UiLCJyZWYiOiJqYnFhY3ZscGdxaHB2bmNqaG9vbSIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzc4MTE5OTUwLCJleHAiOjIwOTM2OTU5NTB9.aE39m_f6Mk3EysJ9jdPLLeeMM89Pcm0N9gDv9JZV6ao'
      ),
      body := '{"batch_size": 10}'::jsonb
    ) as request_id;
  $$
);
