# CLAUDE.md

Guidance for Claude Code (claude.ai/code) when working in this repo.

---

## Project: Pamwe — Couples devotional app

Mobile app for couples to read the Bible together using the M'Cheyne Reading Plan, journal individually, then unlock each other's reflections only after both submit. Built for Christian and his partner Ammy first; designed to generalize.

**Stack:**
- Expo SDK 56, React Native 0.85, React 19, expo-router
- Supabase (Postgres + Auth + Realtime + Storage + Edge Functions)
- TypeScript, Jest + @testing-library/react-native
- iOS-first; Android works but unvalidated end-to-end

**Tracking docs:**
- [`progress.md`](progress.md) — phase-by-phase status, where we are and what's next
- [`trial-and-error.md`](trial-and-error.md) — issues hit during development and how each was solved. **Check this first** when you hit a bug class you might've seen before (RLS recursion, Xcode/Swift compat, release-pipeline snags, `expo prebuild` damage).
- [`build8-plan.md`](build8-plan.md) / [`round4-plan.md`](round4-plan.md) / [`build10-plan.md`](build10-plan.md) — per-round plans + implementation records for beta rounds 3-5
- [`AGENTS.md`](AGENTS.md) — one line: read `https://docs.expo.dev/versions/v56.0.0/` before writing Expo code

---

## Common commands

```bash
# JS / app
npx expo start --dev-client            # Metro for the dev client
npx jest                               # full test suite
npx tsc --noEmit                       # typecheck

# iOS dev build to physical device
cd ios && xcodebuild -workspace Pamwe.xcworkspace -scheme Pamwe \
  -configuration Debug \
  -destination "platform=iOS,id=<UDID>" \
  -allowProvisioningUpdates build 2>&1 | tee /tmp/pamwe-build.log
grep -nE "error:" /tmp/pamwe-build.log | head -50

# Supabase — LOCAL for dev/testing; hosted = project jcyhhxgomhopkoqesbkb (free tier, dedicated account)
supabase start                         # bring up the local stack (Docker)
./scripts/local_dev_seed.sh            # dev users Christian/Ammy + paired couple + M'Cheyne
supabase status                        # local URLs/keys · Studio http://127.0.0.1:54323
# .env points at local (LAN IP http://10.0.0.205:54321). Hosted config saved in
# env.hosted.backup. psql isn't on PATH — run SQL via: docker exec -i supabase_db_Pamwe psql -U postgres -d postgres
#
# ⚠️ HOSTED PROJECT IDENTITY — do not mix these up:
#   • ACTIVE: jcyhhxgomhopkoqesbkb — free tier on a DEDICATED Supabase account
#     (separate email), created 2026-07-09. The .mcp.json `supabase` server points
#     here; sanity-check with get_project_url before any hosted mutation.
#   • DEAD:   freftpwigrkjytusnqhx — old project on Christian's MAIN account (paused;
#     that account's 2-project free quota belongs to his other projects). Never
#     restore or apply anything there. env.hosted.backup may still hold its old
#     values until the cutover rewrites it.
# When cutting over: apply supabase/migrations/* + seeds/plan_metadata.sql to
# jcyhhxgomhopkoqesbkb via MCP.
```

```bash
# TestFlight release (terminal pipeline; Apple Dev approved, ASC record exists).
# 1. Bump CURRENT_PROJECT_VERSION in ios/Pamwe.xcodeproj/project.pbxproj (NOW 4 spots:
#    2 for the Pamwe app + 2 for the VerseWidget target's Debug/Release configs).
#    Both Info.plists read $(CURRENT_PROJECT_VERSION) — never hardcode there. The
#    embedded widget appex CFBundleVersion MUST equal the app's or Apple processing
#    rejects the build. (CFBundleShortVersionString is the literal 1.0.0 in both
#    Info.plists; bump both if the marketing version ever changes.)
# 2. Archive (Release bundles .env.production = hosted Supabase + Sentry DSN):
cd ios && xcodebuild -workspace Pamwe.xcworkspace -scheme Pamwe -configuration Release \
  -destination "generic/platform=iOS" -archivePath /tmp/Pamwe.xcarchive \
  -allowProvisioningUpdates DEVELOPMENT_TEAM=5LX4YFCXPK archive
# 3. Verify: grep -ac jcyhhxgomhopkoqesbkb <archive>/Products/Applications/Pamwe.app/main.jsbundle → 1
# 4. Upload (ExportOptions.plist: method=app-store-connect, destination=upload, signingStyle=automatic):
xcodebuild -exportArchive -archivePath /tmp/Pamwe.xcarchive -exportOptionsPlist ExportOptions.plist -allowProvisioningUpdates
# Pipeline gotchas (details in trial-and-error.md):
#   • "Failed to Use Accounts" on export = stale Xcode Apple-ID session; re-sign in
#     via Xcode Settings → Accounts and retry.
#   • Apple processing rejects binaries missing purpose strings for APIs that mere
#     DEPENDENCIES reference (e.g. NSPhotoLibraryUsageDescription for SDWebImage);
#     a rejected build number is burned, bump and re-archive.
#   • NEVER run `expo prebuild` (see hard rule below). New Expo modules autolink
#     with just `npm install` + `pod install`.
```

