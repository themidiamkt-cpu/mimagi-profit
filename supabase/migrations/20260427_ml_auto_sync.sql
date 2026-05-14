-- Create ml_auto_sync migration
-- This migration enables pg_cron and schedules a job to sync Mercado Livre data hourly.

-- 1. Enable extensions if not already present
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 2. Schedule the job
-- NOTE: The user will need to replace YOUR_SERVICE_ROLE_KEY or use a vault secret.
-- We use mujaacymoymysjvkvtdm as the project ref based on the current config.

select cron.schedule(
  'ml-auto-sync-every-hour',
  '0 * * * *',
  $$
  select
    net.http_post(
      url := 'https://mujaacymoymysjvkvtdm.supabase.co/functions/v1/ml-auto-sync',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
      body := '{}'::jsonb
    ) as request_id;
  $$
);

-- Job agendado com sucesso.
