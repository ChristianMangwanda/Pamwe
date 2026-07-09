-- Webhook wiring for new prayers: a portable SQL trigger replacing the old
-- project's dashboard-configured DB webhook. INSERT-only by construction, so
-- prayer edits and mark-answered never re-notify (debug tour #32). No-op until
-- the app.settings.* GUCs are set (same guard as notify_on_entry_submit), so
-- local prayer creation never depends on push wiring.
CREATE OR REPLACE FUNCTION public.notify_on_new_prayer()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_url TEXT; v_key TEXT;
BEGIN
  v_url := current_setting('app.settings.supabase_url', true);
  v_key := current_setting('app.settings.service_role_key', true);
  IF v_url IS NOT NULL AND v_key IS NOT NULL THEN
    PERFORM net.http_post(
      url := v_url || '/functions/v1/notify-new-prayer',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_key
      ),
      body := jsonb_build_object('record', row_to_json(NEW))
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_new_prayer_trigger ON public.prayers;
CREATE TRIGGER notify_new_prayer_trigger
  AFTER INSERT ON public.prayers
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_prayer();
