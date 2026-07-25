-- #25 (debug-tour): a session straddling midnight reset the streak. The
-- trigger dated the session with now() at the SECOND partner's submit, so
-- A sealing at 11:55pm and B at 12:05am produced a 2-day gap from yesterday
-- and reset a daily streak, despite the couple never missing a session.
--
-- The session's date is now the FIRST submit of the pair, in the couple's
-- timezone: the day the ritual began being sealed is the day it counts for.
-- This fixes the straddle exactly without widening the cadence window (a
-- genuine missed day still resets). The v_today <= v_last guard subsumes the
-- old same-day check and also ignores out-of-order completions of older days,
-- which could otherwise drag streak_last_date backwards.
--
-- Independent of the b14 release-order gate, but must be applied AFTER
-- 20260714000003 (it redefines the same function; applying in filename order
-- does this naturally).

CREATE OR REPLACE FUNCTION public.update_streak_on_mutual_submit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_both BOOLEAN; v_couple UUID; v_tz TEXT; v_today DATE; v_last DATE; v_cadence INT; v_first TIMESTAMPTZ;
BEGIN
  IF NEW.submitted_at IS NULL THEN RETURN NEW; END IF;

  SELECT COUNT(DISTINCT user_id) = 2, MIN(submitted_at) INTO v_both, v_first
  FROM public.entries
  WHERE couple_plan_id = NEW.couple_plan_id AND day_number = NEW.day_number
    AND submitted_at IS NOT NULL;
  IF NOT v_both THEN RETURN NEW; END IF;

  SELECT c.id, COALESCE(c.timezone, 'UTC'), c.streak_last_date, COALESCE(cp.cadence_days, 1)
    INTO v_couple, v_tz, v_last, v_cadence
  FROM public.couple_plans cp JOIN public.couples c ON cp.couple_id = c.id
  WHERE cp.id = NEW.couple_plan_id;

  v_today := (v_first AT TIME ZONE v_tz)::date;

  IF v_last IS NOT NULL AND v_today <= v_last THEN
    RETURN NEW; -- this day (or a later one) already counted
  ELSIF v_last IS NOT NULL AND v_today - v_last <= v_cadence THEN
    UPDATE public.couples SET streak_count = streak_count + 1, streak_last_date = v_today
      WHERE id = v_couple;
  ELSE
    UPDATE public.couples SET streak_count = 1, streak_last_date = v_today
      WHERE id = v_couple;
  END IF;
  RETURN NEW;
END;
$$;
