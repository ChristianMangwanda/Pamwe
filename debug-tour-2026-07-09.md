# Debug Tour — 2026-07-09

Seven parallel audits over the full build: auth/gate, pairing/providers, core daily loop,
DB/RLS, Bible/Plans/Ask Pamwe, push/voice/prayers, config/launch. Findings verified where
marked; everything else is agent-reported and code-plausible. **Nothing has been changed —
this is the review list.**

Legend: ✅ VERIFIED = reproduced empirically or confirmed by direct code/DB inspection.
Severity is product impact, not just technical severity.

---

## P0 — Broken core product. Fix before anything else.

### 1. ✅ VERIFIED — Submitting a reflection is impossible under RLS (as migrated)
- **Where:** policy `entries_update_own_draft`, `supabase/migrations/20260525232605_rls_policies.sql:121-124`
- **What:** The UPDATE policy has `USING (user_id = auth.uid() AND submitted_at IS NULL)` and **no WITH CHECK** — Postgres then applies USING to the *new* row too. Setting `submitted_at` makes the new row violate `submitted_at IS NULL`.
- **Proof:** Simulated `authenticated`-role submit on the live local DB → `ERROR: new row violates row-level security policy for table "entries"`.
- **Why unseen until now:** zero entries have ever been written through the app (local pairing was seeded via service role; on-device pass didn't include a journal submit). The original hosted project worked in earlier phases, so its hand-created policies likely differed from what the parity migration reconstructs.
- **Fix:** `ALTER POLICY entries_update_own_draft ... WITH CHECK (user_id = (SELECT auth.uid()))` — keeps draft-only *targeting* via USING, allows the submit transition. New migration + apply locally + include in hosted runbook.

### 2. ✅ VERIFIED — Pairing (partner B joining) is impossible under RLS (as migrated)
- **Where:** policy `couples_update_join`, `20260525232605_rls_policies.sql:48-52`
- **What:** Same missing-WITH-CHECK class. USING requires `partner_b_id IS NULL`; the join sets it non-NULL → new row violates the reused check.
- **Proof:** Simulated join as dev user bob → `ERROR: new row violates row-level security policy for table "couples"`.
- **Fix:** `WITH CHECK (partner_b_id = (SELECT auth.uid()) AND partner_a_id <> (SELECT auth.uid()))`. Same migration as #1.

### 3. ✅ VERIFIED — Magic-link email sign-in is a dead end
- **Where:** `src/app/_layout.tsx:102-107` (+ `(auth)/sign-in.tsx:27`)
- **What:** Deep-link handler reads `queryParams.access_token/refresh_token` only. Supabase returns the session in the URL **fragment** (`#access_token=...`) or as `?code=` (PKCE); neither is handled. Even on success, nothing navigates off the magic-link screen.
- **Scenario:** User taps the primary "Continue with email" CTA → gets email → taps link → app opens, nothing happens, still signed out.
- **Fix:** Parse the fragment (`url.split('#')[1]` → params) AND handle `?code=` via `supabase.auth.exchangeCodeForSession(code)`; after success `router.replace('/')`. Add `pamwe://(auth)/magic-link` to the hosted Auth redirect allow-list (see P3).

### 4. Double-active-plan death spiral (3 independent audits converged)
- **Where:** `src/lib/plans.ts:90-99` (`getActiveCouPlan` `.single()`), `:102-117` (`enrollInPlan`, no guard), migration `20260709000001` (dropped UNIQUE with no replacement)
- **What:** Nothing enforces "one active plan per couple". Two active rows (both partners enroll simultaneously post-pairing; or transient error shows "Choose a plan" → user re-enrolls) → `.single()` errors → provider treats it as *no plan* → gate re-offers plan-select → each retry inserts another active row. Unrecoverable without manual DB surgery.
- **Fix (multi-part):**
  1. Migration: `CREATE UNIQUE INDEX couple_plans_one_active ON couple_plans (couple_id) WHERE status='active';`
  2. `getActiveCouPlan`: `.order('created_at', {ascending:false}).limit(1).maybeSingle()`
  3. `enrollInPlan`: complete existing actives first (fold into `switchPlan`'s logic) so all entry points are safe.

### 5. Reveal ceremony silently skipped for the first submitter
- **Where:** `src/hooks/useTodayEntry.ts:24` + `(today)/index.tsx:85-89`
- **What:** Everything keys off `current_day`. If A submits, closes the app, and B submits later (trigger advances `current_day`), A reopens to "Read Day N+1" — never sees "Reveal together" for day N. The core emotional payoff is lost; B's reflection is only discoverable in Reflect history.
- **Fix:** Track the highest mutually-submitted-but-not-yet-opened day (e.g. compare `current_day - 1` entries' visibility, or an `opened_at` marker) and surface the reveal CTA for it.

### 6. ✅ VERIFIED (code) — Push tokens never saved in a first session; wrong user keeps token after account switch
- **Where:** `src/app/_layout.tsx:92-98` + `src/lib/notifications.ts:56-64`
- **What:** Registration runs once at cold launch, above AuthProvider. New install → user not signed in yet → `savePushToken` no-ops → token NULL all session. On account switch, old user's row keeps this device's token (their partner's pushes reach the wrong phone); no `addPushTokenListener` for rotation.
- **Fix:** Register + save on auth-state change (session.user.id), null the token on sign-out, add `addPushTokenListener`.

### 7. ✅ VERIFIED (code) — Morning reminder silently reset to 06:30 on every launch
- **Where:** `src/app/_layout.tsx:96`
- **What:** `scheduleMorningNotification(6, 30)` hardcoded at launch; it cancels all scheduled notifications first. User's chosen 08:00 (persisted in prefs, shown in Settings) is overridden every launch.
- **Fix:** Remove the hardcoded call; schedule from the saved `notification_morning_time` after prefs load (Settings already owns rescheduling).

---

## P1 — Security & privacy

### 8. ✅ VERIFIED — Anon key alone can read every pending couple
- **Where:** policies `couples_select_by_invite` + `couples_update_join` (roles `{public}`), `20260525232605_rls_policies.sql:39-52`
- **Proof:** As role `anon`: read a pending couple's `invite_code`, `partner_a_id`, `streak_count`. (Anon *mutation* keeping the row pending-shaped may also pass; my hijack test failed only because it set expiry to past.)
- **Impact:** Invite-code harvesting → grief-join strangers' couples on hosted.
- **Fix:** Restrict both policies `TO authenticated`; scope SELECT to an exact `invite_code` match (the join flow knows the code); the #2 WITH CHECK fix also hard-blocks anon updates.

### 9. Cross-couple prayer injection
- **Where:** policy `prayers_insert`, `rls_policies.sql:137-138`
- **What:** WITH CHECK enforces `author_id = auth.uid()` but not that `couple_id` is the caller's couple (unlike verse_highlights/notes which check both). Any authenticated user can insert a prayer into a stranger's couple (couple ids leak via #8) — it appears in their feed and triggers their push.
- **Fix:** Add couple-membership to the WITH CHECK.

### 10. Account deletion leaves voice recordings in storage
- **Where:** `supabase/functions/delete-account/index.ts:49-53`
- **What:** Deletes entries/prayers/marks rows + auth user, but never removes `voice-entries/{cp}/{day}/{userId}.m4a` objects. The privacy policy (and delete screen) promise reflections are deleted.
- **Fix:** Before auth delete, `storage.remove()` the user's audio paths (derivable from their entries' `audio_url` or the path scheme).

### 11. Ask Pamwe has no rate limit
- **Where:** `supabase/functions/ask-pamwe/index.ts:80-110`
- **What:** verify_jwt gates identity, not frequency. Any authed account can loop 4096-max-token calls against the Anthropic bill.
- **Fix:** Lightweight per-user counter (table keyed by uid, N/hour) → 429.

### 12. SECURITY DEFINER functions without pinned search_path
- **Where:** `handle_new_user` (`rls_policies.sql:181-193`), `notify_on_entry_submit` (`20260607…:166-186`) — confirmed `proconfig NULL` in live DB; the other five helpers are pinned.
- **Fix:** `SET search_path = public, pg_temp` on both; schema-qualify `net.http_post`. (Also the standard Supabase advisor finding.)

### 13. Voice path day-number cast can abort the partner's reveal query
- **Where:** storage policies `voice_insert_own` vs `voice_select_partner_after_reveal` (`20260607…:195-221`)
- **What:** INSERT policy doesn't force `foldername[2]` to be numeric; the partner-SELECT policy casts it `::int` → a malformed upload path makes the partner's storage query error (in-couple DoS).
- **Fix:** Require `(storage.foldername(name))[2] ~ '^\d+$'` (and exact depth) in `voice_insert_own`.

### 14. `prayer_marks_insert` not couple-scoped
- **Where:** `rls_policies.sql:160-161` — WITH CHECK only `user_id = auth.uid()`; can mark arbitrary prayer_ids. Low impact; fix alongside #9.

---

## P2 — Reliability & correctness

### 15. Transient error on cold start re-onboards a paired couple (can create a 2nd couple)
- **Where:** `src/app/index.tsx:16-29`, `src/lib/couples.ts:85-99`
- `getUserCouple` ignores query `error` → null; gate's catch-all sets `unpaired` → onboarding funnel → `createCouple()` runs again. **Fix:** distinguish error from no-row; error state + retry, never `unpaired`.

### 16. Concurrent join: loser silently "succeeds" into a couple they're not in
- **Where:** `src/lib/couples.ts:59-72` — UPDATE has no rows-affected check; loser's `users.couple_id` set to a couple whose RLS then hides it. **Fix:** `.is('partner_b_id', null).select()` and treat empty result as "code already used"; only link user on success.

### 17. `users.couple_id` writes unchecked in create/join
- **Where:** `couples.ts:36-39, 69-72` — failure → orphan couple / permanently stuck partner B. **Fix:** check errors; ideally one RPC transaction for couple+user link.

### 18. Expired invite code bricks the couple
- **Where:** `(onboarding)/invite.tsx:33-39` — reuse branch ignores `invite_expires_at` (7-day expiry, couples.ts:18); no regenerate path exists anywhere. **Fix:** regenerate when reused-and-expired; add "Get a new code".

### 19. CoupleProvider has no realtime → stale partner/plan/ghost couple
- **Where:** `providers/CoupleProvider.tsx:29-56` — partner switches plan or deletes account → this device keeps ghost state until relaunch. **Fix:** subscribe to `couples` + `couple_plans` for the couple id → `refresh()`; also refresh on `partner_left` push route.

### 20. Draft autosave races submit → spurious "Could not submit"
- **Where:** `src/lib/entries.ts:46-87`, `journal.tsx:72-88` — read-then-insert vs UNIQUE. **Fix:** upsert with `onConflict: 'couple_plan_id,day_number,user_id'` (or serialize via in-flight ref).

### 21. Plan switch mid-day strands a submitted, un-revealed reflection
- **Where:** `plans.ts:140-152` — partner's waiting entry orphaned on a completed plan; never revealed, never in Reflect (mutual-only). **Fix:** warn/block when an un-revealed submitted entry exists today (product call).

### 22. `switchPlan` is non-transactional
- **Where:** `plans.ts:140-152` — completes actives, then insert can fail → couple left with NO plan. **Fix:** RPC doing both atomically (natural place to also enforce #4).

### 23. Custom plans re-fetch bible-api.com every day with no cache
- **Where:** `src/lib/bible.ts:135-142` (`fetchPassage` uncached; `passage_text` NULL by design) + known aggressive rate limiting → daily reading breaks for custom-plan couples. **Fix:** cache by `reference|translation`; ideally persist fetched text back into `plan_days.passage_text`.

### 24. Ask Pamwe normalizer silently drops ranged references
- **Where:** `src/lib/askPamwe.ts:19-45` — "Matthew 5-7" fails `parseReference` → reading dropped → plan shrinks vs advertised length. **Fix:** keep unparsed-but-plausible refs (fetchPassage handles ranges) or reconcile `days` with surviving count in the review UI.

### 25. Streak resets when a couple's submits straddle midnight
- **Where:** `20260607…: update_streak_on_mutual_submit` (~145-155) — A at 23:59 + B at 00:01 → reset to 1. Also two plan-days in one day only +1. **Fix:** decide semantics; add one-day grace around midnight if calendar-day.

### 26. No AppState wiring for Supabase token auto-refresh
- **Where:** `src/lib/supabase.ts:8-15` — backgrounded >1h → stale-token 401s on return. **Fix:** documented `AppState` start/stopAutoRefresh pattern.

### 27. Google sign-in cancel shows an error alert
- **Where:** `(auth)/sign-in.tsx:41-56` — v16 resolves `{type:'cancelled'}` (doesn't throw); dead cancel branch → "No idToken received". **Fix:** `if (result.type !== 'success') return;`.

### 28. Final-day Complete screen shows "your plan · 0 days"
- **Where:** `reveal.tsx:40-45` + `complete.tsx:20-21` — `refreshCouple()` nulls the active plan before Complete reads it. **Fix:** pass title/duration as route params.

### 29. Sentry major-version drift
- **Where:** package.json `@sentry/react-native 8.13.0` vs expected ~7.11.0; no Expo config plugin. DSN unset so JS is no-op, but the 8.x native pod still links. **Fix:** pin ~7.11.0 (or add the 8.x plugin) before enabling DSN.

### 30. Audio: signed URL expires (1h) with no re-sign; player load errors invisible
- **Where:** `components/AudioPlayer.tsx:32,41-50`. **Fix:** re-sign on play; surface `status.error`.

### 31. Recording lost on interruption (call) / backgrounding
- **Where:** `components/VoiceRecorder.tsx:89-98,125-140`. **Fix:** AppState/interruption handler that stops-and-preserves; guard `handleStop` to keep any produced uri.

### 32. notify-new-prayer likely re-fires on edits/mark-answered
- **Where:** `functions/notify-new-prayer/index.ts:8-15` — no INSERT-vs-UPDATE guard; webhook event scope is hosted-config, unverifiable locally. **Fix:** confirm INSERT-only webhook; add a guard in the function regardless.

### 33. Dead push tokens never cleaned
- **Where:** notify-* functions ignore Expo receipts (`DeviceNotRegistered`). **Fix:** null out `expo_push_token` on those responses.

### 34. Chapter cache can be poisoned by an empty-200 response
- **Where:** `src/lib/bible.ts:102,122-128` — malformed 200 → `[]` cached → blank chapter until app restart. **Fix:** don't cache empty/malformed; route to the error+Retry card.

### 35. Plan detail schedule window never shows the current day on long plans
- **Where:** `plans/[id].tsx:20,154-155,204` — fixed days 1-40 window; M'Cheyne day 100 unreachable. **Fix:** center window on `dayNow` or make "+N more" expand.

### 36. Transient `getPlanDay` failure renders "Choose a plan"
- **Where:** `plans.ts:119-129` + `useTodayEntry.ts:35-46` + `(today)/index.tsx:48` — wrong empty state; the entry door to #4's cascade. **Fix:** distinguish load-failed (retry) from no-plan.

### 37. ✅ VERIFIED (code) — highlight save/clear failures swallowed
- **Where:** `bible/[book]/[chapter].tsx:122,128` — empty catches; haptic fires before write. **Fix:** surface failure, reload marks.

### 38. Verse-marks queries ignore per-query errors
- **Where:** `src/lib/verseMarks.ts:28-51` — partner's marks can silently "vanish" on partial failure. **Fix:** propagate errors.

### 39. Mark upsert clobbers authorship
- **Where:** `verseMarks.ts:53-83` — partner B editing A's highlight/note rewrites `user_id` and text. **Fix:** exclude `user_id` from conflict-update; consider overwrite warning.

### 40. Editing a null-category prayer silently sets "other"
- **Where:** `prayers/index.tsx:103-106` + `add.tsx:34-36`. **Fix:** preserve original when param missing.

### 41. Prayer author-only edit is UI-only (RLS allows either partner)
- **Where:** `rls_policies.sql:140-146` — acceptable for a trusted couple; note it or split policies by column.

### 42. Apple `fullName` requested but discarded
- **Where:** `sign-in.tsx:58-78` — first-auth name lost; onboarding could pre-fill. **Fix:** persist `credential.fullName?.givenName` via `updateDisplayName`.

### 43. You-tab sign-out is fire-and-forget
- **Where:** `you/index.tsx:50` — navigate before signOut resolves; errors silent (settings.tsx does it right). **Fix:** await + surface errors.

### 44. Join accepts 4-char codes (always 6)
- **Where:** `(onboarding)/join.tsx:21` — `>=4` → guaranteed generic failure. **Fix:** `=== 6`.

### 45. Three components still import the frozen light-only palette
- **Where:** `(onboarding)/waiting.tsx:9`, `ui/TwineDivider.tsx:3`, `PamweWordmark.tsx:2` — wrong colors in dark mode. **Fix:** `useTheme()`.

### 46. Notification permission prompt at cold launch, no recovery path
- **Where:** `notifications.ts:22-32` + `_layout.tsx:92-99` — no priming; enabling later in iOS Settings never re-registers. **Fix:** prompt post-onboarding; re-register on Settings focus when granted+tokenless. (Folds into #6.)

---

## P3 — Launch runbook (config; verified by the config audit)

### 47. 🚨 EAS production build ships with NO Supabase config
- `.env` is gitignored (EAS never sees it); `eas.json` has no `env` blocks → `createClient(undefined, undefined)`. Un-ignoring `.env` would instead bake the LAN IP. **Fix:** put HOSTED values (from `env.hosted.backup`) into `eas.json` env for preview/production (or `eas env:create`).

### 48. 🚨 Rotate `ANTHROPIC_API_KEY` now (pasted in chat; sitting in two local .env files) → update `supabase/functions/.env` + `supabase secrets set` on hosted.

### 49. App icon is still the Expo default (both `assets/images/icon.png` and the `ios.icon` Icon-Composer file) — App Store rejection risk (2.3.8/4.0); notification icon inherits it.

### The hosted-cutover checklist (ordered):
1. Rotate Anthropic key (#48).
2. Un-pause / upgrade hosted project `freftpwigrkjytusnqhx`.
3. Apply migrations in order: `20260607000000` parity, `20260708000001..5`, `20260709000001` — **plus the new RLS-fix migration from P0 #1/#2 and the partial unique index from #4**.
4. Seeds: `seed.sql` (if fresh), `plan_metadata.sql` UPDATEs, Psalms/Cord/John seed outputs. Then `get_advisors`.
5. Set DB GUCs or the push webhooks silently no-op: `ALTER DATABASE postgres SET app.settings.supabase_url='...'; ALTER DATABASE postgres SET app.settings.service_role_key='...';`
6. Deploy all 5 edge functions (ask-pamwe verify_jwt=true; the 4 webhook/delete targets per CLAUDE.md) + set secrets. Add explicit `[functions.*] verify_jwt` blocks to config.toml so posture is declarative.
7. Hosted Auth config: custom SMTP, Site URL, add `pamwe://` + `pamwe://(auth)/magic-link` to redirect allow-list; confirm Apple/Google provider credentials.
8. Real app icon (#49).
9. EAS env with hosted values (#47).
10. Resolve Sentry (#29).
11. APNs: confirmed key uploaded to EAS (done during first build); verify production build emits `aps-environment=production`.
12. App Store Connect privacy questionnaire + hosted privacy-policy URL.
13. `eas build -p ios --profile production` → TestFlight → verify on a device NOT on your Wi-Fi: OAuth sign-in, pairing, submit → push banner, voice record/playback, Ask Pamwe.

---

## Verified-solid (no action)
- Locked-reveal RLS itself: no early-read path via table, storage, or realtime (REPLICA IDENTITY pk + subscriber RLS).
- Advance/streak triggers: correct events, idempotent, nothing depended on the dropped UNIQUE.
- Reveal is fully server-driven (client never mutates day/streak); waiting screen realtime+poll can't double-navigate; stale autosave can't clobber a submitted entry.
- Draft/voice upload retry paths idempotent; prayer "prayed" double-tap idempotent; notify-partner fires exactly once per submit.
- Chapter fetch cache prevents translation-switch refetch storms; parseReference clamps chapters.
- Info.plist strings, privacy manifest, encryption flag, Google URL-scheme consistency, `__DEV__`-gating of dev sign-in buttons.
- Reflect history is retake-safe (groups by enrollment id).
