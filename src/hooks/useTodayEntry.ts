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
  refresh: () => Promise<void>;
};

export function useTodayEntry(): TodayState {
  const { couplePlan } = useCouple();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [planDay, setPlanDay] = useState<any | null>(null);
  const [myEntry, setMyEntry] = useState<any | null>(null);
  const [partnerEntry, setPartnerEntry] = useState<any | null>(null);
  // Spinner only before the first load; later refreshes revalidate silently so
  // Today keeps its content instead of blanking on every couple-state refresh.
  const loadedOnce = useRef(false);

  const dayNumber = couplePlan?.current_day ?? 1;

  const refresh = useCallback(async () => {
    if (!couplePlan) {
      setLoading(false);
      return;
    }

    try {
      if (!loadedOnce.current) setLoading(true);
      const planId = couplePlan.plan?.id ?? couplePlan.plan_id;
      const [pd, mine, partner] = await Promise.all([
        getPlanDay(planId, dayNumber),
        getMyEntry(couplePlan.id, dayNumber),
        getPartnerEntry(couplePlan.id, dayNumber),
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
  }, [couplePlan, dayNumber]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { loading, error, planDay, myEntry, partnerEntry, dayNumber, refresh };
}
