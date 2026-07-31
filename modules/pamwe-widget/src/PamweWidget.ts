import { Platform, requireOptionalNativeModule } from 'expo-modules-core';

interface PamweWidgetModule {
  setAnniversary(anniversary: string | null): void;
  getAnniversary(): string | null;
}

// Optional so Android and any build predating this module keep working: the
// widget is iOS only, and a missing native half should cost the Lock Screen
// counter, never the screen that calls this.
const native = requireOptionalNativeModule<PamweWidgetModule>('PamweWidget');

/** Share the couple's anniversary ('YYYY-MM-DD', or null to clear) with the
 *  Lock Screen widget, and ask WidgetKit to redraw. No-op where unavailable. */
export function shareAnniversary(anniversary: string | null): void {
  if (Platform.OS !== 'ios' || !native) return;
  try {
    if (native.getAnniversary() === anniversary) return;
    native.setAnniversary(anniversary);
  } catch {
    // A widget that is one refresh stale is not worth surfacing.
  }
}
