import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { getUserCouple } from '../lib/couples';

const FALLBACK_POLL_MS = 30000;

/** Advance the moment the partner joins.
 *
 *  Realtime on the couple row, with a slow poll behind it so a dropped socket
 *  costs half a minute rather than the whole pairing. Lives in a hook because
 *  the handoff split waiting off the invite screen: someone can be sitting on
 *  either when the other person types the code, and both have to move. */
export function useAwaitPairing(coupleId: string | null) {
  const router = useRouter();

  useEffect(() => {
    if (!coupleId) return;
    const check = async () => {
      const couple = await getUserCouple();
      if (couple?.paired_at) router.replace('/(onboarding)/connected');
    };
    const channel = supabase
      .channel(`pairing:${coupleId}-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'couples', filter: `id=eq.${coupleId}` },
        check,
      )
      .subscribe();
    const fallback = setInterval(check, FALLBACK_POLL_MS);
    return () => { supabase.removeChannel(channel); clearInterval(fallback); };
  }, [coupleId, router]);
}
