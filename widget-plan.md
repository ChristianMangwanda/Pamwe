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

---

# Lock Screen widget — plan + implementation record

**Session:** 2026-07-31. Built from the design handoff
`~/Downloads/Pamwe Verse Widget (2b, 2c).html` (a self-unpacking bundle; the real
markup is in its `__bundler/template` script tag).

## What the handoff asked for, and what iOS allows

The mock compares two transparency treatments for a Lock Screen widget: **2b
"Sheer"** (6% white panel, 4px blur, hairline border, soft text shadow) and **2c
"Clear"** (no container, shadow only). Three things did not survive contact with
WidgetKit, and are worth knowing before anyone tries to "fix" the fidelity:

1. **iOS owns the transparency.** Lock Screen widgets render in
   `WidgetRenderingMode.vibrant`; the system flattens content into its own
   monochrome material. Tint, blur, shadow and the Pamwe palette are not knobs.
   The only sanctioned backdrop is `AccessoryWidgetBackground()`. So 2b vs 2c
   survives as a *decision* (panel or no panel) but none of its numbers do.
2. **The mock is drawn about twice the real width.** Its panel is 338 x 72pt.
   A real `.accessoryRectangular` is roughly **172 x 76pt**.
3. **The header therefore cannot hold both** the full reference and
   "1,540 days together" (needs ~200pt of ~164pt usable). This is the same
   tension the designer flagged under "Still open".

## Decisions (locked with Christian)

1. **Both treatments, user picks** — shipped as `LockVerseConfiguration`, an
   `AppIntentConfiguration` with a "Clear background" toggle.
2. **Counter from a real anniversary**, not `paired_at` (which reads ~20 days for
   Christian and Ammy). New nullable `couples.anniversary`, set in You → Couple.
3. **Same curated verse** as the home widget, so the two agree.
4. **Tap opens the verse in the reader**, not Today.

## What was built

- `ios/VerseWidget/LockVerseWidget.swift` — `AppIntentConfiguration`, timeline
  reloading at local midnight (verse *and* day count roll over together),
  `.widgetURL(entry.verse.readerURL)`.
- `ios/VerseWidget/LockVerseView.swift` — pure SwiftUI. The header is a
  `ViewThatFits` ladder: full ref + "N days together" → full ref + "N days" →
  `abbr` + "N days" → `abbr` + "Nd" → ref alone. Verse uses `short` at 12.5pt,
  3 lines, `minimumScaleFactor(0.78)` so the longest few shrink rather than clip.
- `ios/VerseWidget/SharedData.swift` — reads the App Group key, counts days.
  Parses `YYYY-MM-DD` as a **local** calendar day (an ISO8601 parser would read
  UTC midnight and be off by one west of Greenwich).
- `modules/pamwe-widget/` — local Expo module, writes the one key and calls
  `WidgetCenter.reloadAllTimelines()`. Autolinked; no `expo prebuild`.
- App Group `group.com.christianmangwanda.pamwe` on **both** entitlements files;
  `CODE_SIGN_ENTITLEMENTS` on both widget build configs.
- `supabase/migrations/20260731000001_couples_anniversary.sql` — column plus a
  `set_couple_anniversary` SECURITY DEFINER RPC. A member-wide UPDATE policy was
  rejected: it would hand the client `streak_count`, `invite_code`, `timezone`
  and the partner ids too.
- `scripts/gen_widget_verses.py` now emits `book`/`chapter`/`verse` (read from
  `src/lib/bible.ts` so a name the reader cannot resolve fails the build instead
  of shipping a dead tap) and `abbr` (standard citation short forms).
- `scripts/add_widget_target.rb` now re-asserts the file lists on every run, so
  adding a Swift file to `SOURCES` is enough. It used to only seed them on first
  splice, which is why new files silently went uncompiled.

## Bugs the off-device render caught

Both would have shipped invisibly, because the layout only fails at the real
size and neither is a compile error.

**The counter never appeared.** The first header was a `ViewThatFits` of
"full reference + 'N days together'" then "reference only". At ~164pt of usable
width the first candidate never fits, so it fell straight through and the counter
was silently gone, deleting the entire feature the anniversary work exists for.
Fixed with a four-rung ladder that gives up the counter's wording, then the book's
full name (`abbr`), before dropping the counter.

**Long verses clipped mid-word.** `short` is capped at 85 characters but three
lines only hold about 80, so the longest entries truncated to "don't be afr...".
`minimumScaleFactor(0.78)` lets those shrink instead; a clipped verse reads as a
mistake, a slightly smaller one does not.

## Verification (headless)

- `LockVerseView` rendered off device with `ImageRenderer` at 160x72, 172x76 and
  184x82, across four content cases (mock, no anniversary, long reference,
  longest verse + 5-digit counter). This is what caught the two real bugs: the
  counter never fitting, and long verses clipping.
- VerseWidget target **builds clean** (`xcodebuild -target VerseWidget`).
- All 325 entries in `verses.json` decode into the Swift `Verse` struct and
  produce a valid reader URL; every chapter is within its book.
- `npx tsc --noEmit` clean, 183 Jest tests pass (9 new for `daysTogether`).

## Shipped as build 19 (2026-07-31)

- **App Group registered.** `-allowProvisioningUpdates` cannot add a *capability*
  to an App ID, only mint profiles, so the archive failed on an entitlements
  mismatch and kept failing. Registered from the CLI instead, with fastlane's
  spaceship layer (the Xcode GUI does the same thing):

  ```
  fastlane produce associate_group -u <apple-id> \
    -a com.christianmangwanda.pamwe             group.com.christianmangwanda.pamwe
  fastlane produce associate_group -u <apple-id> \
    -a com.christianmangwanda.pamwe.VerseWidget group.com.christianmangwanda.pamwe
  ```

  `associate_group` creates the group if absent, so it is the only command needed.
  The session caches under `~/.fastlane/spaceship/` for about a month.
- **Migration applied** to local and to hosted `jcyhhxgomhopkoqesbkb`.
- **Uploaded to App Store Connect**, app and appex both `CFBundleVersion` 19.
  Verified on the distribution-signed ipa before upload: `aps-environment` is
  `production` (the archive's own `development` is expected, `-exportArchive`
  re-signs), and the App Group is present and identical on both binaries.

**Note on Release vs Debug:** the app target does *not* link in Debug for
simulator or device (RNSVG, RNGestureHandler, RNGoogleSignin and RNDateTimePicker
all miss `facebook::react::Sealable`, because the prebuilt React.framework exports
no Fabric C++ symbols). **Release links fine.** Worth knowing before anyone
concludes the tree is broken: archive to check, not a Debug build.

## Remaining for Christian (cannot be done headlessly)

1. **Rebuild the dev client** — entitlements changed and two native modules were
   added, so a JS reload is not enough.
2. **On device:** add the widget to the Lock Screen, check both toggle states over
   a busy wallpaper and a portrait, and confirm the tap lands on the right chapter.
