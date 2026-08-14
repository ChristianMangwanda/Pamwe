import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import {
  reconcilePushRegistration,
  clearPushToken,
  watchPushTokenRotation,
  scheduleMorningFromPrefs,
  scheduleRecapFromPrefs,
  schedulePrayerReviewFromPrefs,
  clearDeliveredNotifications,
  cleanupLegacyScheduled,
  cancelMorningNotification,
  cancelWeeklyRecap,
  cancelPrayerReview,
} from '../lib/notifications';
import { clearAllReminders } from '../lib/prayerReminders';
import { clearAccountLocalData } from '../lib/localData';
import { shareAnniversary } from '../../modules/pamwe-widget';
import { recordTermsAcceptance } from '../lib/account';

/** Let a promise have a turn, not the whole day.
 *
 *  Resolves either way: callers here want the work attempted, never a rejection
 *  and never an unbounded wait. */
function withTimeout(work: Promise<unknown>, ms: number): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    work
      .catch(() => {})
      .finally(() => { clearTimeout(timer); resolve(); });
  });
}

type AuthContextType = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  // Derived, not a second source of truth. session and user used to be two
  // states written by two racing callbacks, so they could disagree.
  const user: User | null = session?.user ?? null;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, next) => {
      setSession((prev) => {
        // auth-js emits INITIAL_SESSION with a NULL session whenever restoring
        // it errors, and a slow radio on a cold launch is enough to trigger
        // that. Taking it at face value wiped a good session, so the gate saw
        // "signed out" and flashed the welcome screen at a signed-in user
        // before the token refresh retried and landed. getSession above still
        // decides the genuinely signed-out case, and an explicit SIGNED_OUT
        // still clears the session here.
        if (event === 'INITIAL_SESSION' && !next && prev) return prev;
        return next;
      });
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Push wiring is auth-scoped: registration must run AFTER sign-in (a fresh
  // install has no user row to save the token to) and re-run on account
  // switch. The reminder schedules from the user's saved pref.
  useEffect(() => {
    if (!session?.user?.id) return;
    // Not gated on the push token: these are local notifications, and the
    // pre-b14/b17 repeating leftovers keep firing whether or not push registers.
    // They sat inside the `if (token)` below until 2026-08-02, which meant a
    // phone that failed APNs registration silently got no morning reminder and
    // no weekly recap either. Each one checks permission itself.
    cleanupLegacyScheduled();
    scheduleMorningFromPrefs();
    scheduleRecapFromPrefs();
    schedulePrayerReviewFromPrefs();
    // Stamps the first sign-in only (the update filters on a null column), so
    // the consent the welcome screen asks for is recorded against the account.
    recordTermsAcceptance();
    // Registers a device that has ALREADY been given permission, and never
    // prompts. The prompt used to fire here, on the first render after
    // sign-in, before there was a partner or a reflection to point at; iOS
    // asks once, so a no there was permanent. The onboarding "connected"
    // screen asks now, and Settings offers it later.
    //
    // It VERIFIES the row rather than trusting the write, because a granted
    // phone with no push_tokens row is silent and says nothing about it: every
    // notify-* function answers no_token with a 200. The row can go without
    // this app ever knowing (another account claiming the handset, a dead-token
    // sweep), so the launch that follows puts it back.
    reconcilePushRegistration();
    const rotationSub = watchPushTokenRotation();
    return () => rotationSub.remove();
  }, [session?.user?.id]);

  // Delivered banners linger in Notification Center until dismissed, so a
  // signed-in user gets greeted by a stack of days-old partner/prayer pushes.
  // Clear them on launch and whenever the app returns to the foreground. This
  // only clears DELIVERED notifications; scheduled reminders are untouched.
  useEffect(() => {
    if (!session?.user?.id) return;
    clearDeliveredNotifications();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') clearDeliveredNotifications();
    });
    return () => sub.remove();
  }, [session?.user?.id]);

  const signOut = async () => {
    // Detach this device's token while we can still prove who we are:
    // clear_push_token reads auth.uid(), so it has to happen before the session
    // goes. It used to be awaited with nothing bounding it, and it is a network
    // call: on a bad connection the tap did nothing at all, for as long as the
    // request hung, and the app read as though it had refused to sign out. It
    // gets 2.5 seconds now and then loses its turn. Nothing is lost by that,
    // because save_push_token releases a handset from every other account when
    // it is next claimed, so the row repairs itself on the following sign-in.
    await withTimeout(clearPushToken(), 2500);

    // The session goes here, and everything below is about the phone rather
    // than the account. None of it can fail in a way worth blocking on, and
    // none of it can leave anyone signed in.
    await supabase.auth.signOut();

    await Promise.all([
      // Caches the screens read BEFORE the network answers, which is what let a
      // signed-out phone keep showing a couple's prayers and reflections.
      clearAccountLocalData(),
      // Local notifications outlive the session on their own: they are already
      // scheduled with iOS. Cancelled by id, never a cancel-all.
      cancelMorningNotification(),
      cancelWeeklyRecap(),
      cancelPrayerReview(),
      clearAllReminders(),
    ].map((p) => p.catch(() => {})));

    // The widget counts "In love N days" from the App Group, which is the one
    // thing that crosses out of the app. Nothing else there knows anything, so
    // this is the whole of what a widget has to forget.
    shareAnniversary(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
