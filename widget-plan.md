# Verse of the Day widget — plan + implementation record

**Session:** 2026-07-12. Built the home-screen widget from the design handoff
(`widgets/Verse of the Day Widget.html` + `tree-light.png` / `tree-dark.png`).

## What it is

A native **WidgetKit + SwiftUI** app-extension, `VerseWidget`: one Scripture
verse per day with a tree-of-life emblem behind it. Small / Medium / Large,
light + dark, faithful to the mock (verified by off-device render, see below).

## Decisions (locked with Christian)

1. **Self-contained curated daily verse.** The widget bundles `verses.json` (a
   curated set of uplifting, standalone verses) and picks by calendar **day-of-year**
   (cycling if the set is shorter than the year), rolling over at local midnight. No
   App Group, no native bridge, **zero JS changes**, works before sign-in,
   identical for both partners. (The alternative — personalized "our current
   reading" — would need an App Group + native bridge; deferred, see below.)

   > **Curation (added same session):** the first cut used the M'Cheyne pull quote
   > for each date, but those are keyed to reading position and surface narrative
   > fragments ("The lot came out for the children of Joseph...") that mean little
   > out of context. Replaced with a hand-curated devotional set: the references
   > live in `scripts/gen_widget_verses.py` and the exact WEB text is fetched from
   > bible-api.com (the app's own Bible source, `src/lib/bible.ts`) so nothing is
   > hand-typed or paraphrased.
2. **Target spliced in code**, not the Xcode GUI, via the `xcodeproj` gem inside
   Homebrew CocoaPods. No `expo prebuild` (honours the hand-maintained `ios/`).

## What was built

All under **`ios/VerseWidget/`** (now git-tracked via a `.gitignore` exception):

- `VerseWidgetBundle.swift` — `@main` WidgetBundle.
- `VerseWidget.swift` — WidgetKit: `TimelineProvider` (one entry, reload `.after`
  next local midnight), family → `WidgetSize` mapping, `containerBackground`,
  `contentMarginsDisabled`, `.widgetURL("pamwe://today")`. Deployment target
  **iOS 17.0** (app stays 16.4) so those modern APIs are unconditional.
- `VerseWidgetView.swift` — **pure SwiftUI** (no WidgetKit import) so it renders
  off device. Background gradients + tree emblem + three per-size layouts.
- `Theme.swift` — light/dark color tokens + fonts, from the mock's CSS.
- `VerseData.swift` — loads `verses.json`, `verse(for:)` by day-of-year.
- `Info.plist` — WidgetKit extension point, `UIAppFonts`, version keys mirroring
  the app (`CFBundleShortVersionString` literal `1.0.0`, `CFBundleVersion` =
  `$(CURRENT_PROJECT_VERSION)`).
- `Assets.xcassets/Tree.imageset` — light + dark tree (auto-switch).
- `Fonts/` — `Fraunces-Italic` (verse) + `InstrumentSans-SemiBold` (eyebrow/ref),
  the only two faces the widget uses.
- `verses.json` — curated verse entries `{d, full, short, ref}`.

Scripts (committed, reproducible):
- `scripts/gen_widget_verses.py` — curated `REFERENCES` list + fetch of exact WEB
  text from bible-api.com (cached, rate-limited). `short` is a Small-widget
  convenience (first sentence/clause under ~85 chars); hand-editable.
- `scripts/add_widget_target.rb` — idempotently splices the target into
  `Pamwe.xcodeproj` and positions the embed phase correctly. Run with
  `GEM_HOME=/opt/homebrew/Cellar/cocoapods/<ver>/libexec /opt/homebrew/opt/ruby/bin/ruby …`.

## Verification (headless)

- **Design match:** rendered all 6 (size × mode) to PNGs with `ImageRenderer` on
  the Mac; they match the mock (cream/warm-black grounds, tree emblem, italic
  verse, tracked eyebrow + reference).
- **Widget compiles + links** for the simulator; the built `.appex` carries the
  fonts, `Assets.car` (Tree), and the curated verses; Info.plist resolves to the app's
  exact version.
- **Survives `pod install`** untouched (no `[CP]` phases attached).
- **Full app builds and embeds** the appex in `Pamwe.app/PlugIns/` with matching
  versions (both build 12 / 1.0.0). Hit and fixed a `Cycle inside Pamwe` (embed
  phase must run early — details in `trial-and-error.md`).

## Remaining for Christian (can't be done headlessly)

1. Open `Pamwe.xcworkspace` once → `VerseWidget` target → Signing & Capabilities →
   confirm team `5LX4YFCXPK` + automatic signing (Xcode auto-registers the
   `…pamwe.VerseWidget` App ID). **No capability toggles** (self-contained).
2. Build/run to a device, add the Pamwe widget in all three sizes, light + dark.
3. Ship: the archive embeds the appex automatically; `ExportOptions.plist`
   (automatic signing) signs it. **Release bump is now 4 spots** for
   `CURRENT_PROJECT_VERSION` (2 app + 2 widget) — the appex `CFBundleVersion` must
   equal the app's or Apple processing rejects (see CLAUDE.md).

## Out of scope (later)

Personalized "our current reading" verse (needs App Group + native bridge; the
view is already structured to later prefer App-Group data and fall back to the
bundle), Lock Screen / StandBy accessory widgets, configurable (AppIntent) widget.
