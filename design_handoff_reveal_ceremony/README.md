# Handoff: Reveal ceremony, round two

## Overview
The Reveal is the once-a-day moment in Pamwe when both partners have submitted their private
reflection and the seal breaks. This handoff specifies the replacement choreography: two orbs
travel in from the far left and right edges, meet at dead center with light and ripple, the
floral embroidery grows out of the meeting point, and then the word "Amen" arrives alone.
Total run: 4260ms to the veil lift, 5060ms including the handoff to the existing reflection
cards. Tap anywhere skips at any point. Reduce Motion has its own explicit variant.

## About the design files
`Reveal Ceremony.dc.html` in this bundle is a **design reference built in HTML**, not
production code. It is a live prototype of the timing: every keyframe in it matches the
millisecond marks in the tables below, so it is the fastest way to feel the pacing and to
check a Reanimated port against something concrete.

The task in the app is to **re-implement this choreography in React Native with Reanimated**
using the codebase's existing components, theme hook and haptics wrapper. Do not port the
HTML or the CSS. Everything here is expressible with `translateX`, `translateY`, `scale`,
`rotate` and `opacity` plus `withSequence` / `withTiming` / `withDelay`, which is the
constraint the design was written to.

## Fidelity
**High fidelity for motion, high fidelity for layout, roles for color.** Timings, distances,
easings, sizes and haptic marks are final and exact. Colors are given as **theme roles**
(background, ink, accent, accent-soft, sel, line-accent), never hex, so light and dark both
work through `useTheme()`. The prototype's own hex values come from the Pamwe tokens and are
listed at the end for reference only.

## The four acts

| Act | Name | Window | What it does |
|-----|------|--------|--------------|
| I | Approach | 260 to 1980 | Two orbs enter from beyond the left and right edges and cross most of the screen. Haptic ticks quicken as the gap closes. |
| II | Meeting | 1980 to 2420 | They press 6pt past touching, swell to 1.12 and settle. Glow flares, two rings ripple out, the strong haptic lands. |
| III | Bloom | 2260 to 3590 | The rose opens out of the meeting point, then vines grow outward from it, then two tulip sprigs rise behind the orbs. Three staged entrances. |
| IV | Amen | 3420 to 4260 | The word alone, rising 14pt into place, then 240ms of held silence. |

Then the veil lifts (4260) and the existing reflection cards unfurl beneath (4400, 4560).

## Layout geometry

Screen reference is a 390pt wide phone. All positions are measured from screen center.

- **Ceremony group**: absolutely fills the reveal screen above the veil, flex column, centered
  on both axes. Stack from top: sprig row (offset 56pt above the orb row), orb row (64pt tall),
  30pt gap, flower row (94pt tall), 22pt gap, "Amen".
- **Orbs**: 64 x 64pt, borderRadius 32, fill `sel`, 1.5pt border `accent2`, initial centered
  in Fraunces_500Medium 22pt, color `accent`. Resting positions after contact are x = -32
  and x = +32, so the two circles touch exactly.
- **Glow**: 236 x 236pt image, centered on the orb row, behind the orbs, above the veil.
- **Rings**: two 64 x 64pt circles, borderRadius 32, 1pt border (`accent2` then `lineAccent`),
  centered on the meeting point, opacity 0 until their start.
- **Flower row**: horizontal, centered: vine-left 104 x 42, bloom 84 x 94 (overlapping the
  vines by 4pt each side), vine-right 104 x 42.
- **Sprigs**: 88 x 70pt each, 84pt apart, top edge 56pt above the orb row, layered behind the orbs.
- **Amen**: Fraunces_400Regular_Italic 30pt, letter-spacing 0.04em, color `accent`.
  This is a deliberate jump up from today's 15pt: it is the last thing on screen and it should
  be able to carry the beat on its own.

## Timeline

Marks are absolute milliseconds from ceremony start. `settle` = cubic-bezier(0.22, 1, 0.36, 1),
the app's one settle curve.

