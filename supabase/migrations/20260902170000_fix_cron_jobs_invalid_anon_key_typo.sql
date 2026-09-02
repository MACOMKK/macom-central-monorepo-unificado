-- Corrige um typo presente desde a criacao destes cron jobs (20260508132000...): o JWT usado nos
-- headers Authorization/apikey tinha "iss":"supase" (faltando "ba") em vez de "iss":"supabase".
-- Isso invalidava a assinatura do token e o gateway do Supabase rejeitava toda chamada com
-- 401 UNAUTHORIZED_LEGACY_JWT -- ou seja, processa-fila-email (a cada minuto),
-- servicos-lembrete-aprovacoes (hora em hora) e security-alerta-picos-login (a cada 15min) nunca
-- autenticaram com sucesso desde que foram criados. Confirmado em producao via
-- net._http_response: 390/390 chamadas com status_code 401 nas ultimas horas antes desta migration.
--
-- Reagenda os 4 jobs afetados (incluindo o novo intranet-notifica-aniversariante, que copiou o
-- mesmo valor quebrado) com a chave anon correta.

do $$
declare
  job record;
begin
  for job in
    select jobid, jobname
    from cron.job
    where jobname in (
      'processa-fila-email-every-minute',
      'servicos-lembrete-aprovacoes-hourly',
      'security-alerta-picos-login-15min',
      'intranet-notifica-aniversariante-daily'
    )
  loop
    perform cron.unschedule(job.jobid);
  end loop;
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
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpicWFjdmxwZ3FocHZuY2pob29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxMTk5NTAsImV4cCI6MjA5MzY5NTk1MH0.aE39m_f6Mk3EysJ9jdPLLeeMM89Pcm0N9gDv9JZV6ao',
        'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpicWFjdmxwZ3FocHZuY2pob29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxMTk5NTAsImV4cCI6MjA5MzY5NTk1MH0.aE39m_f6Mk3EysJ9jdPLLeeMM89Pcm0N9gDv9JZV6ao',
        'x-invoke-secret', 'rJf1vBBA5sfNU3oM3LyjWk5zxFhi4NJv'
      ),
      body := '{"batch_size": 10}'::jsonb
    ) as request_id;
  $$
);

select cron.schedule(
  'servicos-lembrete-aprovacoes-hourly',
  '0 * * * *',
  $$
    select net.http_post(
      url := 'https://jbqacvlpgqhpvncjhoom.supabase.co/functions/v1/servicos-lembrete-aprovacoes',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpicWFjdmxwZ3FocHZuY2pob29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxMTk5NTAsImV4cCI6MjA5MzY5NTk1MH0.aE39m_f6Mk3EysJ9jdPLLeeMM89Pcm0N9gDv9JZV6ao',
        'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpicWFjdmxwZ3FocHZuY2pob29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxMTk5NTAsImV4cCI6MjA5MzY5NTk1MH0.aE39m_f6Mk3EysJ9jdPLLeeMM89Pcm0N9gDv9JZV6ao',
        'x-invoke-secret', 'rJf1vBBA5sfNU3oM3LyjWk5zxFhi4NJv'
      ),
      body := '{}'::jsonb
    ) as request_id;
  $$
);

select cron.schedule(
  'security-alerta-picos-login-15min',
  '*/15 * * * *',
  $$
    select net.http_post(
      url := 'https://jbqacvlpgqhpvncjhoom.supabase.co/functions/v1/security-alerta-picos-login',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpicWFjdmxwZ3FocHZuY2pob29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxMTk5NTAsImV4cCI6MjA5MzY5NTk1MH0.aE39m_f6Mk3EysJ9jdPLLeeMM89Pcm0N9gDv9JZV6ao',
        'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpicWFjdmxwZ3FocHZuY2pob29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxMTk5NTAsImV4cCI6MjA5MzY5NTk1MH0.aE39m_f6Mk3EysJ9jdPLLeeMM89Pcm0N9gDv9JZV6ao'
      ),
      body := '{}'::jsonb
    ) as request_id;
  $$
);

select cron.schedule(
  'intranet-notifica-aniversariante-daily',
  '0 8 * * *',
  $$
    select net.http_post(
      url := 'https://jbqacvlpgqhpvncjhoom.supabase.co/functions/v1/intranet-notifica-aniversariante',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpicWFjdmxwZ3FocHZuY2pob29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxMTk5NTAsImV4cCI6MjA5MzY5NTk1MH0.aE39m_f6Mk3EysJ9jdPLLeeMM89Pcm0N9gDv9JZV6ao',
        'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpicWFjdmxwZ3FocHZuY2pob29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxMTk5NTAsImV4cCI6MjA5MzY5NTk1MH0.aE39m_f6Mk3EysJ9jdPLLeeMM89Pcm0N9gDv9JZV6ao',
        'x-invoke-secret', 'rJf1vBBA5sfNU3oM3LyjWk5zxFhi4NJv'
      ),
      body := '{}'::jsonb
    ) as request_id;
  $$
);
