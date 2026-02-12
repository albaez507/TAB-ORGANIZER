-- Migration: Create trigger to send email when a library is shared
-- This trigger calls the send-share-email Edge Function via pg_net

-- Enable the pg_net extension (HTTP requests from PostgreSQL)
create extension if not exists pg_net with schema extensions;

-- Create the trigger function
create or replace function handle_new_share()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Call the Edge Function via HTTP using pg_net
  perform
    net.http_post(
      url := 'https://rdipxnnqljdgcfmdemzi.supabase.co/functions/v1/send-share-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object('record', row_to_json(new))
    );

  return new;
end;
$$;

-- Create the trigger on shared_libraries table
drop trigger if exists on_share_created on shared_libraries;
create trigger on_share_created
  after insert on shared_libraries
  for each row
  execute function handle_new_share();
