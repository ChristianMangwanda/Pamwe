// Motion primitives from the design prototype's @keyframes (Pamwe App.dc.html).
// Durations/easings are exact; ReduceMotion.System honors the OS accessibility setting
// (the prototype handles prefers-reduced-motion globally).
import { Easing, Keyframe, ReduceMotion, SlideInDown } from 'react-native-reanimated';

const settle = Easing.bezier(0.22, 1, 0.36, 1);

/** Tab/screen content entrance: translateY 14 → 0 + fade, 350ms ease. */
export const fadeUp = new Keyframe({
  0: { opacity: 0, transform: [{ translateY: 14 }] },
  100: { opacity: 1, transform: [{ translateY: 0 }], easing: Easing.ease },
})
  .duration(350)
  .reduceMotion(ReduceMotion.System);

/** Full-screen overlay entrance: translateY 24 + scale .985 → identity + fade.
 *  Prototype was 340ms; trimmed in build 8 — beta feedback read it as load
 *  time on plan detail and the builder. */
export const overlayIn = new Keyframe({
  0: { opacity: 0, transform: [{ translateY: 24 }, { scale: 0.985 }] },
  100: { opacity: 1, transform: [{ translateY: 0 }, { scale: 1 }], easing: settle },
})
  .duration(200)
  .reduceMotion(ReduceMotion.System);

/** Bottom sheet entrance: slides up from the bottom edge, 300ms. */
export const sheetUp = SlideInDown.duration(300)
  .easing(settle.factory())
  .reduceMotion(ReduceMotion.System);

/** Success checks / avatars / seals: scale .7 → 1.08 → 1, 500ms. */
export const popIn = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 0.7 }] },
  60: { opacity: 1, transform: [{ scale: 1.08 }], easing: settle },
  100: { opacity: 1, transform: [{ scale: 1 }], easing: settle },
})
  .duration(500)
  .reduceMotion(ReduceMotion.System);

/** How the reveal cards arrive, decided by how the ceremony above them ended. */
export type UnsealKind = 'full' | 'skip' | 'reduced';

/** Reveal cards: translateY 22 + scale .97 → identity, staggered per card.
 *  'full' is the ceremony's closing beat (500ms, 160ms apart), 'skip' the
 *  hurried version for a tap (320ms, 90ms), 'reduced' a plain crossfade in
 *  place (300ms, 80ms) for the Reduce Motion ceremony. */
export function unseal(index: number, kind: UnsealKind = 'full') {
  // Already the Reduce Motion design, so it opts out of the system setting
  // rather than being flattened into an instant cut by it.
  if (kind === 'reduced') {
    return new Keyframe({
      0: { opacity: 0 },
      100: { opacity: 1, easing: Easing.linear },
    })
      .duration(300)
      .delay(index * 80)
      .reduceMotion(ReduceMotion.Never);
  }
  const quick = kind === 'skip';
  return new Keyframe({
    0: { opacity: 0, transform: [{ translateY: 22 }, { scale: 0.97 }] },
    100: { opacity: 1, transform: [{ translateY: 0 }, { scale: 1 }], easing: settle },
  })
    .duration(quick ? 320 : 500)
    .delay(index * (quick ? 90 : 160))
    .reduceMotion(ReduceMotion.System);
}