`LANG=en_US.UTF-8` and `LC_ALL=en_US.UTF-8` are set in `~/.bash_profile` — needed for CocoaPods on Homebrew Ruby 4. Don't remove.

---

## Architecture

### App routing (Expo Router, file-based)

```
src/app/
├── index.tsx                      # auth gate, routes to one of 5 states
├── _layout.tsx                    # root providers (Theme, Auth, Couple, deep-link, push) + GestureHandlerRootView
├── (auth)/                        # welcome, sign-in, magic-link
├── (onboarding)/                  # value-slides, name, pair-choice, invite, join, waiting, connected, plan-select
└── (tabs)/                        # 6-tab DOCKED bar (DockedTabBar; the b7 glass oval is gone): Today · Bible · Plans · Prayers · Reflect · You
    ├── (today)/                   # home (tree streak, milestones, catch-up, nudge) → reading → journal → waiting → reveal → complete
    ├── bible/                     # index → [book] → [book]/[chapter] reader (6 translations); marks, note
    ├── plans/                     # index (Ask Pamwe card) → [id] detail; builder (Ask Pamwe)
    ├── prayers/                   # index (swipe cards + detail sheet w/ reminders) → add → timeline (answered)
    ├── reflect/                   # index (history + From-your-story card) → [id] detail (responses) → words (Their Words)
    └── you/                       # index (stats + dark toggle) → settings, recaps, couple, privacy, terms, delete-account
```

A floral **Ask Pamwe bubble** ([src/components/PamweFab.tsx](src/components/PamweFab.tsx)) floats on every non-ritual tab (never Today or the reading/journal/reveal flow) and opens [AskPamweSheet](src/components/AskPamweSheet.tsx). Screens it floats on pad their scroll end by `FAB_CLEARANCE`.

The design-handoff rebuild (2026-07) replaced the 2-tab app with this 6-tab shell. **Theming:** every screen reads colors from `useTheme()` ([src/providers/ThemeProvider.tsx](src/providers/ThemeProvider.tsx)) over the light+dark palettes in [src/theme/tokens.ts](src/theme/tokens.ts); the user toggles light/dark in the You tab. Legacy [src/constants/colors.ts](src/constants/colors.ts) is a **frozen light-only palette** kept for a few pre-auth/onboarding files only — **never import it in new code; use `useTheme()`.**

Auth gate in [src/app/index.tsx](src/app/index.tsx) sequences:
1. No session → `(auth)/welcome`
2. Session, no couple → `(onboarding)/invite`
3. Session, couple not paired → `(onboarding)/waiting`
4. Session, paired, no plan → `(onboarding)/plan-select`
5. Session, paired, has plan → `(tabs)`

### Supabase data model (12 tables, all RLS-enabled)

