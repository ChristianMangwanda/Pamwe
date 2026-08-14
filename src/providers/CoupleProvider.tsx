import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AppState } from 'react-native';
import { useAuth } from './AuthProvider';
import { getUserCouple, getPartnerProfile, togetherSince, toISODate } from '../lib/couples';
import { shareAnniversary } from '../../modules/pamwe-widget';
import { getActiveCouPlan } from '../lib/plans';
import { getMyProfile } from '../lib/account';
import { supabase } from '../lib/supabase';
import {
  cancelMorningNotification,
  cancelWeeklyRecap,
  cancelPrayerReview,
  scheduleMorningFromPrefs,
  scheduleRecapFromPrefs,
  schedulePrayerReviewFromPrefs,
} from '../lib/notifications';
import { silenceAllReminders } from '../lib/prayerReminders';

type CoupleContextType = {
  couple: any | null;
  partner: any | null;
  /** My own users row. Screens read their own name from here, the same place
   *  the partner's comes from, so the two can never disagree. */
  me: any | null;
  couplePlan: any | null;
  loading: boolean;
  /** The last refresh threw.
   *
   *  Only meaningful together with the state beside it: a blip that kept
   *  last-known couple state is not worth a word to anyone, but a FIRST fetch
   *  that failed leaves couple and couplePlan null with loading already false,
   *  which is indistinguishable from a genuine "no couple, no plan" and sent
   *  couples to an empty state that offered to enrol them in a plan they were
   *  already reading. Screens pair this with `!couple` to tell the two apart. */
  error: boolean;
  refresh: () => Promise<void>;
};

const CoupleContext = createContext<CoupleContextType>({
  couple: null,
  partner: null,
  me: null,
  couplePlan: null,
  loading: true,
  error: false,
  refresh: async () => {},
});

export function CoupleProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [couple, setCouple] = useState<any | null>(null);
  const [partner, setPartner] = useState<any | null>(null);
  const [me, setMe] = useState<any | null>(null);
  const [couplePlan, setCouplePlan] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Keyed on the user id, NOT the session object: token refresh on foreground
  // mints a new session object for the same user, and keying on it made every
  // app resume refetch couple state and blank the Today screen.
  const userId = session?.user?.id ?? null;

  const refresh = useCallback(async () => {
    if (!userId) {
      setCouple(null);
      setPartner(null);
      setMe(null);
      setCouplePlan(null);
      // Signed out is an answer, not a failure.
      setError(false);
      setLoading(false);
      return;
    }

    try {
      // Best effort, and deliberately not inside the try/catch below's scope
      // for the couple: a profile read that blips should not cost the couple
      // state that the whole app routes on.
      getMyProfile().then(setMe).catch(() => {});

      const c = await getUserCouple(userId);
      setCouple(c);

      if (c?.id) {
        // Both of these need only the couple id, which is already in hand, so
        // awaiting them one after the other spent a whole round trip for
        // nothing. The plan is the slow half of the cold start and every screen
        // that renders "no plan yet" is waiting on it.
        const [p, plan] = await Promise.all([
          getPartnerProfile(c, userId),
          getActiveCouPlan(c.id),
        ]);
        setPartner(p);
        setCouplePlan(plan);
      } else {
        // No couple means no plan: without this, an unpair or partner-left
        // leaves every consumer reading the previous couple's plan.
        setPartner(null);
        setCouplePlan(null);
      }
      setError(false);
    } catch {
      // A failed refresh (network blip) keeps the last-known couple state
      // rather than nulling it, which would bounce the user to onboarding.
      // On a COLD start there is no last-known state to keep, so the flag is
      // what stops that failure reading as "you have no couple and no plan".
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Keep couple state live. Without this, pairing or enrolling in a plan
  // mid-session left every tab reading a stale null couple until relaunch.
  //
  // The Date.now() in the topic is load-bearing (PAMWE-IOS-5): removeChannel
  // tears down asynchronously, and supabase.channel() with the topic of a
  // channel that is still dying hands back that SAME already-subscribed
  // instance, so attaching handlers to it throws and the subscription never
  // re-arms. A per-mount suffix means a remount can never collide with its own
  // teardown. Every .channel() call site in the app carries one for the same
  // reason.
  useEffect(() => {
    if (!couple?.id) return;
    const channel = supabase
      .channel(`couple-state-${couple.id}-${Date.now()}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'couples', filter: `id=eq.${couple.id}` }, () => refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'couple_plans', filter: `couple_id=eq.${couple.id}` }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [couple?.id, refresh]);

  // Realtime is not enough on its own. iOS drops the socket when the app is
  // backgrounded and missed changes are never replayed, so a partner starting
  // a new plan while this phone was asleep never arrived: they would begin
  // reading and the other phone still showed the finished plan, or nothing.
  // Re-reading couple state on foreground closes that window.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  // Hand the Lock Screen widget the date the couple counts from. Sharing the
  // resolved date rather than the raw anniversary keeps the fallback rule in
  // one place, so the widget can never disagree with the You tab.
  //
  // Gated on `loading` because couple is null while the first fetch is in
  // flight, and syncing that would clear the widget's counter on every launch.
  // Once loaded, a null couple is real (signed out) and should clear it.
  const since = couple ? togetherSince(couple) : null;
  const sinceISO = since ? toISODate(since) : null;
  useEffect(() => {
    if (loading) return;
    shareAnniversary(sinceISO);
  }, [loading, sinceISO]);

  // A pause has to actually stop the phone talking, on BOTH phones.
  //
  // The screen says "no pages and no reminders", and until this existed that
  // was simply untrue: the morning reminder, the Sunday recap and every prayer
  // reminder are LOCAL notifications, already handed to iOS, so they keep
  // firing no matter what the database says. The one who tapped Agree and the
  // one who asked both have to go quiet, and only one of them ran the RPC, so
  // this watches the couple's state rather than the action. Realtime carries
  // paused_at to the other phone, which is what makes that work.
  //
  // Coming back re-derives from the saved preferences rather than restoring a
  // snapshot: prefs are the source of truth for these, and someone who changed
  // their reminder time mid-pause should get the time they chose.
  const paused = !!couple?.paused_at;
  const hadCouple = !!couple;
  useEffect(() => {
    if (loading || !hadCouple) return;
    if (paused) {
      cancelMorningNotification().catch(() => {});
      cancelWeeklyRecap().catch(() => {});
      cancelPrayerReview().catch(() => {});
      // Silenced, not forgotten: the times somebody chose for their prayers are
      // theirs, and a pause should not cost them setting every one again.
      silenceAllReminders().catch(() => {});
    } else {
      scheduleMorningFromPrefs().catch(() => {});
      scheduleRecapFromPrefs().catch(() => {});
      schedulePrayerReviewFromPrefs().catch(() => {});
    }
  }, [loading, hadCouple, paused]);

  return (
    <CoupleContext.Provider value={{ couple, partner, me, couplePlan, loading, error, refresh }}>
      {children}
    </CoupleContext.Provider>
  );
}

export const useCouple = () => useContext(CoupleContext);
