# Addressing the Codex Audit: Full Roadmap

## Context

An external audit (codex) reviewed the whole app. Three exploration passes verified every claim against the code on `security-round` (ff86f4b). The verdict: the audit's correctness findings are essentially all real (with nuance), several suggestions conflict with deliberate documented decisions and are rejected, and the operational blockers it cites were already tracked in progress.md. Christian chose to plan the **full roadmap now**: an ops round plus three shippable implementation rounds (builds 26, 27, 28), each strictly better than the last, plus a written backlog.

**Christian's decisions (2026-08-09):**
1. Full roadmap, sequenced rounds
2. Reveal-seen marker: **durable, in the database**
3. Unpair/leave-partnership: **deferred to backlog**
4. Early plan end: **"End this plan", quiet, honest, no ceremony, no tree**
5. Activity surface: **derived union feed (RPC), not a stored events table**
6. Activity placement: **quiet bell with unread dot in Today's header**
7. Invite: **link + prefill + QR only; NO name-preview oracle**
8. Ended plans: **shown in Completed, labeled "Read N of M days"; zero-read plans stay hidden**

**Audit items REJECTED (conflict with deliberate decisions, do not implement):**
- One-note-per-author on verses: contradicts the 2026-08-07 design (one shared note + `verse_note_responses` discussion as the second voice; authorship already shown in the reader)
- Removing/changing Amen-advances-the-day: the mechanic stays; we fix its side effect (unread reveal)
- Un-clearing delivered notifications on foreground: deliberate; the Activity surface is the replacement trail
- "Gentle re-entry": streak grace (`cadence + 4`), same-day catch-up crediting and DayClosed already exist
- Reveal first-view ceremony / faster return: `revealSeen` already does this (moves to DB in Round 1)

**Load-bearing constraints verified directly:**
- `entries_update_own_draft` USING pins client updates to `submitted_at IS NULL` (20260525232605_rls_policies.sql:121-124) → the seen-marker CANNOT be a column grant + client UPDATE on a sealed row; it must be a SECURITY DEFINER RPC (house style anyway)
- `couple_plans.status` CHECK is `('active','completed','paused')` (initial_schema.sql:72) → "End this plan" reuses `'completed'`; `isFinished()` (current_day >= duration) stays the sole discriminator; no constraint migration

---

## Round 0 — Ops, no code (before anything else)

All already tracked in progress.md / security-round-plan.md. Every hosted mutation via MCP after `get_project_url` confirms `jcyhhxgomhopkoqesbkb`.

1. **Push `security-round` to origin.** The branch is 2 commits ahead of origin/main (dbd0279 security round, ff86f4b ask-pamwe 503 fix) with no remote ref: the hosted DB schema's source of truth exists only on this machine.
2. **Restore Ask Pamwe** (Christian, dashboards): top up OpenAI + Anthropic credits, and set the spend alerts from store-package.md §7. Second dual outage; the alerts are the real fix.
3. **Rotate the review password** (runbook step 6): new value into App Store Connect review notes FIRST, then the `execute_sql` block (crypt update + session/refresh-token deletes for the two `dddddddd-…` reviewer ids).
4. **Deploy the pending edge functions** via MCP `deploy_edge_function`. Precondition: dashboard `NOTIFY_WEBHOOK_SECRET` equals the Vault `notify_webhook_secret` value, else every notification 401s. Order: `notify-partner` first + real-banner check, then the notify-* family, then `delete-account`, then `ask-pamwe` (server half of ff86f4b; client half rides in build 26).
5. **Apply `20260808000007_resume_final_day_autocomplete.sql`** only once both phones are on b25+.
6. Post-deploy: `get_advisors`, `get_logs`, one 200 webhook delivery per function.

Size: ~half a day, mostly Christian's hands (dashboards + password).

---

## Round 1 — DONE in the working tree (2026-08-09), ships as build 26

Committed as `a1ad996` on `security-round`, pushed. All nine items below landed.
Verification actually run, not just planned:

- `supabase db reset` replays all 57 migrations clean from scratch
- `rls_probe.sql` (now 14 sections) green against that from-scratch database
- 34 Jest suites / 311 tests green, `tsc --noEmit` clean
- both migrations applied to hosted `jcyhhxgomhopkoqesbkb` via MCP, backfill
  verified there: 47 sealed entries, 46 marked seen, 0 revealed-but-unwatched,
  so nobody gets a false "you missed a reveal" card on upgrade
- `get_advisors` shows no new warning class (`mark_reveal_seen` joins the
  existing SECURITY DEFINER list; `switch_plan` is INVOKER so it does not appear)

Two things found along the way that were not in the audit:

