import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';

// Survives (tabs) layout remounts so the same tap is never routed twice.
let lastHandledId: string | null = null;

// Routes a tapped notification to the right screen. Mounted in the (tabs)
// layout so navigation only happens after the auth gate has landed a signed-in,
// paired user — covers both warm taps and cold starts from a notification.
export function usePushRouting() {
  const router = useRouter();
  const response = Notifications.useLastNotificationResponse();

  useEffect(() => {
    if (!response) return;
    const id = response.notification.request.identifier;
    if (lastHandledId === id) return;
    lastHandledId = id;

    const data = response.notification.request.content.data as Record<string, unknown> | null;
    switch (data?.type) {
      case 'partner_entry':
        // reveal is only valid once both have submitted; otherwise land on Today
        router.push(data.reveal ? '/(tabs)/(today)/reveal' : ('/(tabs)/(today)' as any));
        break;
      case 'prayer':
        router.push('/(tabs)/prayers' as any);
        break;
      case 'freeze':
      case 'morning':
        router.push('/(tabs)/(today)' as any);
        break;
      case 'partner_left':
        // couple state changed — let the auth gate re-route
        router.replace('/');
        break;
    }
  }, [response, router]);
}
