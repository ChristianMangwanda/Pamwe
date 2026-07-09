-- ============================================================================
-- Local ⇄ remote parity reconstruction
-- ============================================================================
-- The hosted project accumulated changes (Phase 4–6) that were applied directly
-- via the Supabase MCP and never mirrored into migration files. This migration
-- reconstructs them so a local `supabase start` produces a working stack that
-- matches production behavior. Sourced from progress.md, trial-and-error.md,
-- phase6-completeness.md, and the code's expectations in src/lib/*.
--
-- Deviations from prod, deliberate for local dev:
--   • Streak logic is simplified (increment / no-op / reset) — the 30-day freeze
--     bridging is a prod-only edge case not exercised in screen-by-screen testing.
--   • notify_on_entry_submit is made a no-op when app.settings.* GUCs are unset
--     (they are, locally), so entry submission never depends on push wiring.
--   • notify-new-prayer / notify-freeze webhooks are omitted locally (push only).
-- ============================================================================

-- ---- Missing columns -------------------------------------------------------
ALTER TABLE public.couples  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'UTC';
ALTER TABLE public.prayers  ADD COLUMN IF NOT EXISTS notify_partner BOOLEAN NOT NULL DEFAULT true;

-- ---- SECURITY DEFINER helpers (break RLS self-recursion) -------------------
-- See trial-and-error.md → "RLS infinite recursion". These run as owner (BYPASSRLS)
-- so the inner lookups don't re-trigger the calling table's policy.

CREATE OR REPLACE FUNCTION public.current_user_couple_id()
RETURNS UUID LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT couple_id FROM public.users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.has_user_submitted_entry(
  p_couple_plan_id UUID, p_day_number INT, p_user_id UUID
) RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
  -- Guarded so a caller can only probe their own submission state.
  SELECT p_user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.entries
    WHERE couple_plan_id = p_couple_plan_id
      AND day_number = p_day_number
      AND user_id = p_user_id
      AND submitted_at IS NOT NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.can_view_partner_audio(
  p_couple_plan_id UUID, p_day_number INT, p_owner UUID
) RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT
    EXISTS (
      SELECT 1 FROM public.couple_plans cp JOIN public.couples c ON cp.couple_id = c.id
      WHERE cp.id = p_couple_plan_id
        AND (c.partner_a_id = auth.uid() OR c.partner_b_id = auth.uid())
    )
    AND EXISTS ( -- caller has personally submitted their side of this day
      SELECT 1 FROM public.entries me
      WHERE me.couple_plan_id = p_couple_plan_id AND me.day_number = p_day_number
        AND me.user_id = auth.uid() AND me.submitted_at IS NOT NULL
    )
    AND EXISTS ( -- the owner (partner) has submitted too
      SELECT 1 FROM public.entries them
      WHERE them.couple_plan_id = p_couple_plan_id AND them.day_number = p_day_number
        AND them.user_id = p_owner AND them.submitted_at IS NOT NULL
    );
$$;

