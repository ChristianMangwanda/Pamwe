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

/** Full-screen overlay entrance: translateY 24 + scale .985 → identity + fade, 340ms. */
export const overlayIn = new Keyframe({
  0: { opacity: 0, transform: [{ translateY: 24 }, { scale: 0.985 }] },
  100: { opacity: 1, transform: [{ translateY: 0 }, { scale: 1 }], easing: settle },
})
  .duration(340)
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

/** Reveal cards: translateY 18 + scale .97 → identity, 500ms, staggered 160ms per card. */
export function unseal(index: number) {
  return new Keyframe({
    0: { opacity: 0, transform: [{ translateY: 18 }, { scale: 0.97 }] },
    100: { opacity: 1, transform: [{ translateY: 0 }, { scale: 1 }], easing: settle },
  })
    .duration(500)
    .delay(index * 160)
    .reduceMotion(ReduceMotion.System);
}
