create extension if not exists pg_cron;

create or replace function gestao_intranet.limpar_notificacoes_antigas()
returns integer
language plpgsql
security definer
set search_path = gestao_intranet, public
as $$
declare
  deleted_count integer;
begin
  delete from gestao_intranet.notificacoes
  where (lida_em is not null and criado_em < now() - interval '90 days')
     or (lida_em is null and criado_em < now() - interval '180 days');

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

do $$
declare
  existing_job_id bigint;
begin
  select jobid
    into existing_job_id
  from cron.job
  where jobname = 'intranet-notifications-cleanup-daily'
  limit 1;

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;
end
$$;

select cron.schedule(
  'intranet-notifications-cleanup-daily',
  '20 3 * * *',
  $$select gestao_intranet.limpar_notificacoes_antigas();$$
);