1. **`local_dev_seed.sh` seeded the wrong database.** It picked the db container
   with `grep supabase_db | head -1`, which with a second local Supabase stack
   running resolved to another project's container entirely. Now named from
   `config.toml`'s `project_id`.
2. **The entries column grant nearly broke voice sending on old builds.** Builds
   up to b23 wrote `transcript` inline on the draft row and throw if it fails,
   so `transcript` is in the grant. Probed, not just reasoned about.

Still to do for build 26 itself: bump `CURRENT_PROJECT_VERSION` in all 4 spots,
`restore_ios_patches.rb --check`, archive, grep the bundle for the project ref,
upload. Round 0's ops items are Christian's and are unblocked by none of this.

### What Round 1 contained

### 1. Durable reveal-seen marker
- **Migration `20260810000001_reveal_seen.sql`**: nullable `entries.reveal_seen_at timestamptz` (on the viewer's OWN row); RPC `mark_reveal_seen(p_couple_plan, p_day)` in the 20260808000001 pairing-RPC style (SECURITY DEFINER, pinned search_path, revoke public/anon, grant authenticated), idempotent via `coalesce`, scoped `user_id = auth.uid() AND submitted_at IS NOT NULL`. Backfill: `reveal_seen_at = submitted_at` for every mutually-sealed day EXCEPT days `>= current_day` on an active plan (preserves the one reveal currently awaiting Amen).
- **Client**: [src/lib/entries.ts](src/lib/entries.ts) gains `markRevealSeen()` + `getUnseenReveals(couplePlanId, currentDay)` (my sealed entries with null marker and day < current_day, intersected with partner-submitted days; RLS visibility already IS the mutual-seal test). [reveal.tsx](src/app/(tabs)/(today)/reveal.tsx) drops the AsyncStorage `seenKey` gate; ceremony-replay check reads `myEntry.reveal_seen_at`; mark-seen is fire-and-forget (worst case the ceremony replays once). [(today)/index.tsx](src/app/(tabs)/(today)/index.tsx): in the OPEN state, when unseen reveals exist, a card above the CTA: "Yesterday's reveal is waiting" (or "Day N's…"), oldest first, one card, → `reveal?day=N`.

### 2. `switch_plan` RPC (atomic enrollment)
- **Migration `20260810000002_switch_plan_rpc.sql`**: `switch_plan(p_couple, p_plan, p_cadence default 1) returns couple_plans` — one transaction: complete old active, insert new, `exception when unique_violation` adopt the concurrent partner's active row (the 23505 adoption moves inside). **SECURITY INVOKER** (couple_plans has legitimate client policies; RLS stays the guard, the RPC adds only atomicity). Validate `p_cadence in (1,2,7)`.
- [src/lib/plans.ts](src/lib/plans.ts): `enrollInPlan` becomes the rpc call + one re-fetch of the joined shape; `switchPlan` stays the passthrough; the 5 call sites don't change.

### 3. Today stops swallowing errors
- [useTodayEntry.ts](src/hooks/useTodayEntry.ts): `error: 'network' | 'missing-day' | null` (PGRST116 from `getPlanDay .single()` = missing-day); never clear last-good data on failure.
- [(today)/index.tsx](src/app/(tabs)/(today)/index.tsx): consume `error`. (a) plan + network error + no planDay → dedicated "Couldn't load today" + Retry, never the new-couple copy; (b) error + planDay → keep content, thin error line + Retry; (c) missing-day → quiet line + door to Plans.

### 4. "End this plan"
- No new status. [plans/[id].tsx](src/app/(tabs)/plans/[id].tsx:187): if `isFinished` keep the ceremony route (legit manual finish); else button = "End this plan", quiet confirm ("End this plan? The days you read together stay in your reflections."), `completePlan` → `refreshCouple()` → `router.replace('/(tabs)/plans')`. No complete.tsx, no tree, no celebration haptic.
- [planHistory.ts](src/lib/planHistory.ts): `endedPlans()` (completed, `!isFinished`, ≥1 sealed day) + sealed-day counter (distinct partner-submitted day_numbers via RLS-visible entries = mutual seals; fallback `current_day - 1`). **Metric = sealed days**, matching what the streak counts.
- [plans/index.tsx](src/app/(tabs)/plans/index.tsx:91) (+ finished.tsx): ended rows join the Completed section labeled "Read N of M days". Zero-sealed-day abandons stay hidden.

### 5. Amen guard
- [reveal.tsx](src/app/(tabs)/(today)/reveal.tsx:311): `amening` busy state, disabled while in flight; on `advancePlanDay` failure keep Sentry + Alert "Couldn't mark the day complete" with Try again / Back to Today (currently Sentry-only silent).

### 6. Profile name: one source
- [CoupleProvider.tsx](src/providers/CoupleProvider.tsx): fetch `getMyProfile()` in `refresh()`, expose `me`.
- Replace auth-metadata name derivations at [you/index.tsx:70](src/app/(tabs)/you/index.tsx#L70), [(today)/index.tsx:142](src/app/(tabs)/(today)/index.tsx#L142), [reveal.tsx:45](src/app/(tabs)/(today)/reveal.tsx#L45) with `me.display_name`/`me.avatar_initial` (old derivation = fallback only).
- Editor: "Your name" row in [you/settings.tsx](src/app/(tabs)/you/settings.tsx) reusing `updateDisplayName` ([src/lib/account.ts](src/lib/account.ts)) — columns already in the users grant.

### 7. Engineering floor (this round's slice)
- **CI**: new `.github/workflows/app-ci.yml` — push/PR: `npm ci`, `npx tsc --noEmit`, `npx jest --ci`; separate lint job `continue-on-error: true` until the eslint backlog/toolchain lands (backlog).
- **Generated types**: `supabase gen types typescript --local > src/types/database.ts`; `createClient<Database>` in [src/lib/supabase.ts](src/lib/supabase.ts); all NEW code typed; legacy `any` cleanup incremental. Regen after every migration, every round.

**Tests**: Jest (error taxonomy, ended-plan labeling + fallback, rpc wrapper + 23505 adoption, unseen-reveal intersection, name editor, CoupleProvider `me`). rls_probe.sql new sections, also paying down existing gaps: `create_couple`, `regenerate_invite_code`, expired-code sentence, `delete_account` not callable by authenticated, `accepted_terms_at`, `mark_reveal_seen` (partner can't mark mine; unsubmitted refused; direct UPDATE refused), `switch_plan` (outsider refused; exactly one active row; adoption). On-device (two phones): partner Amens first → waiting card appears; ceremony plays once; **reinstall → no replay**; airplane-mode Today shows error not new-couple copy; end plan at day 3/21 → "Read 3 of 21 days", no tree.

**Rollout**: local stack + probe green + jest/tsc green → MCP apply_migration (both, by name) → regen types → build 26 (bump all 4 CURRENT_PROJECT_VERSION spots, `restore_ios_patches.rb --check`, archive, bundle-grep project ref, upload).

**Size**: ~5-6 dev days (backfill SQL + probe sections are the careful parts).

---

## Round 2 — Notifications: right moment, every device → build 27

### 1. Permission priming
- [notifications.ts](src/lib/notifications.ts): split into `getPushTokenIfGranted()` (never prompts) and `requestPushPermission()` (the prompt). [AuthProvider.tsx](src/providers/AuthProvider.tsx:80) uses the former — granted users keep working, fresh installs never prompted at sign-in.
- [connected.tsx](src/app/(onboarding)/connected.tsx): priming card "Know the moment {partner} has written" + Turn on notifications / Not now. Settings: enable card when `undetermined`, `Linking.openSettings` line when denied.

### 2. `push_tokens` table (multi-device)
- **Migration `20260817000001_push_tokens.sql`**: `push_tokens(token text pk, user_id uuid fk cascade, platform, updated_at)` + index on user_id; RLS own-rows only (plain policies; single-step writes). Backfill from `users.expo_push_token`. **Transition**: keep the legacy column + grant this round (b25/b26 clients still write it); functions read push_tokens with legacy fallback; drop-column migration goes to backlog gated on both phones ≥ b27.
- Client: `savePushToken` upserts `{token, user_id, platform}` on conflict token (device changing accounts moves the row); keep the b8 anti-PATCH-storm guard verbatim; persist device token under `pamwe:pushToken` so sign-out deletes only THIS device's row (fixes the account-wide null).
- Edge: [_shared/push.ts](supabase/functions/_shared/push.ts) fans out one message per token; `DeviceNotRegistered` deletes that token row (keep per-token cleanup). The six `notification_*` prefs stay on users.
- **Deploy all functions via MCP, pinning `@supabase/supabase-js` to one exact 2.x everywhere** (10 floating imports today; Anthropic SDK already pinned).

### 3. Activity surface (decisions 5+6)
- **Migration `20260817000002_activity_feed.sql`**: SECURITY INVOKER RPC `activity_feed(p_before timestamptz, p_limit int)` — `UNION ALL` over `entry_responses`, `prayers`, `dreams`, `verse_notes`, `verse_note_responses` under the caller's own RLS, ordered desc, keyset pagination. Unread dot via a `users.last_seen_activity_at` column added to the existing users column grant.
- Client: `src/lib/activity.ts` (new lib seam); quiet bell + unread dot (never a count) in Today's header → an activity screen in the (today) stack listing items with deep links (existing routes; respect the withAnchor rule for nested pushes). Filter own-authored items out (it's a record of the PARTNER's motion).

**Tests**: Jest (registration split, upsert semantics, activity lib mapping). Probe: push_tokens isolation (can't read/insert another user's), activity_feed scoping (outsider sees nothing, respondent RLS honored). On-device: fresh install prompts only at connected; two devices one account both receive; sign out on one device, other still receives; upgrade path no re-prompt, no delivery gap; bell dot clears on open.

**Rollout**: migrations → `notify-partner` deploy + real banner → rest (pinned) → regen types → build 27.

**Size**: ~4-5 dev days.

---

## Round 3 — Polish and reach → build 28

1. **System theme**: `ThemePreference = 'light'|'dark'|'system'` alongside existing `ThemeMode`; [ThemeProvider.tsx](src/providers/ThemeProvider.tsx) stores preference in the same `pamwe:theme` key, resolves via `Appearance.getColorScheme()` + `addChangeListener` while system, stops forcing `setColorScheme` in that case; third "Auto" option in [you/index.tsx](src/app/(tabs)/you/index.tsx:117).
2. **Accessibility**: [Button.tsx](src/components/ui/Button.tsx) `accessibilityState={{disabled, busy}}`; [BottomSheet.tsx](src/components/ui/BottomSheet.tsx) `accessibilityViewIsModal`, scrim role, `onAccessibilityEscape`.
3. **Invite link + QR** (decision 7 — NO name preview): share message gains `pamwe://join?code=X`; [join.tsx](src/app/(onboarding)/join.tsx) `useLocalSearchParams` prefill; cold-start signed-out stash under `pamwe:pendingInvite` consumed after sign-in; QR via `react-native-qrcode-svg` (pure JS over installed react-native-svg; npm install only, NO pod, NO prebuild). Universal links deferred (no domain).
4. **Scripture text search**: migration `20260824000001_bible_verses_fts.sql` — stored generated tsvector + GIN on `bible_verses`, RPC `search_verses(p_query, p_limit)` via `websearch_to_tsquery` ordered by `ts_rank` (FTS over ILIKE: stemming + index on the free tier; RPC because `.textSearch()` can't order by rank). Client: `searchScripture()` in [src/lib/search.ts](src/lib/search.ts); "Scripture" section in the existing bible/search screen (retitle its entry row); results → `/(tabs)/bible/[book]/[chapter]?verse=n`.
5. **Voice draft durability** (scoped; NOT a generic outbox): on failed voice send persist `{uri, durationSeconds}` under `pamwe:pendingVoice:{cpId}:{day}`; on journal mount verify file exists → "Your recording is ready to send" with Send again / Discard; clear on success/discard. (Text autosave already exists; the local file already survives a failed send, only the pointer is lost.)

**Tests**: Jest (theme resolution + listener, searchScripture, join prefill, pendingVoice). Probe: bible_verses writes still refused post-FTS, `search_verses` authenticated-only. On-device: appearance flip mid-session; VoiceOver pass; QR scan phone-to-phone incl. cold start; search feel on hosted; kill app after failed voice send → reopen → send.

**Rollout**: migration via MCP → regen types → build 28.

**Size**: ~4-5 dev days.

---

## Backlog (deferred, rough priority)

- Unpair / leave-partnership (decision 3; build when generalizing beyond one couple)
- Drop `users.expo_push_token` + grant + function fallback once both phones ≥ b27
- ESLint: resolve eslint-config-expo 57 vs Expo 56, burn the ~188-error backlog, flip CI lint to gating
- Universal links (needs a domain + apple-app-site-association)
- Generic offline outbox (Round 3 voice retention is deliberately not this)
- Invite name-preview RPC (declined for now, decision 7)
- Private export; biometric lock; editable generated plans; shared-decision model for plan/cadence changes; prayer Answered undo/reopen; notification preview controls; push receipt polling (getReceipts); e2e harness (Maestro); analytics
- 7th Grove rung; Android end-to-end validation; caution-only catalogue sweep (pre-existing)

## Verification (whole roadmap)

- Every migration lands locally first: `supabase start` → `db reset` replays clean → `rls_probe.sql` green via docker psql → then MCP `apply_migration` by name on hosted
- Every new DB object gets a probe section in the same round it ships
- `npx jest` + `npx tsc --noEmit` green before every build; CI enforces from Round 1 on
- Each round ends in an uploaded TestFlight build (26, 27, 28): version bump in all 4 spots, `restore_ios_patches.rb --check`, archive, `grep -ac jcyhhxgomhopkoqesbkb` on the bundle = 1, upload
- Two-phone on-device checks per round as listed (reveal-seen reinstall test is the critical one)
