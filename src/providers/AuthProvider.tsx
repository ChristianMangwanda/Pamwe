import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import {
  registerForPushNotifications,
  savePushToken,
  clearPushToken,
  watchPushTokenRotation,
  scheduleMorningFromPrefs,
  scheduleRecapFromPrefs,
  schedulePrayerReviewFromPrefs,
  clearDeliveredNotifications,
} from '../lib/notifications';

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
    registerForPushNotifications().then((token) => {
      if (token) {
        savePushToken(token);
        scheduleMorningFromPrefs();
        scheduleRecapFromPrefs();
        schedulePrayerReviewFromPrefs();
      }
    });
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
    // Best-effort: detach this device's push token from the account before the
    // session goes away, so a later sign-in by someone else on this phone
    // doesn't receive the old account's partner notifications.
    try { await clearPushToken(); } catch { /* sign out regardless */ }
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
