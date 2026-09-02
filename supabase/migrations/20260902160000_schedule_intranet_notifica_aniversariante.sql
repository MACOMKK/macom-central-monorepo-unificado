-- Agenda o cron diario (08:00) que dispara a Edge Function intranet-notifica-aniversariante,
-- responsavel por enviar o e-mail de parabens para colaboradores ativos que fazem aniversario no
-- dia (data_nascimento em public.colaboradores). Mesmo padrao de seguranca (x-invoke-secret) ja
-- usado por processa-fila-email e servicos-lembrete-aprovacoes
-- (20260826160000_add_invoke_secret_header_cron_jobs.sql).

do $$
declare
  existing_job_id bigint;
begin
  select jobid
    into existing_job_id
  from cron.job
  where jobname = 'intranet-notifica-aniversariante-daily'
  limit 1;

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;
end
$$;
select cron.schedule(
  'intranet-notifica-aniversariante-daily',
  '0 8 * * *',
  $$
    select net.http_post(
      url := 'https://jbqacvlpgqhpvncjhoom.supabase.co/functions/v1/intranet-notifica-aniversariante',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhc2UiLCJyZWYiOiJqYnFhY3ZscGdxaHB2bmNqaG9vbSIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzc4MTE5OTUwLCJleHAiOjIwOTM2OTU5NTB9.aE39m_f6Mk3EysJ9jdPLLeeMM89Pcm0N9gDv9JZV6ao',
        'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhc2UiLCJyZWYiOiJqYnFhY3ZscGdxaHB2bmNqaG9vbSIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzc4MTE5OTUwLCJleHAiOjIwOTM2OTU5NTB9.aE39m_f6Mk3EysJ9jdPLLeeMM89Pcm0N9gDv9JZV6ao',
        'x-invoke-secret', 'rJf1vBBA5sfNU3oM3LyjWk5zxFhi4NJv'
      ),
      body := '{}'::jsonb
    ) as request_id;
  $$
);
