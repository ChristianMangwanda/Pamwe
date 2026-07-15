-- Advance the plan day when the couple taps Amen on the reveal, not the instant
-- both partners submit.
--
-- advance_plan_day_if_mutual_submit used to bump couple_plans.current_day from
-- inside the second partner's submit. Every ritual screen derives its day from
-- that live value (src/hooks/useTodayEntry.ts) and CoupleProvider propagates the
-- change over realtime within milliseconds, so both clients jumped to the next
-- (empty) day at the exact moment the finished day became revealable. The
-- reveal was skipped rather than blocked: getPartnerEntry queried a day with no
-- rows, the waiting screen never advanced, and Today's CTA moved on as though
-- the day had been read. Whoever sat on the waiting screen lost every time.
--
-- The client already expected to advance at Amen (reveal.tsx refreshes the
-- couple there); it now calls advancePlanDay() first.
--
-- RELEASE ORDERING: this migration and the client change must ship together. On
-- a client that predates it, nothing advances current_day at all and the couple
-- repeats the same day forever.
--
-- The completion branch stays here: a plan's final day is settled by the mutual
-- submit itself and there is no next day to move to, so Amen only navigates.
-- The function keeps its name to avoid re-pointing the trigger, though it now
-- only handles completion.

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

  -- Final day only. Mid-plan advancement now happens at Amen, client-side.
  IF NEW.day_number = v_current AND v_current >= v_duration THEN
    UPDATE public.couple_plans SET status = 'completed'
      WHERE id = NEW.couple_plan_id AND status <> 'completed';
  END IF;

  RETURN NEW;
END;
$$;
