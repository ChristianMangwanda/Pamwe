# Pamwe Build Progress Summary

**Last Updated:** August 15, 2026

---

## 🎯 LAUNCH DEADLINE (set 2026-08-12): LIVE ON THE APP STORE MON AUG 24

Submit for review **Wed Aug 19**. Full schedule and decisions in
[`launch-plan.md`](launch-plan.md). The short version: b28 to both phones +
the two-phone pause/leave pass with Ammy by Sun Aug 16, privacy policy on
GitHub Pages (launching WITHOUT a domain, decided 2026-08-12), listing +
privacy questionnaire Mon–Tue, submit Wednesday, buffer for one rejection
round. If the two-phone pass is clean, **b28 is the launch build**.

⚠️ **Superseded 2026-08-15: b30 is now the launch candidate**, because catching
up was broken in a way that only showed once someone fell more than one day
behind. See the build 30 entry directly below. b28's own changes are unaffected
and still ship; b30 is b28 plus this round.

---

## 🚀 BUILD 30 (2026-08-15): catching up alone must not need your partner

**`current_day` was deciding two different things**, and that was the whole bug.
It is one pointer for the couple, it only moves on Amen, and Amen needs BOTH
partners sealed for that day. The catch-up screen handed the Reflect button to
`current_day` and nothing else, so a person four days behind wrote one
reflection and stopped. If their partner was also behind, nobody moved and the
gap kept growing. The screen's own footnote, "One at a time. Finishing the day
you start here opens the next one", was false in exactly the case it was written
for: finishing YOUR side opens nothing.

Writing is solo and the reveal is shared, so those come apart. What you may
write is now your own lowest unsealed day up to `expectedDay` (`myOwedDays`),
and `current_day` goes back to meaning only "the day you two are on together".
**RLS needed nothing**: the locked reveal is keyed per
`(couple_plan_id, day_number)`, so day 4 reveals on its own without waiting for
day 2, and `compute_streak` has credited same-day catch-up twice since
2026-07-26. The database was ready the whole time; only the client serialised it.

Three things found while tracing it, all closed:

- **A silent no-op.** `plans/[id].tsx` already let you reach day 4's journal
  while the pointer sat on 2 (the cadence gate is directional and allows it, and
  the journal does not refuse). Amen then ran an UPDATE guarded on
  `.eq('current_day', 4)`, which matched **zero rows** — and PostgREST does not
  error on that. Nothing threw, no alert fired, and the reveal returned you to
  Day 2 having changed nothing and said nothing.
- **The banner hid itself when it was most needed.** It rendered on
  `behind > 0 && !bothSubmitted`, so a couple who had both sealed today and
  neither tapped Amen lost the door to the catch-up screen entirely, while the
  pointer sat still and the backlog went untouched.
- **Completion could strand.** The trigger asked whether the final day landed on
  the day the couple were pointed at. Sealed out of order that is a different
  question, and a finished plan would stay `active` forever, still offering days
  it had already read, never reaching the Grove.

**`advance_plan_day` answers rather than increments** (migration
`20260817000001`): the lowest day the couple have not both sealed, forward-only,
`SECURITY INVOKER`. The same move `compute_streak` made on 2026-07-26 and for
the same reason, that a stored counter left wrong by an out-of-order write has
no way back. INVOKER means RLS does the hard part for free: a partner's row is
visible only on days you sealed too, so `count(distinct user_id) = 2` over what
you can see IS the mutual-seal test, with no definer helper. One Amen now clears
a whole revealed backlog instead of demanding one per day, and a double tap is a
no-op by computation rather than by guard. **Amen still owns advancement** —
20260714000002's call stands, the trigger still does not move the pointer on
seal.

**Catching up earns a moment, not a trophy.** `BackInStep.tsx`: the days you
wrote land one after another on the same `landStep` keyframe the Grove's
footprints use, then the count, then a line. The Grove rule holds — days do not
mint a second award — so nothing accrues and nothing is stored; the trigger is a
session-only route param like the Grove's `arrived=`. Haptics stop at `success`,
because `celebrate` is used exactly once in the whole app when a tree settles,
and a test asserts this never reaches for it.

Also: `waiting.tsx` offers "Keep going: N days left" instead of being a wall,
Today's unseen-reveal card counts a queue rather than showing one, and
`notify-partner` (v16) coalesces a catch-up run into one banner, stateless and
failing OPEN so a fault there can never silence the app's core notification.

Verified: `tsc` clean, **435 Jest tests across 46 suites**, ESLint 0 errors,
`rls_probe.sql` **26/26** including two new probes that run as a real signed-in
session and prove writing three days alone does not move the couple, one sealed
day moves it one, a cleared backlog moves it all at once, repeats are no-ops, it
never goes backwards, outsiders are refused, and a plan sealed last-day-first
still completes. Hosted: migration applied and `notify-partner` v16 deployed
2026-08-15, both backfills touching **zero rows**, no new security advisors, and
b28/b29 phones keep working because the old direct-table path is untouched.

---

## 🚀 BUILD 28 (2026-08-11): the channel that never survives its own remount

