# Design brief: the Grove, Pamwe's award system

You are designing the only page in Pamwe that tells a couple how far they have come.

Pamwe is a devotional app for two people. They read the same Bible passage, each writes a private reflection, and neither can see the other's words until both have written. That is the whole product: a small daily ritual that belongs to the two of them. Everything in the app is deliberately quiet so the ritual can be the loud thing.

The Grove is where the app keeps score, and it is the one place allowed to feel like an achievement.

## What a tree means, and why the rarity matters

**A couple earns a tree by finishing a reading plan together.** Not by reading a day, not by keeping a streak: by walking a whole plan from day one to its last day, both of them, all the way through.

That takes between a fortnight and a year. A couple might earn three trees in their first year and be proud of it. This is the rarest event the app has, which drives two design consequences:

1. **The page is visited rarely and must reward the visit.** It is not a dashboard. Someone opens it a handful of times a year, usually right after finishing something, and should want to sit with it.
2. **The empty and near-empty states are the common case.** A couple with zero or one tree is the normal reader of this page, not an edge case. The page must feel like a promise before it feels like a trophy case. Design the one-tree state as carefully as the seven-tree state.

The ladder is seven trees, ascending in size, drawn from around the world. That spread is deliberate: this is an app built by a Zimbabwean developer for couples anywhere, and the grove should not look like one continent's garden.

| # | Tree | Earned at | The line shown when it is theirs |
|---|---|---|---|
| 1 | Fig tree | 1 plan | Your first plan finished together, and a fig tree planted. |
| 2 | Olive tree | 2 plans | Two plans finished. Olive trees grow slowly and last for centuries. |
| 3 | Jacaranda | 3 plans | Three plans finished. The jacaranda turns whole streets purple. |
| 4 | Oak | 5 plans | Five plans finished. Oaks hold their ground for hundreds of years. |
| 5 | Baobab | 8 plans | Eight plans finished. The baobab carries whole seasons in its trunk. |
| 6 | Cedar of Lebanon | 12 plans | Twelve plans finished. Cedars crowned the mountains of Lebanon. |
| 7 | Redwood | 20 plans | Twenty plans finished. Redwoods are the tallest living things on Earth. |

The ladder lives in [`src/lib/treeAwards.ts`](src/lib/treeAwards.ts) and is cheap to extend: adding a rung is one line. Argue with the species, the thresholds, or the copy if you have a better idea. Nothing here is sacred except that it must keep going: the previous system capped at three and then said "In full bloom" forever, which let a couple exhaust the app's only milestone in a season.

## What exists today (the thing you are replacing)

A functional placeholder, built to ship the logic, never designed:

- Screen title "Your grove", italic subtitle, then a flat vertical list of seven rows.
- Each row: a 38px rounded square holding a Phosphor `Tree` or `TreeEvergreen` glyph, the species name, and one line of text. Earned rows get a surface fill and the accent color; locked rows are transparent with a padlock and read "Unlocks at 5 plans finished."
- Above the list, one sentence: "Olive tree, standing. 1 more plan and the jacaranda joins it."

It is honest and completely inert. Seven near-identical rows, two off-the-shelf icons standing in for seven species, and nothing that feels like a grove. The word "grove" promises that the trees stand together somewhere; a list is the least grove-like arrangement possible.

**The core question we are handing you: what should this be instead of a list?** A landscape that accumulates trees as they are earned. A path walked from one tree to the next. A single scene that grows denser. Something else. We do not have the answer and we are not attached to the list.

## Where it sits in the app

- **Entry point:** the You tab. A card there shows the current tree drawing, a pill reading "Olive tree · 2 plans", and a caption "Next tree at 3 plans: jacaranda." Tapping the card opens the Grove. Spec what that card should become too: it is the Grove's advertisement and the thing most people actually see.
- **The other moment:** finishing a plan lands on a completion screen that shows the same tree drawing and a caption naming the tree just earned. **That is the emotional peak of the whole system** and it deserves your attention: it is the instant a new tree arrives. Today it is a static caption. Say what should happen there and how it should hand off to the Grove.
- Streak milestones (7, 30, 100 consecutive plan days) are a **separate** system today: a card appears once on the home screen, the couple dismisses it, and it is gone forever with no record anywhere. If you think days-based milestones belong in the Grove alongside plan-based trees, make that case. If you think mixing two currencies muddies it, say that instead.

## The visual world

