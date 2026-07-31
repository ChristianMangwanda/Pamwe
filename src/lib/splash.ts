import * as SplashScreen from 'expo-splash-screen';

// The native splash (the Pamwe mark on the cream background) is the app's own
// loading screen. It used to be torn down the moment fonts finished, which was
// 3-4 network hops before the auth gate had decided anything, so a cold launch
// showed a bare spinner and sometimes flashed the welcome screen.
//
// Now the gate hides it when it has actually landed somewhere, with the root
// layout holding a hard timeout so a hung query can never strand a user on the
// splash forever. Both call this; whoever gets there first wins.
let hidden = false;

export function hideSplashOnce() {
  if (hidden) return;
  hidden = true;
  // Fade the splash out over the app instead of cutting: the one soft entrance
  // per session, so opening feels eased while every tab switch stays instant
  // (the b17 tab cross-fade is gone; see DockedTabBar). Native, iOS-only, and
  // entirely outside the navigation machinery, so nothing here can race a
  // screen transition.
  SplashScreen.setOptions({ fade: true, duration: 350 });
  SplashScreen.hideAsync().catch(() => {
    // Already hidden, or the module isn't available. Nothing to recover from.
  });
}
