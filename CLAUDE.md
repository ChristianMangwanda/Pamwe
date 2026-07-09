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
- [`trial-and-error.md`](trial-and-error.md) — issues hit during development and how each was solved. **Check this first** when you hit a bug class you might've seen before (RLS recursion, Xcode/Swift compat, free-Apple-ID quirks).
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

# Supabase — LOCAL for dev/testing (hosted project is paused; pay-to-host at launch)
supabase start                         # bring up the local stack (Docker)
./scripts/local_dev_seed.sh            # dev users Christian/Ammy + paired couple + M'Cheyne
supabase status                        # local URLs/keys · Studio http://127.0.0.1:54323
# .env points at local (LAN IP http://10.0.0.205:54321). Hosted config saved in
# env.hosted.backup. psql isn't on PATH — run SQL via: docker exec -i supabase_db_Pamwe psql -U postgres -d postgres
# When launching: apply supabase/migrations/* + seeds/plan_metadata.sql to the hosted project via MCP.
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
└── (tabs)/                        # 6-tab glass shell: Today · Bible · Plans · Prayers · Reflect · You
    ├── (today)/                   # home → reading → journal → waiting → reveal → complete
    ├── bible/                     # index → [book] → [book]/[chapter] reader; marks, note
    ├── plans/                     # index → [id] detail; builder (Ask Pamwe)
    ├── prayers/                   # index (swipe cards + detail sheet) → add (compose/edit)
    ├── reflect/                   # index (revealed history) → [id] detail
    └── you/                       # index (stats + dark toggle) → settings, recaps, couple, privacy, terms, delete-account
```

The design-handoff rebuild (2026-07) replaced the 2-tab app with this 6-tab shell. **Theming:** every screen reads colors from `useTheme()` ([src/providers/ThemeProvider.tsx](src/providers/ThemeProvider.tsx)) over the light+dark palettes in [src/theme/tokens.ts](src/theme/tokens.ts); the user toggles light/dark in the You tab. Legacy [src/constants/colors.ts](src/constants/colors.ts) is a **frozen light-only palette** kept for a few pre-auth/onboarding files only — **never import it in new code; use `useTheme()`.**

Auth gate in [src/app/index.tsx](src/app/index.tsx) sequences:
1. No session → `(auth)/welcome`
2. Session, no couple → `(onboarding)/invite`
3. Session, couple not paired → `(onboarding)/waiting`
4. Session, paired, no plan → `(onboarding)/plan-select`
5. Session, paired, has plan → `(tabs)`

### Supabase data model (8 tables, all RLS-enabled)

| Table | Purpose |
|---|---|
| `users` | Profile mirror of `auth.users`. Created by `handle_new_user` trigger. Holds `couple_id`, push token, notification prefs. |
| `couples` | Invite code + partner_a/b + paired_at + streak state + timezone. |
| `plans` | Reading plans. Curated (M'Cheyne 365, John 21, Psalms 30, Cord 21) + couple-built custom plans (`is_curated=false`, `couple_id`, `created_by`). Browse metadata cols: `tagline/about/explore/gain/minutes_label/rhythm_label/book_label`. |
| `plan_days` | Rows per plan-day: passage ref, text (**nullable** — custom plans store NULL and live-fetch), pull quote, reflection prompt. |
| `couple_plans` | A couple's enrollment in a plan (current_day, start_date, status). |
| `entries` | Per-user per-day reflection. Type text or voice. `submitted_at` is the locked-reveal trigger. |
| `prayers` / `prayer_marks` | Shared prayer requests with "I prayed today" marks. `prayers.category` (family/health/work/guidance/thanks/other); author-only update/delete. |
| `verse_highlights` / `verse_notes` | Per-couple shared study layer over the Bible reader (one highlight + one note per verse per couple; `user_id` = authorship). |

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
- Other webhook functions: `notify-new-prayer`, `notify-freeze`, `delete-account` (verify_jwt=true — demote-don't-delete routine).
- **`ask-pamwe`** — the plan builder's AI ("Ask Pamwe"). **verify_jwt=true** (user-invoked, not a webhook). Anthropic SDK (`npm:@anthropic-ai/sdk`), structured output, model from env `ANTHROPIC_MODEL` (default `claude-haiku-4-5`). Secret **`ANTHROPIC_API_KEY`**: locally in gitignored `supabase/functions/.env` (`supabase functions serve ask-pamwe --env-file …`); hosted via `supabase secrets set`. The app calls it through `src/lib/askPamwe.ts`, which falls back to hardcoded recs if the key/function is absent.

---

## Hard rules / conventions

### Don't reach across the lib layer

UI screens go through `src/lib/*.ts` (couples, entries, plans, notifications) which wrap the Supabase client. Don't call `supabase.from(...)` directly from a screen.

### Decimals on the DB side, not floats

`couples.streak_count`, `couple_plans.current_day`, `entries.audio_duration_seconds`, `plan_days.day_number` are all `int4`. Anything monetary or stat-y would be Postgres `numeric`, not JS `number`. There's nothing of the latter category yet.

### Timezone is captured once at couple creation, immutable in v1

[src/lib/couples.ts](src/lib/couples.ts) writes `Intl.DateTimeFormat().resolvedOptions().timeZone` into `couples.timezone` when partner A generates the invite code. **No editable timezone setting in v1.** The Weekend-8 streak Edge Function uses this. If long-distance couples become a real case, revisit.

### Don't modify the M'Cheyne plan or pull quotes silently

`supabase/seed.sql` has all 365 days of WEB Bible text + reflection prompts. If you find yourself "fixing" a verse or quote, stop — they came from the consultant (M'Cheyne 1842) and the source text.

### iOS entitlements are intentionally minimal in dev

[ios/Pamwe/Pamwe.entitlements](ios/Pamwe/Pamwe.entitlements) is empty `<dict></dict>`. Push and Sign In with Apple are stripped to allow signing with a free Apple ID. **Apple Developer Program enrollment submitted 2026-07-09 (awaiting approval)** — re-enable both on approval; the post-approval checklist is in [progress.md](progress.md) (top "Apple Developer — post-approval checklist").

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
| Reflections history + recaps | [src/lib/reflections.ts](src/lib/reflections.ts), [src/lib/recaps.ts](src/lib/recaps.ts) |
| Prayers (category, edit/delete) | [src/lib/prayers.ts](src/lib/prayers.ts) |
| Push notifications | [src/lib/notifications.ts](src/lib/notifications.ts) |
| Motion + haptics | [src/lib/motion.ts](src/lib/motion.ts), [src/lib/haptics.ts](src/lib/haptics.ts) |
| Voice recorder component | [src/components/VoiceRecorder.tsx](src/components/VoiceRecorder.tsx) |
| Design tokens | [src/theme/tokens.ts](src/theme/tokens.ts) (light+dark; via `useTheme()`), [src/constants/typography.ts](src/constants/typography.ts). Legacy [src/constants/colors.ts](src/constants/colors.ts) is frozen — don't use in new code. |
| Ask Pamwe edge function | [supabase/functions/ask-pamwe/index.ts](supabase/functions/ask-pamwe/index.ts) |
| Seeded plan content | [supabase/seed.sql](supabase/seed.sql) (~14k lines) + `scripts/seed_{john,psalms,cord}_plan.py` |
