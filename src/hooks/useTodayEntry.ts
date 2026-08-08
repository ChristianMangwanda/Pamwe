import { useState, useEffect, useCallback, useRef } from 'react';
import { useCouple } from '../providers/CoupleProvider';
import { getPlanDay } from '../lib/plans';
import { getMyEntry, getPartnerEntry } from '../lib/entries';

type TodayState = {
  loading: boolean;
  error: boolean;
  planDay: any | null;
  myEntry: any | null;
  partnerEntry: any | null;
  dayNumber: number;
  /** The plan this hook is reading, pinned when asked for. */
  couplePlan: any | null;
  refresh: () => Promise<void>;
};

/**
 * Today's plan day and both entries for it.
 *
 * `dayOverride` pins the hook to one day instead of following the couple's live
 * current_day. current_day advances when a partner taps Amen and realtime
 * delivers that to both phones, so every screen in the ritual (reading,
 * journal, waiting, reveal) pins the day it opened on. Unpinned, the journal
 * would autosave your words into the next day's entry the moment your partner
 * amened, and the waiting screen would sit waiting on a day nobody had read.
 * Today itself stays unpinned: following the live day is its job.
 *
 * `pinPlan` does the same for the plan itself. On a plan's FINAL day the mutual
 * submit retires it (advance_plan_day_if_mutual_submit sets status completed),
 * CoupleProvider hears that over realtime, and getActiveCouPlan then returns
 * null. Unpinned, the plan vanished from under whoever was mid-ritual: the
 * waiting screen never advanced, and the reveal showed "That plan is finished"
 * instead of the two reflections, so the last day of every plan lost its reveal,
 * its Amen and the completion screen with it. The ritual screens hold the plan
 * they opened with; Today stays unpinned, since noticing the plan ended is
 * exactly its job.
 */
export function useTodayEntry(dayOverride?: number, pinPlan = false): TodayState {
  const { couplePlan: livePlan } = useCouple();
  // Keyed on the id so a refreshed object does not re-pin, and only ever read
  // once the live plan is gone.
  const [pinnedPlan, setPinnedPlan] = useState<any | null>(null);
  useEffect(() => {
    if (pinPlan && livePlan) setPinnedPlan(livePlan);
  }, [pinPlan, livePlan?.id]);
  const couplePlan = livePlan ?? (pinPlan ? pinnedPlan : null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [planDay, setPlanDay] = useState<any | null>(null);
  const [myEntry, setMyEntry] = useState<any | null>(null);
  const [partnerEntry, setPartnerEntry] = useState<any | null>(null);
  // Spinner only before the first load; later refreshes revalidate silently so
  // Today keeps its content instead of blanking on every couple-state refresh.
  const loadedOnce = useRef(false);

  const dayNumber = dayOverride ?? couplePlan?.current_day ?? 1;

  // Keyed on ids, NOT the couplePlan object: CoupleProvider hands back a fresh
  // object on every refresh, and it refreshes on any couples/couple_plans
  // change. Depending on the object re-ran all three queries on every streak
  // recompute and every unrelated couple write, on every screen at once.
  const couplePlanId = couplePlan?.id ?? null;
  const planId = couplePlan?.plan?.id ?? couplePlan?.plan_id ?? null;

  const refresh = useCallback(async () => {
    if (!couplePlanId) {
      // The plan went away (unpaired, plan ended): clear the previous plan's
      // day and entries instead of letting screens keep reading them.
      setPlanDay(null);
      setMyEntry(null);
      setPartnerEntry(null);
      loadedOnce.current = false;
      setLoading(false);
      return;
    }

    try {
      if (!loadedOnce.current) setLoading(true);
      const [pd, mine, partner] = await Promise.all([
        getPlanDay(planId, dayNumber),
        getMyEntry(couplePlanId, dayNumber),
        getPartnerEntry(couplePlanId, dayNumber),
      ]);
      setPlanDay(pd);
      setMyEntry(mine);
      setPartnerEntry(partner);
      setError(false);
      loadedOnce.current = true;
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [couplePlanId, planId, dayNumber]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { loading, error, planDay, myEntry, partnerEntry, dayNumber, couplePlan, refresh };
}
