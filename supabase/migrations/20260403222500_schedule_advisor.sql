-- Enable pg_cron if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the financial-advisor-agent to run every day at 8:00 AM UTC
-- We use net.http_post to call our edge function
-- Replace the URL with your project's function URL
-- The service role key is needed to bypass RLS and process all users
SELECT cron.schedule(
  'financial-advisor-daily',
  '0 8 * * *',
  $$
  SELECT
    net.http_post(
      url:='https://xskjeusygahhzdoufdyd.supabase.co/functions/v1/financial-advisor-agent',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);