REVOKE EXECUTE ON FUNCTION public.current_user_couple_id() FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_user_submitted_entry(UUID, INT, UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_view_partner_audio(UUID, INT, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.current_user_couple_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_user_submitted_entry(UUID, INT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_partner_audio(UUID, INT, UUID) TO authenticated;

-- ---- Replace recursive policies with helper-based ones ----------------------
DROP POLICY IF EXISTS "users_select_partner" ON public.users;
CREATE POLICY "users_select_partner" ON public.users
  FOR SELECT USING (
    couple_id IS NOT NULL AND couple_id = public.current_user_couple_id()
  );

DROP POLICY IF EXISTS "entries_select_partner_after_mutual_submit" ON public.entries;
CREATE POLICY "entries_select_partner_after_mutual_submit" ON public.entries
  FOR SELECT TO authenticated USING (
    user_id != (SELECT auth.uid())
    AND couple_plan_id IN (
      SELECT cp.id FROM public.couple_plans cp
      JOIN public.couples c ON cp.couple_id = c.id
      WHERE c.partner_a_id = (SELECT auth.uid()) OR c.partner_b_id = (SELECT auth.uid())
    )
    AND submitted_at IS NOT NULL
    AND public.has_user_submitted_entry(couple_plan_id, day_number, (SELECT auth.uid()))
  );

-- ---- Day advancement on mutual submit --------------------------------------
CREATE OR REPLACE FUNCTION public.advance_plan_day_if_mutual_submit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_both BOOLEAN; v_current INT; v_duration INT;
BEGIN
  IF NEW.submitted_at IS NULL THEN RETURN NEW; END IF;

  SELECT COUNT(DISTINCT user_id) = 2 INTO v_both
  FROM public.entries
  WHERE couple_plan_id = NEW.couple_plan_id AND day_number = NEW.day_number
    AND submitted_at IS NOT NULL;
  IF NOT v_both THEN RETURN NEW; END IF;

  SELECT cp.current_day, p.duration_days INTO v_current, v_duration
  FROM public.couple_plans cp JOIN public.plans p ON cp.plan_id = p.id
  WHERE cp.id = NEW.couple_plan_id;

  IF NEW.day_number = v_current THEN
    IF v_current >= v_duration THEN
      UPDATE public.couple_plans SET status = 'completed'
        WHERE id = NEW.couple_plan_id AND status <> 'completed';
    ELSE
      UPDATE public.couple_plans SET current_day = v_current + 1
        WHERE id = NEW.couple_plan_id AND current_day = v_current;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS advance_plan_day_trigger ON public.entries;
CREATE TRIGGER advance_plan_day_trigger
  AFTER INSERT OR UPDATE OF submitted_at ON public.entries
  FOR EACH ROW EXECUTE FUNCTION public.advance_plan_day_if_mutual_submit();

-- ---- Streak on mutual submit (simplified; see header) ----------------------
CREATE OR REPLACE FUNCTION public.update_streak_on_mutual_submit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_both BOOLEAN; v_couple UUID; v_tz TEXT; v_today DATE; v_last DATE;
BEGIN
  IF NEW.submitted_at IS NULL THEN RETURN NEW; END IF;

  SELECT COUNT(DISTINCT user_id) = 2 INTO v_both
  FROM public.entries
  WHERE couple_plan_id = NEW.couple_plan_id AND day_number = NEW.day_number
    AND submitted_at IS NOT NULL;
  IF NOT v_both THEN RETURN NEW; END IF;

  SELECT c.id, COALESCE(c.timezone, 'UTC'), c.streak_last_date
    INTO v_couple, v_tz, v_last
  FROM public.couple_plans cp JOIN public.couples c ON cp.couple_id = c.id
  WHERE cp.id = NEW.couple_plan_id;

  v_today := (now() AT TIME ZONE v_tz)::date;

  IF v_last IS NOT DISTINCT FROM v_today THEN
    RETURN NEW; -- already counted today
  ELSIF v_last = v_today - 1 THEN
    UPDATE public.couples SET streak_count = streak_count + 1, streak_last_date = v_today
      WHERE id = v_couple;
  ELSE
    UPDATE public.couples SET streak_count = 1, streak_last_date = v_today
      WHERE id = v_couple;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_streak_on_mutual_submit_trigger ON public.entries;
CREATE TRIGGER update_streak_on_mutual_submit_trigger
  AFTER INSERT OR UPDATE OF submitted_at ON public.entries
  FOR EACH ROW EXECUTE FUNCTION public.update_streak_on_mutual_submit();

-- ---- Make the notify webhook a no-op when push isn't wired (local) ----------
CREATE OR REPLACE FUNCTION public.notify_on_entry_submit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_url TEXT; v_key TEXT;
BEGIN
  IF OLD.submitted_at IS NULL AND NEW.submitted_at IS NOT NULL THEN
    v_url := current_setting('app.settings.supabase_url', true);
    v_key := current_setting('app.settings.service_role_key', true);
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

-- ---- Voice storage bucket + locked-reveal policies -------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-entries', 'voice-entries', false)
ON CONFLICT (id) DO NOTHING;

-- Path scheme: {couple_plan_id}/{day_number}/{user_id}.m4a
DROP POLICY IF EXISTS "voice_insert_own" ON storage.objects;
CREATE POLICY "voice_insert_own" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'voice-entries'
    AND split_part(storage.filename(name), '.', 1) = auth.uid()::text
    AND (storage.foldername(name))[1] IN (
      SELECT cp.id::text FROM public.couple_plans cp JOIN public.couples c ON cp.couple_id = c.id
      WHERE c.partner_a_id = auth.uid() OR c.partner_b_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "voice_select_own" ON storage.objects;
CREATE POLICY "voice_select_own" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'voice-entries'
    AND split_part(storage.filename(name), '.', 1) = auth.uid()::text
  );

DROP POLICY IF EXISTS "voice_select_partner_after_reveal" ON storage.objects;
CREATE POLICY "voice_select_partner_after_reveal" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'voice-entries'
    AND public.can_view_partner_audio(
      (storage.foldername(name))[1]::uuid,
      (storage.foldername(name))[2]::int,
      split_part(storage.filename(name), '.', 1)::uuid
    )
  );

DROP POLICY IF EXISTS "voice_update_own" ON storage.objects;
CREATE POLICY "voice_update_own" ON storage.objects
  FOR UPDATE TO authenticated USING (
    bucket_id = 'voice-entries'
    AND split_part(storage.filename(name), '.', 1) = auth.uid()::text
  );

DROP POLICY IF EXISTS "voice_delete_own" ON storage.objects;
CREATE POLICY "voice_delete_own" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'voice-entries'
    AND split_part(storage.filename(name), '.', 1) = auth.uid()::text
  );

-- ---- Realtime publication (waiting→reveal, live prayers, couple updates) ----
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['entries','prayers','prayer_marks','couples','couple_plans'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;