| Element | Mark | Transform | Opacity | Easing |
|---|---|---|---|---|
| Veil | 0 to 4260 | none, covers the reveal screen | 1 | held |
| Both orbs | 260 to 760 | none | 0 to 1 | settle |
| Left orb | 260 to 1580 | translateX -237 to -60 | 1 | cubic-bezier(0.33, 0, 0.5, 0.85) |
| Right orb | 260 to 1580 | translateX +237 to +60 | 1 | cubic-bezier(0.33, 0, 0.5, 0.85) |
| Left orb | 1580 to 1960 | translateX -60 to -26 | 1 | cubic-bezier(0.6, 0, 0.85, 0.4) |
| Right orb | 1580 to 1960 | translateX +60 to +26 | 1 | cubic-bezier(0.6, 0, 0.85, 0.4) |
| Left orb | 1960 to 2300 | translateX -26 to -32 | 1 | settle |
| Right orb | 1960 to 2300 | translateX +26 to +32 | 1 | settle |
| Both orbs | 1980 to 2040 | scale 1 to 1.12 | 1 | cubic-bezier(0.3, 0, 0.7, 1) |
| Both orbs | 2040 to 2420 | scale 1.12 to 1 | 1 | settle |
| Glow | 1980 to 2120 | scale 0.35 to 1.5 | 0 to 0.85 | cubic-bezier(0.2, 0.8, 0.4, 1) |
| Glow | 2120 to 2580 | scale 1.5 to 1.18 | 0.85 to 0.3, then held | settle |
| Ring 1 | 1980 to 2700 | scale 0.55 to 2.9 | 0.5 to 0 | cubic-bezier(0.2, 0.75, 0.3, 1) |
| Ring 2 | 2100 to 2860 | scale 0.55 to 2.9 | 0.5 to 0 | cubic-bezier(0.2, 0.75, 0.3, 1) |
| Rose bloom | 2260 to 2560 | scale 0.12 to 1.08, rotate -18 to +2 | 0 to 1 | cubic-bezier(0.2, 0.85, 0.3, 1) |
| Rose bloom | 2560 to 2820 | scale 1.08 to 1, rotate +2 to 0 | 1 | settle |
| Vine left | 2600 to 3200 | scaleX 0.14 to 1, origin right edge | 0 to 1 by 2800 | settle |
| Vine right | 2640 to 3240 | scaleX 0.14 to 1, origin left edge | 0 to 1 by 2840 | settle |
| Sprig left | 2900 to 3500 | translateY +10 to 0, scale 0.86 to 1 | 0 to 0.92 | settle |
| Sprig right | 2990 to 3590 | translateY +10 to 0, scale 0.86 to 1 | 0 to 0.92 | settle |
| Amen | 3420 to 4020 | translateY +14 to 0, scale 0.94 to 1 | 0 to 1 | settle |
| All | 4020 to 4260 | held | held | the exhale |
| Ceremony group | 4260 to 4740 | translateY 0 to -16, scale 1 to 1.03 | 1 to 0 | cubic-bezier(0.4, 0, 0.6, 1) |
| Veil | 4260 to 4820 | none | 1 to 0 | cubic-bezier(0.4, 0, 0.6, 1) |
| Card 1 | 4400 to 4900 | translateY +22 to 0, scale 0.97 to 1 | 0 to 1 | settle |
| Card 2 | 4560 to 5060 | translateY +22 to 0, scale 0.97 to 1 | 0 to 1 | settle |

Implementation notes:

- Travel and press are **separate shared values on nested views**, so no two animations fight
  for the same transform. Suggested tree per orb:
  `travelView > pressView > swellView > fadeView > orb`.
- The press is one `withSequence`: `withTiming(34, {duration: 380, easing: cubic(0.6,0,0.85,0.4)})`
  then `withTiming(28, {duration: 340, easing: settle})`, where the values are deltas from the
  travel resting point of 60pt.
- Glow holds at 0.3 opacity after its flare and only leaves with the veil, so the meeting point
  stays warm while the flower grows.
- Vines scale on X from the edge nearest the bloom, so the embroidery reads as growing outward
  rather than sliding in. In RN, offset the view and use `transform: [{translateX: w/2}, {scaleX: s}, {translateX: -w/2}]`
  to fake a non-center transform origin.
- At most nine animated layers are live at once, none of them change layout, so this holds 60fps
  on a mid-range iPhone. Keep every driver on the UI thread (no `runOnJS` inside the timeline
  except the haptic calls).

## Haptic score

| Mark | Pattern | Why |
|---|---|---|
| 900 | tap, selection | First sense of approach. Barely there, one soft tick as the orbs clear the edges. |
| 1340 | light impact | The rhythm starts. Gaps shorten from here. |
| 1620 | light impact | 280ms later. |
| 1800 | light impact | 180ms later. The quickening is what tells the body something is about to happen. |
| 1900 | light impact | 100ms later, the last breath before contact. |
| 1980 | medium impact, then success at 2020 | Contact. The strong beat of the whole app. |
| 2050 | light impact | The swell releasing. Reads as the recoil of the meeting, not a new event. |
| 2280 | tap, selection | The bloom opening. Last haptic of the ceremony. |

Nothing fires after 2280, so "Amen" lands in silence. Schedule the marks from the same clock
that starts the animations and clear all pending marks on skip and on unmount.

## Reduce Motion variant

No translation, no scale, no rotation. Crossfades only, same order of acts, one haptic.
Total 1960ms.

| Mark | What happens |
|---|---|
| 0 to 320 | Both orbs fade in, already side by side and touching at center. |
| 320 | One success haptic. The only haptic in this variant. |
| 420 to 780 | The flower fades in whole, as one assembled asset. No growth, no stagger. |
| 900 to 1260 | "Amen" fades in. Still last, still alone. |
| 1260 to 1560 | Held. |
| 1560 to 1960 | Veil and ceremony crossfade out, cards fade in place 300ms each, 80ms apart. |

