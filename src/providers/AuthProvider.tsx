import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import {
  registerForPushNotifications,
  savePushToken,
  clearPushToken,
  watchPushTokenRotation,
  scheduleMorningFromPrefs,
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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
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
      }
    });
    const rotationSub = watchPushTokenRotation();
    return () => rotationSub.remove();
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