| Table | Purpose |
|---|---|
| `users` | Profile mirror of `auth.users`. Created by `handle_new_user` trigger. Holds `couple_id`, push token, notification prefs. |
| `couples` | Invite code + partner_a/b + paired_at + streak state + timezone. |
| `plans` | Reading plans. Curated (M'Cheyne 365, John 21, Psalms 30, Cord 21) + couple-built custom plans (`is_curated=false`, `couple_id`, `created_by`). Browse metadata cols: `tagline/about/explore/gain/minutes_label/rhythm_label/book_label`. |
| `plan_days` | Rows per plan-day: passage ref, text (**nullable** — custom plans store NULL and live-fetch), pull quote, reflection prompt. |
| `couple_plans` | A couple's enrollment in a plan (current_day, start_date, status). |
| `entries` | Per-user per-day reflection. Type text or voice. `submitted_at` is the locked-reveal trigger. `transcript` (nullable) holds the on-device voice transcript. |
| `entry_responses` | Hearts/amens/replies/kept-lines a partner leaves on a revealed reflection (`kind`: heart/amen/reply/quote). RLS mirrors locked-reveal via `can_respond_to_entry()`; in the realtime publication. |
| `prayers` / `prayer_marks` | Shared prayer requests with "I prayed today" marks. `prayers.category` (family/health/work/guidance/thanks/other); author-only update/delete. |
| `verse_highlights` / `verse_notes` | Per-couple shared study layer over the Bible reader (one highlight + one note per verse per couple; `user_id` = authorship). |
| `ask_pamwe_usage` / `partner_nudges` | Service-role-only bookkeeping (RLS on, zero policies): Ask Pamwe rate limiting (20/day + cooldown via `bump_ask_pamwe_usage` RPC) and nudge cooldowns (1/hour). |

### Locked-reveal RLS

The core mechanic. Partner entries are invisible until both partners have submitted for the same `(couple_plan_id, day_number)`. Enforced at the Postgres level via:

- `entries_select_partner_after_mutual_submit` policy on `public.entries`
- 5 policies on `storage.objects` for the `voice-entries` bucket, mirroring the same logic
- SECURITY DEFINER helpers `has_user_submitted_entry()` and `can_view_partner_audio()` that bypass RLS to avoid self-recursion (see trial-and-error.md → "RLS infinite recursion")

**Audio path scheme:** `voice-entries/{couple_plan_id}/{day_number}/{user_id}.m4a`. RLS parses this with `storage.foldername()` + `split_part`.

### Edge Functions + DB Webhook

- `notify-partner` deployed (verify_jwt=false because it's a DB webhook target)
- Trigger `notify_partner_on_submit_trigger` on `entries` AFTER INSERT OR UPDATE OF submitted_at, calls the function via `net.http_post`. Only fires when submitted_at transitions NULL → set.
- `entries` is in the `supabase_realtime` publication so the waiting screen subscription fires.
- Other webhook functions: `notify-new-prayer`, `notify-freeze`, `delete-account` (verify_jwt=true — demote-don't-delete routine). **Push banners actually deliver since b10/b11** (APNs key on Expo).
- **`notify-nudge`** — user-invoked (verify_jwt=true): "nudge my partner" from Today; pushes to the partner, one per sender per hour (cooldown logged in `partner_nudges`).
- **`ask-pamwe`** (v7) — **"Pamwe points, never preaches"** (Christian's product line: no Scripture interpretation, ever; interpretation questions deflect gently). Two schema-constrained modes: `plans` (2 reading-plan recs, the builder) and `help` (short pointing answer + up to 3 references, the in-app sheet). Every schema carries a required `off_topic` flag; the server swaps flagged output for one fixed gentle line. Per-user rate limit 20/day + 10s cooldown, fail-open. **verify_jwt=true.** Anthropic SDK (`npm:@anthropic-ai/sdk`), model from env `ANTHROPIC_MODEL` (default `claude-haiku-4-5`). Secret **`ANTHROPIC_API_KEY`**: locally in gitignored `supabase/functions/.env`; hosted via `supabase secrets set`. Clients: `src/lib/askPamwe.ts` (`askPamwe` falls back to hardcoded recs; `askPamweHelp` returns a typed answer/off_topic/error).

---

## Hard rules / conventions

### Don't reach across the lib layer

UI screens go through `src/lib/*.ts` (couples, entries, plans, notifications) which wrap the Supabase client. Don't call `supabase.from(...)` directly from a screen.

### Decimals on the DB side, not floats

`couples.streak_count`, `couple_plans.current_day`, `entries.audio_duration_seconds`, `plan_days.day_number` are all `int4`. Anything monetary or stat-y would be Postgres `numeric`, not JS `number`. There's nothing of the latter category yet.

### Timezone is captured once at couple creation, immutable in v1

[src/lib/couples.ts](src/lib/couples.ts) writes `Intl.DateTimeFormat().resolvedOptions().timeZone` into `couples.timezone` when partner A generates the invite code. **No editable timezone setting in v1.** The Weekend-8 streak Edge Function uses this. If long-distance couples become a real case, revisit.

### No em dashes in user-facing copy — ever

Christian's rule (2026-07-10): zero em dashes in any developer-authored user-facing text (UI strings, alerts, notification bodies, plan metadata, prompts, AI output — the ask-pamwe system prompt forbids them). Use commas, colons, or periods. Null-value placeholder glyph is `·`. Scripture text is the one exception (quoted source material). Code comments are exempt.

### Auth: getSession(), not getUser(); every sign-in success must route through the gate

All of src/lib reads identity via `supabase.auth.getSession()` (local) — `getUser()` is a network call that hangs after fresh sign-ins. Any new sign-in path must end with `router.replace('/')` (see `sign-in.test.tsx`). CoupleProvider stays live via realtime + explicit `refresh()` at onboarding transitions — screens must clear their loading state when `couple` is null.

### Beta feedback loop

Christian logs findings in the Notion page **"Pamwe Ramblings"** (Notion MCP connector). Triage into rounds, fix in batches, one TestFlight build per round. Current triage state lives in progress.md's top banner.

### Don't modify the M'Cheyne plan or pull quotes silently

`supabase/seed.sql` has all 365 days of WEB Bible text + reflection prompts. If you find yourself "fixing" a verse or quote, stop — they came from the consultant (M'Cheyne 1842) and the source text.

### NEVER run `expo prebuild` — the ios/ project is hand-maintained

`ios/` is gitignored (except `ExportOptions.plist`) but hand-maintained: entitlements, `$(CURRENT_PROJECT_VERSION)` wiring, purpose strings. A stray prebuild on 2026-07-11 reset Info.plist's `CFBundleVersion` to a literal `1` and stripped `NSPhotoLibraryUsageDescription`, which burned build 10 at Apple processing. New Expo modules need only `npm install` + `pod install` (autolinking). Purpose strings are mirrored in `app.json > ios.infoPlist` as a backstop.

### Home-screen widget (VerseWidget) — added 2026-07-12

A native **WidgetKit + SwiftUI** app-extension: "Verse of the Day," small/medium/large, light + dark, tree-of-life emblem behind the verse. **Fully self-contained** (no App Group, no native bridge, no JS): it bundles a **curated** set of uplifting, standalone verses (`verses.json`) and picks one by calendar day-of-year (cycling if the set is shorter than the year), rolling over at local midnight. The earlier M'Cheyne-pull-quote set was dropped because it surfaced narrative fragments that mean little out of context; the curated set is every-day devotional. Tapping opens `pamwe://today`. Widget deployment target is **iOS 17.0** (uses `containerBackground` + `contentMarginsDisabled`); the app stays 16.4.

- **Source lives in [ios/VerseWidget/](ios/VerseWidget/) and IS git-tracked** (a `.gitignore` exception; the rest of `ios/` stays ignored). The view files (`VerseWidgetView.swift`, `Theme.swift`, `VerseData.swift`) are deliberately WidgetKit-free so they can be snapshot-rendered off device.
- **The `.xcodeproj` target is NOT committed but is reproducible**: if `ios/` is ever regenerated, re-run `scripts/add_widget_target.rb` (via CocoaPods' bundled xcodeproj gem — see the script header) to re-splice the target, then `pod install`. `verses.json` is generated by `scripts/gen_widget_verses.py`: the curated references live in that script, and it fetches the exact WEB text from bible-api.com (the app's own Bible source), so verses are never hand-typed. Edit its `REFERENCES` list (or `verses.json` directly) to change the selection.
- **Do not add VerseWidget to the Podfile** — it uses only system frameworks. `pod install` leaves it intact (it does stamp a harmless `RCTNewArchEnabled` into the widget Info.plist each run; leave it).
- Fonts are bundled into the appex (`Fraunces-Italic`, `InstrumentSans-SemiBold`) and listed in the widget's `Info.plist > UIAppFonts`; referenced by PostScript name via `Font.custom`.

### Push + Sign In with Apple are LIVE (since 2026-07-11)

[ios/Pamwe/Pamwe.entitlements](ios/Pamwe/Pamwe.entitlements) carries `aps-environment` + `com.apple.developer.applesignin`. EAS projectId `ab024cbc-…` in app.json (owner `munhumutapachris`); APNs key on Expo's servers (EAS-generated, portal ID K45Q3988W2; the Apple team is at its 2-key max, the manually created TDA69K9QWF key is unused). All notify-* functions deliver real banners. `savePushToken` carries the b8 anti-PATCH-storm guard: never remove it.

---

## Behavioral guidelines

### 1. Check `trial-and-error.md` before deep-debugging

If you hit RLS recursion, a Swift compile error in `expo-modules-jsi`, a CocoaPods Unicode crash, or any of a half-dozen iOS dev-build snags — there's a documented fix already.

### 2. node_modules patches are frozen via patch-package

The `expo-modules-jsi` Xcode-26 patches live in `patches/expo-modules-jsi+56.0.7.patch` and re-apply automatically on every `npm install` via the `postinstall` script. Commit the patches/ directory. If the patch fails to apply after a dep bump, the underlying source probably moved — re-derive per trial-and-error.md and run `npx patch-package expo-modules-jsi` to regenerate.

### 3. Surgical changes

Touch only what you must. Don't refactor adjacent code, don't reformat. The lib functions are the seams; build inside them.

### 4. Simplicity first

Minimum code that solves the problem. No abstractions for single-use code. No flexibility that wasn't asked for. No error handling for impossible scenarios.

### 5. Don't guess load-bearing values

The seeded plan IDs, the dummy user UUIDs (`aaaaaaaa-...` / `bbbbbbbb-...`), the couple ID (`cccccccc-...`), the M'Cheyne text — these are references that tests and dev flows rely on. If you find yourself "correcting" one, stop and ask.

### 6. Real device validation matters

The voice recorder, audio upload, and partner-push flow only behave correctly on a real iPhone with the dev client. Simulator can't do mic; Expo Go can't do APNs. When you ship Phase 4 features, allocate time for on-device testing.

---

## Where to find things

| Need | Path |
|---|---|
| Auth flow | [src/providers/AuthProvider.tsx](src/providers/AuthProvider.tsx) |
| Theme (light/dark, `useTheme()`) | [src/providers/ThemeProvider.tsx](src/providers/ThemeProvider.tsx) + [src/theme/tokens.ts](src/theme/tokens.ts) |
| Couple context (paired user, plan) | [src/providers/CoupleProvider.tsx](src/providers/CoupleProvider.tsx) |
| Today's entry hook | [src/hooks/useTodayEntry.ts](src/hooks/useTodayEntry.ts) |
| Couple pairing | [src/lib/couples.ts](src/lib/couples.ts) |
| Entries (text + voice) + stat counts | [src/lib/entries.ts](src/lib/entries.ts) |
| Plans + custom-plan builder | [src/lib/plans.ts](src/lib/plans.ts), [src/lib/planBuilder.ts](src/lib/planBuilder.ts) |
| Ask Pamwe AI client | [src/lib/askPamwe.ts](src/lib/askPamwe.ts) |
| Bible fetch/parse + verse marks | [src/lib/bible.ts](src/lib/bible.ts), [src/lib/verseMarks.ts](src/lib/verseMarks.ts) |
| Reflections history + recaps + on-this-day | [src/lib/reflections.ts](src/lib/reflections.ts), [src/lib/recaps.ts](src/lib/recaps.ts) |
| Reflection responses + kept lines | [src/lib/entryResponses.ts](src/lib/entryResponses.ts), [src/components/ReflectionResponses.tsx](src/components/ReflectionResponses.tsx) |
| Prayers (category, edit/delete) + reminders | [src/lib/prayers.ts](src/lib/prayers.ts), [src/lib/prayerReminders.ts](src/lib/prayerReminders.ts) |
| Push notifications + nudge | [src/lib/notifications.ts](src/lib/notifications.ts) |
| Voice transcription (on-device) | [src/lib/transcription.ts](src/lib/transcription.ts) |
| Shared-layer search | [src/lib/search.ts](src/lib/search.ts) |
| Catch-up / grace days | [src/lib/catchup.ts](src/lib/catchup.ts) |
| Streak milestones | [src/lib/milestones.ts](src/lib/milestones.ts), [src/components/MilestoneCard.tsx](src/components/MilestoneCard.tsx) |
| Ask Pamwe bubble + sheet | [src/components/PamweFab.tsx](src/components/PamweFab.tsx), [src/components/AskPamweSheet.tsx](src/components/AskPamweSheet.tsx) |
| Docked tab bar | [src/components/DockedTabBar.tsx](src/components/DockedTabBar.tsx) |
| Motion + haptics | [src/lib/motion.ts](src/lib/motion.ts), [src/lib/haptics.ts](src/lib/haptics.ts) |
| Voice recorder component | [src/components/VoiceRecorder.tsx](src/components/VoiceRecorder.tsx) |
| Design tokens | [src/theme/tokens.ts](src/theme/tokens.ts) (light+dark; via `useTheme()`), [src/constants/typography.ts](src/constants/typography.ts). Legacy [src/constants/colors.ts](src/constants/colors.ts) is frozen — don't use in new code. |
| Ask Pamwe edge function | [supabase/functions/ask-pamwe/index.ts](supabase/functions/ask-pamwe/index.ts) |
| Seeded plan content | [supabase/seed.sql](supabase/seed.sql) (~14k lines) + `scripts/seed_{john,psalms,cord}_plan.py` |
| Home-screen widget (WidgetKit/SwiftUI) | [ios/VerseWidget/](ios/VerseWidget/) (git-tracked source); target splice `scripts/add_widget_target.rb`, verse data `scripts/gen_widget_verses.py` |