One app change since b27, shipped the same evening it was found: every realtime
`.channel()` topic carries a per-mount `Date.now()` suffix (commit `3432d39`).
`removeChannel` tears down asynchronously, so a screen remounting faster than
its old channel died got the SAME still-subscribed instance back and threw
"cannot add postgres_changes callbacks after subscribe()". Sentry caught it
twice in two days, at two different sites (PAMWE-IOS-5 in CoupleProvider on
b25, PAMWE-IOS-6 on Today's couple-requests channel on b27, the second landing
on Christian's phone within an hour of the fix being written), which is why all
nine call sites got the suffix rather than one. The quiet cost when it fired
was a subscription that never re-armed until relaunch. Harmless to data, and
the b26 error boundary caught it as designed. PAMWE-IOS-5 resolved;
**PAMWE-IOS-6 resolved 2026-08-15.** Neither phone ended up on b28 itself
(Christian took b30, Ammy b29), but `3432d39` is an ancestor of both, so the fix
is what that condition was actually asking for and it is running on both phones.
It last fired 2026-08-11 on b27, two events across nineteen seconds, and b28,
b29 and b30 have logged nothing since.

Also closed 2026-08-11, between b27 and this build: the whole backlog (legacy
push-token column dropped, ESLint gating at zero errors, iOS-only decision),
plus two infrastructure finds: CI had been dead at `npm ci` since the ESLint
bootstrap (npm's cross-platform optional-deps bug; lock entries generated in a
Linux container) and the Supabase keepalive had NEVER run (its
`SUPABASE_ANON_KEY` repo secret was never set; set now, green, and it matters
more now that a paused couple generates no traffic). All three workflows green.

---

## 🚀 BUILD 27 UPLOADED (2026-08-11)

The August onboarding and offboarding handoff, plus the five findings from
Notion, plus the ways out of a partnership that the app never had. Branch
`build27`. Full plan and decisions: [`build27-plan.md`](build27-plan.md).

**Signing out means it now.** The app's only auth check was `src/app/index.tsx`,
which decides nothing unless you are standing on it, so once the session went
the six tabs kept rendering: prayers listed, the Bible readable from a chapter
cache that is authoritative by design. `(tabs)` and `(onboarding)` are fenced,
and the phone forgets the account's caches, its scheduled reminders and the
widget's day counter. The rule is default-delete: a cache invented next year
leaves unless somebody deliberately keeps it.

**Pausing takes two**, as the handoff drew it. Nothing stops until the other
person agrees, and the database refuses to let the asker answer themselves. The
streak had to learn about it: it is derived rather than stored, so "your streak
stays where it is" could not be a saved number, and a pause is a stretch of
calendar `compute_streak` subtracts.

**Leaving keeps the words.** Every policy reaches rows through
`current_user_couple_id()`, which is null the moment you leave, so a hundred and
fifty days would have vanished exactly when they matter most. Membership in a
sealed couple is a second read path, and **the locked reveal does not relax
inside it**: a day only one of you wrote stays shut. Leaving is not a way to
collect a reflection you never earned.

**A bug of mine, caught before it shipped:** the paused screen promised "no
pages and no reminders" and nothing cancelled anything. That is the exact fault
Round 4 existed to close. Both halves fixed, and the notifiers that could break
the promise are deployed.

Verified: two migrations replay clean from scratch, `rls_probe.sql` now **22
sections** green, 44 Jest suites / 403 tests, `tsc` clean, and inside the
archive an 11MB bundle carrying the hosted ref once with no local URL, app and
widget both at 27.

**On hosted:** both migrations applied by name via MCP; five of eight notify
functions deployed and each verified answering 401 without the secret;
`get_advisors` shows no new warning class. **2026-08-11: the last three are up
too.** `notify-partner` v14, `notify-nudge` v10, `notify-thinking` v7, deployed
after confirming `couples.paused_at` exists on hosted (migrations before
functions), each verified answering 401 to an unauthorized caller.
`notify-partner`'s 401 comes from the function itself (verify_jwt stays false),
which also proves the secret env var is readable: a missing one is a 500.

⏳ **Nothing is tested on a real phone.** Pause and leaving are the first
features here where the database changes state because TWO people agreed, and
no test suite can prove that. The two-phone pass is the whole remaining risk:
ask on one, accept on the other, withdraw, leave, and check the farewell note
appears exactly once.

**Closed 2026-08-11:** the App Review path is REMOVED ENTIRELY, not rotated
(Christian's call: he reviews with his own account). The `@review.pamwe.app`
password branch in sign-in, `scripts/seed_review_accounts.sql` and the hosted
Grace/Daniel couple (auth rows, couple, entries, prayers, verse marks) are all
gone; the leaked password now points at nothing. The only `signInWithPassword`
left is the `__DEV__`-gated dev door. Also today: App Store screenshots
captured and **de-identified** (upload set `Screenshots/appstore/`, a fictional
Caleb & Abby patched in with the app's own fonts by
`scripts/deidentify_screenshots.py`; originals gitignored, real journal text
never leaves the machine), OpenAI auto-recharge set (the spend-alert story for
the default provider; Anthropic stays parked), `secret-match-check` deleted
from the dashboard, and `20260808000007_resume_final_day_autocomplete` applied
to hosted now that both phones run b26+ (67 migrations, hosted equals local;
the backfill completed the plans that finished while the trigger was paused).

**Still open from b26:** nothing. The two-phone pass moves to the final
pre-launch checks, per Christian.

**Backlog closed out (2026-08-11, later the same day):**

- **The legacy push-token column is gone**, local and hosted. Order was
  functions first: all nine notify functions redeployed reading `push_tokens`
  alone (partner v15, nudge v11, thinking v8, new-prayer v13, new-dream v8,
  new-note v8, verse-comment v8, new-response v8, couple-request v2), every one
  verified answering 401 unauthorized after the deploy, THEN
  `20260815000001_drop_legacy_push_token` (RPCs lose their sync calls,
  `sync_legacy_push_token` dropped, `users.expo_push_token` dropped). Hosted
  verified: column 0, function 0, migration recorded. `rls_probe.sql` section
  15 rewritten to assert the legacy machinery is GONE; all 22 sections green
  locally with the column dropped.
- **ESLint backlog burned: 179 errors to 0, and lint now GATES CI.** Real
  fixes for the unused vars, the ternary-as-statement, `Array<T>` types. The
  react-hooks v6 compiler-preset rules are off with reasons written in
  eslint.config.js (reanimated shared-value writes and load-then-set effects are
  deliberate patterns, and are safe under the compiler because every one of them
  is in a handler or an effect, never during render. NOTE: this line used to say
  "no React Compiler here", which was false, the experiment is on in app.json;
  corrected 2026-08-12). `react/no-unescaped-entities`
  keeps only its typo-catching half. Tests keep the jest.mock hoisting idiom.
  The 18 exhaustive-deps warnings stay advisory on purpose. tsc clean, 402
  tests green.
- **Android is out of scope by decision, not neglect**: iOS-only until real
  user demand says otherwise. **The 7th Grove rung** waits for a couple to
  near the redwood. **Universal links** wait for a domain to exist.

---

## 🚀 BUILD 26 UPLOADED (2026-08-10)

Four audit rounds in one binary, plus the ask-pamwe client half that had been
sitting in the tree since the outage. 14 commits since b25, 54 files, ~4,400
lines. Archived from `security-round` at `7a73d3d`.

What the couple will notice: a reveal neither phone watched comes back and is
remembered on the account rather than on one handset; notifications reach every
device you sign into; a quiet bell on Today holds what your partner did while
you were away; pairing by link or QR; Scripture search; ending a plan early
without the app claiming you finished it; a lock-screen privacy switch; and an
Ask Pamwe that says it is unavailable when it is, rather than resting.

Verified before the archive, in the order that catches the most for the least
time spent:

- `tsc --noEmit` clean, 42 Jest suites / 377 tests
- `restore_ios_patches.rb --check`: every hand-made patch present, all four
  `CURRENT_PROJECT_VERSION` spots at 26
- **`export:embed` grep before the archive, not after.** One hosted project ref
  in the bundle, zero occurrences of the LAN URL. Two minutes to rule out the
  failure that has burned a build number before.
- hosted migrations match local, the single local-only file being
  `resume_final_day_autocomplete`, held back on purpose
- all eleven edge functions live at the expected versions, `ask-pamwe` at v17,
  so the server half of the 503 classification was already there to meet the
  client half shipping here
- `get_advisors`: no new warning class. `mark_reveal_seen`, `save_push_token`
  and `clear_push_token` joined the existing SECURITY DEFINER list exactly as
  the roadmap predicted; `switch_plan`, `activity_feed` and `search_verses` are
  INVOKER and do not appear.

Verified inside the archive: 11MB `main.jsbundle` carrying the hosted ref once
and no local URL, app and widget appex both `CFBundleVersion` 26, all three
purpose strings, `PrivacyInfo.xcprivacy` present.

Upload warned that eight prebuilt frameworks shipped without dSYMs (React,
hermesvm, ExpoImage, the four SDWebImage coders, ReactNativeDependencies).
Pre-existing and not ours: those are prebuilt XCFrameworks. It costs Apple-side
symbolication for native frames in those libraries only; Sentry still gets the
JavaScript, which is where our crashes live.

**Still on Christian's hands, in priority order:**

1. **Rotate the App Review password.** Oldest open item from the security round.
   `grace@review.pamwe.app` still carries the password that sits in public git
   history, and there is now a newer TestFlight build up. New value into App
   Store Connect review notes FIRST, then the `execute_sql` block in
   [`security-round-plan.md`](security-round-plan.md) step 6.
2. **Apply `20260808000007_resume_final_day_autocomplete.sql`** once both phones
   are actually running 26.
3. **Delete `secret-match-check`** from the dashboard. Still ACTIVE at v3 as an
   inert 410 stub; the MCP toolset has no delete verb.
4. **Set the spend alerts** from [`store-package.md`](store-package.md) section
   7. Two dual outages happened because nothing was watching the balance.

⏳ **Still unproven, and now testable on two phones:** a real banner from a real
trigger. The deploy verified only the refusal half (401 without the secret).

---

## ✅ ask-pamwe v17 DEPLOYED (2026-08-09)

Every mode goes through one `askJson` chain now: OpenAI first, Anthropic behind
it, next provider tried ONLY on an account failure (dead key, no credit,
exhausted quota). A timeout or a bare rate limit does not fail over, because
those clear on their own and spending a second provider's tokens turns one blip
into two bills.

**Anthropic is parked indefinitely.** With only OpenAI funded the chain simply
lands there every time, and the by-book builder, which was Anthropic-only and
therefore dark, works again. Either key alone runs the whole feature.

Also live in v17: the 503 `unavailable: true` classification from `ff86f4b`
(hosted was still on v16, which predates it) and the pinned supabase-js.

✅ **All eleven edge functions deployed (2026-08-09).** The webhook secrets were
verified equal server-side first, by a throwaway function that compared them
inside the database and returned one bit. Worth recording why: comparing the
Vault against a dashboard SCREENSHOT said "mismatch" twice, and the screenshot
was simply stale. A prefix from an image is not evidence.

Deployed: `ask-pamwe` v17, `notify-partner` v13, `notify-new-prayer` v11,
`notify-new-dream` v6, `notify-new-note` v6, `notify-verse-comment` v6,
`notify-new-response` v7, `notify-nudge` v9, `notify-thinking` v6,
`delete-account` v12.

Verified after: all six webhook targets answer **401** to a caller with no
secret (a missing env var would be 500, so this also proves the secret is
readable by the functions), and `verify_jwt` is false on exactly those six and
true on `ask-pamwe`, `notify-nudge`, `notify-thinking`, `delete-account`.

Left to do by hand: delete the retired `secret-match-check` function from the
dashboard. It is an inert 410 stub with `verify_jwt` back on, kept only because
the MCP toolset has no delete verb.

⏳ **Still unproven: a real banner on a real phone.** Nothing has triggered a
live notification since the deploy, so the authorized path (trigger sends the
header, function accepts it) is verified only by its refusal half.

---

## ⭐ AUDIT RESPONSE ROUND 4 (2026-08-09): stop confirming things that did not happen

Committed (`30ba739`), migration applied to hosted. The places where the app
said one thing and did another.

- **The answered-prayer note did not exist on Android.** `Alert.prompt` is iOS
  only, so the button was there, the confirm appeared, and the note was silently
  dropped. The answered timeline, the payoff of the whole prayer feature, could
  not be written to. One sheet now, same question on both platforms.
- **Answered was a one-way door**, on a control that sits on a swipe card. Every
  answered prayer offers "Still carrying this", which reopens it and clears the
  note rather than leaving it on an open prayer.
- **Highlighting buzzed BEFORE the write and swallowed the error.** A highlight
  that never reached the server closed the sheet, confirmed in the hand, and
  left nothing behind. The confirming buzz waits for the commit now, and a
  failure says so and reverts the reader.
- **The morning reminder had no off switch**, so the only way to stop it was to
  turn off notifications for the whole app. It has a switch, and any time rather
  than five presets.
- **A lock screen control.** These banners carry a partner's reflection, the
  words of a prayer, a dream, in front of whoever is looking at the phone. On
  "Keep it private" the title and body become "Something is waiting for you";
  the routing data is untouched so the tap still lands right. One control, not
  one per category: a setting you reason about six times is one nobody sets.

---

## 🔒 TRUNCATE was never guarded by RLS (2026-08-09, fixed on hosted)

Found while writing a probe for the new verse search. Asserting "Scripture is
read-only" means trying to write it, and the UPDATE was correctly refused, but
the grant list read `DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE,
UPDATE` for `anon` and `authenticated`, on **all 22 tables**, locally and on
hosted.

DELETE and UPDATE are row operations, so RLS governs them. **TRUNCATE is not.**
Postgres checks the table privilege and stops, so `truncate public.entries` as
`authenticated` empties every reflection every couple has written, policies and
all. Verified locally: 31,103 verses to zero in one transaction, rolled back.

Reach today is low and worth stating plainly: PostgREST has no TRUNCATE verb, so
the API cannot ask for it. What it closes is the gap between what the policies
say and what the database enforces. These three privileges come from Supabase's
own bootstrap `grant all`, not from `20260708000004`, so they land on any new
project and on every new table unless the defaults change too. Both are done.

Worth recording: the first draft of the fix ended with a tidying
`grant select, insert, update, delete on all tables`, and the probe caught it on
the very next run. A blanket grant undoes every narrowing before it, and that
line had handed back whole-table UPDATE on `users` and `entries` and the writes
on `couples` and `push_tokens`. The migration only takes away now.

---

## ⭐ AUDIT RESPONSE ROUND 3 (2026-08-09): follow the phone, find the verse, keep the recording

Committed (`6a62fbf`, `ef7b35a`), both migrations applied to hosted.

- **Auto appearance.** The system scheme was a seed read once at mount, so a
  phone going dark at sunset stayed light until relaunch, and there was no way
  to ask for that. The provider now follows the OS while Auto is chosen, and
  hands the scheme back rather than pinning one.
- **Scripture search.** A stored tsvector and GIN index over all 31,103 verses,
  with a `search_verses` function that ranks them (PostgREST cannot order by a
  computed rank). Every word must appear, so the top hit is the verse being
  reached for; a phrase remembered from another translation can be genuinely
  absent, and the empty state says so rather than reading as broken.
- **Pairing by link and QR.** `pamwe://join?invite=` plus a code the join screen
  fills in, surviving the case where the tap arrives before there is an account.
  The code stays spelled out in the message, because a custom-scheme link does
  nothing on a phone without the app. **No name preview**, deliberately: that
  lookup is the enumeration oracle the security round closed.
- **A failed voice send keeps the recording.** "Your recording is still here"
  was only true while the journal screen stayed mounted.
- **Accessibility.** Button announces busy and disabled; BottomSheet is a modal
  to VoiceOver as well as to the eye, with an escape gesture.

---

## ⭐ AUDIT RESPONSE ROUND 2 (2026-08-09): every device, the right moment, and a record

Committed (`b6bb3a8`, `a6dd6fb`) and both migrations applied to hosted. Ships
with the next build alongside Round 1.

- **A push token was a column on the account, so a person had one phone.** A
  second device overwrote the first and the first went quiet; signing out on
  either silenced both. Tokens are rows now (`push_tokens`), written only
  through `save_push_token` / `clear_push_token`. `users.expo_push_token` stays
  and is kept in step by the database, because it is what the currently
  deployed edge functions read, and it is what makes the sign-out fix work
  before they are redeployed.
- **The permission prompt fired at sign-in**, before a couple had paired or
  seen a reflection. iOS asks once, so a no there is permanent. Launch now
  registers only a device that already said yes; the ask lives on the connected
  screen, with a second door in Settings.
- **An Activity list**, reached from a quiet bell on Today that carries a dot
  and never a number. Derived at read time by one function over the five tables
  that already hold the truth, so it cannot drift. Own actions filtered out.
- The eight notify-* functions fan out over every device **in the tree**, ready
  for the deploy still waiting on the webhook-secret check.
- `@supabase/supabase-js` was floating on `@2` in ten of eleven edge imports.
  Pinned.

**Found on hosted while applying this: two real accounts held the same push
token.** One phone had been signed into both and the sign-out never released
it, so one person's partner notifications were arriving on a device someone
else now uses. `save_push_token` now releases a handset from every other
account when it is claimed, so the next launch on that phone repairs it with no
one doing anything.

---

## ⭐ AUDIT RESPONSE ROUND 1 (2026-08-09): the ritual stops losing moments

A second external audit (codex) reviewed the whole app. Every claim was checked
against the code: the correctness findings are real, several suggestions
contradict decisions already made on purpose and were rejected with reasons, and
the operational blockers it named were the ones already in this file. Roadmap and
the full triage: [`audit-response-plan.md`](audit-response-plan.md).

**Round 1 is committed (`a1ad996`, pushed) and its two migrations are applied to
hosted. It ships as build 26.** Six fixes:

1. **A reveal one partner never watched was quietly lost.** The day advances on
   either partner's Amen, which stays, but "seen" was a flag in one phone's
   AsyncStorage. `entries.reveal_seen_at` now, written only by
   `mark_reveal_seen()`, with Today offering the oldest unwatched reveal back.
   Existing days backfilled except the one a couple is standing on.
2. **Plan switching is one transaction** (`switch_plan`). It was an UPDATE then a
   separate INSERT, and a failure between them left a couple with no active plan
   and no way back, with the half-read plan vanishing from every list.
3. **Today stops dressing failures as empty states.** A failed fetch rendered the
   brand-new-couple copy; the hook now distinguishes network from missing-day and
   keeps the last good content.
4. **"End this plan"** replaces an early "Mark plan complete" that played the full
   ceremony and reported the plan's whole length as days read. Quiet now, no tree,
   and the plan stays in history reading "Read 3 of 21 days".
5. **Amen has an in-flight guard and a visible failure.** It was Sentry-only.
6. **One source for your own name**, plus a way to change it, which never existed.

Also: CI runs jest and tsc on every push (lint reports, does not gate yet),
generated database types are wired in, `rls_probe.sql` grew to 14 sections
covering the new objects and the gaps it already had, and `local_dev_seed.sh` no
longer seeds dev users into whichever Supabase container Docker listed first.

---

## 🟡 Ask Pamwe: OpenAI topped up, Anthropic PARKED (Christian, 2026-08-09: tokens are expensive)

Christian hit "Build the plan" on "Dealing with insecurities" and got **"Pamwe is
resting for a moment. Try again in a bit."** The screen is fine. The backend is
not: **both API accounts have a zero credit balance**, so every mode of Ask Pamwe
fails.

- **OpenAI** (`build`, the Plans search): `429 insufficient_quota`,
  `credit_balance_exhausted`. The key authenticates and `gpt-5.6-luna` is still
  listed on the account, so this is billing, not a key or a model change.
- **Anthropic** (`plans`, the by-book builder): `400 invalid_request_error`,
  "Your credit balance is too low to access the Anthropic API."

Confirmed in the hosted edge logs: `POST | 502 | ask-pamwe`, 2,938ms, version 14.
`luna()` throws on the non-2xx intake call, the build handler catches it, and
returns 502. Everything else in that handler returns 200 with a specific line, so
**a 502 from ask-pamwe means an exception, and an exception here means the model
call.**

**Half of it is fixed in the working tree** (not deployed, not built). The server
now classifies the thrown model error and answers **503 + `unavailable: true`**
when the provider refused the ACCOUNT rather than the request, keeping the 502
"resting" for genuine weather. The client reads the server's sentence back off
`FunctionsHttpError.context`, which it never did before: `functions.invoke()`
reports every non-2xx as an error with `data` null, so the function's own words
were always thrown away. Four tests in `build-plan-errors.test.ts`; 30 suites /
284 Jest green, tsc clean. **Ships when ask-pamwe is redeployed and build 26 goes
up.** Until then the phone still says "resting".

Deliberately unchanged: `askPamwe()` (the by-book builder) still falls back to
stock recommendations on any failure. That is a documented product decision, the
builder always offers something, and reversing it is Christian's call rather than
a side effect of this fix.

**The rest of the defect is that this is invisible.** "Resting for a moment. Try again in
a bit." describes something transient and self-healing. This is neither: it stays
broken until someone adds credits. **This is the second time it has happened** (b21:
"Hosted ask-pamwe ran v8 against an Anthropic account with no credits, so every
plan-generation request died", found only because the round happened to touch it).
Same failure, other provider, same friendly copy hiding it. Two things worth doing
beyond topping up:

1. Distinguish "the model is unreachable" from "try again", so a dead account
   reads as broken rather than busy.
2. The spend alerts in [store-package.md](store-package.md) section 7 were never
   set. An alert at 50% would have caught both of these before a couple did.

Nothing else in the app depends on either provider. The catalogue is data, plans
already built still open, and every other tab is unaffected.

---

## ⭐ B25 / SECURITY ROUND (2026-08-08): database done, binary up, two things left

An external review raised 13 findings; all 13 verified real, two worse than
reported. **Seven of the eight migrations are applied to hosted and build 25 is
uploaded to TestFlight.**

Done on hosted: the pairing RPCs, the users column grants, the entries scope and
partner-filtered streak, the response foreign keys, the webhook-secret plumbing,
the delete_account RPC, and `users.accepted_terms_at`. Verified after applying:
`notify_config()` still locked away from the API roles, the three pairing RPCs
callable by `authenticated`, and every recent webhook delivery still 200.

**Still outstanding, in priority order:**

1. **Rotate the App Review password.** Not done. `grace@review.pamwe.app` still
   carries the password that sits in the public repo, and had 8 live sessions as
   of tonight. Put the new one in App Store Connect review notes first, since a
   TestFlight build is up.
2. **Deploy the seven edge functions.** The Vault now has
   `notify_webhook_secret`, so the triggers are already sending the header and
   the currently deployed (old) functions ignore it. Before deploying the new
   ones, **confirm the dashboard secret `NOTIFY_WEBHOOK_SECRET` matches the Vault
   value** or every notification starts returning 401.
3. **`20260808000007_resume_final_day_autocomplete.sql`**, once both phones are
   on build 24 or later.

Runbook: [`security-round-plan.md`](security-round-plan.md).

---

## ⭐ B24 (UPLOADED 2026-08-08): the app answers back

Six items from Pamwe Ramblings. Backend went to hosted on the 7th, the binary on
the 8th.

**The release took seven archives, and three of them were dead on arrival.** All
three reported `** ARCHIVE SUCCEEDED **` with correct version numbers and every
purpose string. Full write-ups in trial-and-error.md; the short version:

1. A transient `ETIMEDOUT` killed the bundler, and `SENTRY_ALLOW_FAILURE=true`
   reported it as "Source maps upload failed, but continuing build". The archive
   shipped with **no main.jsbundle at all**.
2. The bundle phase calls `@expo/cli`'s build entry directly, bypassing the
   `expo` bin wrapper that sets `NODE_ENV`. Unset, `@expo/env` loads `.env`, so
   two archives baked in **the LOCAL Supabase URL and the LOCAL anon key**.
   Setting `NODE_ENV` in the shell and as an xcodebuild build setting both look
   right and both silently fail to reach the phase.
3. The fix is in the phase's own shell: set the mode AND source
   `.env.production`, since `@expo/env` never overrides a variable already in
   the environment. A missing `.env.production` is now `exit 1` rather than a
   silent fall back to local.

**`ios/` is gitignored, so that patch is not in git.** It joins the
sentry-xcode.sh splice and PrivacyInfo.xcprivacy on the redo list if `ios/` is
ever regenerated. Step 3 of the checklist, the bundle grep, is the only thing
that caught any of this.

**Both of those are now closed (2026-08-08, after the upload):**

- **The redo list is a script.** `scripts/restore_ios_patches.rb` puts back every
  hand-made patch in `ios/`: the bundle phase, the Sentry splice,
  `PrivacyInfo.xcprivacy`, both entitlements wirings, `$(CURRENT_PROJECT_VERSION)`
  and the purpose strings. Canonical copies are in git at `scripts/ios/`, so the
  phase's shell is now version-controlled for the first time. `--check` reports
  drift without touching anything, which makes it a pre-archive gate.
- **Failure 1 cannot happen silently again.** The bundle phase now asserts, after
  the Sentry wrapper returns, that a non-empty `main.jsbundle` exists, and fails
  the build when it does not. The bundle grep is still the checklist step that
  proves the bundle points at the right *project*; this only proves one exists.

- **The last day of every plan had been losing its reveal**, since the
  2026-07-14 cadence migration left its completion branch behind. The second
  submit retires the plan, `getActiveCouPlan` only returns active rows, so
  `couplePlan` went null mid-ritual and the reveal showed "That plan is
  finished" in place of the two reflections: no ceremony, no Amen, no completion
  screen, no planting. `useTodayEntry(day, pinPlan)` now pins the plan the way it
  already pinned the day. Full write-up in trial-and-error.md.
- **The ceremony was marked seen before it played.** The flag went to
  AsyncStorage when the ceremony STARTED, so anything that remounted the screen
  inside those 4.3 seconds skipped it forever. It is written on completion now,
  and the waiting screen hands over exactly once.
- **Replies are a chain.** `entry_responses.parent_id`, any depth, drawn at one
  indent past the fourth step. RLS authorises a reply against its PARENT, which
  is what lets your words sit under your own reflection when you answer hers.
  `notify-new-response` now tells whoever is being answered rather than always
  the entry's author.
- **A verse note has a discussion.** New `verse_note_responses` table and a
  screen at `bible/verse`: the note, hearts and amens on it, and comments under
  it. The note itself stays ONE shared note, so the second voice goes into the
  discussion instead of overwriting the first. Pushes via `notify-verse-comment`.
- **The reflection stopped opening on a wall of Scripture.** A slim tappable
  banner naming the reading replaces the passage card, so a day you reopen opens
  on the words you came back for.
- **A plan day opens on its passage.** `parseReference` keeps both ends of a
  range and the reader shows just those verses, with the whole chapter one tap
  away. Catalogue-built plans have carried real ranges since v9; the reader was
  throwing the range away and opening the chapter.

---

## ⭐ B22 (2026-08-02): the recap points somewhere, and the Grove

Build 22 is uploaded to App Store Connect and processing. Three rounds of work,
all on `main` (`ed0fd3e` through `1292190`; the `grove` branch fast-forwarded in,
so it is the same commit). Green at upload: 26 suites, 246 tests, tsc clean,
archive with zero errors. Three migrations and the ask-pamwe rebuild went to
hosted during round one; **rounds two and three touch no backend at all.**

Pipeline notes for next time: the bundle verification (`grep -ac
jcyhhxgomhopkoqesbkb main.jsbundle` = 1, dead ref = 0) and the app-vs-appex
`CFBundleVersion` match both passed first try. Export logged seven "Upload
Symbols Failed" warnings for prebuilt frameworks that ship without dSYMs
(ReactNativeDependencies, hermesvm, the five SDWebImage ones). They are warnings,
not errors, they do not affect the binary, and they only mean Xcode Organizer
cannot symbolicate a crash inside third-party native code we do not own.

### Round one: six things Christian hit in use

- **The recap was a receipt.** It stated facts and nothing in it was tappable.
  `recaps.ts` now returns ITEMS, so every passage, marked verse and prayer opens
  the thing it names, and the copy congratulates and points forward instead of
  counting. Two bugs went with it: "days read" counted rows, so two plans in one
  day counted twice, and a failed load span forever instead of showing an error.
- **The recap notification was a navigation trap.** A cold-start tap mounted the
  target as its stack's ONLY route, so Back fell through to the tab bar and that
  tab stayed stuck until the app restarted. `unstable_settings` anchors plus
  `withAnchor` on the three nested pushes. It also affected note and reveal pushes.
- **Verse marks carry authorship now.** A partner's initial rides inline on what
  they marked, both tables joined the realtime publication, and the note sheet
  stopped calling their note "Your note". **The note push had never once fired on
  hosted**: the trigger read a GUC hosted Postgres forbids. Fixed and verified
  end to end against the review couple.
- **Plans:** Browse became a real screen (the door did nothing but clear chips),
  build dropped the prompt preview and its round trips (7.6s live), "Save for
  later" means building no longer ends what you are reading, and finished plans
  became a list whose count finally applies `isFinished`.
- **Lock widget** says "In love N days". The old ladder dropped the words first
  and rendered a bare "126D", a number with nothing saying what it counted. Both
  the reference and the phrase fit once the header drops to 8pt.

### Round two: the Grove (branch `grove`)

The award page, designed with Claude Design and built from the handoff. **One
scrolling scene, not a list**: footprints climbing a path, a tree at every
threshold passed, the rest standing pale ahead. It supersedes the seven-row list
from `7b10954`.

- **Thresholds are 5, 10, 20, 40, 80, 100.** Christian's call, and he was right
  to push back: the first estimate against it was wrong, built on the app's
  lifetime rather than the 20 days it had actually been in use. Measured pace is
  0.75 reading days per calendar day, so the fig is ~10 weeks out and the redwood
  a four-year walk.
- **Two silent bugs the ladder change introduced, both caught before shipping.**
  Tree spacing was hardcoded for a 1,2,3,5,8,13 ladder and left the five-plan
  opening stretch as a 60 unit sliver of a 1930 unit scene, so it is now DERIVED
  from the thresholds. And the prints advanced on streak alone, so 4-of-5 plans
  looked like 0; solid prints now track plans, with the streak adding
  half-strength ground on top that can never arrive.
- **Days do not mint a second trophy**, they move you. That is how the streak
  lives here without competing with plans.
- **"Unbroken" is retired** from all streak copy, with a test to keep it out: the
  streak forgives four days, so it cannot honestly claim to be unbroken.
- Art ships as ONE alpha-only set tinted at runtime: 3.00MB to 0.58MB. The olive
  arrived with two UI glyphs baked into its corners, painted out on import.

### Round three: the planting

The arrival moment, phase two of the handoff and the emotional peak of the whole
award system. It covers the completion screen for 2,250ms: quiet, then twelve
prints land 46ms apart up the last stretch, then the tree stands out of its base,
then its name and its line. Reduce Motion gets a different timeline rather than a
flattened one, 400ms of crossfades with one haptic.

- **Nothing is stored to know a tree is new.** A count landing exactly on a
  threshold IS the planting (`justPlanted`), which is what the design asked for:
  no newly-unlocked flag, no earn dates, nothing that can go stale or fire twice.
- **A layout bug in round two's scene, found by reasoning about it rather than by
  the tests.** Each tree's wrapper held only absolutely positioned children, so
  it measured zero high and every tree's `bottom` resolved above the top of the
  walk. It had never run on a device. The wrappers now fill the scene.
- **The generic StreakTree drawing is gone**, and `awardStage` with it. It was
  the last thing in the app telling the tree story in a different visual language
  than the Grove. The completion screen carries a `GroveCard` instead, which is
  also its door into the walk.
- The completion screen's success haptic is now gated on the plan count, so the
  finish is not sounded twice a breath apart when a tree arrives.
- Composition and vertical budget were checked by rendering the panel off device
  at 390x844 and at the 375x667 floor, light and dark, with the real fonts. Same
  method the lock-screen header was tuned with.

**Still to do:** on-device validation of the planting (haptic rhythm, the 8pt
widget header through vibrancy, two-phone partner marks), then a build.

---

## ⭐ B21 (2026-08-02): plans stop being improvised

Build 21 is uploaded to App Store Connect and processing. Four commits on main
(`5b030b4`, `dde0b15`, `7395018`, plus the untracked pbxproj bump). This is the
largest round since the design handoff: it carries five app changes that had sat
unshipped since b20, and a backend rebuilt underneath them.

**The backend was broken in production before this round, and nobody could have
seen it from the app.** Hosted ask-pamwe ran v8 against an Anthropic account with
no credits, so every plan-generation request died. The fix and the feature turned
out to be the same act.

### The Bible catalogue (the round's centre)

Ask Pamwe used to invent a reading list from a prompt, so what a couple got
depended on how they phrased their sentence. You cannot hard-code a branch for
"we lost a baby" and another for "we lost a dog". So the knowledge moved out of
the prompt and into data: **31,103 verses, 3,083 passages and 1,189 chapters
tagged by what they are ABOUT**, from a closed 65-term vocabulary. Generated once
in 39 minutes for **$2.81** on gpt-5.6-luna, 1189/1189 chapters accepted, every
chapter validated on arrival for exact verse coverage.

- **Tags name subject matter, never application.** `grief` yes,
  `suffering-is-discipline` no. Nobody will audit 31,103 rows, so an
  interpretation that gets in at tag time shapes every plan built from it,
  forever, unseen. This is the catalogue's half of "points, never preaches".
- **Passage boundaries are not model output.** They are the BSB's printed section
  positions, fixed in code. Three rounds of trying to steer them with prose went
  coarse, then slavish, then confetti; every constraint enforced in code held at
  100%. That lesson is recorded in the spec header and is the reusable finding of
  this round.
- **Build v9 cannot invent a reference.** Intake maps words onto the vocabulary,
  `retrieve_passages()` picks the pool in SQL, and the arranger answers with
  indices into that pool. Structural, not instructional.
- **Cautions are the pastoral guardrail**: a flagged passage returns only when
  every flag was explicitly allowed, so a couple asking about infertility meets
  Hannah and a couple in ordinary grief never stumbles into a dead child.

### The app changes, unshipped since b20

Reveal pins its own day so a partner's Amen cannot shift it mid-read (the
concurrent-use bug), faster voice sending, finishing a plan became a moment with
the tree regrown from finished plans rather than the streak, Plans rebuilt around
search with sharing and no floating bubble, and readings as long as the passage
actually is.

Gate: tsc clean, **25 suites / 207 Jest**. Hosted verified before the archive
(row counts matching local, retrieval returning the same passages, a live build
request answering). Archive verified before upload: hosted ref present, dead ref
absent, no LAN URL, app and widget `CFBundleVersion` both 21, purpose strings
present.

**Still on Christian:** the Plans search to build flow on device, described in
his own words rather than a theme word; the finished-plan flow across both
phones; everything b19/b20 left open on the Lock Screen widget.

**Known soft spot, deliberately not fixed:** caution recall measured 6/4/5/4 of 6
across sample runs with no relation to prompt wording, so it is run-to-run
variance on borderline calls rather than a bug to word away. The fix, if it
bites, is a caution-only sweep over the finished catalogue (~$0.40, no re-run).

**Also true and worth saying:** the catalogue is one model's reading. Good enough
to build on, not a finished pastoral instrument. Real use will find its wrong
tags faster than more sampling would.

---

## B20 (2026-07-31): the anniversary picker gets a screen

Build 20 is on App Store Connect, VALID. One commit on main (`380cd6f`). No DB
change, no native change: b19 already carried the column, the RPC and the picker
pod, so this is JS only.

- **The anniversary setting was unusable in b19.** Opening it showed the date
  wheel cut roughly in half with Save entirely below the screen edge. Shipped
  blind in b19 and found on device.
- **It is now its own screen** (`you/anniversary.tsx`) instead of a bottom sheet.
  The picker sits in a flex child that centres it with Save pinned outside that
  child, so the picker's late self-measurement can only re-centre the wheel and
  can never push Save away. Cause and reasoning in `trial-and-error.md`.
- **Copy says what the setting is for.** "The date you got together. It sets the
  days together count here and on your Lock Screen", and the row prompts with
  "Set the date you got together" rather than "Counting from the day you paired",
  which described the fallback rather than the thing being asked for.
- Also stopped rebuilding `maximumDate` every render, which re-set the picker's
  bounds natively on each turn of the wheel.

Gate: tsc clean, **24 suites / 183 Jest** (unchanged). Archive verified before
upload: hosted project ref present and dead-project ref absent in the bundle, app
and widget `CFBundleVersion` both 20, all three purpose strings present, new copy
in the bundle and the old sheet copy gone.

**Still on Christian:** everything b19 left open (the Lock Screen widget on a real
wallpaper, both toggle states, tap target), plus confirming the anniversary screen
saves and that the day count matches the widget.

**Known gap, deliberately not built:** there is no way to clear an anniversary
once set. `setAnniversary(null)` and the RPC both accept it; only the UI is
missing.

**Loose end in the working tree:** a set of macOS `" 2"` duplicate files
(assets, design handoff, four in `ios/VerseWidget/`, two test files, and one
migration). All untracked and byte-identical to their originals, so they are
excluded from builds: `add_widget_target.rb` uses explicit file lists rather than
a glob, and there is no `assetBundlePatterns` in app.json. They do affect Jest,
which globs `__tests__`, so a plain `npx jest` reports 26 suites / 200 tests
instead of 24 / 183. Left in place pending Christian's call.

---

## ⭐ B19 (2026-07-31): reveal ceremony, Lock Screen widget, and a Debug build that could not link

Build 19 is on App Store Connect, VALID. Hosted DB is in sync (one migration,
`couples_anniversary`). Everything below is on main as four commits.

- **Reveal rebuilt as a four-act ceremony** from a new design handoff. Two orbs
  cross in from beyond both edges, meet at centre with a glow and two rings, the
  rose opens and grows vines and sprigs, then "Amen" alone and 240ms of silence.
  4260ms, nine haptic marks that quicken into the meeting, a tap skips at any
  point, and Reduce Motion has its own 1960ms crossfade variant. The cards now
  unfurl *under* the fading veil, which the old structure could not express.
- **Lock Screen widget** (`.accessoryRectangular`), a second widget in the
  existing appex. Same curated daily verse, a "N days together" counter, a
  "Clear background" toggle, and a tap that opens the verse in the reader.
- **Couples now have an anniversary.** Nullable `couples.anniversary`, set in
  You → Couple, written through a SECURITY DEFINER RPC rather than a policy.
  Falls back to `paired_at` everywhere until set, and the You tab and the widget
  read one shared rule so they cannot disagree.
- **Prayer reminders retire on prayer** rather than pausing for a week, and the
  pre-b14/b17 notification leftovers are cleaned up (the duplicate morning banner
  and the nag that could not be killed). Morning reminder now greets by first name.
- **The b17 tab cross-fade is gone**, replaced by a native splash fade. It sat on
  an upstream race that could leave a revisited tab fully transparent.
- **Debug builds could not link, and now can.** Every third-party Fabric pod was
  losing `facebook::react::Sealable` because React Native's prebuilt-artifact swap
  scripts were installing the *release* artifacts into Debug builds. Release
  archives were never affected, which is why it looked like a broken tree from a
  dev build and a healthy one from an archive. Fix + how to confirm it in
  `trial-and-error.md`.

Gate: tsc clean, **24 suites / 183 Jest** (17 new).

**Still on Christian:** add the widget to the Lock Screen and check both toggle
states over a busy photo and a portrait, and confirm the tap lands on the right
chapter. The shipping art is still the handoff's prototype stand-ins.

---

## ⭐ B17 (2026-07-26): eight rounds since b16

Everything below shipped in b17. Nothing here reached a device before it.

- **Chapter-keyed reflection prompts.** 444 prompts, one per chapter, grounded in
  that chapter's own text. Curated plans backfilled to 100% unique per-day
  (M'Cheyne 365/365 from 30, John 21/21 from 7). planBuilder reads the library
  for new custom plans, falling back to the old rotation for uncovered chapters.
  The live Daniel plan is untouched by choice.
- **Reply notifications + keyboard fix.** notify-new-response (replies only,
  never hearts/amens); KeyboardAvoidingView on both screens that host the reply
  box, so the keyboard stops covering what you type.
- **Prayer reminders reworked.** Praying for something ends the daily asking for
  the week; a Sunday 6pm review replaces the nagging. Dated one-shots under a
  budget, because iOS silently drops past 64 pending local notifications.
- **Weekly recap actually sends** (was a mock banner captioned "Sent to you both").
- **Reveal ceremony**: your two initials meet, divider draws, "Amen", then the
  reflections unfurl. Once per day, tap to skip.
- **Reflections paged** 12 at a time. **Branded loading** (wordmark, not a
  spinner) and a 220ms tab cross-fade. **Heart moved inline** beside the CTA.
- **Sentry PAMWE-IOS-4 fixed**: the draft insert race that showed a raw Postgres
  constraint to the reader on Share.

---

## ⭐⭐⭐⭐⭐⭐⭐⭐⭐ B16 ROUND (2026-07-25): Sentry race, heart placement, paging, real recaps

Gate: tsc clean, **20 suites / 143 Jest**.

**Sentry PAMWE-IOS-4 fixed** (the one real issue on the board, 2026-07-18, b14).
Title was useless ("Object captured as exception") because the code passed a raw
Postgrest object to Sentry; the serialized context held the truth: `23505
duplicate key value violates unique constraint
entries_couple_plan_id_day_number_user_id_key`. Both the autosave interval and
the Share button call `createOrUpdateDraft`, so on a day's FIRST draft, tapping
Share during an in-flight autosave had both read "no row yet" and both insert.
The loser surfaced raw Postgres text to the reader as "Couldn't send it", and
`landedAnyway()` could not rescue it because nothing was submitted yet. Both
draft paths now re-read on 23505 and take the update path; a sealed row is still
returned untouched. 5 new tests.

**Thinking-of-you heart moved inline.** Floating it bottom-left was wrong for
Today: the primary action is a full-width bottom button on a scrolling page, so
the bubble sat on "Read Day N" partway through any scroll. (Ask Pamwe gets away
with a bubble precisely because it is absent from these screens.) Now a 56pt
button in a row with the CTA.

**Reflections paged**, 12 per page, newest first, Newer/Older + "Page X of Y".
Client-side on purpose: `getRevealedReflections` groups entries into mutual
pairs in JS, so a server-side `range()` would cut pairs in half.

**Weekly recap actually sends now.** It never had: the "Your week together is
ready" banner was a decorative `NotificationPreview` mock rendered INSIDE the
recaps screen under the caption "Sent to you both", with no notify-recap
function, no cron (pg_cron is not enabled), and the token WEEKLY appearing
nowhere in the repo. This file recorded it at the time as "delivery still
APNs-blocked, mock only"; APNs went live 2026-07-11 and it was never picked back
up. Now a local WEEKLY trigger (Sunday 9am, device timezone, no cron and no
service-role port of the aggregation), scheduled only once the couple has read a
day. New `notification_recap` pref + Settings toggle + `recap` push route. The
mock banner now shows only for the week period, since month and quarter still
are not sent.

**Known dead code:** `notify-freeze` is deployed but ORPHANED. Its header claims
the streak trigger fires it, but `update_streak_on_mutual_submit()` contains no
freeze logic and no `net.http_post`. Nothing can call it. Either wire up the
freeze feature or delete the function; do not use it as a reference template
(use notify-new-prayer).

---

## ⭐⭐⭐⭐⭐⭐⭐⭐ B15 ROUND (2026-07-25): Dreams, thinking-of-you, launch + tree fixes

Gate: tsc clean, **19 suites / 138 Jest**. All hosted work applied and verified.

**Dreams** (new `dreams` table, Prayers tab → Dreams toggle). Couple-shared
journal: write a dream, read your partner's, carry it into a prayer.
**Pamwe never interprets a dream** (see the CLAUDE.md rule); Ask Pamwe is
deliberately not wired in. RLS written in the post-hardening shape from the
start and **verified against a live user token**: cross-couple insert 403,
author spoofing 403, own-couple insert 201, SELECT scoped to the caller.
`delete-account` also clears dreams, without which an account deletion would
fail on the FK once anyone had written one (App Store 5.1.1(v)).

**Dream push**: `notify-new-dream` on INSERT + its own `notification_dream`
pref (the existing toggles are worded too narrowly to fold dreams into).
No preview in the banner: a dream can be private in a way a prayer point is not.
Whole chain verified end to end via `net._http_response`.

**Thinking of you**: heart bubble bottom-left on Today, `notify-thinking`,
30-minute cooldown sharing `partner_nudges` under `kind='thinking'` so it and
the read-nudge never silence each other.

**Launch fix** (Christian: "it shows a spinner for a second or two, sometimes
flashes Get started"). Two independent causes, both fixed:
1. `SplashScreen.hideAsync()` was keyed on **fonts alone**, dropping the branded
   splash a token-refresh plus 2-3 queries before the gate had decided anything.
   The gate now hides it when it has actually landed, with a 3s floor in the root
   layout so a hung query can never strand anyone on the splash. The fallback
   wears the Pamwe wordmark, not a bare spinner.
2. auth-js emits `INITIAL_SESSION` with a **NULL session whenever restore
   errors** (a slow radio on cold start suffices). AuthProvider took it at face
   value, wiping a good session so the gate routed to welcome before the retry
   landed. That null is now ignored when a session is already known, and `user`
   is derived from `session` instead of racing it as a second state.

**Tree fix** (Christian: "it's not growing day by day"). It was wired to
`streak_count`, which resets to 1 on any missed day, so a couple 7 sessions deep
still read "Planted". Now driven by **days read**, which only ever goes up, and
the stem eases between stage heights so every day moves it instead of only the
5 threshold days. Stage boundaries still land on exactly the old heights.

**Still open:** screenshots for the store package.

---

## ⭐⭐⭐⭐⭐⭐⭐ HOSTED RECONCILE (2026-07-25): 5 migrations applied, timeline reset, b15 armed

Christian reported stale notifications piling up and "we're 2 days behind" on the
real couple's plan. Both traced to real causes, both fixed. Gate: tsc clean,
**18 suites / 126 Jest**.

**Root cause: hosted was 5 migrations behind the repo**, so the shipped b14 client
and the database disagreed. Worst of it: hosted still had the OLD
`advance_plan_day_if_mutual_submit`, which bumped `current_day` the instant both
partners submitted, **skipping the reveal** (the exact bug `20260714000002` was
written to kill). That is what "out of sync" actually was.

**Applied to hosted** (`jcyhhxgomhopkoqesbkb`, via MCP, verified after each):
`20260714000002` advance-on-Amen · `20260714000003` plan_cadence (the
`cadence_days` column was missing entirely, so `setPlanCadence` would have
errored) · `20260716000001/2/3`.

**Data fix:** the couple's `start_date` re-anchored `2026-07-13 → 2026-07-18` so
today lands exactly on `current_day` 8. No readings skipped, no entries touched.
The streak of 1 was **already correct** (genuine gaps: nothing sealed Jul 16, 17,
20), so nothing was restored, it was not a midnight-straddle victim.

**Code (ships with b15):** delivered push banners now clear on launch and on every
foreground (`clearDeliveredNotifications` in `src/lib/notifications.ts`, called
from AuthProvider). iOS keeps delivered notifications in Notification Center until
dismissed, so days-old partner/prayer pushes greeted the user every unlock. Only
DELIVERED notifications are cleared; scheduled reminders are untouched (never
swap this for a cancel-all, see the cadence rule in CLAUDE.md).

**Migration bookkeeping (non-obvious):** hosted records migrations by NAME with
regenerated version timestamps, not the repo file prefixes (true since the
2026-07-09 setup). Always apply via the supabase MCP; `supabase db push` would
mismatch versions and choke on the non-idempotent `CREATE POLICY` migrations.

**Edge functions redeployed** (all 4 now carry the `_shared/push.ts` dead-token
cleanup, which had never been deployed): notify-partner v7, notify-new-prayer v6,
notify-freeze v7, notify-nudge v3. **`verify_jwt` preserved exactly** (false for the
three webhook targets, true for the user-invoked nudge). Deploy layout matters: the
functions are uploaded with the repo's directory shape (`notify-x/index.ts` +
`_shared/push.ts`, entrypoint `notify-x/index.ts`) so the `../_shared/push.ts`
relative import resolves. A flat upload would break it at boot, not at deploy.
All four smoke-tested live: each returns its safe early-return without sending push.

**Review accounts seeded.** Grace + Daniel on Gospel of John day 3, day 3 has only
Daniel's entry so the reviewer's own submit fires the reveal. 5 entries, 3 prayers,
1 highlight, 1 note. **Password sign-in verified end to end** against the live auth
endpoint (real access token returned), so the `@review.pamwe.app` path works.

**Still open:** archive + upload b15. `CURRENT_PROJECT_VERSION` already bumped to
**15** in all 4 spots. Screenshots remain the last store-package gap.

---

## ⭐⭐⭐⭐⭐⭐ LAUNCH-PREP ROUND (2026-07-16): store package + P2 sweep, code-complete

Section C of launch-checklist.md plus the E-list P2s, in one pass. Gate: tsc
clean, **18 suites / 126 Jest**. Nothing deployed to hosted yet (MCP unauthorized
this session); everything hosted-bound is staged and listed below.

**Live now:**
- **Privacy + support + terms pages** on GitHub Pages (public repo
  `ChristianMangwanda/pamwe-site`, styled to the app palette, light + dark):
  https://christianmangwanda.github.io/pamwe-site/ (+`privacy.html`, `terms.html`).
- **[`store-package.md`](store-package.md)** — full ASC submission kit: description/
  promo/keywords in the copy voice, nutrition-label table, age-rating answers,
  6-shot 6.9" screenshot list, App Review notes, Anthropic spend-alert steps.

**Code (committed to the app, ships with b15):**
- **Reviewer sign-in path**: `@review.pamwe.app` emails get a password field on
  sign-in (production, not `__DEV__`); demo couple Grace + Daniel seeded by
  `scripts/seed_review_accounts.sql` (John day 3, reveal armed, password in
  store-package.md). +2 sign-in tests.
- **#18** expired invite code auto-regenerates on the invite screen
  (`regenerateInviteCode` + migration `20260716000001` policy: partner A may
  refresh an unpaired couple's code; RLS previously made this impossible).
- **#23** custom-plan passages persist on first fetch (`savePlanDayPassage`,
  fire-and-forget from reading + reflect detail; migration `20260716000002`
  adds the plan_days UPDATE policy, NULL-guard keeps curated text untouchable).
- **#25** streak now dates a session by the FIRST partner's submit (migration
  `20260716000003`), so a reveal straddling midnight no longer resets a daily
  streak. Product call for Christian to bless; cadence windows unchanged.
- **#30** AudioPlayer re-signs the voice URL on play after 50 min (1h TTL).
- **#45** waiting.tsx / PamweWordmark / TwineDivider now theme via `useTheme()`
  (light values identical, dark finally correct).
- **Dead-token cleanup**: new `_shared/push.ts` used by all four notify-*
  functions; a DeviceNotRegistered ticket nulls that user's push token.

**Hosted queue (in order, when MCP is back + Ammy confirms b14):**
1. ✅ **APPLIED 2026-07-25** `20260714000002` + `20260714000003` (Christian confirmed both phones on b14)
2. ✅ **APPLIED 2026-07-25** `20260716000001/2/3`
3. ✅ **DEPLOYED 2026-07-25** notify-partner v7, notify-new-prayer v6, notify-freeze v7, notify-nudge v3
4. ✅ **SEEDED 2026-07-25** `scripts/seed_review_accounts.sql` (sign-in verified live)

---

## ⭐⭐⭐⭐⭐ HOME-SCREEN WIDGET (2026-07-12): "Verse of the Day" built + compiling

Design handed off as `widgets/Verse of the Day Widget.html` + light/dark tree PNGs.
Built as a native **WidgetKit + SwiftUI** app-extension `VerseWidget` (own session,
matching the mock in all 3 sizes × light/dark). Decisions with Christian: a
**self-contained curated daily verse** (bundles a curated set of uplifting,
standalone verses, picks by calendar day-of-year, rolls at midnight; no App Group,
no native bridge, zero JS changes) and **I spliced the target in code** via the xcodeproj gem inside
Homebrew CocoaPods (no `expo prebuild`). Full record: [`widget-plan.md`](widget-plan.md).
All in [ios/VerseWidget/](ios/VerseWidget/) (now git-tracked); target reproducible via
`scripts/add_widget_target.rb`, data via `scripts/gen_widget_verses.py`.
**Verified headless**: view rendered off device to PNGs (matches the mock),
widget target compiles + links for the simulator, the built `.appex` carries the
fonts + the curated verses + tree, and it survives `pod install` untouched. **Remaining for
Christian**: open Xcode once to confirm VerseWidget signing (team 5LX4YFCXPK, auto;
no capability toggles needed), then a device build to drop it on the home screen.
Release note: the version bump is now **4 spots** (see CLAUDE.md) so the appex
CFBundleVersion matches the app.

---

## ⭐⭐⭐⭐ COPY PASS ROUND (2026-07-12): b12 UPLOADED, Sentry board cleared

The three b7 Sentry crashes (PAMWE-IOS-1/2/3, all the PATCH-storm) resolved;
sweep found zero other issues, zero events b8-b11. Then the whole-app
copywriting pass: voice derived from Christian's own Notion writing into
[`copy-voice.md`](copy-voice.md) (approved: "I like this voice"), 119 of ~800
strings rewritten (plan + inventory + go-live log: [`copy-pass-plan.md`](copy-pass-plan.md)).
Committed 837f28b, pushed. Hosted deployed same day: ask-pamwe v8,
notify-partner v5, notify-freeze v6, plan_metadata.sql applied (hosted + local).
**b12 (copy-only build) archived + uploaded ~13:00 PT**; new copy verified in
the bundle before upload (hosted refs 1, new welcome H1 present, old lines gone).
Open: b12 on-device pass with Ammy (doubles as the b11 feature pass), privacy-page
Anthropic wording (Christian to phrase), widget (own session).

---

## ⭐⭐⭐ ROUND 5 "COMPLETE THE LOOPS" (2026-07-11): b10 SHIPPED to TestFlight

Same-day follow-up to round 4 after Christian tested b9 ("everything looks okay"
except the FAB blending in). Plan + full log: [`build10-plan.md`](build10-plan.md).
All committed + pushed (GitHub current), 96/96 Jest, hosted fully migrated,
**shipped as b11 ~11:15 PT** (b10 burned by a missing photo-library purpose string). In it: the Ask Pamwe bubble redesign (real material +
halo + guaranteed clearance), realtime reflection responses (+ fixed the b9
stale-initial display bug), "Keep a line" + the Their Words keepsake screen,
"From your story" resurfacing on Reflect, streak milestones (7/30/100) + the
restored plan-completion celebration, **on-device voice transcription**
(expo-speech-recognition; transcripts feed snippets/search/keep-a-line), and
**real push complete end to end** (eas projectId + entitlements + APNs key on
Expo; all four notify functions can finally deliver banners). b10 on-device test
list + the accidental-prebuild lesson are in build10-plan.md. Remaining loose
ends: b10 on-device pass with Ammy, "resolve the three Sentry issues" (still
open since b7), widget (own session), finish the copy pass another day.

---

## ⭐⭐ ROUND 4 FEATURE BUILDOUT (2026-07-11, overnight): 12 features shipped to main

After round 3 (b8) verified, Christian asked to build the whole green-list + 10 new
feature ideas + the Ask Pamwe rework, daily-improvement cadence. Overnight run
(plan + log: [`round4-plan.md`](round4-plan.md)), all committed to main, tsc clean +
84/84 Jest after each, nothing pushed to GitHub yet:

- **Ask Pamwe, quietly present** (7c7c481): reworked from builder-only to a quiet
  helper. Server v7 (uncommitted-deployed) adds a "help" mode + an off_topic gate + a
  hardened prompt that POINTS, never interprets Scripture, + a per-user rate limit.
  Floral FAB on every non-ritual tab, inline card on Plans, ephemeral answer sheet.
- **Respond to a partner's reflection** (45ba4d6): hearts/amens/replies/saved-lines on
  reveal + reflect history. New entry_responses table, RLS 4-way tested.
- **Faithfulness timeline** (085b001) · **per-prayer reminders** (81ee2fd) ·
  **catch-up nudge on Today** (34e11be) · **nudge your partner** (49191ad) ·
  **shared-layer search** (46287ee) · **offline-first reading** (20f184f) ·
  **6 translations + picker** (d2b9311) · **per-plan palettes** (2f3ff4a) ·
  **tree-growth streak** (7f6930d) · **partial copy pass** (a0f4ab1).
- **Deferred (native, need device):** voice transcription and the home-screen widget,
  with implementation notes in round4-plan.md.

**Morning checklist is in round4-plan.md**: apply 3 migrations to hosted, deploy
ask-pamwe v7 + notify-nudge, resolve the 3 b7 Sentry issues, cut b9, taste-review the
visual features. Migrations + functions are LOCAL-verified only; hosted apply + deploy
need Christian's word (same permission gate as before).

---

## ⭐ Where we are now (2026-07-10): LIVE ON TESTFLIGHT, couples beta running

**Apple Developer approved; App Store Connect record created; builds ship from the terminal** (xcodebuild archive → exportArchive upload; see trial-and-error.md "TestFlight beta round"). **Christian + Ammy are internal testers, paired as a real couple** (couple `955b0f3d…`) on the hosted project `jcyhhxgomhopkoqesbkb`. Sentry crash reporting live (DSN in `.env.production`/eas.json). `ANTHROPIC_API_KEY` set on hosted 2026-07-10 (old exposed key revoked) — Ask Pamwe live pending in-app verification.

**Builds 1–7 (all 2026-07-10):**
1. **b1** — first upload: real app icon (floral P), `.env.production` (hosted Supabase baked into Release builds).
2. **b2** — magic-link modal auto-dismiss; name-screen hang fixed (getSession + finally + loud zero-row update); onboarding libs on getSession; ALL em dashes removed from developer-authored copy (app + hosted DB + edge functions; scripture untouched); `CFBundleVersion` → `$(CURRENT_PROJECT_VERSION)`.
3. **b3** — OAuth navigation fix: every sign-in success routes through the gate (Apple sign-in worked server-side but the UI never left the screen). New `sign-in.test.tsx` (7 scenarios). Dashboard side: Google/Apple providers enabled; Google needs **Skip nonce checks** ON (library can't pass the nonce).
4. **b4** — all remaining `getUser()` → `getSession()` across src/lib (was hammering /user ~7 req/s).
5. **b5** — **CoupleProvider staleness fix** (the root cause of the first beta's dead ends): realtime on couples/couple_plans + refresh() at invite/join/plan-select transitions; prayers spinner fix; join requires 6-char codes.
6. **b6** — Sentry enabled (crashes now self-report; recaps crash still undiagnosed, awaiting first report).
7. **b7** — Round 2 perf/UI: session caches + AsyncStorage stale-while-revalidate for the Plans grid; plan detail renders header before the 365-row schedule; schedule window centers on current day (fixes debug-tour #35); plan-detail CTA clears the tab bar; tab bar reproportioned (28px insets, 60px tall, radius 30) per Christian's screenshots.

**Feedback loop:** Christian logs beta findings in the Notion page **"Pamwe Ramblings"** (readable via the Notion MCP connector); triage → fix in batches → one build per round. Round-1/2 items all shipped.

**✅ ROUND 3 DONE: [`build8-plan.md`](build8-plan.md)** — b8 shipped to TestFlight 2026-07-10 and **verified live the same evening** (Christian: "major improvement, feels faster"; committed to main as 1c87587). The headline bug was an infinite push-token loop PATCHing /users at ~200 req/s; hosted API logs on b8 show exactly 2 launch-time PATCHes and zero errors, and Sentry has ZERO b8 events. All three b7 crashes (PAMWE-IOS-1/2/3 in org `zakia-12`, checked via the `sentry` CLI, not the MCP) were the same PATCH-storm memory exhaustion; they await a one-click resolve. ask-pamwe v6 (trimmed) live: first call 6.1s vs 7.1-12.8s on v5. Watch on b8: the never-captured b6 recaps crash; Ammy's phone still on b7 until she updates. Leftover triage from the round:
- **Verify on b7:** Ask Pamwe live answers; prayers realtime between both phones; tab bar feel; production push banner (checklist A6).
- **Watch Sentry** for the recaps crash + general crash reports.
- **Green list (Christian to rank):** nudge/poke partner push; more Bible translations (bible-api has ASV/YLT/Darby+); plan artwork (design call — striped banners are the current design); tree-growth streak (post-launch); whole-app copywriting pass ("sounds like AI"); Ask Pamwe discoverability in the Plans tab.
- **Standing rules:** NO em dashes in any user-facing copy (memory + ask-pamwe prompt enforce it); build numbers bump via `CURRENT_PROJECT_VERSION` only.
- **Wide-launch items still open:** Supabase Pro upgrade + custom SMTP; Ask Pamwe rate limit; App Store Connect metadata/screenshots/privacy URLs; App Review demo-account strategy (see launch-checklist.md).

---

## Previous status (2026-07-09, pre-TestFlight)

**The design-handoff rebuild is CODE-COMPLETE — all 12 phases (0–11).** The app is the full 6-tab experience: Today · Bible · Plans · Prayers · Reflect · You, with light/dark theming, verse highlights/notes, a Plans catalog + custom-plan **builder with a live Claude-powered "Ask Pamwe"**, a Reflections history, and a You tab with recaps. `npx tsc --noEmit` clean; **59/59 Jest pass** across 7 suites. Feature work is done.

**What's left is all external / non-code:**
1. **Apple Developer Program — enrollment SUBMITTED 2026-07-09, awaiting Apple approval.** (Christian subscribed; will revisit on approval.) Unblocks: real APNs push banners, Sign In with Apple, TestFlight/App Store. Post-approval steps are staged in the "Apple Developer — post-approval checklist" below.
2. **On-device validation pass** on a physical iPhone (dark-mode visual, prayer swipe feel, voice record/upload/playback, two-device realtime, Ask Pamwe latency) — the whole app is verified in code + via DB/RLS tests, never run end-to-end on device.
3. **Rotate the `ANTHROPIC_API_KEY`** (it was pasted in chat 2026-07-08) and keep it in `supabase/functions/.env` (local) / `supabase secrets` (hosted).
4. **At launch:** apply the local-only migrations + plan seeds (Psalms/Cord/John + `plan_metadata.sql` + `20260708000005_prayers_author_delete.sql`) to the hosted project via MCP; re-enable the stripped iOS entitlements.

### Apple Developer — post-approval checklist (do when Apple approves)

1. `eas init` (interactive — needs Christian's Expo login) → stamps the EAS `projectId` into `app.json`, which also un-skips push-token registration in `src/lib/notifications.ts`.
2. Register the App ID `com.christianmangwanda.pamwe` with **Push Notifications** + **Sign In with Apple** capabilities; create an **APNs Auth Key (.p8)** → upload to Expo (`eas credentials`).
3. Re-enable entitlements (currently empty `<dict></dict>` in `ios/Pamwe/Pamwe.entitlements`): add `com.apple.developer.applesignin` + set `usesAppleSignIn`/push in `app.json`. The Apple-sign-in code already exists in `(auth)/sign-in.tsx`; all 4 push webhook functions already fire (just no banner today).
4. `eas build -p ios --profile development` → verify real push + Apple sign-in on device.
5. Real Pamwe app icon (still the Expo template default) before TestFlight; `eas build --profile production` → `eas submit`.

---

## Design-handoff rebuild (started 2026-07-08, code-complete 2026-07-09)

A finished high-fidelity design arrived in `design_handoff_pamwe/` (interactive prototype + tokens/motion spec). The app is being rebuilt to it phase-by-phase per the approved plan at `~/.claude/plans/let-us-create-a-ethereal-fairy.md` — data layer survives, view layer replaced, plus new features (6 tabs, dark mode, verse highlights/notes, Plans catalog + builder with Ask Pamwe AI, Reflections tab, You tab + recaps).

### Rebuild Phase 0 — Foundations: CODE-COMPLETE (2026-07-08)

- **Theme system:** `src/theme/tokens.ts` (light + dark palettes, design token names verbatim, swatches, GUTTER=26) + `src/providers/ThemeProvider.tsx` (`useTheme()`, AsyncStorage `pamwe:theme`, `Appearance.setColorScheme` sync). Context default = light tokens so unwrapped test renders keep working. Legacy `constants/colors.ts` frozen for un-migrated screens; deleted in rebuild Phase 11.
- **Typography:** Fraunces 500/500-italic/600 now loaded; design variants appended to `typeScale` (eyebrow/h1/h2/reader/cta/chip). Existing keys untouched (tests assert them).
- **Motion/haptics:** `src/lib/motion.ts` (fadeUp/overlayIn/sheetUp/popIn/unseal, exact prototype timings, `ReduceMotion.System`) + `src/lib/haptics.ts` (tap/light/medium/success/celebrate mapping the prototype's vibrate patterns).
- **Glass shell:** `ui/Glass.tsx` (GlassView on iOS 26+ via expo-glass-effect, BlurView + glass tint fallback), `GlassTabBar.tsx` (`useGlassTabOptions()` — floating radius-28 bar, press scale .88 + tap haptic, Phosphor fill/regular). Note: bottom-tabs types deep-import from `expo-router/build/react-navigation/bottom-tabs` (expo-router 56 vendors react-navigation; no public subpath).
- **New primitives:** `ui/Screen.tsx` (safe-area + 26px gutter + fadeUp + 118px bottom padding for the floating bar), `ui/SectionEyebrow.tsx`, `ui/Floral.tsx` (handoff PNGs copied to `assets/images/`, dark-mode tintColor). `ui/Text.tsx` now themes via `useTheme()`.
- **6-tab shell:** Today · Bible · Plans · Prayers · Reflect · You (Phosphor: SunHorizon/BookOpen/Books/HandsPraying/Feather/UserCircle). Plans/Reflect/You are styled stubs. Deleted the stale `(tabs)/prayers.tsx` route-collision stub. Settings/privacy/terms/delete-account moved from the Today stack to `(tabs)/you/` (links updated).
- **Fixes:** `getExpoPushTokenAsync` now reads the EAS projectId from Constants (skips with a warning if absent — was `projectId: undefined`); `GestureHandlerRootView` at root (for Phase 8 swipe); `app.json` `userInterfaceStyle` → `automatic`.
- **Native rebuild done:** expo-blur + expo-clipboard + phosphor-react-native installed; expo-modules-jsi patch re-applied cleanly; pods installed; **BUILD SUCCEEDED** to Christian's iPhone (iOS 27) and app installed via devicectl.
- **Gate:** `npx tsc --noEmit` clean repo-wide; 39/39 Jest tests pass.
- ⏳ **On-device smoke pending (Christian):** boot with Metro (`npx expo start --dev-client`), sign in, glass bar renders over scrolled content, tab haptics fire, core loop works, all 6 tabs reachable, Settings works under You.

### Backend moved to LOCAL Supabase for dev/testing (2026-07-08)

The hosted project `freftpwigrkjytusnqhx` hit its free-tier limit / paused. Decision (Christian): **run Supabase locally for testing, pay to host at launch.** Same stack, same code — only `.env` points elsewhere. This also unblocks magic-link testing (local emails land in Mailpit) and gives an always-available backend with no usage caps.

**Local stack is up and fully verified.** Docker + Supabase CLI (`brew`). `supabase start` runs Postgres/Auth/Realtime/Storage/Edge-runtime/Studio locally.

- **`.env` now points at local:** `EXPO_PUBLIC_SUPABASE_URL=http://10.0.0.205:54321` (the Mac's LAN IP so the physical iPhone reaches it over Wi-Fi; the dev client's `NSAllowsLocalNetworking` already permits cleartext to private IPs, so **no rebuild needed**). Local anon key set. **The hosted config is backed up in `env.hosted.backup`** (gitignored) — copy it back to return to hosted.
  - ⚠️ The URL is tied to the Mac's current LAN IP. If it changes (different Wi-Fi / new DHCP lease), update `EXPO_PUBLIC_SUPABASE_URL`. For the **simulator**, use `http://127.0.0.1:54321` instead.
- **Schema debt fixed — local migrations are now a complete, checked-in mirror of what prod had.** New migrations:
  - `20260607000000_local_remote_state_parity.sql` — reconstructs the remote-only changes: `couples.timezone`, `prayers.notify_partner`; SECURITY DEFINER helpers `current_user_couple_id` / `has_user_submitted_entry` / `can_view_partner_audio` + the **non-recursive** `users_select_partner` and `entries_select_partner_after_mutual_submit` policies (fixes the documented RLS recursion); `advance_plan_day_trigger` + `update_streak_on_mutual_submit_trigger`; the `voice-entries` storage bucket + 5 locked-reveal storage policies; realtime publication (entries/prayers/prayer_marks/couples/couple_plans); a locally-safe `notify_on_entry_submit` (no-op when `app.settings.*` GUCs are unset, so submission never depends on push wiring). **Streak logic is simplified locally** (increment/no-op/reset; no 30-day freeze bridging — a prod-only edge case). notify-new-prayer/notify-freeze webhooks omitted locally (push only).
  - `20260708000001_verse_marks.sql` — `verse_highlights` + `verse_notes` (per-couple shared study layer, recursion-safe RLS, indexes).
  - `20260708000002_prayers_category.sql` — `prayers.category` (family/health/work/guidance/thanks/other).
  - `20260708000003_plans_browse_metadata_and_custom_plans.sql` — plans browse/detail columns (tagline/about/explore/gain/labels/couple_id), `plan_days.passage_text` nullable, curated-public/custom-private RLS. **Curated-plan copy is content**, applied in `supabase/seeds/plan_metadata.sql` (runs after seed.sql; migrations run before seeds locally, so metadata can't live in the migration). On hosted, run that seed file's UPDATEs once via MCP.
  - `20260708000004_api_role_grants.sql` — explicit table grants for anon/authenticated (hosted gets these via default privileges; local needs them explicit or PostgREST 403s under RLS).
- **Dev data:** `scripts/local_dev_seed.sh` (idempotent) creates the two `__DEV__` sign-in users as **Christian** (`alice@pamwe.dev`, partner A) and **Ammy** (`bob@pamwe.dev`, partner B), password `dev-password`, pairs them (`America/New_York`), and enrolls them in M'Cheyne day 1. So the redesigned screens show real names.
- **Verified end-to-end** (via PostgREST with real JWTs): password sign-in works; `/entries` returns 200 (no recursion); plans expose the browse metadata; a highlight inserted by Christian is visible to Ammy (shared study layer); a categorized prayer by Ammy is visible to Christian. Storage bucket + 5 policies, 3 entry triggers, realtime on 5 tables all present.

**How to run the local backend (after a Mac reboot or `supabase stop`):**
```bash
supabase start                 # brings the stack back (data persists in the docker volume)
./scripts/local_dev_seed.sh    # only needed after a `supabase db reset` (reset wipes data)
npx expo start --dev-client    # then dev-sign-in as Christian or Ammy
```

**Local limitations (all acceptable for solo screen-by-screen dev):** Ammy can't test from her own location (backend lives on your Mac) — that needs hosting; real APNs push and Apple/Google OAuth don't work locally (use the dev sign-in). John plan + the 2 new curated plans (Psalms/Cord) are not seeded locally yet — generated in rebuild Phase 6.

**Not seeded locally yet:** Gospel of John (only M'Cheyne 365 is in seed.sql). Generate via `scripts/seed_john_plan.py` when rebuild Phase 6 needs the browse grid.

### Rebuild Phase 1 — Schema migrations: DONE locally (2026-07-08)

All Phase 1 schema is applied and verified on the local stack (see above). When launching, apply the same migrations to the hosted project via MCP + run `supabase/seeds/plan_metadata.sql`'s UPDATEs, then `get_advisors`.

### Rebuild Phase 2 — Onboarding & pairing reskin: CODE-COMPLETE (2026-07-08)

Full onboarding flow rebuilt to the design, reconciled with the real auth the prototype didn't have. Flow: **Welcome → sign-in → value-slides → name → pair-choice → invite | join → connected → (gate: plan-select → tabs).**

- **New screens** (copy verbatim from prototype): `(onboarding)/value-slides.tsx` (3 slides, progress dots, Skip), `name.tsx` (writes `users.display_name`/`avatar_initial` via new `updateDisplayName`), `pair-choice.tsx` (Invite / I-have-a-code option cards), `join.tsx` (code entry → `joinCouple` → connected), `connected.tsx` (overlapping pop-in avatars with real initials + "{me} & {partner}" line, `celebrate()` haptic).
- **Restyled:** `(auth)/welcome.tsx` ("Grow closer to God, together." + floral + two CTAs), `sign-in.tsx` + `magic-link.tsx` (theme pass; dev buttons now "Christian"/"Ammy"), `(onboarding)/invite.tsx` (real code from `createCouple`, idempotent reuse on relaunch, Copy via expo-clipboard + Share, spinning waiting, realtime → connected).
- **Intent flag:** welcome's "I have an invite code" stores `pamwe:onbIntent` so the funnel skips the value sell and lands on Join (read in value-slides + name). Minor deviation: pairing is mandatory (no "I'll do this later"), and welcome has no radial gradient (expo-linear-gradient not installed) — solid bg instead.
- **Primitives:** Button/Card/Avatar now theme via `useTheme()`; Button gains `dashed` variant + cta type + 17px padding; new `ui/BackLink.tsx` + `ui/Spinner.tsx` (rotating CircleNotch). Lib: `updateDisplayName` + `getMyProfile` in `account.ts`.
- **Gate rewired** (`src/app/index.tsx`): session+no-couple → value-slides; couple-not-paired → invite (shows code + waits); paired+no-plan → plan-select; paired+plan → tabs. `waiting.tsx` kept but superseded by invite.
- **Gotcha fixed:** the hosted-config backup `.env.hosted.local` broke Metro bundling (parsed as JS by the `.env*.local` glob) → renamed to `env.hosted.backup` (gitignored). Also regenerated the stale expo-router typed-routes manifest (Metro typegen) so the new routes typecheck.
- **Gate:** `npx tsc --noEmit` clean; 39/39 Jest pass.
- ⏳ **On-device:** not yet walked on the phone (deferred to the debugging pass, per plan).

### Rebuild Phase 3 — Today screen: CODE-COMPLETE (2026-07-08)

`(tabs)/(today)/index.tsx` rebuilt to the prototype: floral corner bleed + gear (→ `you/settings`), centered date eyebrow (real `new Date()` → "Monday · May 25") + "Day N" (34px serifLight) + italic plan title, ProgressBar with Day/total row, anchor verse card (current day's `pull_quote` + ref, big “ glyph at .2 opacity, flowers-divider), You/{partner} avatar row joined by a rose flowers-divider (statuses from `useTodayEntry`: Done / Reading… / Today; partner ring solid when done, dashed while waiting), 7-dot streak strip + "N day streak", state-aware CTA (Read Day N / Waiting for {partner} / Reveal together), and "Today's reading · {ref}" footer. Pull-to-refresh + restyled no-plan empty state kept.

- New `ui/ProgressBar.tsx` (line-2 track + accent fill). `ui/StreakBar.tsx` **replaced** — now a `count`-driven 7-dot strip (done=accent, upcoming=line-2); only Today consumed it.
- `reading.tsx` got the theme pass (BackLink, eyebrow/h2 tokens, flowers-divider, reader type, prompt card) — the full verse reader arrives in Phase 4.
- Partner name/initial from `CoupleProvider.partner`; my initial from `user_metadata.full_name` (dev users show "C"/"A"). Server stays source of truth — the CTA only navigates, never mutates day/streak.
- **Gate:** `tsc` clean; 39/39 Jest pass.

### Rebuild Phase 4 — Bible tab (reader, translations, marks): CODE-COMPLETE (2026-07-08)

Full Bible experience rebuilt: books → chapters → reader with translation switching, typography popover, reference-jump search, and the shared per-couple highlights/notes layer.

- **lib/bible.ts:** `Translation` type + `TRANSLATION_NAMES`; `fetchChapterVerses(book, chapter, translation)` (per-(book,chapter,translation) Map cache, whitespace-normalized verses); `fetchPassage(reference, translation)` (for NULL-text custom-plan days later); `parseReference(query)` (prototype regex, exact→despaced→prefix, chapter clamped, verse discarded). Removed the old `fetchBibleChapter`.
- **New lib/verseMarks.ts:** `getMarksForChapter`, `getAllMarks` (canonical-order sort), `setHighlight`/`clearHighlight` (upsert/delete), `saveNote`/`deleteNote`. Writes carry `user_id`; RLS scopes to couple.
- **New primitives:** `ui/SegmentedControl.tsx` (pill, used for translations + later recaps/appearance/builder), `ui/Switch.tsx` (custom track/knob), `ui/BottomSheet.tsx` (Modal scrim + sheetUp). **New `components/VersePassage.tsx`** — shared verse-by-verse renderer (nested Text, tap spans, swatch highlight bg, inline note mark; sizes 17/19/22/26 line-height 1.9); reused by Reflections later.
- **Screens:** `bible/index.tsx` (search + reference-jump card + "My highlights & notes" entry with live count + OT/NT lists), `bible/[book].tsx` (56×56 chapter grid), `bible/[book]/[chapter].tsx` (the reader: Chapters back, WEB/KJV/BBE SegmentedControl, "Aa" popover with size row + verse-numbers Switch + light/dark appearance calling `setMode`, optional plan-context banner via params, title + full translation name + flowers-divider, VersePassage with "Gathering the words…" + error/retry, Prev/Next, verse-tap → action-sheet BottomSheet with 4 swatches + clear + note preview → note editor), `bible/note.tsx` (modal editor, Cancel/ref/Save, empty text deletes), `bible/marks.tsx` (Notes + Highlights sections, canonical order, rows jump to chapter, empty state). Reader prefs persist to AsyncStorage (`pamwe:readerScale`, `pamwe:verseNums`).
- **Deviations:** verse auto-scroll/flash on jump from marks not implemented (RN flowing-text can't easily measure a verse position) — opening the chapter is the behavior. The note-pencil indicator is an inline "✎" glyph (SVG icons can't be inline children of RN Text).
- **New test:** `bible-parse.test.ts` (7 cases). **Gate:** `tsc` clean; **46/46 Jest pass**; all Phosphor icon names verified to resolve.

### Rebuild Phase 5 — Reflect flow (write → waiting → reveal): CODE-COMPLETE (2026-07-08)

The three ritual screens rebuilt to the design, all data/realtime/RLS logic preserved.

- **journal.tsx:** design write view — BackLink "Back to reading" (saves draft), "{plan} · {ref}" eyebrow, "Your reflection" h1, prompt card (surface-2, "Today's prompt" + italic prompt), textarea, lock hint "Hidden until you've both reflected.", "Share with {partner}" CTA (`medium()` haptic). **Voice kept** as a designed addition: the Write/Voice toggle is now a `SegmentedControl`; voice mode shows the prompt card + VoiceRecorder. Autosave, submit, and the voice upload pipeline are unchanged.
- **waiting.tsx:** `popIn` check circle, "Your reflection is in.", sealed-until-both copy, a "{partner} is reading…" card (dashed avatar), "Back to Today" CTA. Realtime subscription + 30s fallback poll + auto-route to reveal kept.
- **reveal.tsx:** "Revealed together" eyebrow, "What you each wrote" h1, ref, flowers-divider, two cards entering with `unseal(0)`/`unseal(1)` (staggered 160ms), `success()` haptic on unlock. CTA **"Amen · mark day complete"** (HandsPraying icon) is **acknowledgment only** — it calls `CoupleProvider.refresh()` then routes to the completion screen on the final day or home otherwise; **no client mutation of current_day/streak** (the DB trigger owns advancement). Voice entries render `AudioPlayer` inside the card; loading + "couldn't load" retry states kept.
- **Voice components themed:** `AudioPlayer` + `VoiceRecorder` now consume `useTheme()`; play/pause glyphs (▶/❚❚) replaced with Phosphor `Play`/`Pause`. All recording logic (metering waveform, 5-min auto-stop, permissions, playback) untouched.
- **Gate:** `tsc` clean; Jest green.

### Rebuild Phase 6 — Plans tab, plan detail, 2 new seeded plans: CODE-COMPLETE (2026-07-08)

Plans browse + detail built to the prototype, and the browse grid now has real content: two new curated plans seeded (**placeholder content — pull quotes/titles/prompts are original starting points for Christian's editorial pass, WEB passage text is public-domain**). John also seeded locally so the grid has four plans.

- **Seeds (new scripts, `seed_john_plan.py` pattern — offline bible-api WEB fetch → idempotent SQL, fixed UUIDs):**
  - `scripts/seed_psalms_plan.py` → **Psalms of Comfort (30 days)**, id `c1b2c3d4-…892`. Curated 30-psalm arc through the emotional weather of a shared life; per-day title + chosen pull-quote verse + couples reflection prompt authored.
  - `scripts/seed_cord_plan.py` → **A Cord of Three Strands (21 days)**, id `d1b2c3d4-…893`. Ecclesiastes 1–12 then a curated companionship arc (Gen 2, Ruth 1, Prov 27, Song 8, John 15, 1 Cor 13, Eph 4, Col 3, 1 Pet 3) — deliberately fixes the prototype's canon-drift into Song of Songs. Applied to local DB; verified 30/30 + 21/21 `plan_days`, pull quotes single-line, RLS-readable by an authenticated dev user.
  - `supabase/seeds/plan_metadata.sql` extended with Psalms + Cord browse/detail copy (tagline/about/explore/gain/labels), lifted from `planLib`. **On hosted: run all three seed SQLs + the two new metadata UPDATEs via MCP.**
- **`src/lib/plans.ts`:** `getCuratedPlans()` (curated only, duration asc so M'Cheyne 365 is last), `getCouplePlans(coupleId)` (custom plans — empty until the builder in Phase 7), `getPlan(id)`, `getPlanDayList(id)`, `completePlan(couplePlanId)`.
- **New `ui/StripedBanner.tsx`** — the prototype's diagonal 45° striped banner as an SVG userSpace pattern (react-native-svg), sized to measured width, unique `useId` pattern id. Used by plan cards, detail banner, and plan-select.
- **`plans/index.tsx`** rebuilt: "Reading now" hero (striped banner + italic title + progress + Day N of M + View plan), "Your plans" (custom, hidden when empty), "Browse more" 2-col curated grid, dashed "Build your own plan" (→ friendly "coming soon" until Phase 7). Pull-to-refresh + `useFocusEffect` reload.
- **New `plans/[id].tsx`** (`overlayIn`): striped banner + floral + back, meta row (days / scripture / minutes), About, **Reading schedule** windowed to 40 rows (done `< current_day` / current / upcoming, live from `plan_days`; rows tap → Bible reader via `parseReference`, with plan context for the active plan), explore (numbered) + gain (surface-2 card), footer CTA "Continue reading" (active) / "Begin together" (enroll or confirm-switch), secondary "Mark plan complete" (active only → `completePlan` → plan-select). `plans/_layout.tsx` registers `[id]`.
- **`plan-select.tsx`** restyled to the theme + `StripedBanner` browse cards (was legacy `constants/colors`); now reads `getCuratedPlans()`.
- **Deviations:** builder is Phase 7 (dashed button alerts "coming soon"); "Mark plan complete" routes to plan-select rather than the `complete.tsx` celebration (that screen needs an active plan, which marking-complete removes); the Plans-header magnifier is decorative (search lives in the Bible tab).
- **Gate:** typed-routes manifest regenerated (new `plans/[id]`); `npx tsc --noEmit` clean; **46/46 Jest pass**; data layer verified through PostgREST with a real dev-user JWT.

> [!IMPORTANT]
> **Open questions for Christian (Phase 6):**
> 1. **Hosted apply of the new plans is pending.** The two new plans + John are seeded to the **local** DB only. At launch, apply `/tmp/psalms_seed.sql`, `/tmp/cord_seed.sql`, `/tmp/john_seed.sql` (regenerate with the scripts) **and** the two new `plan_metadata.sql` UPDATEs to the hosted project (`freftpwigrkjytusnqhx`) via MCP. **Q: apply to hosted now, or leave local-only until the launch migration pass?** (Left local-only for now, matching the current dev setup.)
> 2. **"Mark plan complete" routes to plan-select, not the `complete.tsx` celebration.** Marking complete removes the active plan, and `complete.tsx` reads an *active* plan for its stats — so the manual-complete path currently lands on plan selection instead of the celebration. **Q: acceptable, or should manual-complete also show a celebration?** (Would need `complete.tsx` to accept a just-completed plan id/stats rather than reading the active one.) The automatic final-day completion (via the reveal screen) still reaches `complete.tsx` normally.

### Rebuild Phase 7 — Plan builder + real Ask Pamwe (Claude API): CODE-COMPLETE (2026-07-08)

The build-your-own-plan flow, with a real Claude-powered recommendation feature. Uses Christian's Anthropic developer account (API key via edge-function secret).

- **Edge function `supabase/functions/ask-pamwe/index.ts`** — user-invoked (**`verify_jwt = true`**, added to `config.toml` under `[functions.ask-pamwe]`; deploy hosted with the same). `import Anthropic from "npm:@anthropic-ai/sdk"`; model from env `ANTHROPIC_MODEL` (**default `claude-haiku-4-5`** — Christian's choice; Haiku 4.5 supports structured outputs), key from `ANTHROPIC_API_KEY`. **Structured output** via `output_config.format` (json_schema — note: the `format.name` sub-field is rejected by the API, omit it) so parsing can't fail: `{ recommendations: [{ title, meta, days(7|14|21|30), rhythm(verses|chapter|deep), readings:[{day,reference}], prompts[] }] }`, 2–3 recs. `thinking: disabled` (fast), `max_tokens 4096`. Validates query ≤ 300 chars → 400; missing key → friendly 503; refusal/errors → friendly 502. **Verified LIVE end-to-end** (real key in `supabase/functions/.env`) on both Sonnet 5 and Haiku 4.5 — returns 3 well-formed, contextual recommendations. Built against the `claude-api` skill, not from memory.
- **`src/lib/askPamwe.ts`** — `askPamwe(query)` via `supabase.functions.invoke('ask-pamwe')`. Normalizes each rec: drops readings whose book fails `parseReference`, renumbers days, derives `days` from what survived. **On any failure (missing key, network, refusal, all-invalid) falls back to hardcoded "gentle starting points"** (John 21 / Psalms-of-comfort 14 / Way-of-Love 7) — so the builder works end-to-end even before the key is set.
- **`src/lib/planBuilder.ts`** — `generateSchedule(startBook, startChapter, days)` (pure canon walk over `BIBLE_BOOKS`, clamped at Revelation 22) + `createCustomPlan(coupleId, {name, days, readings, prompts?, ...})` (inserts a `plans` row `is_curated=false, couple_id, created_by` + N `plan_days` with `passage_text = NULL`, prompts or a rotating generic set). Client-side, no edge function.
- **`plans/builder.tsx`** — single screen, 4 internal steps + success (`overlayIn`, step dots). Step 1: Books / Topics / **Ask Pamwe** SegmentedControl (books = searchable `BIBLE_BOOKS`; topics = themed chips that call Ask Pamwe; ask = free-text → recommendation cards). Step 2: length 7/14/21/30 with a "Recommended" badge on the AI pick. Step 3: rhythm (verses/chapter/deep) + "Reflect together" Switch (rendered for fidelity; **v1 stores rhythm as a label only** — deviation). Step 4: name + review → `createCustomPlan` → `popIn` success (View plan / Done). Wired to the dashed "Build your own plan" button (was a "coming soon" alert) + registered route.
- **Custom-plan readability closed a gap:** `(today)/reading.tsx` now **live-fetches NULL-`passage_text` days** via `fetchPassage` (loading + retry states), so builder-made plans read correctly in the daily ritual — not just via the Bible reader.
- **New test** `src/__tests__/plan-builder.test.ts` (6 cases: within-book walk, book-boundary crossing, canon-end clamp, mid-book start, unknown-book fallback, exact length). **Gate:** typed-routes regenerated (new `plans/builder`); `npx tsc --noEmit` clean; **52/52 Jest pass**.

> [!IMPORTANT]
> **To turn Ask Pamwe live (Christian):**
> - **Local:** create `supabase/functions/.env` (gitignored; template at `.env.example`) with `ANTHROPIC_API_KEY=sk-ant-…`, then `supabase functions serve ask-pamwe --env-file supabase/functions/.env`. The running `supabase start` stack does **not** hot-serve a newly-added function — serve it explicitly (or restart the stack).
> - **Hosted (at launch):** `supabase secrets set ANTHROPIC_API_KEY=…` and `mcp__supabase__deploy_edge_function` with `verify_jwt: true`.
> - The builder's Ask Pamwe / Topics modes gracefully use the fallback recs when the key/function is absent; Books mode is fully offline. **Key note:** it was pasted in chat — rotate it and update `supabase/functions/.env`.

### Rebuild Phase 8 — Prayers upgrade: CODE-COMPLETE (2026-07-08)

The Prayers tab rebuilt to the design: categories, swipe actions, a detail sheet, and a compose/edit flow with a live notification preview.

- **Migration `20260708000005_prayers_author_delete.sql`** — adds an **author-only DELETE** policy on `prayers` (there was none — delete was RLS-blocked). UPDATE stays couple-scoped so either partner can mark a shared prayer answered; text/category editing is UI-gated to the author. Applied locally + mirrored; **hosted needs it too.** **RLS verified with both dev accounts:** category persists cross-account, Ammy's delete of Christian's prayer is blocked (row survives), Ammy *can* mark it answered, Christian can delete his own.
- **`src/lib/prayers.ts`** — `PrayerCategory` type + `PRAYER_CATEGORIES`/`CATEGORY_LABEL`; `createPrayer(..., category)`, new `updatePrayer(id, text, category)` + `deletePrayer(id)`.
- **New `ui/CategoryChip.tsx`** (surface-2 pill, accent2 label) + **`NotificationPreview.tsx`** (black mock iOS banner; reused by recaps in Phase 10).
- **`PrayerCard.tsx` rebuilt** — themed; **swipe-left on own prayers** (`Gesture.Pan` + reanimated, `activeOffsetX([-10,10])` so scroll wins, snap open −140 past −70 with `medium()` haptic) revealing Edit/Delete; Avatar + name + relative time + CategoryChip header; **directional prayed row** (own prayer → read-only "{partner} prayed / Waiting for {partner}"; partner's → my "I prayed today" toggle). `relativeTime()` helper exported.
- **New `PrayerDetailSheet.tsx`** (BottomSheet) — text, category, prayed status, "Mark as answered", Edit/Delete for own; answered prayers show the note.
- **`prayers/index.tsx` rebuilt** — "Add a prayer point" CTA, rose Floral divider, active cards, "Answered · N" archive section, hands-praying empty state, pull-to-refresh, realtime kept; card + sheet wired to mark-answered/edit/delete (optimistic + reload). **`add.tsx` rebuilt** as compose **and edit** (opened with `editId`/`text`/`category` params): "Your prayer" textarea (280), category chips, "Let {partner} know" Switch + live `NotificationPreview` (create only). `prayers/_layout.tsx` themed.
- **Gate:** `npx tsc --noEmit` clean; **52/52 Jest pass**.
- ⏳ **On-device (Christian):** swipe feel + scroll-vs-swipe on a physical iPhone; category persistence across the two accounts in the live UI; the notification banner still won't deliver on the free Apple ID (webhook fires, no banner) — unchanged.

### Rebuild Phase 9 — Reflections tab: CODE-COMPLETE (2026-07-08)

The shared history of revealed reflections — list, book filters, and a detail view.

- **New `src/lib/reflections.ts`** — `getRevealedReflections(coupleId)` selects the couple's submitted entries and **groups by `(couple_plan_id, day_number)`, keeping only mutual pairs.** The locked-reveal RLS already hides a partner's entry until both submit, so a day is "revealed" exactly when two entries are visible; a non-mutual day surfaces only my own entry and is dropped. Batch-fetches `plan_days` (reference/title) + plan titles, derives the `book` (via `parseReference`) for filtering and a text `snippet`, sorts newest-revealed first. `getReflectionDetail(couplePlanId, day)` re-fetches the plan day + both entries fresh for the detail screen. **RLS premise verified with both dev accounts:** Christian-only submit → he sees 1 entry (excluded); after Ammy submits → 2 visible (included). Test data cleaned up.
- **`reflect/index.tsx` rebuilt** (was a stub) — floral corner, "Reflections" + italic subtitle, derived **book filter chips** (shown when >1 book), reflection cards (date · reference eyebrow, overlapping You/partner avatars, italic snippet, book chip + "Read →"), feather empty state, pull-to-refresh, `useFocusEffect` reload. Rows → detail.
- **New `reflect/[id].tsx`** — BackLink, date·reference eyebrow + italic title + "Day N · {plan}" + flowers-divider, "The passage" card (seeded `passage_text`, or **live-fetch when NULL** for custom plans, with loading/error), then "What you each wrote" — two cards (mine outline-avatar / partner filled-avatar) rendering text or the themed `AudioPlayer` for voice entries. Route registered in `reflect/_layout.tsx`.
- **Gate:** typed routes regenerated (`reflect/[id]`); `npx tsc --noEmit` clean; **52/52 Jest pass**.

### Rebuild Phase 10 — You tab, recaps, dark mode ships: CODE-COMPLETE (2026-07-08)

The You tab, period recaps, and **dark mode goes user-visible** — which made this the dark-mode QA sweep (theming the last legacy screens).

- **Lib:** `entries.ts` — `countMyTotalSubmitted(coupleId)` (my submitted → "Days read") + `countCoupleReflections(coupleId)` (all visible submitted → "Reflections"). `prayers.ts` — `countPrayers(coupleId)`. **New `src/lib/recaps.ts`** — `getRecap(coupleId, timezone, 'week'|'month'|'quarter')` runs client queries over existing tables (my entries in range → days + "What you read" references; verse_highlights count; prayers in range → "What you prayed for"), with **deterministic headline/"learned" templates — no LLM over private reflections in v1**. Pure testable `recapCutoffISO()` (rolling N-day window; v1 deviation: not timezone-exact calendar boundaries).
- **`you/index.tsx` rebuilt** (was a stub): floral corner, profile (64px avatar, name, "Walking with {partner} · N day streak"), **3 stat cards** (Days read / Reflections / Prayers, live counts on focus), **Appearance Light/Dark toggle → `setMode`** (Sun/MoonStars; this is where dark goes user-visible), Settings group (Notifications, Change reading plan, Your recaps, You & {partner}), About group (Privacy, Terms), Sign out confirm, WEB attribution footer.
- **New `you/recaps.tsx`** — Week/Month/Quarter SegmentedControl, range label + headline, 3 stat cards (Days read / Highlights / Prayers), "What you read / learned / prayed for" cards, "Sent to you both" `NotificationPreview` (delivery still APNs-blocked — mock only). **New `you/couple.tsx`** — overlapping-avatar couple card, sealed-reveal privacy note, "Delete my account" → existing delete flow. Both routes registered.
- **Dark-mode sweep:** theme-passed the last legacy `constants/colors` screens — `you/settings.tsx` (notif prefs), `you/privacy.tsx`, `you/terms.tsx`, `you/delete-account.tsx`, `(today)/complete.tsx` (TwineDivider → Floral), and the `(today)`/`(auth)` stack layouts. **Every signed-in surface now themes via `useTheme()`.** Remaining `constants/colors` users are onboarding-only/pre-auth (`(onboarding)/waiting.tsx`, `PamweWordmark`, `TwineDivider`) where the dark toggle isn't reachable — Phase 11 deletes `constants/colors`.
- **Gate:** typed routes regenerated (`you/recaps`, `you/couple`); `npx tsc --noEmit` clean; **56/56 Jest pass** (new `recaps-dates.test.ts`); You-tab/recap queries verified against real RLS (no column errors). ⏳ **On-device:** the actual dark-mode *visual* check (floral tint, highlight ink stays `#2B1F14`, glass tint, keyboard/alert appearance) still needs a real iPhone — the sweep here is code-level theming completeness.

### Rebuild Phase 11 — Cleanup, tests, docs: DONE (2026-07-09) — **amended: no new features, colors.ts kept**

> **Plan amended (Christian):** Phase 11 is finishing hygiene only. The two dropped items: (1) the `complete.tsx` "certificate" rebuild (Floral confetti / `Share.share` / seal) — net-new feature, skipped; `complete.tsx` already works and is themed. (2) Deleting `src/constants/colors.ts` — **kept, frozen.** It stays a light-only palette for the pre-auth/onboarding stragglers (`(onboarding)/waiting.tsx`, `PamweWordmark`, `TwineDivider`) + `ui-components.test.tsx`; those aren't reachable with the dark toggle on. Rule: never import it in new code — use `useTheme()`.

- **Tests:** `ui-components.test.tsx` gained a **theme-switch test** (renders `ThemeProvider`, `setMode('dark')` → themed Text recolors light ink `#2B1F14` → dark ink `#EFE6D6`, exercising the whole theme system), a dashed-Button border test, and a SegmentedControl `accessibilityState` test. Fixed the shared AsyncStorage mock in `setup.ts` (missing `__esModule: true` double-wrapped the default import — first surfaced now that a test mounts `ThemeProvider` directly). Pure-function suites all present: `bible-parse`, `plan-builder`, `recaps-dates`.
- **Accessibility pass:** `accessibilityRole="button"` + `accessibilityState={{ selected }}` added to every selectable chip/card group (builder length/book/rec, prayer category chips, reflect book filters, plan-select cards; SegmentedControl + You appearance toggle already had it). Icon buttons already carry labels/text; reduced-motion honored globally (all `motion.ts` keyframes use `ReduceMotion.System`).
- **Docs:** root `CLAUDE.md` updated — 6-tab route map, theming (`useTheme()`/tokens + frozen `colors.ts` warning), expanded data-model (custom plans, nullable `plan_days.passage_text`, `prayers.category`, `verse_highlights`/`verse_notes`), `ask-pamwe` edge function + `ANTHROPIC_API_KEY` secret, and the new lib modules in "Where to find things."
- **Gate:** `npx tsc --noEmit` clean; **59/59 Jest pass** (7 suites).

**The design-handoff rebuild (Phases 0–11) is code-complete.** What remains is external/on-device, not feature work: the physical-iPhone validation pass (dark-mode visual, prayer swipe feel, voice record/upload/playback, two-device realtime, Ask Pamwe latency), Apple Developer enrollment (**submitted 2026-07-09, awaiting approval**), rotating the pasted `ANTHROPIC_API_KEY`, and applying the local-only migrations/seeds to the hosted project at launch.

---

> ⚠️ **Everything below this line is the ORIGINAL pre-rebuild history (the 2-tab app, phases 1–8).** It's kept for the debugging/decision trail, but the authoritative current status is the **⭐ Where we are now** banner at the top plus the rebuild Phase 0–11 entries above. Where the two disagree, the top wins (e.g. plans are now 4 curated + a custom builder; build-your-own is shipped; tests are 59/59, not 39/39).

**Current State (pre-rebuild snapshot):** Phases 1–6 are code-complete. The full feature set is built and backed by the live Supabase project (`freftpwigrkjytusnqhx`): the daily ritual + locked reveal, voice journaling, timezone-aware streaks with silent freezes, the Bible browser, the Prayers tab (Phase 5), and the Phase 6 "completeness" layer — plan completion, a real Settings screen, account deletion, couples realtime, and the freeze "fresh start" ping. Typecheck is clean on app/lib files and 39/39 Jest tests pass. **The gating work now is on-device validation, not feature-building** — the core flows (voice reveal, account deletion both directions, plan completion, notification recovery) have only been verified in code and via transactional DB tests, never run end-to-end on a physical iPhone. Real APNs push remains blocked on Apple Developer enrollment.

### At a glance — what's done vs. what's left

| Area | State |
|---|---|
| Auth (magic link + Apple + dev users) | ✅ Built. Magic-link-via-real-email not validated end-to-end. |
| Couple pairing + onboarding | ✅ Built. Now realtime (Phase 6), was polling. |
| Reading plans (M'Cheyne 365, John 21) | ✅ Both fully seeded. Switch-plan + completion flow done. |
| Daily ritual + locked reveal | ✅ Built. Not yet run end-to-end on device. |
| Voice journaling + storage RLS | ✅ Built. Mic/upload/playback need a real iPhone. |
| Streaks + silent freezes + fresh-start ping | ✅ Built + DB-tested. |
| Bible browser tab | ✅ Built. |
| Prayers tab (Phase 5) | ✅ Built. Not yet run on device. |
| Settings (sign out / plan / notif prefs) | ✅ Built (Phase 6). |
| Account deletion (demote routine) | ✅ Built + DB-tested. Both directions need device test. |
| Plan completion screen | ✅ Built + DB-tested. |
| Apple Developer / APNs / TestFlight | 🟡 **Enrollment submitted 2026-07-09, awaiting Apple approval.** Post-approval checklist in the top banner. |
| Build-your-own-plan UI | ✅ Built in rebuild Phase 7 (Plans builder: Books / Topics / Ask Pamwe). |
| Ship Prep (now Phase 7) | 🔶 Started 2026-06-10 — eas.json, Sentry (env-gated), error states, privacy/terms, onboarding polish, a11y. |
| Launch (Phase 8) | ⏳ Not started (gated on Apple approval). |

---

## Phase 1 — Foundation (Weekends 1–2): COMPLETE

### Weekend 1: Scaffold & Auth

- **Project scaffold:** Expo SDK 56, TypeScript, file-based routing (expo-router), React 19.
- **Dependencies:** Supabase JS, AsyncStorage adapter, Apple Authentication, deep linking, Google Fonts (Fraunces + Instrument Sans).
- **Design system:** Color tokens, typography tokens, UI primitives (Text, Button, Card, TwineDivider, Avatar, StreakBar, PamweWordmark).
- **Supabase client:** AsyncStorage adapter, session persistence, `detectSessionInUrl: false`.
- **Auth flow:** `AuthProvider`, `useAuth` hook, deep link handler in root layout.
- **Auth screens:** welcome, sign-in (magic link + Apple Sign In), magic-link confirmation.

### Weekend 1 (continued): Database

- Project ID `freftpwigrkjytusnqhx`, `.env` configured.
- 8 tables, RLS on all: `users`, `couples`, `plans`, `plan_days`, `couple_plans`, `entries`, `prayers`, `prayer_marks`.
- Locked-reveal RLS enforced at Postgres level (not client).
- `idx_entries_reveal_lookup` for the self-join.
- `handle_new_user` trigger auto-creates `public.users` on Auth signup.

### Weekend 2: Couple Pairing & Onboarding

- `src/lib/couples.ts` — invite code generation (6-char alphanumeric, no ambiguous O/0/I/1), 7-day expiry, join validation, self-join prevention.
- Onboarding screens: dual-path invite + waiting (polls every 10s + on foreground).
- Auth gate in `src/app/index.tsx` routes through 5 states.

### Test Suite (foundation)

- Jest + jest-expo + @testing-library/react-native.
- 30 tests, 3 suites: couples (15), AuthProvider (6), ui-components (9).

---

## Phase 2 — The Daily Ritual (Weekends 3–4): COMPLETE

### Weekend 3: Reading Plan Engine

- **M'Cheyne Reading Plan:** 365 days, Family Worship column from PLAN2.pdf. Replaced original 3 curated plans.
- **WEB Bible text:** All 365 passages from bible-api.com (public domain) → `supabase/seed.sql` (14,281 lines).
- **Pull quotes:** Auto-extracted compelling verse (40-200 chars) per day.
- **Reflection prompts:** 30 rotating couples-focused prompts.
- **Plan-select screen:** Shown after pairing if no active plan.
- **Lib + providers:** `src/lib/plans.ts`, `src/lib/entries.ts`, `CoupleProvider`, `useTodayEntry`.

### Weekend 4: Reading & Text Journal

- Tab layout: Today + Prayers (Prayers placeholder).
- Today stack: home → reading → journal → waiting → reveal.
- Text journaling with 5s autosave, character count, send confirmation.

---

## Phase 3 — The Magic (Weekends 5–6): COMPLETE

### Weekend 5: Locked Reveal (Realtime)

- `postgres_changes` subscription on waiting screen, filtered by `couple_plan_id`. 30s fallback poll.

### Weekend 6: Push Notifications

- `expo-notifications` + `expo-device` installed; plugin in `app.json` with oxblood accent.
- `src/lib/notifications.ts`: `registerForPushNotifications`, `savePushToken`, `scheduleMorningNotification`.
- 6:30 AM morning ping scheduled in root layout.
- `notify-partner` Edge Function source written.

### Phase 3 Deployment (completed 2026-05-28 via Supabase MCP)

- ✅ Deployed `notify-partner` Edge Function (verify_jwt=false, webhook target).
- ✅ Database trigger `notify_partner_on_submit_trigger` on `entries`, fires `net.http_post` when `submitted_at` transitions NULL → set. Migration: `enable_pg_net_and_notify_partner_webhook`.
- ✅ Realtime enabled on `public.entries` (added to `supabase_realtime` publication).
- ✅ Trigger function locked down (`REVOKE EXECUTE ... FROM PUBLIC`).

---

## Phase 4 — Voice & Streaks (Weekends 7–8): COMPLETE (code-complete; voice flow device-validation pending)

### Phase 4 prep — Storage RLS for voice entries (completed 2026-05-28)

- ✅ `couples.timezone` column added (default `'UTC'`). Captured at couple creation in `src/lib/couples.ts` via `Intl.DateTimeFormat().resolvedOptions().timeZone`. Intentionally no editable UI in v1.
- ✅ `voice-entries` Storage bucket (private).
- ✅ 5 Storage RLS policies on `storage.objects` mirroring locked-reveal logic.
- ✅ Path scheme: `{couple_plan_id}/{day_number}/{user_id}.m4a`.
- ✅ Fixed latent infinite-recursion bug in `entries_select_partner_after_mutual_submit` (self-referencing subquery). Migration: `fix_entries_rls_recursion_and_refactor_storage_helpers`. Now uses SECURITY DEFINER helpers.
- ✅ 4-stage RLS smoke test passed.
- ✅ Test for timezone capture in `couples.test.ts`.

### Weekend 7: Voice journaling (code-complete 2026-05-28)

- ✅ Installed `expo-audio` (~56.0.11), `expo-file-system` (~56.0.7), `base64-arraybuffer` (^1.0.2).
- ✅ `expo-audio` plugin configured in `app.json` with custom mic permission string.
- ✅ API surface verified against installed `.d.ts` (not memory): `useAudioRecorder`, `useAudioRecorderState`, `useAudioPlayer`, `useAudioPlayerStatus`, `RecordingPresets.HIGH_QUALITY`, `setAudioModeAsync`.
- ✅ `src/lib/entries.ts` extended with `ensureVoiceDraft`, `uploadVoiceRecording`, `attachAudioToEntry`, `getSignedAudioUrl`. Upload via new `File.arrayBuffer()` with `expo-file-system/legacy` base64 fallback.
- ✅ `src/components/VoiceRecorder.tsx`: permission flow, 5-min hard auto-stop, live timer, 32-bar metering waveform (null-safe), playback with re-record/send. Failure preserves recording on screen.
- ✅ Write/Voice toggle wired into journal screen.
- ✅ 39 tests passing (8 new for voice flow).
- ⏳ **On-device validation pending** — voice flow has not been recorded/uploaded/revealed end-to-end yet.

### Weekend 8: Streaks (SHIPPED — see "Phase 4 — Streaks" section below)

- ⏳ `calculate-streak` Edge Function with timezone-aware midnight.
- ⏳ Rolling 30-day window freeze-day logic (3 forgivable misses).
- ⏳ Streak visualization on Home screen.

---

## iOS dev build (Xcode 26 / Swift 6) — RUNNING

The biggest event of the 2026-05-28 session. Apple has tightened the Swift compiler faster than Expo SDK 56 ships with. Full debugging log in [trial-and-error.md](trial-and-error.md).

What's working:
- ✅ Custom dev client builds and installs on Christian's iPhone with a free Apple ID
- ✅ Bundle ID: `com.christianmangwanda.pamwe`
- ✅ Entitlements stripped (no Push, no Apple Sign In — both unsupported on personal teams)
- ✅ CocoaPods works once `LC_ALL=en_US.UTF-8` is set in `~/.bash_profile`
- ✅ Trust verification succeeds on cellular (not all Wi-Fi networks can reach Apple's `ppq.apple.com`)
- ✅ App boots cleanly, all Expo modules register, Metro bundle loads
- ✅ Patches applied to `node_modules/expo-modules-jsi/`:
  - `weak let` → `weak var` in 15 places
  - `@unchecked Sendable` on HostFunctionContext, HostObjectContext, JavaScriptValue, JavaScriptPropNameID
  - **Package.swift and JavaScriptType protocol left untouched** — touching them breaks symbol ABI and dyld can't resolve

What's NOT yet working / blocked:
- ⏳ Magic link auth via real email — Supabase URL config (Site URL = `pamwe://`) not yet validated end-to-end. Hit rate limit during attempts.
- ⏳ Apple Sign In — won't work, free Apple ID.
- ⏳ Partner push notifications on iOS — no APNs key (paid account required). Database webhook still fires; edge function still runs; no banner on phone.

Dev sign-in workaround (created 2026-05-28):
- `alice@pamwe.dev` / `dev-password` — Partner A
- `bob@pamwe.dev` / `dev-password` — Partner B
- Paired in couple `cccccccc-cccc-cccc-cccc-cccccccccccc`, enrolled in M'Cheyne day 1
- `__DEV__`-gated buttons on `src/app/(auth)/sign-in.tsx`

---

## Open work, ranked by priority (as of 2026-06-06)

Most of the old list is now **done** — John seed finished, Phase 4 streaks shipped, Settings built, couples realtime wired. What actually remains:

1. **On-device validation pass (highest priority, no money required).** The whole app has been built and verified in code + via transactional DB tests, but the device-only behaviors have never run end-to-end on a real iPhone:
   - Core ritual: sign in → Today → record voice as Christian → switch to Bob → record → reveal plays both → day advances → streak bars fill.
   - Plan completion: finish the 21-day John plan → completion screen → choose next plan.
   - Prayers (Phase 5): add a prayer as Alice → appears live for Bob → both tap "prayed today" → mark answered → archive.
   - Settings: toggle notif prefs; deny OS notifications and confirm the recovery banner + deep link.
   - Account deletion: run **both** directions (A deletes vs B deletes), confirm the survivor keeps their data and lands on a usable waiting screen with a fresh invite code.
2. **Apple Developer enrollment ($99/yr).** Gates real APNs push (all webhooks fire today but no banner delivers on the free Apple ID), Sign In with Apple, and TestFlight/App Store. Hard external blocker for Phases 7–8.
3. **Magic-link auth via real email** — Supabase Site URL (`pamwe://`) config never validated end-to-end (hit the rate limit, pivoted to dev users).
4. **Phase 7 — Ship Prep** (renumbered, was Phase 6): onboarding polish, splash pronunciation guide, App Store screenshots/metadata, marketing page, EAS Build → TestFlight, crash monitoring.
5. **Phase 8 — Launch**: TestFlight feedback, RevenueCat (paywall off for the 90-day free period), per-couple entitlement, App Store submission.
6. **Build-your-own plan UI** — schema supports it (`plans.created_by`); deferred to its own post-launch phase (needs a bundled WEB dataset + prompt strategy, per Decision 3 in [phase6-completeness.md](phase6-completeness.md)).
7. **Seed more curated plans** — NT-in-30, Psalms-in-30, etc. Same offline-fetcher → dashboard-paste pattern.

### Live backend inventory (Supabase `freftpwigrkjytusnqhx`)

- **Edge Functions:** `notify-partner`, `notify-new-prayer`, `notify-freeze`, `delete-account`.
- **Realtime publication:** `entries`, `prayers`, `prayer_marks`, `couples`, `couple_plans`.
- **Triggers on `entries`:** `notify_partner_on_submit_trigger`, `advance_plan_day_trigger` (now also flips `status='completed'` on the final day), `update_streak_on_mutual_submit_trigger` (now fires the freeze "fresh start" webhook).
- **Trigger on `prayers`:** `notify_partner_on_new_prayer_trigger`.
- **New column:** `prayers.notify_partner` (per-prayer toggle).

## Recently completed (2026-05-29)

- ✅ Wired up `patch-package`. Patches in `patches/expo-modules-jsi+56.0.7.patch` (204 lines, 14 Swift source files). Auto-applies via `postinstall` script in package.json.
- ✅ **Tier 1 bug fixes:**
  - Sign-in `setLoading(false)` on success paths (Google + Apple) — no more spinner-stuck after auth.
  - `index.tsx` auth gate refactored with `useCallback` + session-id dep; `getUserCouple(userId?)` accepts the cached user id from the session so no extra `supabase.auth.getUser()` network round-trip.
  - DB trigger `advance_plan_day_trigger` on `entries` AFTER INSERT/UPDATE OF submitted_at — bumps `couple_plans.current_day` when both partners have submitted for the same day. Idempotent. Migration: `advance_plan_day_on_mutual_submit`. Smoke-tested with a synthetic two-submit sequence in a transaction.
  - New [src/components/AudioPlayer.tsx](src/components/AudioPlayer.tsx) — fetches signed URL via `getSignedAudioUrl`, wraps `expo-audio` `useAudioPlayer`/`useAudioPlayerStatus`. Reveal screen now renders it for voice entries (mine + partner), falls back to text rendering for `entry_type='text'`.
- ✅ **Tier 2 content management:**
  - `switchPlan(coupleId, newPlanId)` in `src/lib/plans.ts`. Marks active plan completed, enrolls in new plan at day 1.
  - `plan-select.tsx` accepts `?mode=change` query param. In switch mode: confirmation alert, "Switch to this plan" CTA, no auto-select.
  - "Change plan" ghost button on Today home → navigates to `(onboarding)/plan-select?mode=change`.
  - **Gospel of John (21 days)** plan partially seeded: plan row + day 1 inserted via migration. Remaining days 2–21 (~100KB of SQL) are at `/tmp/john_remaining.sql` and need a one-shot paste into Supabase SQL editor: https://supabase.com/dashboard/project/freftpwigrkjytusnqhx/sql/new
- ✅ 39/39 tests still pass; typecheck clean on touched files.
- ✅ **Bible browser tab added.** New routes under `src/app/(tabs)/bible/`:
  - `index.tsx` — searchable book picker (66 books, OT + NT sections)
  - `[book].tsx` — chapter picker grid for a book
  - `[book]/[chapter].tsx` — chapter reader with Prev/Next nav
  - All powered by `src/lib/bible.ts` which fetches on-demand from bible-api.com (WEB translation, no seed needed). 66-book canonical metadata included.
  - Tab order now Today / Bible / Prayers.

## Phase 3 backend verification + security sweep (2026-05-28)

Ran through the Phase 3 backend state via the Supabase MCP and confirmed everything is live:

- ✅ Edge Function `notify-partner` deployed (v1, `verify_jwt: false`, byte-for-byte match with [supabase/functions/notify-partner/index.ts](supabase/functions/notify-partner/index.ts))
- ✅ Realtime publication includes `public.entries` (waiting-screen subscription will fire)
- ✅ `pg_net` v0.20.3 installed
- ✅ DB triggers: `notify_partner_on_submit_trigger` calls Edge Function on submission; `advance_plan_day_trigger` bumps `current_day` on mutual submit
- ✅ `users.expo_push_token`, `notification_partner`, `notification_morning_time` columns exist

**Security advisor sweep — addressed:**
- `handle_new_user`: pinned `search_path = public, pg_temp` (was mutable, lint 0011)
- `handle_new_user`, `rls_auto_enable`: revoked anon/authenticated EXECUTE (operational, not user-facing)
- `has_user_submitted_entry`, `can_view_partner_audio`, `current_user_couple_id`: revoked **anon** EXECUTE (previously callable by unauthenticated requests via `/rest/v1/rpc/...`)
- Kept **authenticated** EXECUTE on those three — they're referenced by RLS policies `entries_select_partner_after_mutual_submit`, `voice_entries_select_partner_after_reveal`, `users_select_partner`. Revoking authenticated breaks the locked reveal.

**Tech debt resolved (re-audit 2026-05-28):** re-read the three helper bodies and they're already self-protected. `has_user_submitted_entry` requires `auth.uid() = p_user_id` so you can only probe your own state. `can_view_partner_audio` requires `me.user_id = auth.uid() AND me.submitted_at IS NOT NULL` so you must have personally submitted before the function returns anything useful. `current_user_couple_id` returns the caller's own couple_id (which they already have via `users_select_own`). RPC access to these doesn't leak anything beyond what RLS already permits. Added `COMMENT ON FUNCTION` to each documenting the rationale so this doesn't get re-flagged. **Not moving to a private schema** — cosmetic, not protective.

**Open (dashboard-only):** HaveIBeenPwned leaked-password protection. Dashboard → Authentication → Policies → Password Strength.

## Phase 4 — Streaks (started 2026-05-28)

**Streak system shipped** (DB trigger, not Edge Function or cron — the streak is self-correcting on next submit).

- New function: `public.update_streak_on_mutual_submit()`. SECURITY DEFINER, `search_path = public, pg_temp`, EXECUTE revoked from anon/authenticated.
- New trigger: `update_streak_on_mutual_submit_trigger` on `entries` AFTER INSERT OR UPDATE OF `submitted_at`.
- Computes "today" via `couples.timezone` (the device-derived value captured at couple creation).
- Idempotent: same-day re-fire after partner's second submit is a no-op (guarded on `streak_last_date = today_date`).
- Freeze logic: 3 freezes per rolling 30-day window. Gap-day delta vs `streak_last_date` is bridged by freezes when available; if not, streak resets to 1.
- **Per Christian's preference, freeze use is silent.** No UI affordance, no notification — `freeze_days_used` just ticks up on the couple row.

Smoke-tested with a 4-case transactional DO block against the dev couple (alice + bob, America/New_York):
1. First mutual submit → streak=1 ✅
2. Yesterday → today → streak=2 ✅
3. 2-day gap with freezes available → streak=3, freezes_used=1 ✅
4. 4-day gap with only 1 freeze left → streak resets to 1, freezes_used=0 ✅

All assertions passed; final `RAISE EXCEPTION` discarded the test data. Couple state confirmed back to zeroes after rollback. No production impact.

**Home screen** already reads `streak_count` from the `couples` row via the `useCouple` provider; the 7-bar `<StreakBar>` row will start filling in as submissions land.

**Phase 4 leftovers** (deferred):
- Voice journaling — already shipped previously (`VoiceRecorder`, `AudioPlayer`, `voice-entries` bucket, storage RLS).
- Freeze-day notification ("Yesterday was a freeze-day. Today is a fresh start.") — punted to polish.

---

## Phase 5 — Prayers tab (Weekends 10–11): SHIPPED (2026-06-06)

Second tab built end-to-end. Replaced the "Coming soon" placeholder.

**Data layer** — [src/lib/prayers.ts](src/lib/prayers.ts), mirrors `entries.ts`:
- `getPrayers(coupleId, status)` / `getAnsweredPrayers(coupleId)` — ordered by `created_at` (active) or `answered_at` (answered).
- `createPrayer(coupleId, text, notifyPartner)` — author = current user.
- `getTodayMarks(timezone)` — both partners' marks for today (RLS-scoped to couple).
- `markPrayedFor(prayerId, timezone)` — idempotent upsert (`ignoreDuplicates`), one per user/prayer/day.
- `markAnswered(prayerId, note?)`.
- "Today" derived from `couples.timezone` (same source as the streak system) so insert and read agree on the calendar day regardless of device UTC offset.

**Screens** — Prayers tab converted from a single file to a stack ([src/app/(tabs)/prayers/](src/app/(tabs)/prayers/)):
- `index.tsx` — Active/Answered segmented toggle, FlatList of `PrayerCard`, pull-to-refresh, empty states. Realtime: one channel with two `postgres_changes` listeners (`prayers` filtered by `couple_id`, `prayer_marks` unfiltered) + `useFocusEffect` reload. "Mark answered" uses `Alert.prompt` on iOS (optional note), plain confirm on Android.
- `add.tsx` — modal sheet (`presentation: 'modal'`): 280-char textarea, char count, **Notify your partner** `Switch` (default on), Add button.
- The **Answered archive** is the "Answered" position of the toggle — no separate route (simplicity).
- [src/components/PrayerCard.tsx](src/components/PrayerCard.tsx) — author label (You/Your partner), date, "I prayed today" pill (shows "You prayed today" / "You both prayed today"), Mark answered action; answered cards show the optional note.

**Backend:**
- `prayers.notify_partner` boolean column added (default true) — the per-prayer toggle.
- Edge Function `notify-new-prayer` deployed (v1, `verify_jwt=false`), mirrors `notify-partner`. Pushes an 80-char preview to the partner.
- Trigger `notify_partner_on_new_prayer_trigger` on `prayers` AFTER INSERT → `net.http_post` to the function, gated on `NEW.notify_partner`. Mirrors `notify_partner_on_submit`.
- `prayers` + `prayer_marks` added to the `supabase_realtime` publication.
- Migration: `phase5_prayers_notify_and_realtime` (applied via MCP).

Smoke-tested the insert → mark → answer flow in a transactional DO block against the dev couple; rolled back, both tables confirmed back to 0 rows. 39/39 tests still pass; typecheck clean on touched files.

**On-device validation pending** — add a prayer as Alice, confirm it appears live for Bob, both tap "I prayed today", mark answered, check archive. Real APNs push still won't deliver on the free Apple ID (webhook fires, no banner) — same as `notify-partner`.

---

## Phase 6 — Completeness (2026-06-06): SHIPPED (code-complete, on-device validation pending)

Built to the done criteria in [phase6-completeness.md](phase6-completeness.md) (the spec, reconciled against the live schema before building — its account-deletion design was corrected from "delete the couples row" to "demote, never delete," because the cascade chain `couples → couple_plans → entries` / `couples → prayers → prayer_marks` would have wiped the surviving partner's data).

**Tier 0 — unblocks**
- John plan confirmed fully seeded (21/21 days, all with passage_text + prompt). No paste needed.
- HaveIBeenPwned: confirmed moot — production auth is passwordless (magic link + Apple); the only `signInWithPassword` is `__DEV__`-gated. Left disabled intentionally.

**Tier 1 — required surfaces**
- **Plan completion.** Trigger `advance_plan_day_if_mutual_submit()` now sets `couple_plans.status='completed'` when the final day is mutually submitted (was silently clamping `current_day`, leaving a dead reveal loop). Migration `phase6_mark_plan_completed_on_final_day`; transactionally smoke-tested (John day 21 → completed). New [complete.tsx](src/app/(tabs)/(today)/complete.tsx) celebration screen (days / reflections / streak stats), reached from the reveal screen's final-day CTA. Today's no-plan state rewritten from "something went wrong" to a graceful "Ready for what's next → Choose a plan."
- **Settings screen** ([settings.tsx](src/app/(tabs)/(today)/settings.tsx)), reached via a ⚙ in the Today header. Owns sign out (now routes to `/`), change plan, and notification prefs (morning-time presets, partner + prayer toggles) wired to `users.notification_morning_time/notification_partner/notification_prayer`, with a permission-denied recovery banner (`Linking.openSettings()`). Removed the ghost "Change plan" and `__DEV__` sign-out from Today.
- **Account deletion** — demote-don't-delete. Edge Function `delete-account` (verify_jwt=true, authenticates caller): deletes the user's own marks/entries/prayers, demotes the couple (promotes the survivor into the NOT NULL `partner_a` slot when needed, regenerates a fresh invite code), notifies the partner, then `auth.admin.deleteUser` (cascades `public.users`). Confirmation screen [delete-account.tsx](src/app/(tabs)/(today)/delete-account.tsx) + double confirm. Lib [src/lib/account.ts](src/lib/account.ts). Demote logic transactionally verified: partner B's data survives, couple row intact, survivor promoted.

**Tier 2 — consistency**
- `couples` + `couple_plans` added to the realtime publication (migration `phase6_realtime_couples`); onboarding [waiting.tsx](src/app/(onboarding)/waiting.tsx) now subscribes to `couples` UPDATEs (10s poll → realtime + 30s fallback).
- **Freeze-day "fresh start" ping.** Edge Function `notify-freeze` + a webhook added to the freeze-bridge branch of `update_streak_on_mutual_submit()` (migration `phase6_freeze_fresh_start_notification`). Fires only when a freeze is actually consumed; the freeze itself stays silent. Gentle, non-punishing copy to both partners.

**Tier 3 — finished feel**
- Home no-plan state done (above). Prayers/answered empty states already shipped in Phase 5.
- Prayer write paths: `createPrayer`/`markAnswered` already alerted; `markPrayedFor` was optimistic+silent — now reverts and surfaces a gentle alert on failure.

**Status:** typecheck clean on touched files; 39/39 tests pass; security advisor shows no new issues (only the 3 long-documented RLS helper functions + the moot HIBP toggle). New edge functions: `notify-new-prayer` (Phase 5), `delete-account`, `notify-freeze`.

**On-device validation pending (needs a real iPhone + dev client):**
- Finish the John plan end-to-end → completion screen → choose next plan.
- Settings: toggle prefs, deny OS notifications and confirm the recovery banner + deep link.
- Account deletion **both directions** (partner A deletes vs partner B deletes); confirm survivor keeps data and is routed to the unpaired/waiting state with a usable invite code.
- Real push delivery for `delete-account`/`notify-freeze` still blocked on Apple Developer / APNs (webhooks fire; no banner on free Apple ID), same as all other pushes.

---

## Phase 7 — Ship Prep (started 2026-06-10)

First pass: everything that needs no money and no device. 39/39 tests pass; `npx tsc --noEmit` is now fully clean repo-wide (was app/lib-only).

- **eas.json** created (development / preview / production profiles, remote app version source). Still needs a one-time `eas init` (Expo account login) to stamp the project ID into app.json.
- **Crash reporting scaffolded.** `@sentry/react-native` installed (RNSentry 8.13.0, pods linked), env-gated init + `Sentry.wrap` in [src/app/_layout.tsx](src/app/_layout.tsx) — a no-op until `EXPO_PUBLIC_SENTRY_DSN` is set in `.env`. New `metro.config.js` uses `getSentryExpoConfig` (debug IDs for symbolication). Remaining: create the Sentry account, set the DSN, rebuild the dev client, and add `SENTRY_AUTH_TOKEN` to EAS for source map upload.
- **Reveal dead-end fixed.** [reveal.tsx](src/app/(tabs)/(today)/reveal.tsx) returned `null` (blank screen) if entries failed to load; now shows a spinner while loading and a "Couldn't load your reflections" card with retry. `useTodayEntry` exposes an `error` flag; the waiting screen shows a gentle "retrying" hint on fetch failure (the 30s fallback poll self-heals).
- **Privacy Policy + Terms of Use** as real in-app screens ([privacy.tsx](src/app/(tabs)/(today)/privacy.tsx), [terms.tsx](src/app/(tabs)/(today)/terms.tsx)) linked from a new About section in Settings. Same text can be pasted to a hosted page for the App Store Connect privacy-policy URL later.
- **Onboarding polish.** Welcome screen now carries the pronunciation line (pah-mweh — "together" in Shona) and a three-step Read / Reflect / Reveal explainer.
- **Accessibility pass.** `Button` primitive sets `accessibilityRole`/`Label`; the Today gear icon is labeled; Prayers + journal segmented tabs expose selected state; Settings switches are labeled. (VoiceRecorder/AudioPlayer already had labels.)
- **Housekeeping.** `tsconfig` now includes `"types": ["jest", "node"]` so test files typecheck; deleted dead Expo-template files `src/components/app-tabs(.web).tsx` (referenced the removed `/explore` route); `.gitignore` now covers `.env` and the stray personal files in the working dir (SteriCycle/, PDFs, `CLAUDE 2.md`).

**Remaining Phase 7:** Apple Developer enrollment (external blocker) → EAS build → TestFlight; App Store screenshots + metadata; marketing page; Sentry account + DSN; magic-link Site URL validation; the on-device validation pass.

### Second pass (2026-06-11) — last of the no-money code work

- **Notification tap routing.** All four push payloads now carry `data.type` (`partner_entry` + `reveal` flag, `prayer`, `freeze`, `partner_left`; the local morning notification sends `morning`). New [src/hooks/usePushRouting.ts](src/hooks/usePushRouting.ts) (uses `useLastNotificationResponse`, covers warm taps + cold starts, dedupes by notification id), mounted in [(tabs)/_layout.tsx](src/app/(tabs)/_layout.tsx) so routing only happens after the auth gate lands a signed-in, paired user. Routes: reveal-ready partner pushes → reveal screen, otherwise Today; prayer → Prayers tab; freeze/morning → Today; partner-left → `/` (auth gate re-evaluates).
- **Edge function deploys:** `notify-freeze` (v2) and `delete-account` (v2) redeployed with the data payloads, verify_jwt preserved. ⚠️ `notify-partner` and `notify-new-prayer` redeploys were blocked by the local permission layer — local sources are updated and ready; redeploy is the one pending backend step (tap routing falls back to opening the app normally until then).
- **Voice/text submit error hints.** [journal.tsx](src/app/(tabs)/(today)/journal.tsx) now detects network failures and says so ("You look offline. Your recording is still here…") instead of surfacing raw error messages; draft/recording preservation is stated in both paths.
- **Splash background** switched from template Expo blue `#208AEF` to the Pamwe parchment `#EFE6D6` in app.json.
- ⚠️ **App icon is still the Expo template default** (blue "A", confirmed visually) — needs a real Pamwe icon before TestFlight. Design work, not code; `assets/images/icon.png` (1024×1024) is the slot, also used for the notification icon, plus `assets/expo.icon` for iOS 26.

**Code-complete means code-complete now:** the only remaining feature code is RevenueCat (Phase 8), deliberately deferred until App Store Connect products exist so the integration can be verified against real offerings instead of written blind. Everything else left requires the Apple Developer account, a Sentry account, a designed app icon, or a physical device.

### Design/UX elevation pass (2026-06-11, same day)

Two parallel review agents audited every screen for premium-feel gaps and design-system consistency. Implemented the clear wins:

- **Partner presence.** New `getPartnerProfile()` + `profileInitial()` in [src/lib/couples.ts](src/lib/couples.ts) (uses the existing `users_select_partner` RLS policy; `avatar_initial`/`display_name`/`email` fallback chain). `CoupleProvider` now exposes `partner`. The hardcoded "?" on home + onboarding-waiting avatars and the "P" on the reveal screen are now the partner's real initial. `myInitial` uppercased consistently.
- **The reveal moment is celebrated.** Reveal cards enter with a staggered fade-down (mine, then partner's at +300ms, reanimated `FadeInDown`) and a success haptic fires when both unlock. Plan-complete screen fires a success haptic on mount; "I prayed today" gives a light impact tap. `expo-haptics` installed (pods linked — same rebuild as Sentry).
- **Dark mode hole closed.** `userInterfaceStyle` was `"automatic"` with a light-only palette (system Alerts/Switches/keyboard would have gone dark over parchment). Now `"light"`.
- **13 dead Expo-template files deleted** (themed-text/view, hint-row, web-badge, collapsible, external-link, animated-icon ×3, use-color-scheme ×2, use-theme, constants/theme.ts) — all verified unreferenced; only live code remains in src/.
- **Missing states filled:** Prayers list shows a spinner during first load (was blank); plan-select shows a "couldn't load plans" + retry state when `getPlans()` returns nothing; home gets pull-to-refresh (refreshes entries + couple/streak).
- **Small fixes:** invite screen wrapped in `KeyboardAvoidingView`; waiting-screen error hint warmed ("We can't reach the server right now — we'll keep trying"); journal's hardcoded rgba overlay → `colors.bgOverlay` token.

Deliberately NOT done (judgment calls, logged for Christian): tab-bar glyph icons (✶ ☩ ♡) vs real icons, dark mode as a feature, ScreenHeader/ToggleRow component extraction, spacing-constants refactor, a back affordance on the reading screen, "discard recording" on VoiceRecorder, streak visual past 7 days, waiting-screen "checking…" shimmer.

39/39 tests, typecheck clean.

---

## Key references

- [CLAUDE.md](CLAUDE.md) — overall project guidance, architecture, conventions
- [trial-and-error.md](trial-and-error.md) — debugging log, search here first for any class of bug
- [AGENTS.md](AGENTS.md) — Expo SDK 56 docs pointer

---

## IN FLIGHT (2026-07-26): chapter-keyed reflection prompts

**Decided with Christian, approved after a 20-chapter sample review:**
one prompt per chapter, generated once and stored forever, keyed `(book, chapter)`.
Curated plans (M'Cheyne 365, John 21) get backfilled; Psalms and Cord are already
100% per-day. The live Daniel plan (`1f8273a3…`) is deliberately LEFT ALONE.

**Why:** Ask Pamwe returned 2-3 prompts for a whole plan and planBuilder dealt
them round-robin (`prompts[i % len]`), so Daniel day 5 asked about the fiery
furnace (Daniel 3). Curated plans rotated too: M'Cheyne 30 prompts / 365 days,
John 7 / 21. Chapter-keying fixes it at the root and never re-spends tokens.

**Steps:** (1) `passage_prompts` table + RLS, (2) generate the canon via Batch API
with claude-haiku-4-5, (3) backfill `plan_days.reflection_prompt` from the library
for curated plans, (4) planBuilder reads the library for new custom plans.

**Resumable:** `scripts/gen_passage_prompts.py` caches fetched chapter text AND
every generated prompt to the scratchpad, so a re-run only costs tokens for
chapters not yet done. Nothing is lost if this session restarts.

**DONE 2026-07-26.** 444 chapter prompts generated (claude-haiku-4-5, grounded in
each chapter's own WEB text), applied to hosted, and curated plans backfilled.
Every curated plan is now 100% unique per-day prompts: M'Cheyne 365/365 (was
30), John 21/21 (was 7), Psalms and Cord already were. The live Daniel plan is
untouched, as Christian asked. planBuilder reads the library for new custom
plans and falls back to the old rotation for a chapter not yet covered.

Two traps found the hard way, both now pinned by tests/code:
  * M'Cheyne stores 38 of 437 days as RANGES ("Genesis 9-10"). An earlier claim
    in this file that there were none came from sampling 3 days. Ranges key on
    their FIRST chapter, in both the SQL backfill and client chapterKey().
  * plan_days stores "Psalm 23" (singular) while bible-api answers to "Psalms".
    Un-normalized, both map to one chapter and a single upsert carrying both
    fails outright (ON CONFLICT cannot touch the same row twice).

DONE 2026-07-26: library covers the full 1,189-chapter canon (66 books). Every
chapter of the Bible now has its own prompt, so a custom plan on any book is
covered. planBuilder still falls back if a lookup ever misses.
