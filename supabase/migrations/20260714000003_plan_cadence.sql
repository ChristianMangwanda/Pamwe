-- Reading cadence, per plan enrollment.
--
-- Beta feedback (2026-07-13): "Set cadence. Every day is too much for people."
-- A couple now chooses one plan day per N calendar days when they start a plan:
-- 1 = every day, 2 = every other day, 7 = once a week. An interval keeps the
-- catch-up maths arithmetic rather than a day-of-week calendar.
--
-- It lives on couple_plans rather than couples because rhythm belongs to the
-- plan: M'Cheyne 365 is dated and inherently daily, while a 21-day plan can
-- suit a weekly pace. Default 1 keeps every existing enrollment as it is.

ALTER TABLE public.couple_plans
  ADD COLUMN IF NOT EXISTS cadence_days int NOT NULL DEFAULT 1
    CHECK (cadence_days IN (1, 2, 7));

COMMENT ON COLUMN public.couple_plans.cadence_days IS
  'Calendar days per plan day: 1 = daily, 2 = every other day, 7 = weekly.';

-- ---- Streak counts sessions kept, not calendar days ------------------------
--
-- The old rule required strictly consecutive calendar days (v_last = v_today - 1),
-- which reset the streak on every non-daily cadence and made the tree and the
-- 7/30/100 milestones unreachable for anyone not reading daily. A streak now
-- means "plan days completed in a row, on your own rhythm": the gap since the
-- last counted day only has to fit inside the cadence window.
--
-- At cadence 1 this is identical to the old behaviour: a same-day repeat still
-- returns early, and the only gap that can satisfy `<= 1` is exactly 1 day.
-- Reading ahead of a slower cadence (a 1-day gap on cadence 2) also counts,
-- since being eager should never cost you the streak.
CREATE OR REPLACE FUNCTION public.update_streak_on_mutual_submit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_both BOOLEAN; v_couple UUID; v_tz TEXT; v_today DATE; v_last DATE; v_cadence INT;
BEGIN
  IF NEW.submitted_at IS NULL THEN RETURN NEW; END IF;

  SELECT COUNT(DISTINCT user_id) = 2 INTO v_both
  FROM public.entries
  WHERE couple_plan_id = NEW.couple_plan_id AND day_number = NEW.day_number
    AND submitted_at IS NOT NULL;
  IF NOT v_both THEN RETURN NEW; END IF;

  SELECT c.id, COALESCE(c.timezone, 'UTC'), c.streak_last_date, COALESCE(cp.cadence_days, 1)
    INTO v_couple, v_tz, v_last, v_cadence
  FROM public.couple_plans cp JOIN public.couples c ON cp.couple_id = c.id
  WHERE cp.id = NEW.couple_plan_id;

  v_today := (now() AT TIME ZONE v_tz)::date;

  IF v_last IS NOT DISTINCT FROM v_today THEN
    RETURN NEW; -- already counted today
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