## Skip behavior

Tap anywhere on the screen.

**Before "Amen" settles (any time under 4020):** cancel every animation and hold each value
where it stands, no snapping back to a keyframe. Ceremony group opacity to 0 over 160ms linear.
Veil opacity to 0 over 220ms after a 60ms delay. Cards unfurl at once, 320ms each, 90ms apart.
Clear queued haptics, fire none.

**After "Amen" settles (past 4020):** a tap only shortens the hold. Run the normal lift
immediately: veil 560ms, group rise and fade 480ms, cards on the usual 500ms / 160ms stagger.

## State

- `phase`: idle | playing | skipping | done. Only `playing` accepts a skip tap.
- `hasPlayedToday`: persisted per reveal date. The ceremony plays the first time that day's
  reveal opens and never again that day. On subsequent opens, mount the reveal screen with the
  cards already in place and no veil.
- `reduceMotion`: from `AccessibilityInfo.isReduceMotionEnabled()` plus its change listener,
  read once at mount.
- One shared value per animated property, plus one timeout handle list for the haptic schedule.

## Assets

Sizes are logical points, export at 2x and 3x. PNG with alpha, no baked shadows.

| Asset | Size | Notes |
|---|---|---|
| bloom-center.png | 84 x 94 | New centerpiece rose, larger and more detailed than today's divider rose. Sits 30pt below the orb pair. |
| vine-left.png | 104 x 42 | Left half of the divider flourish, cut at the bloom seam. Right edge anchors to the bloom. |
| vine-right.png | 104 x 42 | Mirror of the left, left edge anchors to the bloom. |
| sprig-left.png | 88 x 70 | Tulip and leaf cluster drawn to lean inward. Layers behind the orbs. |
| sprig-right.png | 88 x 70 | Mirror of the left sprig. |
| orb-glow.png | 236 x 236 | Soft radial falloff to fully transparent, no hard edge. One alpha asset, tinted accent-soft in light and accent in dark. |
| flower-whole.png | 232 x 42 | The assembled flower as one piece, for the Reduce Motion fade and as the seam check against the cut pieces. |

The `assets/` folder in this bundle holds **prototype stand-ins** cut from the existing
`flowers-divider.png` and `flowers-corner.png`, plus two generated glow PNGs. They are good
enough to judge the choreography and to build against, but the shipping pieces should be drawn
as one centerpiece and then cut, so the seams between bloom and vines line up.

Layer order, back to front: veil, glow, rings, sprigs, vines and bloom, orbs, "Amen".

## Color roles

Use the theme hook, never hex.

| Use | Role |
|---|---|
| Veil and ground | background (`bg`) |
| Orb fill | `sel` |
| Orb border, ring 1 | `accent2` |
| Ring 2 | `lineAccent` |
| Initials, "Amen" | `accent` |
| Glow tint | `lineAccent` in light, `accent` in dark |

Pamwe token values behind those roles, for reference only:
light `bg #EFE6D6`, `sel #EADFC6`, `ink #2B1F14`, `accent #6B2421`, `accent2 #9B5651`,
`lineAccent #E4CFC9`; dark `bg #17120E`, `sel #33291F`, `ink #EFE6D6`, `accent #E7AA9C`,
`accent2 #D18A7F`, `lineAccent #4A352F`.

## Type

- Orb initial: Fraunces_500Medium, 22pt, color accent.
- "Amen": Fraunces_400Regular_Italic, 30pt, letter-spacing 0.04em, color accent.
- No other text appears during the ceremony. The only word on this screen is "Amen".

## Copy

"Amen". Nothing else. No em dashes anywhere in the feature, including code comments and
commit messages, per the Pamwe voice rules.

## Files in this bundle

- `Reveal Ceremony.dc.html` — the interactive prototype and the same spec rendered as a page.
  Open it in a browser: play, toggle light and dark, toggle Reduce Motion, study at 0.4x, and
  tap the phone to see the skip. Dots under the phone are the haptic marks.
- `assets/` — prototype stand-in artwork and the two glow PNGs.
- `_ds/` — the Pamwe design system bundle the prototype loads for tokens and fonts.

## Suggested build order

1. Veil plus skip plumbing, with the existing card unfurl as the handoff. Verify a tap at any
   moment leaves the user on a correct reveal screen.
2. Act I and II with placeholder circles, no art. Tune on device: the approach is the part that
   has to feel watched rather than waited out.
3. Haptic schedule against Act I and II. Check the quickening on a real phone, not the simulator.
4. Art pieces and Act III.
5. "Amen" and the lift.
6. Reduce Motion variant and the once-per-day gate.
