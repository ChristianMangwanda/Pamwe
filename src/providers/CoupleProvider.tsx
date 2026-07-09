import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthProvider';
import { getUserCouple, getPartnerProfile } from '../lib/couples';
import { getActiveCouPlan } from '../lib/plans';

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

  const refresh = useCallback(async () => {
    if (!session) {
      setCouple(null);
      setPartner(null);
      setCouplePlan(null);
      setLoading(false);
      return;
    }

    try {
      const c = await getUserCouple(session.user.id);
      setCouple(c);
      setPartner(c ? await getPartnerProfile(c, session.user.id) : null);

      if (c?.id) {
        const plan = await getActiveCouPlan(c.id);
        setCouplePlan(plan);
      }
    } catch {
      // Silently fail — couple state will be null
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <CoupleContext.Provider value={{ couple, partner, couplePlan, loading, refresh }}>
      {children}
    </CoupleContext.Provider>
  );
}

export const useCouple = () => useContext(CoupleContext);
