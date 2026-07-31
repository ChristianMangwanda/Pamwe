# Design brief: the Reveal ceremony, round two

You are designing the most important three seconds in Pamwe, a couples devotional app. Two partners read the same Bible passage separately and each writes a private reflection. Neither can see the other's words until both have submitted. The Reveal is the moment the seal breaks: you both wrote, so now you both read. It happens at most once a day. Everything else in the app is quiet on purpose so that this one moment can feel like something.

Your job is the choreography of that moment. Not the screen after it, just the ceremony itself.

## The app's visual world, quickly

- Warm cream background, deep ink text, a muted accent (light and dark themes both exist; the ceremony must work in each).
- Type is Fraunces (serif, used italic for scripture-adjacent moments) and Instrument Sans.
- The recurring motif is floral embroidery: hand-stitched-looking flowers and vine dividers (we have these as image assets and can commission new variants, including cut-apart pieces for staged entrances).
- Motion language: one settle curve everywhere, cubic-bezier(0.22, 1, 0.36, 1). Durations in the app run 200 to 500ms. The ceremony is allowed to break the duration rule; it is the one place the app is allowed to take its time.
- Voice: plain, warm, reverent without being churchy. The only word on this screen is "Amen".

## What the ceremony does today (the thing you are replacing)

A full-screen veil in the background color covers the reveal screen, then:

1. Two small circles (46px) holding the partners' initials fade in while drifting toward each other horizontally. They start only 58px from center, so the travel is subtle. 560ms.
2. They touch at center with a small swell (scale 1.07, back to 1) and one success haptic on the contact beat. 270ms.
3. A floral vine divider (150 x 26px) and the word "Amen" (italic serif, 15px) fade and stretch in beneath them, both on the same animation. 380ms.
4. 160ms hold, then the veil fades out over 260ms and the two reflection cards underneath unfurl with a staggered entrance (500ms each, 160ms apart).

Total: about 1.6 seconds. Tap anywhere skips (the veil drops in 140ms). iOS Reduce Motion is honored: with it on, everything simply arrives in place.

The verdict from use: it is over before it registers. The travel is so short the meeting reads as a twitch, the flower and the Amen arrive on the same beat so neither gets its own moment, and the whole thing feels like a screen transition rather than a ceremony.

## What we want instead

The new choreography, in the founder's words: two orbs start at opposite ends of the screen and meet in the middle. When they meet, the flower embroidery appears. Then the word "Amen". Slower. More spectacular. The phone vibrates a little as they come together.

Design intent behind those words:

- **Two orbs, full journey.** One orb per partner, entering from the far left and far right edges of the screen. The travel should be long enough to watch: you see them coming, you feel the approach. They currently carry the partners' initials; keep the initials unless you find something more beautiful (the orbs are the two people, that must stay legible).
- **The meeting is the climax.** Contact at dead center deserves real emphasis: light, bloom, merge, ripple, whatever you design, this is the beat everything builds to. The haptics should build with the approach and land with the contact (we can fire any pattern of taps and impacts at millisecond marks you specify; current vocabulary is tap, light, medium, success, celebrate, and we can add custom sequences).
- **Then the flower.** The embroidery grows out of the meeting point as its own act, not a fade-in alongside something else. If it should draw on in stages, spec it as staged opacity/scale of pre-cut pieces (petals, stems, leaves) and we will cut the asset apart to match.
- **Then "Amen."** Last, alone, with room to breathe. The word is the exhale after the meeting.
- **Slower everywhere.** Target somewhere around 3 to 4.5 seconds total; find the pacing that feels ceremonial rather than sluggish, and give each act its own beat. Tap-to-skip stays, so patience costs nothing.
- After "Amen" settles, the veil lifts and the two reflection cards unfurl beneath (that part exists and works; you just hand off to it, and you may spec how the lift should feel so the handoff belongs to the ceremony).

## Hard constraints

1. **Runtime is React Native with Reanimated.** Everything must be expressible as transform (translate, scale, rotate) and opacity animations, plus staged timing and springs. No filters, no blurs over moving content, no masked path drawing, no particle systems. If you want a glow, design it as a soft pre-rendered asset that scales and fades. It must hold 60fps on a mid-range iPhone.
2. **Assets are images.** The embroidery is pre-rendered artwork. You can spec new pieces (including a larger centerpiece bloom and cut-apart layers for staged growth) but each piece animates only by transform and opacity.
3. **Both themes.** Spec any colors as roles (background, ink, accent, accent-soft), not hex values, so it maps to light and dark.
4. **Reduce Motion.** Spec the reduced version explicitly: what appears, in what order, with no movement. It should still feel intentional, not broken.
5. **Skip.** A tap anywhere exits gracefully at any point. Spec what a skip looks like from mid-ceremony (today: the veil just fades in 140ms).
6. **Haptics are part of the score.** Mark every haptic beat on the timeline with its intensity. Vibration during the approach should be subtle; the contact is the strong beat. Nothing after "Amen".
7. **Copy.** The only word is "Amen". No em dashes anywhere in anything you produce.
8. **Once per day.** The ceremony plays the first time that day's reveal opens, never again that day. No design work needed here, just know repetition fatigue matters less than first-impression weight.

## What to deliver

A beat-by-beat choreography spec we can port straight to Reanimated:

- A timeline table: for each element (left orb, right orb, contact effect, flower pieces, Amen, veil), its keyframes with millisecond marks, transforms, opacities, and easing per segment.
- Haptic marks on the same timeline.
- The Reduce Motion variant.
- The skip behavior.
- A list of any new art assets you need, with sizes and how they layer.
- If you can, an HTML/CSS prototype using @keyframes on the same timeline (that is how the app's original motion language was handed off, and it ports cleanly).

Design the feeling first, then make the timeline exact. The bar: when the orbs touch, a couple sitting on the couch together should both look up.
