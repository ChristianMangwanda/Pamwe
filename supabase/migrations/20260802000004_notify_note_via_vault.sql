-- notify_on_new_verse_note read app.settings.* directly, which hosted Postgres
-- does not permit (see 20260709000006). The trigger therefore fired into a
-- no-op on hosted and the "your partner took note of this verse" push has never
-- been delivered there. Route it through notify_config() like every other
-- notifier, which tries the GUCs first and falls back to Vault.
--
-- The trigger itself is unchanged: INSERT-only, so editing a note never
-- re-notifies.
CREATE OR REPLACE FUNCTION public.notify_on_new_verse_note()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_url TEXT; v_key TEXT;
BEGIN
  SELECT nc.url, nc.key INTO v_url, v_key FROM public.notify_config() nc;
  IF v_url IS NOT NULL AND v_key IS NOT NULL THEN
    PERFORM net.http_post(
      url := v_url || '/functions/v1/notify-new-note',
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

REVOKE EXECUTE ON FUNCTION public.notify_on_new_verse_note() FROM public, anon, authenticated;