- **Palette (light):** background `#EFE6D6`, surface `#F7F0E1`, ink `#2B1F14`, secondary ink `#7A6A55`, muted `#A89678`, accent `#6B2421` (deep oxblood), accent-2 `#9B5651`, hairlines `#D9CCB0`.
- **Palette (dark):** background `#17120E`, surface `#221B15`, ink `#EFE6D6`, muted `#9C8D72`, accent `#E7AA9C` (the accent inverts to a warm blush), accent-2 `#D18A7F`, hairlines `#3A3026`.
- **Type:** Fraunces (serif) for anything expressive, italic for scripture-adjacent lines; Instrument Sans for labels. Page titles are Fraunces Light 30px. Eyebrows are Instrument Sans SemiBold 10px, uppercase, 2px letter-spacing. Body is Fraunces 15 to 17px.
- **Motif:** hand-stitched floral embroidery. Two existing assets, a corner spray and a vine divider, appear throughout as quiet punctuation. New embroidery can be commissioned.
- **Existing tree art:** one code-drawn SVG that morphs through six stages, from a seed in soil to a stem with leaf pairs to a five-petal bloom. It is generic, not species-specific, and it is the thing seven distinct trees would replace. There is also a single raster tree used as a watermark in the home-screen widget.
- **Motion:** one settle curve everywhere, `cubic-bezier(0.22, 1, 0.36, 1)`. Screens enter with a 14px rise and fade over 350ms. Earned things pop in at scale 0.7 → 1.08 → 1 over 500ms.
- **Haptics available:** tap, light, medium, success, and a celebrate pattern (success, then a heavy impact 150ms later).
- **Voice:** plain, warm, reverent without being churchy. It states what happened and does not gush. Read the seven lines in the table above for the register.

## Hard constraints

1. **React Native.** Vector art is `react-native-svg` (paths, gradients, groups; no filters, no masks of moving content). Raster art is fine as bundled PNG. Motion is Reanimated: transform and opacity only, holding 60fps on a mid-range iPhone. No particle systems, no live blur.
2. **Seven species must be distinguishable at a glance,** in one accent color, in light and dark, at whatever size your layout uses. Silhouette is doing all the work: a baobab and a redwood must not read as the same tree in different sizes. If you need seven pieces of commissioned art, say so and spec the sizes; if you can do it in code-drawn SVG, better.
3. **Spec colors as roles** (background, surface, ink, muted, accent, accent-2, hairline), never hex, so it maps to both themes. Verify your design in dark: the accent flips from deep oxblood to warm blush, which is a bigger shift than a normal dark mode.
4. **State is derived, not stored.** The app counts finished plans on the fly; there is no record of *when* a tree was earned and no "newly unlocked" flag. If your design needs a first-time-seen state, an arrival animation, or a date under each tree, call it out as a data requirement and we will add it. There is precedent for a locally stored high-water mark, and finish dates are recoverable. Just do not assume they exist.
5. **Both extremes must hold.** Zero trees (the promise), one tree (the common case), and all seven (the rare, earned end). Show all three.
6. **Accessibility.** Honor Reduce Motion with an explicit alternative. Do not let color alone carry earned-versus-locked, and keep text legible against any scene you build.
7. **No em dashes** in any copy you write. Commas, colons, periods. This is a house rule with no exceptions outside quoted scripture.
8. **It cannot become a leaderboard.** No comparison to other couples, no ranking, no streak-shaming, nothing that makes a slow couple feel behind. Two people who finished one plan in a year did something good.

## What to deliver

1. **The concept, argued.** What the Grove is instead of a list, and why that serves a page visited three times a year. One paragraph before any pixels.
2. **The Grove screen** at all three fill states (0, 1, and 7 trees), light and dark. Include how a locked tree reads, how the next one is motivated, and where the copy sits.
3. **The seven trees**, as art direction or actual SVG. Whichever you choose, show all seven side by side so the silhouettes can be checked against each other.
4. **The You tab card**, since it is what most people see.
5. **The arrival moment:** what happens on the completion screen when a tree is earned, and how it connects to the Grove. Beat-by-beat with millisecond marks and haptic beats if it is animated, in the format we use for motion handoff.
6. **Copy** for anything you add or change, in the voice above.
7. **Data requirements**, if your design needs anything the app does not currently keep.
8. An HTML/CSS prototype if you can. That is how this app's original design was handed off and it ports cleanly to React Native.

The bar: a couple who has just finished their second plan together opens this page, sees an olive tree standing next to a fig, and wants to go start a third.
