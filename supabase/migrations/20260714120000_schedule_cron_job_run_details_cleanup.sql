do $$
declare
  existing_job_id bigint;
begin
  select jobid
    into existing_job_id
  from cron.job
  where jobname = 'cleanup-cron-job-run-details-daily'
  limit 1;

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;
end
$$;

select cron.schedule(
  'cleanup-cron-job-run-details-daily',
  '30 4 * * *',
  $$
    delete from cron.job_run_details
    where start_time < now() - interval '7 days';
  $$
);
