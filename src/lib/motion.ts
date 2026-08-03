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

// The planting, on the completion screen. Its three keyframes take an explicit
// delay so the whole timeline reads in one place in PlantingCeremony rather
// than being spread across this file.
//
// `reduced` is not ReduceMotion.System: the ceremony reads the setting itself
// and plays a different timeline, so each animation opts out of being flattened
// a second time on top of that.

/** A plain crossfade on a mark: how the planting's backdrop arrives in both
 *  timelines, and the Reduce Motion answer to all three below. */
export function fadeAt(delay: number, duration = 200) {
  return new Keyframe({
    0: { opacity: 0 },
    100: { opacity: 1, easing: Easing.linear },
  })
    .duration(duration)
    .delay(delay)
    .reduceMotion(ReduceMotion.Never);
}

/** A footprint landing: scale .55 → 1.09 → 1 over 260ms. Scale only, so a print
 *  keeps its angle from a static wrapper rather than animating a rotation it
 *  never actually turns through. A uniform scale commutes with rotation, so the
 *  result is the design's `scale() rotate()` exactly. */
export function landStep(delay: number, reduced: boolean) {
  if (reduced) return fadeAt(delay);
  return new Keyframe({
    0: { opacity: 0, transform: [{ scale: 0.55 }] },
    65: { opacity: 1, transform: [{ scale: 1.09 }], easing: settle },
    100: { opacity: 1, transform: [{ scale: 1 }], easing: settle },
  })
    .duration(260)
    .delay(delay)
    .reduceMotion(ReduceMotion.Never);
}

/** The tree standing up where the prints came through: scale .7 → 1.08 → 1 over
 *  500ms. Pair with `transformOrigin: 'bottom'` so it grows out of its base
 *  rather than swelling from its middle. */
export function standUp(delay: number, reduced: boolean) {
  if (reduced) return fadeAt(delay);
  return new Keyframe({
    0: { opacity: 0, transform: [{ scale: 0.7 }] },
    60: { opacity: 1, transform: [{ scale: 1.08 }], easing: settle },
    100: { opacity: 1, transform: [{ scale: 1 }], easing: settle },
  })
    .duration(500)
    .delay(delay)
    .reduceMotion(ReduceMotion.Never);
}

/** A line of the planting's text: the app's 14px rise, on its own mark. */
export function riseAt(delay: number, reduced: boolean) {
  if (reduced) return fadeAt(delay);
  return new Keyframe({
    0: { opacity: 0, transform: [{ translateY: 14 }] },
    100: { opacity: 1, transform: [{ translateY: 0 }], easing: settle },
  })
    .duration(350)
    .delay(delay)
    .reduceMotion(ReduceMotion.Never);
}

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
