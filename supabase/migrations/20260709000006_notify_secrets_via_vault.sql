-- Hosted Postgres (PG15+ parameter ACLs) no longer permits ALTER DATABASE/ROLE
-- ... SET for custom GUCs ("permission denied to set parameter"), so the
-- notify webhooks can't get their target URL + service key from
-- app.settings.* there. Read them from Supabase Vault instead, keeping the
-- GUC path as a fallback for local dev. Behavior when neither is configured
-- is unchanged: the webhooks silently no-op.
--
-- Hosted setup (one-time, run as postgres):
--   select vault.create_secret('https://<ref>.supabase.co', 'notify_supabase_url');
--   select vault.create_secret('<service_role_key>',        'notify_service_role_key');

CREATE OR REPLACE FUNCTION public.notify_config(OUT url TEXT, OUT key TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  url := current_setting('app.settings.supabase_url', true);
  key := current_setting('app.settings.service_role_key', true);
  IF url IS NULL OR key IS NULL THEN
    BEGIN
      SELECT ds.decrypted_secret INTO url FROM vault.decrypted_secrets ds
        WHERE ds.name = 'notify_supabase_url';
      SELECT ds.decrypted_secret INTO key FROM vault.decrypted_secrets ds
        WHERE ds.name = 'notify_service_role_key';
    EXCEPTION WHEN OTHERS THEN
      url := NULL; key := NULL;
    END;
  END IF;
END;
$$;

-- This function returns the service key — API roles must never call it.
REVOKE EXECUTE ON FUNCTION public.notify_config() FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.notify_on_entry_submit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_url TEXT; v_key TEXT;
BEGIN
  IF OLD.submitted_at IS NULL AND NEW.submitted_at IS NOT NULL THEN
    SELECT nc.url, nc.key INTO v_url, v_key FROM public.notify_config() nc;
    IF v_url IS NOT NULL AND v_key IS NOT NULL THEN
      PERFORM net.http_post(
        url := v_url || '/functions/v1/notify-partner',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_key
        ),
        body := jsonb_build_object('record', row_to_json(NEW))
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_on_new_prayer()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_url TEXT; v_key TEXT;
BEGIN
  SELECT nc.url, nc.key INTO v_url, v_key FROM public.notify_config() nc;
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

-- Function hygiene (matches 20260709000005): no API-role EXECUTE on triggers.
REVOKE EXECUTE ON FUNCTION public.notify_on_entry_submit() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_new_prayer() FROM public, anon, authenticated;
