# Build 27 — Onboarding, offboarding, and an account you can actually leave

## Context

Two things arrived together on 2026-08-10 and turn out to be the same work.

**The design handoff** `Pamwe onboarding and offboarding (standalone).html` (13
screens, August 2026): 5 onboarding and 8 offboarding. The offboarding half does
not exist in the app at all. Pause, leaving the pair, the sealed archive and
export are features, not screens.

**Five findings in Notion "Pamwe Ramblings"**, all about identity and leaving:
sign out does not sign out, a slow launch to a near-black screen, a reinstall
that walks straight back in, a placeholder icon, and a widget that outlives the
account. Traced to code before planning; see the triage below.

They meet at one place. A person who signs out, pauses, leaves or deletes is
doing the same thing at four depths, and the app currently has no honest answer
at any of them. Build 27 gives it one.

**Christian's decisions (2026-08-10):**
1. **Whole handoff plus the bug fixes in one build.** Not staged across 27 and 28.
2. **Pause is mutual, exactly as drawn.** "Ask Ammy to pause", nothing changes
   until she agrees, and the request can be withdrawn.
3. **Leaving returns the partner to unpaired; the archive is kept for both;
   re-pairing starts fresh.** Even the same two people pairing again begin a new
   journey. A sealed couple is never resurrected.
4. **Invite codes stay at 7 days; the copy changes.** The card's "EXPIRES AT
   MIDNIGHT" is the thing that is wrong, not the database.

**Assumed, state if wrong:** sign-out clears account data (prayers, reflections,
stats, plan caches, the pending voice pointer, the push token, the widget's day
counter) and keeps device preferences (theme, reader scale, translation, verse
numbers) and the downloaded Bible chapters. Scripture is public text and
expensive to refetch; a theme is a property of the phone, not the account.

---

## The triage behind Part 0

| Reported | Verdict |
|---|---|
| Sign out leaves you in the app | **Real, two causes.** No auth guard above the tabs, and sign-out awaits an unbounded network RPC before it clears the session. |
| Slow load to a black screen | **Real.** The gate runs `getSession` → `getUserCouple` → `getActiveCouPlan` in sequence; the 3s splash floor then drops you onto `colors.bg`, which is `#17120E` in dark mode. |
| Reinstall walks straight in | **Not reproduced in code.** The session lives in AsyncStorage only, under `Library/Application Support/<bundleid>/`, which async-storage marks excluded from backup by default and a real delete destroys. No SecureStore anywhere. |
| Placeholder app icon | **Not a build defect.** b26's archive carries `AppIcon60x60@2x.png` and a 272K `Assets.car` with `CFBundleIconName = AppIcon`. |
| Widget outlives the account | **Half real.** Surviving delete is not possible, so that points the same way as the reinstall report. Surviving *sign-out* is real: `shareAnniversary` is only ever called with a date, never with null. |

The last three are one event: an app that was not fully removed. Part 0 still
makes the app robust to it, and Part 0.5 makes it provable.

**Also found, not reported:** every couple-scoped cache is written to disk and
never cleared. `pamwe:prayers:{id}`, `pamwe:reflections:{id}`,
`pamwe:youStats:{id}`, the plan and plan-day caches, `pamwe:pendingVoice:*`.
Even a perfect route guard leaves the previous couple's prayers and reflections
readable on the phone.

---

## Part 0 — Foundation: an account you can leave

Everything else sits on this. Built and verified first.

### 0.1 A guard above the tabs
`(tabs)/_layout.tsx` and `(onboarding)/_layout.tsx` read `useAuth()` and render
`<Redirect href="/(auth)/welcome" />` when the session is gone and auth is
settled. `(auth)/_layout.tsx` does the inverse. Unmounting `(tabs)` takes
`CoupleProvider` with it, so nothing keeps fetching for a user who left.

The gate in `index.tsx` stays as the router; these are the fences. Today the
gate is the only thing that looks at the session, and it only looks while you
are standing on it.

### 0.2 Sign-out that is instant and complete
- `clearPushToken()` needs `auth.uid()`, so it must run before the session
  goes, but it is raced against a 2.5s timeout: it can delay sign-out by at
  most that, never indefinitely.
- Then `supabase.auth.signOut()`, then local cleanup, then
  `shareAnniversary(null)` so the widget stops counting someone else's days.
- Scheduled local notifications are cancelled **by id** (morning, prayer
  reminders, weekly recap). Never a cancel-all: that mistake is already
  documented in CLAUDE.md and it silently killed every prayer reminder once.

### 0.3 `src/lib/localData.ts`
`clearAccountLocalData()` walks `AsyncStorage.getAllKeys()` and removes account
data by prefix, keeping device preferences and the scripture cache. One list,
one place, and a test that pins which side of the line each known key falls on,
so a new cache key has to be classified deliberately.

Called on sign-out, on delete-account, and on leaving the pair.

### 0.4 The launch
- Persist the resolved destination per user (`pamwe:lastRoute:{uid}`) and route
  there immediately on the next cold start, reconciling behind it. A returning
  couple lands on Today at once.
