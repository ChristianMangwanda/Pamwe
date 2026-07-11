import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthProvider';
import { getUserCouple, getPartnerProfile } from '../lib/couples';
import { getActiveCouPlan } from '../lib/plans';
import { supabase } from '../lib/supabase';

type CoupleContextType = {
  couple: any | null;
  partner: any | null;
  couplePlan: any | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

const CoupleContext = createContext<CoupleContextType>({
  couple: null,
  partner: null,
  couplePlan: null,
  loading: true,
  refresh: async () => {},
});

export function CoupleProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [couple, setCouple] = useState<any | null>(null);
  const [partner, setPartner] = useState<any | null>(null);
  const [couplePlan, setCouplePlan] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Keyed on the user id, NOT the session object: token refresh on foreground
  // mints a new session object for the same user, and keying on it made every
  // app resume refetch couple state and blank the Today screen.
  const userId = session?.user?.id ?? null;

  const refresh = useCallback(async () => {
    if (!userId) {
      setCouple(null);
      setPartner(null);
      setCouplePlan(null);
      setLoading(false);
      return;
    }

    try {
      const c = await getUserCouple(userId);
      setCouple(c);
      setPartner(c ? await getPartnerProfile(c, userId) : null);

      if (c?.id) {
        const plan = await getActiveCouPlan(c.id);
        setCouplePlan(plan);
      }
    } catch {
      // Silently fail — couple state will be null
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Keep couple state live. Without this, pairing or enrolling in a plan
  // mid-session left every tab reading a stale null couple until relaunch.
  useEffect(() => {
    if (!couple?.id) return;
    const channel = supabase
      .channel(`couple-state-${couple.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'couples', filter: `id=eq.${couple.id}` }, () => refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'couple_plans', filter: `couple_id=eq.${couple.id}` }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [couple?.id, refresh]);

  return (
    <CoupleContext.Provider value={{ couple, partner, couplePlan, loading, refresh }}>
      {children}
    </CoupleContext.Provider>
  );
}

export const useCouple = () => useContext(CoupleContext);
