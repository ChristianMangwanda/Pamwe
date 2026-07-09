-- Trigger to call notify-partner Edge Function when an entry is submitted
-- This fires on UPDATE to entries when submitted_at changes from NULL to a value

CREATE OR REPLACE FUNCTION public.notify_on_entry_submit()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.submitted_at IS NULL AND NEW.submitted_at IS NOT NULL THEN
    PERFORM net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/notify-partner',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := jsonb_build_object('record', row_to_json(NEW))
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_entry_submitted
  AFTER UPDATE ON public.entries
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_entry_submit();