- The waiting state gets the Bloom rather than a bare mark on a near-black
  ground, so the 3s floor never reads as a broken screen.
- A wrong guess (a plan ended while away) corrects itself as the queries land.

### 0.5 Making the reinstall claim testable
A build stamp written on first launch after install, shown in Settings. If a
"fresh install" still carries the previous stamp, the container survived, and we
know that rather than arguing about it.

---

## Part 1 — Onboarding, to the handoff (5 screens)

New component `PamweBloom` — the monogram with roses (`mascot-flowers.png`,
302×372, extracted from the handoff into `assets/images/`). Props `motion`
(sway | still) and `faded` (0.42). The sway is a 7s ease-in-out loop with a 1s
delay, entry is 1s `cubic-bezier(0.22,1,0.36,1)`; both opt out under Reduce
Motion, per the Grove precedent.

**Checked, not assumed:** the artwork is a dark maroon P, so the worry was that
it would vanish on `#17120E`. Composited against both grounds before building:
the maroon holds its shape against the dark background and the roses carry the
contrast. One asset, no dark variant, same as the Grove trees.

| Screen | Change |
|---|---|
| `welcome` | Bloom swaying, "Welcome to Pamwe" / "Growing in Christ", and **three** doors: Sign up, Log in, **I have a code**. Today it is one Get started under "Closer to God. Closer to each other." The third door is also the cold-start invite path. |
| `sign-in` | Bloom still and small, providers first: Continue with Apple, Continue with Google, then **Use an email address** as a ghost. Keeps the `@review.pamwe.app` password path. |
| `invite` | Eyebrow LAST STEP, "Send your partner this code", the code at 32px Fraunces with 7px tracking, and the real expiry underneath (decision 4). Share the code / Later. |
| `waiting` | **New screen.** Faded Bloom, "Waiting for {partner}", one action: Send the code again. Invite currently doubles as this; splitting them is what the handoff asks for and gives the waiting state one job. |
| `connected` | Two avatars, floral divider, "{partner} joined", Begin today's reading. **The round-2 notification priming card must survive this redesign** — it is why fresh installs are no longer prompted at sign-in. |

Every other component the handoff names already exists: `Avatar`, `BackLink`,
`Button` (all four variants), `Card`, `Floral`, `SectionEyebrow`, `Spinner`,
`StripedBanner`, `Text`.

---

## Part 2 — Pause, as a mutual decision (3 screens)

### Data
- `couples.paused_at`, `couples.paused_by` (nullable).
- `couple_requests(id, couple_id, kind, requested_by, status, note, created_at,
  responded_at)`. `kind` in (`pause`, `restart`, `leave`), `status` in
  (`pending`, `accepted`, `declined`, `withdrawn`). One table for every
  both-of-you decision, since leaving needs the same shape and the backlog
  already wants it for plan and cadence changes.
- RPCs in the pairing-RPC house style (SECURITY DEFINER, pinned `search_path`,
  revoked from public/anon): `request_pause()`, `respond_to_request(id, accept)`,
  `withdraw_request(id)`, `request_restart()`. Each takes the couple row
  `FOR UPDATE` so two phones cannot both answer.

### The streak
The handoff promises "Your streak of 9 stays where it is" and then "Your streak
starts again at 9". Our streak is **derived**, not stored: `compute_streak()`
replays sealed days on every seal. So a pause is not a saved number, it is a
stretch the replay must skip. `compute_streak()` learns to subtract paused
intervals from the gap between consecutive sealed days, which keeps the property
that made it derived in the first place: idempotent, self-healing, and
backfillable by re-running it.

### Behaviour
- While paused: no morning reminder, no recap, no prayer review, no partner
  pushes. Today becomes the paused screen.
- `notify-pause-request` and `notify-pause-response`, both behind the shared
  webhook secret like every other target.
- Screens: **pauseAsk** (from Settings, keeps a back link), **pauseSent**
  (spinner, "Nothing changes until she agrees", Withdraw), **paused** (striped
  banner with the date, "Day 9 is saved", Ask her to restart / Read old notes).

---

## Part 3 — Leaving, the archive, and export (4 screens)

### Data
- `couples.left_at`, `couples.left_by`, `couples.farewell_note`,
  `couples.farewell_read_at`.
- `leave_couple(p_note)` — one transaction: seal the couple, null **both**
  users' `couple_id`, cancel any pending requests. Per decision 3 the row is
  never revived; pairing again mints a new couple.
- **Archive RLS is the careful part.** Every policy today reaches rows through
  `current_user_couple_id()`, which is null the moment you leave. Sealed couples
  need a second read path keyed on `partner_a_id`/`partner_b_id` for `couples`,
  `entries`, `plan` context and the response tables. Read only: no policy gains
  a write path to a sealed couple.
- The gate learns a sixth state: **no couple, but archives exist** → a screen
  that offers both a new pairing and the archive, rather than dropping someone
  who just left into the value slides.

