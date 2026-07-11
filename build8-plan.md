# Build 8 — Fix plan from the Build 7 beta ramblings

**Created:** 2026-07-11 · Status: **ALL 9 FIXES IMPLEMENTED (2026-07-10 session); tsc clean, 66/66 Jest.**
Source: Notion "Pamwe Ramblings" → "Build 7 ramblings" (logged ~2026-07-11 02:32 UTC).
Rule from Christian: fix all of these before any green-list features or other work.

## Where we are in the process

1. ✅ Notion ramblings triaged (all items below).
2. ✅ Root causes traced to exact code paths (client trace + hosted DB/log verification).
3. ✅ **Sentry pulled (via the `sentry` CLI — the MCP never authenticated; CLI installed
   + OAuth'd 2026-07-10, org `zakia-12`, project `pamwe-ios`). CRASH ATTRIBUTED: it was
   the PATCH storm.** Two fatal issues, both build 7, both Christian's phone, both
   EXC_BAD_ACCESS under memory exhaustion:
   - **PAMWE-IOS-1** (7:11 PM PT): `__CFStringHandleOutOfMemory` → `_CFRaiseMemoryException`
     — the app literally ran out of memory. Breadcrumbs: wall-to-wall
     `PATCH /rest/v1/users → 204`, dozens within the same second.
   - **PAMWE-IOS-2** (7:16 PM PT, the relaunch): `_Block_copy` null-pointer, breadcrumbs
     again 100/100 PATCH `/users` (buffer cap). Loop re-armed on relaunch, killed it again.
   Both are root-caused to #1 (push-token loop), which is fixed in this batch. Leave the
   two issues UNRESOLVED until b8 ships (b7 is still on both phones), then resolve.
   The b6 recaps crash is NOT in Sentry: the org was only created 2026-07-11 00:57 UTC,
   so pre-b7 events never landed anywhere. Watch for it on b8.
4. ✅ **Implementation batch done** (all 9 steps below; see "Implementation record" at
   the bottom). Gates: `npx tsc --noEmit` clean, 66/66 Jest.
5. ✅ Trimmed `ask-pamwe` **v6 deployed to hosted** (2026-07-10, Christian-approved;
   verify_jwt=true, status ACTIVE). Re-verify latency in-app on b8.
6. ✅ **b8 UPLOADED to TestFlight** (2026-07-10 20:51 PT, "Upload succeeded", awaiting
   Apple processing). `CURRENT_PROJECT_VERSION` 8 (both spots); archive verified
   (hosted ref ×1 in main.jsbundle, CFBundleVersion 8). `ios/ExportOptions.plist` had
   been lost to the `/ios` gitignore; recreated from trial-and-error.md keys and now
   un-ignored + trackable (`.gitignore`: `/ios/*` + `!/ios/ExportOptions.plist`).
   Benign dSYM warnings for prebuilt frameworks (React/Hermes/ExpoImage/SDWebImage);
   native frames stay unsymbolicated until those dSYMs are uploaded (optional fix).
7. ✅ **ROUND 3 VERIFIED ON b8 (2026-07-10 evening).** Christian: "major improvement,
   feels faster." Committed to main as 1c87587. Hosted API logs from the b8 session:
   PATCH /users exactly 2× at launch (vs ~200/s on b7), zero non-2xx, windowed
   plan_days + joined reflections queries visible, a custom plan created fine.
   ask-pamwe v6 first live call 6.1s (v5 was 7.1-12.8s). Sentry: ZERO b8 events; a
   third b7 issue surfaced (PAMWE-IOS-3, Swift alloc failure at 7:32 PM, delivered on
   next launch) — same PATCH-storm OOM family. All three b7 issues can be resolved
   (Claude was permission-blocked; Christian to say "resolve the three Sentry issues"
   or click in the UI). Still watch: b6 recaps crash never captured anywhere.

## Verified facts (hosted project jcyhhxgomhopkoqesbkb, checked 2026-07-11)

- **Runaway PATCH storm (smoking gun):** API logs show ~100 identical
  `PATCH /rest/v1/users?id=eq.0e4c4af1…` requests within ~500ms from Christian's phone
  (UA `Pamwe/7`), sustained. Explains most speed complaints; prime crash suspect.
- **ask-pamwe edge function:** during Christian's test session the deployed **v4 returned
  503** (ANTHROPIC_API_KEY missing at deploy time). **v5 (current) works** — three 200s
  from his phone at ~02:15 UTC — but takes **7–13s per call**.
- Christian's prayer EXISTS in `prayers` (active, correct couple `955b0f3d-8b31…`);
  `prayers_select` RLS is couple-scoped and correct. "0 prayers" + invisible prayer are
  client-side read bugs.
- The couple is enrolled in **curated Gospel of John** (day 1 = "John 1"), all 21 days have
  seeded `passage_text` (0 NULLs). So the slow reading screen was NOT a live bible-api
  fetch; it was almost certainly the PATCH storm starving the request queue.
- No Sentry API token on disk (only the DSN), hence the MCP route.

## Root causes (file:line)

| # | Symptom (Notion) | Root cause |
|---|---|---|
| 1 | Everything slow; slow again on resume; crash | **Push-token infinite loop**: `src/lib/notifications.ts:83-89` — `watchPushTokenRotation` listener calls `registerForPushNotifications()` → `getExpoPushTokenAsync()` emits another token event → listener fires again, forever. Each loop = `savePushToken` → `PATCH /users`. Armed in `src/providers/AuthProvider.tsx:50-60` on every sign-in/launch. |
| 2 | "Opens the app… comes back… starts to load" | Token refresh on foreground (`src/lib/supabase.ts:22-27` startAutoRefresh) → `onAuthStateChange` sets a NEW session object (`AuthProvider.tsx:38-42`) → `CoupleProvider.refresh` keyed on whole `[session]` (`CoupleProvider.tsx:30-57`) refetches, new `couplePlan` identity → `useTodayEntry.ts:26-53` re-runs with `setLoading(true)` (line 33) → Today blanks to spinner (`(today)/index.tsx:38-46`). Other tabs revalidate silently; Today is the one that blanks. |
| 3 | Prayers slow + can't see edited prayer | `prayers/index.tsx:40-58`: three queries in one all-or-nothing `Promise.all`; catch at 53-54 swallows errors → transient failure blanks the whole list (empty state at 125, 147-154). No cache at all in `src/lib/prayers.ts` (b7 SWR cache went to Plans only: `plans/index.tsx:29-37`, `lib/plans.ts:15-33`). NOT an RLS issue. |
| 4 | "0 prayers" stat counter | `src/lib/prayers.ts:118-124` `countPrayers` never checks `error`; failure → `count ?? 0` → lying zero. Same flaw: `countMyTotalSubmitted` (`lib/entries.ts:214-227`), `countCoupleReflections` (231-240). `you/index.tsx:24-40` renders zeros on failure. |
| 5 | Reflect slow; empty state should be instant | `reflect/index.tsx:28,32-43` spinner until network resolves; `lib/reflections.ts:23-98` runs 1-2 SEQUENTIAL round trips even to conclude "empty". No cache. |
| 6 | Notifications & reminders slow to open | `you/settings.tsx:29,31-48` blocks all paint on `Promise.all([getNotificationPrefs(), getNotificationPermissionStatus()])`; UI already tolerates missing prefs (`prefs?.` at 112,121,123). |
| 7 | Plan detail slow | `plans/[id].tsx:130-136` full-screen spinner gates on `getPlan` round trip; caches are session-only (`lib/plans.ts:71-92`), cold launch = network; `getPlanDayList` fetches ALL rows (365 for M'Cheyne) but renders `WINDOW=40` (`[id].tsx:20,153-154`); `overlayIn` 340ms (`lib/motion.ts:17-22`) adds perceived delay. (Good: it does NOT select passage_text.) |
| 8 | Ask Pamwe / Topics: forever-loading, then crash | (a) server was 503 during test (fixed, v5 live); (b) 7-13s latency; (c) `src/lib/askPamwe.ts:50-63` `supabase.functions.invoke` has NO timeout → hung request spins forever (`builder.tsx:81-92` `asking` stays true → bottom spinner at 329-330 persists "while typing"); (d) topic chips (`builder.tsx:216-221`) give no pending/selected feedback, only a haptic. Errors DO fall back to hardcoded recs (`fallbackRecs`), so hang ≠ throw. Topics + Ask Pamwe both call the live edge function; Books mode is offline. |
| 9 | "Read today's portion" → slow mystery page; should open the Bible | CTA at `(today)/index.tsx:89` pushes `(today)/reading.tsx` (standalone page). Bible reader already supports plan context: `plans/[id].tsx:51-65` `openReading` → `bible/[book]/[chapter]` with `{book, chapter, couplePlanId, day, planTitle}`; reader shows plan banner + Reflect button (`bible/[book]/[chapter].tsx:141,169-181`). Mirror that (~5 lines). Watch: reading.tsx shows `reflection_prompt`; keep the journal path reachable. |
| 10 | Tab bar "not it" — dock it (Christian's #1) | Product decision made: replace floating glass oval (`GlassTabBar.tsx` / `useGlassTabOptions`) with a standard edge-to-edge docked bottom bar, Instagram-style, persistent. |
| 11 | "It did fail… check Sentry" | ✅ RESOLVED (step 3 above): both b7 crashes were memory exhaustion from the PATCH storm (#1) — OOM stack + 100× `PATCH /users` breadcrumbs on each event. Recaps crash from b6 predates the Sentry org; still unattributed, watch on b8. |

## Build 8 implementation order

1. **Kill the push-token loop** (#1): guard `savePushToken` (skip if token unchanged since last save), don't re-derive inside the rotation listener (use the event's token / in-flight flag). Single highest-impact fix.
2. **Stop the resume-reload cascade** (#2): key CoupleProvider refresh on `session?.user?.id` not the session object; `useTodayEntry` only `setLoading(true)` on first load (keep content while revalidating).
3. **Dock the tab bar** (#10).
4. **Prayers** (#3+#4): SWR cache like Plans; split the three fetches (one failure can't blank the list); keep last-good content; counters check errors and show last-good.
5. **Reflect** (#5): cached/instant empty state; short-circuit the sequential lead-in.
6. **Settings** (#6): paint shell immediately, fill prefs async.
7. **Plan detail** (#7): AsyncStorage SWR for header, render header without gating; fetch only the day window; trim overlayIn.
8. **Ask Pamwe** (#8): client timeout ~15-20s → graceful fallback recs; pending style on tapped topic chip; cut latency (tighter prompt / fewer recs / smaller max_tokens — measure first).
9. **Today CTA → Bible reader** (#9) with plan context; keep reflection prompt + journal entry point reachable.

Then: bump `CURRENT_PROJECT_VERSION` (2 spots in project.pbxproj), archive, verify bundle, upload — per CLAUDE.md TestFlight pipeline.

## Positives from the ramblings (no action)

Liquid glass animations loved; Bible↔Plans switching feels faster (b7 caches working).
Note: glass ANIMATIONS are liked even though the glass TAB BAR is being replaced — keep the animation language elsewhere.

## Implementation record (2026-07-10 session)

1. **#1 push-token loop:** `notifications.ts` — `savePushToken` now skips when
   `{userId}:{token}` matches the last successful save (reset on `clearPushToken`);
   the rotation listener dedupes the native token from the event (the
   `getExpoPushTokenAsync` re-registration echoes the SAME token back) and holds an
   in-flight flag. The loop can no longer sustain itself at any layer.
2. **#2 resume cascade:** `CoupleProvider` refresh keyed on `session.user.id` (token
   refresh mints a new session object for the same user); `useTodayEntry` shows the
   spinner only before the first successful load (`loadedOnce` ref) and revalidates
   silently after.
3. **#10 docked tab bar:** `GlassTabBar.tsx` deleted → `DockedTabBar.tsx`
   (`useDockedTabOptions`): edge-to-edge, `colors.surface` bg, hairline top border,
   54px + bottom inset, press-scale + tap haptic kept. All `paddingBottom: 118`
   floating-bar clearances → 32 (Screen.tsx + 5 tab screens); plan-detail footer
   `+72` clearance and builder footer inset removed (content now ends above the bar).
4. **#3+#4 prayers + counters:** prayers list hydrates from
   `pamwe:prayers:{coupleId}` AsyncStorage cache, then `Promise.allSettled` per query
   (one failure keeps the other two + last-good), cache written on success; empty
   state gated on a successful load (`everLoaded`). `countPrayers` /
   `countMyTotalSubmitted` / `countCoupleReflections` / `couplePlanIds` now throw on
   error; You tab stats are per-stat allSettled with last-good fallback + persisted
   to `pamwe:youStats:{coupleId}`.
5. **#5 reflect:** `getRevealedReflections` lead-in collapsed to ONE round trip
   (entries joined `couple_plans!inner`, filtered on `couple_plan.couple_id`);
   screen hydrates from `pamwe:reflections:{coupleId}` and persists on success.
6. **#6 settings:** full-screen spinner removed; shell paints immediately, prefs and
   permission fill in independently (`prefs?.` already tolerated null).
7. **#7 plan detail:** `getPlan` writes an AsyncStorage row (`pamwe:plan:{id}`) and
   new `getPlanCached` hydrates the header instantly; `getPlanDayList(planId, fromDay,
   limit)` fetches only the 40-row window (from `current_day - 5`); earlier/more
   labels computed from `plan.duration_days`; `overlayIn` 340ms → 200ms.
8. **#8 ask pamwe:** client aborts the invoke at 15s (AbortController + `signal`,
   supported by supabase-js 2.106) → fallback recs; topic chips show selected/pending
   state and disable while asking; edge function trimmed to exactly 2 recs, prefers
   7/14-day plans, `max_tokens` 4096 → 2048 (output tokens are the latency).
   **Hosted deploy of v6 pending Christian's approval.**
9. **#9 today CTA:** "Read Day N" parses the day's reference and opens
   `bible/[book]/[chapter]` with `{couplePlanId, day, planTitle}` (plan banner +
   Reflect → journal, prompt intact); falls back to `reading.tsx` if the reference
   doesn't parse.

Gates: `npx tsc --noEmit` clean · 66/66 Jest (8 suites). Not yet done: Sentry pull
(MCP auth), hosted ask-pamwe deploy, version bump + archive + upload, on-device pass
(docked bar feel, prayers/reflect cold-launch, Ask Pamwe timing).