### Screens
- **leave1** — SAD TO SEE YOU GO, "Ending the journey", the one fact first:
  the notes stay readable for you both. Continue / Go back.
- **leave2** — "Leave the pair", an optional note, and copy that says plainly
  she reads it once. Leave / Go back.
- **closed** — "You left the pair", the archive summary row (days, notes, READ
  ONLY), Open the archive. No guilt copy.
- **archive** — striped READ ONLY, SEALED banner, "151 days / 128 NOTES", the
  dated entries, Export a copy.

The farewell note is shown to the partner exactly once and stamped
`farewell_read_at`, which is the whole mechanism. Nothing stored twice.

### Export
`Export a copy` produces **one readable file** of every note, dated, and hands
it to the iOS share sheet. Not JSON: the design says "keep a copy first", which
means a copy a person can read in ten years, so it is formatted text. This is
the backlog's "private export", now designed.

---

## Part 4 — Delete account, reshaped

The screen exists; the handoff changes its shape and its honesty. "Your profile
and private notes go today. The 151 shared days need {partner} to agree" is
exactly our demote-don't-delete rule stated out loud for the first time. Export
sits **above** the destructive action, in a KEEP A COPY FIRST card, not beside
it. `delete_account()` itself does not change.

---

## Status (2026-08-10)

**Parts 0 to 4 are done in the working tree**, on branch `build27` (`49bed7a`,
`b0194be`). Verified, not just written:

- both migrations replay clean from scratch via `supabase db reset`
- `rls_probe.sql` grew to **22 sections** and is green against that database,
  including the two that matter most: the person who asked cannot answer
  themselves, and leaving does not unlock a reflection the partner never earned
- 44 Jest suites / 403 tests, `tsc --noEmit` clean
- generated database types and expo router types both regenerated

Two things found while building that the plan had wrong:

1. **The Bloom needs no dark variant.** Composited against both grounds rather
   than guessed at: the maroon holds and the roses carry the contrast.
2. **The waiting screen could not be called `waiting`.** `(today)` already has
   one, and both would flatten to `/waiting`. It is `code-sent` on disk, which
   also says what actually happened.

### On hosted (2026-08-10)

Both migrations are applied to `jcyhhxgomhopkoqesbkb` via MCP `apply_migration`,
by name, after `get_project_url` confirmed the ref. Verified after: 6 new
`couples` columns, 2 tables, 9 functions, 2 triggers, 6 policies, and **no
couple's state changed** (0 paused, 0 sealed). `get_advisors` shows no new
warning CLASS: the seven new SECURITY DEFINER functions joined the existing
list, and `paused_days_between` / `refresh_streak` correctly do not appear,
which is the revoke working.

`notify-couple-request` is deployed at v1 with `verify_jwt = false`, and
answers **401** to a caller with no secret and to one with the wrong secret. A
missing env var would be a 500, so that also proves the dashboard secret is
readable and that the `../_shared/` files resolved.

**The seven modified notifiers are NOT redeployed, on purpose.** `notify-partner`,
`notify-new-prayer`, `notify-new-dream`, `notify-new-note`,
`notify-verse-comment`, `notify-nudge` and `notify-thinking` each gained
`paused_at` in a select and an early return. Every one of them is **inert until
build 27 is on a phone**, because nothing can create a pause before then, and
the versions running now are unaffected by the new columns (adding a column
does not break a select that does not name it).

They belong in build 27's own deploy pass, which has to happen anyway. Doing
them now would mean hand-transcribing seven live notification functions for no
present benefit, and the ordering rule still holds when that pass comes:
**migrations first, functions second**, or a function that selects `paused_at`
against a database without it 500s every notification.

**Still open before this ships as a build:** the archive is reachable only from
the left-the-pair screen, so a couple who are still together cannot browse it
(correct, there is nothing to browse); on-device two-phone testing of pause,
withdraw, leave and the once-only farewell note; and the b26 checklist re-run.

---

## Verification

- `supabase db reset` replays every migration clean, then `rls_probe.sql` green.
- **New probe sections, in the same round:** a sealed couple is readable by both
  ex-partners and by nobody else; no write reaches a sealed couple; a pause
  request cannot be answered by the person who made it; `respond_to_request` is
  refused for an outsider; a left user's `couple_id` really is null; the
  farewell note is readable once by the recipient and never by a third party.
- Jest: local-data classification, the streak under a pause, request state
  machine, gate routing with archives.
- On device, two phones: sign out and confirm the app is actually out, including
  the Bible tab; pause from one phone and accept on the other; withdraw; leave
  and read the note on the other phone; open and export the archive.
- The whole b26 checklist still passes.

---

## Size and risk

This is the largest single round since the design-handoff rebuild. Part 0 is
about a day and pays for itself immediately. Parts 2 and 3 are each a migration,
RPCs, notifications, screens and probe sections, and Part 3's archive RLS is the
riskiest thing in the round because it adds a second read path to tables that
have exactly one today.

**Sequence: 0 → 1 → 2 → 3 → 4**, and Part 0 ships correctly even if the round is
cut short, which is the point of doing it first.
