# CLAUDE.md

Guidance for Claude Code (claude.ai/code) when working in this repo.

---

## Project: Pamwe — Couples devotional app

Mobile app for couples to read the Bible together using the M'Cheyne Reading Plan, journal individually, then unlock each other's reflections only after both submit. Built for Christian and his partner Ammy first; designed to generalize.

**Stack:**
- Expo SDK 56, React Native 0.85, React 19, expo-router
- Supabase (Postgres + Auth + Realtime + Storage + Edge Functions)
- TypeScript, Jest + @testing-library/react-native
- **iOS-only** (Christian's call, 2026-08-11): Android compiles but is not a target; no Android validation work until real user demand says otherwise

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
npx jest                               # full test suite (mocks Supabase: proves nothing about RLS)
npx tsc --noEmit                       # typecheck
npm run lint                           # eslint — 0 errors and GATING in CI since 2026-08-11 (backlog burned;
                                       # rule decisions + reasons live in eslint.config.js; the 18
                                       # exhaustive-deps warnings are advisory on purpose)

# Does the DATABASE actually refuse what we think it refuses? Needs `supabase
# start` + ./scripts/local_dev_seed.sh. Asks as a real signed-in outsider.
docker exec -i supabase_db_Pamwe psql -U postgres -d postgres \
  -v ON_ERROR_STOP=1 -f - < scripts/rls_probe.sql

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
#     restore or apply anything there.
#
# env.hosted.backup DOES hold the ACTIVE project's values (verified 2026-08-02:
# its EXPO URL, session-pooler SUPABASE_DB_URL and service_role key all carry
# ref jcyhhxgomhopkoqesbkb). The cutover rewrote it, so it is the one place on
# disk with hosted DB credentials. Still decode any key's `ref` claim before
# trusting it.
#
# ⚠️ The `supabase` CLI is logged into the WRONG (main) account: `supabase
# projects list` returns the dead project and cannot see jcyhhxgomhopkoqesbkb
# at all. So `supabase secrets set` and `functions deploy` do NOT work for
# hosted. Until that is re-authed:
#   • DDL      -> MCP apply_migration (by name; never db push)
#   • edge fns -> MCP deploy_edge_function (pass the file contents inline)
#   • secrets  -> the Supabase dashboard, by hand
#   • bulk seed (too big to pass through MCP) -> borrow the local container's
#     psql to reach hosted, which is how the 7.7MB catalogue was loaded:
#       DBURL=$(grep '^SUPABASE_DB_URL=' env.hosted.backup | cut -d= -f2- | tr -d '"')
#       docker exec -i supabase_db_Pamwe psql "$DBURL" -v ON_ERROR_STOP=1 -q < <file>
```

```bash
# TestFlight release (terminal pipeline; Apple Dev approved, ASC record exists).
# 1. Bump CURRENT_PROJECT_VERSION in ios/Pamwe.xcodeproj/project.pbxproj (NOW 4 spots:
#    2 for the Pamwe app + 2 for the VerseWidget target's Debug/Release configs).
#    Both Info.plists read $(CURRENT_PROJECT_VERSION) — never hardcode there. The
#    embedded widget appex CFBundleVersion MUST equal the app's or Apple processing
#    rejects the build. (CFBundleShortVersionString is the literal 1.0.0 in both
#    Info.plists; bump both if the marketing version ever changes.)
# 2. Archive. ⚠️ THE BUNDLE PHASE MUST EXPORT NODE_ENV=production, and it only
#    does because it was hand-patched (2026-08-08). @expo/env chooses its .env
#    files from NODE_ENV. The `expo` bin wrapper (node_modules/expo/bin/cli) sets
#    it from --dev false, which is why `npx expo export:embed` is always right,
#    but the Xcode phase calls @expo/cli/build/bin/cli DIRECTLY through
#    react-native-xcode.sh, bypassing that wrapper. Unset, the bundler loads only
#    .env.local and .env, and .env is the LOCAL stack: the archive silently bakes
#    in http://<LAN-IP>:54321 plus the LOCAL anon key and ships an app that can
#    reach nothing. Setting NODE_ENV in the shell or as an xcodebuild build
#    setting does NOT work: neither reaches the script phase. The fix is the
#    `else export NODE_ENV=production` branch now living in the phase's
#    shellScript, beside the Debug SKIP_BUNDLING branch.
#    ios/ IS GITIGNORED, so a regenerated ios/ loses this patch too. It joins the
#    sentry-xcode.sh splice and PrivacyInfo.xcprivacy on the redo list, and the
#    whole list is now restored by one script (canonical copies in scripts/ios/):
#      GEM_HOME=/opt/homebrew/Cellar/cocoapods/1.17.0/libexec \
#        /opt/homebrew/opt/ruby/bin/ruby scripts/restore_ios_patches.rb --check
#    --check changes nothing and exits 1 on drift, so run it BEFORE an archive;
#    drop the flag to repair. It also catches an app/widget CURRENT_PROJECT_VERSION
#    mismatch, which Apple rejects and which burns the build number.
#    To check env resolution in seconds instead of a 20 minute archive:
#      npx expo export:embed --entry-file node_modules/expo-router/entry.js \
#        --platform ios --dev false --reset-cache --bundle-output /tmp/t.jsbundle \
#        --assets-dest /tmp/tassets && grep -c <project-ref> /tmp/t.jsbundle
#    ⚠️ .env.production is GITIGNORED since 2026-08-02 (it was tracked in a public
#    repo). It must exist on disk under that exact name or Release bundles an
#    undefined Supabase URL and step 3's grep returns 0. A fresh clone has to
#    rebuild it from env.hosted.backup first.
#    Source maps: the Bundle React Native build phase is wrapped with
#    @sentry/react-native's sentry-xcode.sh (spliced by hand 2026-08-03; ios/ is
#    gitignored, so a regenerated ios/ loses the splice AND ios/Pamwe/
#    PrivacyInfo.xcprivacy's eight collected-data types — redo both). It reads
#    ios/sentry.properties (gitignored: org zakia-12, project pamwe-ios, plus an
#    org auth token Christian creates in the Sentry dashboard). Upload failures
#    only warn (SENTRY_ALLOW_FAILURE=true in the phase), so a missing token
#    never burns a build; it just ships minified stacks.
#    ⚠️ THAT FLAG IS NOT AS SAFE AS IT SOUNDS (2026-08-08). sentry-cli wraps the
#    WHOLE `export:embed` command, and export:embed is what builds the JS
#    bundle, not just the source maps. A bundler crash is therefore swallowed
#    as "Source maps upload failed, but continuing build" and the archive
#    reports ** ARCHIVE SUCCEEDED ** with NO main.jsbundle inside the .app: a
#    binary that looks shippable and launches to a red screen.
#    CLOSED 2026-08-08: the bundle phase now re-asserts, AFTER the wrapper
#    returns, that $CONFIGURATION_BUILD_DIR/$UNLOCALIZED_RESOURCES_FOLDER_PATH/
#    main.jsbundle exists and is non-empty, and fails the build when it does not.
#    react-native-xcode.sh already checked exactly this, but its check runs
#    INSIDE the wrapper, so sentry-cli swallowed that too; the new one sits
#    outside where nothing can catch it. It skips when SKIP_BUNDLING is set
#    (Debug) and still propagates the wrapper's own exit status. Step 3 below
#    stays in the checklist anyway: this guard proves a bundle EXISTS, only the
#    grep proves it points at the right Supabase project.
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
├── _layout.tsx                    # root providers (Theme, Auth, deep-link) + GestureHandlerRootView; CoupleProvider mounts in (tabs)/_layout, push registration lives in AuthProvider
├── (auth)/                        # welcome, sign-in, magic-link
├── (onboarding)/                  # value-slides, name, pair-choice, invite, join, connected, plan-select
└── (tabs)/                        # 6-tab DOCKED bar (DockedTabBar; the b7 glass oval is gone): Today · Bible · Plans · Prayers · Reflect · You
    ├── (today)/                   # home (tree streak, catch-up, nudge) → reading → journal → waiting → reveal → complete
    ├── bible/                     # index → [book] → [book]/[chapter] reader (6 translations, 2 sources); marks, note, verse (the discussion on one verse)
    ├── plans/                     # index (search + Build/Browse doors, Your plans / Saved for later) → [id] detail; build (generate + save), builder (by book or topic), browse (topic/length grid), finished (list)
    ├── prayers/                   # index = Prayers|Dreams toggle (swipe cards + detail sheet w/ reminders) → add · dream-add → timeline (answered)
    ├── reflect/                   # index (history + From-your-story card) → [id] detail (responses) → words (Their Words)
    └── you/                       # index (stats + dark toggle) → settings, recaps, grove (tree awards), couple (→ anniversary), privacy, terms, delete-account
```

**Ask Pamwe lives in the Plans search field, and nowhere else** (2026-08-01). The floating bubble and its sheet are gone: it was only ever used in Plans, it made the app read as an AI product, and every screen paid 96pt of scroll clearance for it. `Screen.tsx` now ends its scroll at a flat 32pt. Search filters the plans a couple can already open and offers to generate only when nothing matches, so generation is the fallback rather than the front door.

A shared plan travels by link (`pamwe://plan/<token>`, [src/app/plan/[token].tsx](src/app/plan/%5Btoken%5D.tsx)), which opens a preview and never enrols anyone automatically. `plans.share_token` is minted on Share; `plans.is_public` is the separate, deliberate step of offering it in Browse. Popularity does not graduate a plan on its own.

The design-handoff rebuild (2026-07) replaced the 2-tab app with this 6-tab shell. **Theming:** every screen reads colors from `useTheme()` ([src/providers/ThemeProvider.tsx](src/providers/ThemeProvider.tsx)) over the light+dark palettes in [src/theme/tokens.ts](src/theme/tokens.ts); the user toggles light/dark in the You tab. Legacy [src/constants/colors.ts](src/constants/colors.ts) is a **frozen light-only palette** kept for a few pre-auth/onboarding files only — **never import it in new code; use `useTheme()`.**

Auth gate in [src/app/index.tsx](src/app/index.tsx) sequences:
1. No session → `(auth)/welcome`
2. Session, no couple → `(onboarding)/value-slides`
3. Session, couple not paired → `(onboarding)/invite` (shows the code and waits; there is no separate waiting screen)
4. Session, paired, no plan → `(onboarding)/plan-select`
5. Session, paired, has plan → `(tabs)`

### Supabase data model (13 tables, all RLS-enabled)

| Table | Purpose |
|---|---|
| `users` | Profile mirror of `auth.users`. Created by `handle_new_user` trigger. Holds `couple_id`, push token, notification prefs, `accepted_terms_at`. **UPDATE is a column-level grant, not a policy** (2026-08-08): the client may write display_name, avatar_initial, the six notification_* prefs and accepted_terms_at, and nothing else (`expo_push_token` dropped 2026-08-11 with the legacy column; device tokens live in `push_tokens` via the `save_push_token`/`clear_push_token` RPCs). `couple_id` was self-assignable, and `users_select_partner` / `share_plan()` / `plan_days_update_custom` all trusted it. A new client-written column needs adding to that grant. |
| `couples` | Invite code + partner_a/b + paired_at + streak state + timezone + `anniversary` (nullable DATE, written via the `set_couple_anniversary` RPC). **No INSERT or UPDATE reaches this table from the client at all** (2026-08-08): pairing goes through `create_couple` / `join_couple` / `regenerate_invite_code`, and `couples_select_own` is the only policy left. |
| `plans` | Reading plans. Curated (M'Cheyne 365, John 21, Psalms 30, Cord 21) + couple-built custom plans (`is_curated=false`, `couple_id`, `created_by`). Browse metadata cols: `tagline/about/explore/gain/minutes_label/rhythm_label/book_label`. |
| `plan_days` | Rows per plan-day: passage ref, text (**nullable** — custom plans store NULL and live-fetch), pull quote, reflection prompt. |
| `couple_plans` | A couple's enrollment in a plan (current_day, start_date, status, `cadence_days`). |
| `entries` | Per-user per-day reflection. Type text or voice. `submitted_at` is the locked-reveal trigger. `transcript` (nullable) holds the on-device voice transcript. |
| `entry_responses` | Hearts/amens/replies/kept-lines a partner leaves on a revealed reflection (`kind`: heart/amen/reply/quote). RLS mirrors locked-reveal via `can_respond_to_entry()`; in the realtime publication. **`parent_id` (2026-08-07) makes replies a chain of any depth**: hearts, amens and kept lines stay flat and stay on the partner's entry, but a reply may answer a reply, which is the one case where your words sit under your OWN reflection. `can_respond_to_entry()` refuses that by design, so a reply carrying a parent is authorised against the parent instead (`can_reply_to_response()`). |
| `prayers` / `prayer_marks` | Shared prayer requests with "I prayed today" marks. `prayers.category` (family/health/work/guidance/thanks/other); author-only update/delete. |
| `dreams` | Couple-shared dream journal (both partners read, author-only edit/delete). **Pamwe never interprets a dream** (see the rule below). |
| `verse_note_responses` | The discussion under a verse note (`kind`: heart/amen/comment), couple-scoped and author-owned, cascading off the note row. The note itself stays ONE shared note either partner may edit, so this is where the second voice goes instead of overwriting the first. Flat, not threaded: a verse note is a thing you are both looking at. In the realtime publication; comments push via `notify-verse-comment` on the note's own `notification_note` preference, hearts and amens are filtered out at the trigger. |
| `verse_highlights` / `verse_notes` | Per-couple shared study layer over the Bible reader (one highlight + one note per verse per couple; `user_id` = authorship, last-writer-wins via the upsert). Both are in the realtime publication since 2026-08-02, so a partner's mark appears while you are both in the same chapter; the reader carries **their initial** on what they marked, and a written note pushes them (`notify-new-note`; plain highlights stay silent, deliberately). |
| `ask_pamwe_usage` / `partner_nudges` | Service-role-only bookkeeping (RLS on, zero policies): Ask Pamwe rate limiting (20/day + cooldown via `bump_ask_pamwe_usage` RPC) and nudge cooldowns (1/hour). |
| `passage_prompts` | Chapter-keyed reflection questions, one per chapter, all 1,189. Keyed `'Psalm N'` like plan_days, NOT `'Psalms'` like the catalogue: normalise at any join. Its DDL lived only on hosted until the 2026-08-02 backfill migration. |
| **catalogue** (5 tables) | `bible_books` / `bible_chapters` / `bible_verses` / `bible_passages` / `bible_vocabulary`. Reference data: SELECT for authenticated, writes service-role only. See below. |

### The Bible catalogue

31,103 WEB verses, 3,083 passages and all 1,189 chapters, tagged by **what they
are about**, so plan generation can retrieve instead of improvise. Built once
(2026-08-01, ~$2.81, 1189/1189 chapters accepted) by
[`scripts/gen_bible_catalogue.py`](scripts/gen_bible_catalogue.py) against the
spec in [`scripts/bible_catalogue_spec.py`](scripts/bible_catalogue_spec.py),
emitted to SQL by `scripts/emit_bible_catalogue_sql.py`. Applied to local and
hosted.

**The governing rule: a tag names SUBJECT MATTER, never application.** `grief`
yes; `suffering-is-discipline` no, because that is a reading. This is "points,
never preaches" applied to the catalogue, and it matters most here because
nobody will ever audit 31,103 rows: an interpretation that gets in at tag time
silently shapes every plan built from it.

- **The vocabulary is the one irreversible decision.** 65 themes with glosses, 8
  tones, 9 genres, 7 caution flags, all closed sets living in the spec file and
  mirrored into `bible_vocabulary` (which ask-pamwe reads at runtime, so the DB
  is the source of truth for what a theme is). Changing a term means re-tagging.
- **Passage boundaries are NOT model output.** They are the BSB's printed
  section positions, fixed in code before the call (positions only, never the
  titles, which are readings). The spec header records why: three rounds of
  steering boundaries with prose oscillated (coarse, then slavish, then
  confetti), while every constraint enforced in code held at 100%.
- **`caution[]` is the pastoral guardrail.** `retrieve_passages()` returns a
  flagged passage only when EVERY flag it carries was explicitly allowed, so a
  couple asking about infertility meets Hannah while a couple in ordinary grief
  never stumbles into a dead child. Known soft spot: caution recall measured
  6/4/5/4 out of 6 across sample runs with no relation to prompt wording. A
  caution-only sweep over the finished catalogue is the fix if it bites.
- Empty `themes` on a verse is **correct and deliberate** (9% of the canon): a
  name in a genealogy is about nothing, and tagging it would bury the passages
  that really are about family.
- Re-emitting is free: the run caches are frozen gzipped in `scripts/`, and
  `SPEC_VERSION` is part of every cache key, so bumping it regenerates rather
  than serving stale tags.

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
- **Every webhook target checks a shared secret** (2026-08-08). `verify_jwt=false` means the gateway lets anyone POST to these, and until this round nothing else checked: two of them put request-body text straight onto a partner's lock screen. The triggers now send `x-webhook-secret`, resolved by `notify_config()` from the same GUC-then-Vault path as the URL and key (`app.settings.notify_webhook_secret` / Vault `notify_webhook_secret`), and every function refuses without it (`_shared/webhook.ts`). **A missing `NOTIFY_WEBHOOK_SECRET` env var is a 500, not an open door.** The secret must exist on BOTH sides or no notification is delivered: set the dashboard secret and the Vault row before deploying a function that checks it. `notify-new-prayer`, `notify-new-response` and `notify-new-note` also re-fetch their row by id and ignore the request's copy, so the push can only ever say what a real row says.
- Other webhook targets (verify_jwt=false): `notify-new-prayer`, `notify-new-dream`, `notify-new-response`, `notify-new-note`, `notify-verse-comment`. `notify-new-response` tells whoever is being ANSWERED: the parent reply's author when there is one, the entry's author otherwise, which is what makes a chain reach the right phone. **Push banners actually deliver since b10/b11** (APNs key on Expo).
- `delete-account` — user-invoked (verify_jwt=true): demote-don't-delete routine; the survivor keeps everything, a never-paired couple row is detached (`users.couple_id` nulled first) and deleted. **The database half is one transaction** (`delete_account(p_user)`, service-role only) since 2026-08-08: it used to be eighteen statements committing one at a time, so a failure halfway left content permanently gone behind a 500 that claimed nothing had happened. The function now does storage FIRST with a **checked** error (`.remove()` returns `{data,error}` and does not throw, so the old try/catch never saw an RLS refusal and left recordings orphaned once the entries rows were deleted), then the RPC, then `admin.deleteUser`, then the partner push LAST. The auth-row delete stays outside the RPC on purpose: that schema is GoTrue's.
- **`notify-nudge`** / **`notify-thinking`** — user-invoked (verify_jwt=true): "nudge my partner" and "thinking of you" from Today; each pushes to the partner, one per sender per hour **per kind** (cooldowns logged in `partner_nudges.kind`, so one never silences the other).
- **`ask-pamwe`** (build v9, 2026-08-02) — **"Pamwe points, never preaches"** (Christian's product line: no Scripture interpretation, ever; interpretation questions deflect gently). Three schema-constrained modes: **`build`** (ONE plan, the Plans search), `plans` (2 recs, the by-book builder) and `help` (unreachable since the sheet was removed). Every schema carries a required `off_topic` flag; the server swaps flagged output for one fixed gentle line. Per-user rate limit 20/day + 10s cooldown, fail-open. **verify_jwt=true.**

  **`build` never asks a model for a Bible reference.** It reads the [Bible catalogue](#the-bible-catalogue) instead, in three steps: **intake** maps what a couple typed onto the closed theme vocabulary (so "we lost our dog" becomes `grief` without anyone having predicted dogs) and decides which `caution` flags to unlock; **`retrieve_passages()`** picks the candidate pool in plain SQL; then the **arranger** answers with candidate **indices into that pool**, schema-constrained to `0..poolSize-1`, and the server maps them back to references itself. An invented reference has nowhere to enter the pipeline, structurally rather than by instruction. Day notes are catalogue summaries and `meta`/`rhythm` are computed. (The "You will be asked" preview was **removed 2026-08-02**: it cost up to three extra `passage_prompts` round trips before the couple saw anything, to show questions the plan screen shows anyway. `build` now returns `prompts: []`; `createCustomPlan` still resolves the real prompts from `passage_prompts` at creation.) A named book skips the models entirely and walks its chapters. `validateReadings` still runs on the assembled result as a backstop, since a plan day that cannot load is the one failure the app cannot recover from.

  v8's two-pass `PLAN_SPEC` brief is **deleted**: it asked a model to write references and needed an ever-growing rulebook to keep them loadable. Build runs on **OpenAI** (`OPENAI_API_KEY`, model `OPENAI_MODEL`, default `gpt-5.6-luna`, the family that tagged the catalogue); `plans`/`help` still run on the Anthropic SDK (`ANTHROPIC_MODEL`, default `claude-haiku-4-5`). Both keys live locally in gitignored `supabase/functions/.env`; hosted they are dashboard secrets (the CLI cannot reach the project, see the identity block above). Clients: `src/lib/askPamwe.ts` (`buildPlan` returns a typed plan/off_topic/error and deliberately does NOT fall back to stock recs, since a build answers something the couple typed; `askPamwe` still falls back to hardcoded recs for the by-book builder).

  **An account failure must not read as weather** (2026-08-09). A dead key or an empty credit balance is not "try again in a bit": it stays broken until someone tops the account up, and both times it has happened (b21 Anthropic, 2026-08-09 both providers at once) the friendly copy is why nobody noticed for days. The server classifies the thrown model error (`isAccountFailure`: 401/402, or `insufficient_quota` / `credit_balance_exhausted` / `credit balance` in the body, since Anthropic reports exhaustion as a **400**) and answers **503 with `unavailable: true`** instead of the generic 502. A bare 429 stays transient on purpose, that is an ordinary rate limit. On the client, `serverSaid()` reads the body back off `FunctionsHttpError.context`: **`functions.invoke()` reports every non-2xx as an error with `data` null**, so before this the server's sentence was always discarded and replaced with the generic line. "Resting for a moment" now appears only for a real timeout, a dead network, or an unreadable body, which is the only time it is true. Tested in `build-plan-errors.test.ts`.

---

## Hard rules / conventions

### Don't reach across the lib layer

UI screens go through `src/lib/*.ts` (couples, entries, plans, notifications) which wrap the Supabase client. Don't call `supabase.from(...)` directly from a screen.

### A recording leaves the phone on Send, and not one moment before

Christian's call, 2026-08-07, when the send was made faster. The obvious
optimisation is to upload while the recorder sits on its preview, since the
sender always spends a beat there and the storage policy is path-based
(`voice_insert_own` needs no `entries` row, so it would work). **Don't.** The
app's promise is that a reflection is yours until you decide to share it, and
bytes on a server before that decision is not that, whatever RLS says about who
can read them. A re-recorded take would also have to be chased and deleted.

What the send does instead ([journal.tsx](src/app/(tabs)/(today)/journal.tsx)
`handleVoiceComplete`), all of it latency removed without moving the bytes:

- `ensureVoiceDraft` and `uploadVoiceRecording` run **in parallel**. The object
  path is `{couple_plan_id}/{day_number}/{user_id}.m4a`, so the upload never
  needed the draft row; waiting for it cost two round trips.
- `submitVoiceEntry` attaches the audio and seals in **one** UPDATE. Two writes
  also left a window where an entry carried audio but was not sealed. It is
  idempotent the same way `submitEntry` is, and for the same reason.
- **Neither send path awaits `refresh()` before navigating.** `waiting.tsx`
  mounts its own `useTodayEntry` and refetches on arrival, and every screen
  holds its own hook instance, so that await updated nothing anyone reads.
- The recorder writes **mono 64 kbps** AAC (`VOICE_QUALITY` in
  [VoiceRecorder.tsx](src/components/VoiceRecorder.tsx)), not the stereo 128 kbps
  of `RecordingPresets.HIGH_QUALITY`, which spent 16 KB a second on a single
  mono microphone: 4.8MB for a five-minute reflection, and the sender waited for
  all of it.

### Decimals on the DB side, not floats

`couples.streak_count`, `couple_plans.current_day`, `entries.audio_duration_seconds`, `plan_days.day_number` are all `int4`. Anything monetary or stat-y would be Postgres `numeric`, not JS `number`. There's nothing of the latter category yet.

### Cadence: the day advances on Amen, and a streak means sessions kept

Two coupled rules, both from the 2026-07-14 round:

**`current_day` only ever moves when a partner taps Amen on the reveal**
([reveal.tsx](src/app/(tabs)/(today)/reveal.tsx) → `advancePlanDay`). The DB
trigger used to bump it the instant both partners submitted, which pulled every
ritual screen onto the next, empty day and ate the reveal. `advancePlanDay`
guards on `current_day` so a double tap is a no-op, and **the reveal pins its day
via a `day` route param** (`useTodayEntry(dayOverride)`) so the other partner's
Amen can't shift it mid-read. Nothing else writes `current_day`: a client that
doesn't call it will freeze the plan.

**`couple_plans.cadence_days`** (1 daily, 2 every other day, 7 weekly) is set per
enrollment, since M'Cheyne is dated and inherently daily. It feeds three things,
which must stay in step: `expectedDay`/`daysBehind` ([catchup.ts](src/lib/catchup.ts)),
the streak trigger, and the morning reminder. **A streak counts plan days
completed**, not calendar days, and since 2026-07-26 it is **derived, never
incremented**: `compute_streak()` replays the couple's sealed days from `entries`
on every seal, so it is idempotent and self-healing. The old trigger nudged a
stored counter, which meant a missed fire or an out-of-order seal left it wrong
permanently with no way back.

The window is **`cadence_days + 4`**: miss up to four days in a row and the streak
survives, a fifth breaks it. Two readings sealed on the same day count **twice**,
so catching up is credited (the old same-date guard silently skipped the second).
Christian's call, after a couple who had read 9 days across 15 calendar days saw
a streak of 1. Widening or narrowing forgiveness is the `+ 4` in that function,
and re-running the same function backfills every couple.

**The cadence gate: you cannot read ahead, and that rule is DIRECTIONAL**
(Christian, 2026-08-02). `canOpenDay()` ([catchup.ts](src/lib/catchup.ts)) opens
every plan day up to `expectedDay` and nothing past it.

- **Behind, you may open several days in one sitting.** That is catching up and
  it stays credited, per the rule directly above. Any change that blocks
  multiple days in a day reverses that decision, so do not "simplify" this to
  one-reading-per-calendar-day.
- **Ahead, nothing opens.** Reading tomorrow's tonight turns a ritual into a
  backlog, and a couple who clear four days on a Sunday have nothing to do
  together on Monday.
- It **fails open without a `start_date`**: never lock a couple out of their own
  plan over a null column.
- **The seal is the journal**, not Today's button. Today stops offering the day
  and the plan list withholds plan context (so a future day opens as plain
  Scripture with no Reflect button), but `journal.tsx` is the one place that
  must refuse, because every path to writing comes through it.
- **Scripture is never locked.** The Bible tab reads anything at any time. Only
  the day's *reflection* waits.
- `opensOn()` inverts `expectedDay` so the gate and the "opens tomorrow morning"
  line read off one rule and cannot drift; a test asserts the inversion holds at
  every cadence.

When the day is closed, Today becomes `DayClosed`
([src/components/DayClosed.tsx](src/components/DayClosed.tsx)): the verse just
sealed, when the next day opens, and doors to prayers and the Grove. **It has no
primary action on purpose.** It also holds the SEALED day's pull quote, fetched
separately, never the shut day's, which would be the reading-ahead the gate
exists to stop.

The morning reminder uses a DAILY trigger at cadence 1 and individually **dated**
reminders otherwise (no repeating trigger honours both a rhythm and a chosen
clock time), topped up on each sign-in by `scheduleMorningFromPrefs`. It cancels
**by id** (`pamwe-morning*`): it used to call `cancelAllScheduledNotificationsAsync()`,
which silently killed every prayer reminder on launch while their stored ids
still claimed they were set. Never reintroduce a cancel-all here.

### The invite code is a credential, so pairing lives in the database

Christian's round, 2026-08-08, after a security review. The three pairing calls
in [src/lib/couples.ts](src/lib/couples.ts) are `supabase.rpc()` wrappers over
`create_couple` / `join_couple` / `regenerate_invite_code`
([20260808000001](supabase/migrations/20260808000001_pairing_rpcs.sql)). **Never
put pairing back on table writes**, and never add a SELECT or UPDATE policy to
`couples` that reaches a row the caller is not already in.

The code used to be a client-side `.eq()` filter and nothing more. The database
never saw it, so `couples_select_by_invite` (no `auth.uid()`, no code term) let
any signed-in user list every pending invite, and `couples_update_join` let them
claim one without it. Three round trips with no transaction meant a drop between
the second and third left a couple paired with the joiner's profile unlinked.

- Codes come from `gen_random_bytes`, not `Math.random()`, over the same
  ambiguity-free 32-symbol alphabet. Expiry is `now() + interval '7 days'`
  decided server-side; the client used to send it, so a modified client could
  mint an invite that never expired.
- `join_couple` takes the row `FOR UPDATE`, so two devices racing one code cannot
  both pass the unpaired check, and it writes `couples` and `users.couple_id`
  together.
- **Unknown, spent and expired all raise the same sentence.** Not tidiness: a
  distinguishable error is an oracle telling a stranger which codes are real.
  Those strings are user-facing copy (join.tsx alerts `e.message`).
- No throttle, deliberately. Enumeration is gone, so guessing is blind over 32^6
  against rows that expire in a week. Revisit only if the logs show it happening.
- The rules are tested in [scripts/rls_probe.sql](scripts/rls_probe.sql), not in
  Jest, because Jest mocks the client and would pass whatever the database does.

### Timezone is captured once at couple creation, immutable in v1

[src/lib/couples.ts](src/lib/couples.ts) writes `Intl.DateTimeFormat().resolvedOptions().timeZone` into `couples.timezone` when partner A generates the invite code. **No editable timezone setting in v1.** The Weekend-8 streak Edge Function uses this. If long-distance couples become a real case, revisit.

### No em dashes in user-facing copy — ever

Christian's rule (2026-07-10): zero em dashes in any developer-authored user-facing text (UI strings, alerts, notification bodies, plan metadata, prompts, AI output — the ask-pamwe system prompt forbids them). Use commas, colons, or periods. Null-value placeholder glyph is `·`. Scripture text is the one exception (quoted source material). Code comments are exempt.

### Dreams are recorded, never interpreted

The Dreams journal (Prayers tab → Dreams toggle) is a plain written record the
couple can talk about and pray over. **Pamwe does not tell anyone what a dream
means**, and Ask Pamwe is deliberately not wired into it. This is the same rule
that governs the rest of the app (the ask-pamwe system prompt: "you point, you
never preach", no interpreting Scripture, no settling doctrine), applied to
ground that is contested across Christian traditions and that people act on.
Christian's call, 2026-07-25. If dream interpretation is ever revisited, it is a
product decision for him, not a feature to add because the model can.

The one connection between the two halves is `handleDreamPray`: it carries the
dream text into the add-prayer screen, trimmed to the prayers table's 280-char
check, for the couple to word themselves.

### A notification that pushes into a nested stack must carry an anchor

[usePushRouting.ts](src/hooks/usePushRouting.ts) routes taps by `data.type`. Any
push into a screen that is **not** its tab's root must pass `{ withAnchor: true }`,
and that tab's `_layout.tsx` must declare
`export const unstable_settings = { initialRouteName: 'index' }` (the `you`,
`bible` and `(today)` stacks do). Without both, a cold start from the banner
mounts the pushed screen as the stack's ONLY route: its back link falls through
to the tab navigator, lands on Today, and **that tab stays stuck on the pushed
screen until the app restarts**, with no in-app way back. Fixed 2026-08-02, after
it was hit through the weekly recap. Tab-root pushes (`reflect`, `prayers`,
`(today)`) need nothing.

### The Grove: a walk, not a list

Finished plans earn a tree, from fig up to redwood
([src/lib/treeAwards.ts](src/lib/treeAwards.ts)), shown as ONE scrolling scene
([you/grove.tsx](src/app/(tabs)/you/grove.tsx)): two sets of footprints climbing
a path, a tree rooted at every threshold passed, the trees ahead standing pale.
Geometry is pure maths in [src/lib/grove.ts](src/lib/grove.ts) on a 400-wide
canvas that screens scale by `deviceWidth / SCENE_W`. Design handoff:
[The Grove (standalone).html](The%20Grove%20(standalone).html), brief in
[grove-design-brief.md](grove-design-brief.md).

- **Thresholds are 5, 10, 20, 40, 80, 100** (Christian, 2026-08-02), measured
  against the real pace: 0.75 reading days per calendar day, so the fig is about
  10 weeks in and the redwood a four-year walk. **Tree spacing is DERIVED from
  those thresholds** (square root of each stretch), never hardcoded, because the
  handoff's fixed positions were tuned for a 1,2,3,5,8,13 ladder and left the
  five-plan opening stretch as a 60 unit sliver.
- **Finished plans move the solid prints; the streak only adds half-strength
  ground on top and can never arrive.** Planting is what arriving is for.
- **Days do not mint a second trophy.** That is how streaks live here without
  competing with plans, and it retired the dismiss-once milestone card (the
  removal landed 2026-08-03: `MilestoneCard`, `lib/milestones.ts` and their
  test are gone).
- **The ladder does not end.** Above the redwood the path keeps going
  unlabelled; a 7th rung ships when a couple nears it.
- The count stays derived (`finishedPlanCount`), never stored. The generic
  `StreakTree` drawing and `awardStage` are **gone** (2026-08-02): every tree is
  its own artwork on the walk, so nothing needs a stage number, and the
  completion screen carries a `GroveCard` instead.

**The planting** ([PlantingCeremony.tsx](src/components/PlantingCeremony.tsx)) is
the arrival moment, and the only sequence in the app longer than half a second
after the reveal. It covers the completion screen for 2,250ms: a beat of quiet,
then twelve prints land 46ms apart up the last stretch, then the tree stands out
of its base, then its name. Haptics are success at 0, light every fourth print,
medium as the tree grows, celebrate as it settles. Both ways out land somewhere,
the Grove or the completion screen underneath.

- **A tree is "newly earned" if the count landed exactly on a threshold**
  (`justPlanted`). That is the whole mechanism: nothing is stored, so nothing can
  go stale and no flag can fire twice. The handoff asked for no newly-unlocked
  flag and no per-tree earn dates, and it does not need them.
- **The completion screen's success haptic is gated on the count** so the finish
  is not sounded twice a breath apart. Whichever of the two owns the beat, it
  fires once, including when the count fails to load.
- Reduce Motion gets its own timeline, not a flattened one: the finished scene
  crossfades in over 200ms, the words 200ms later, one haptic, done at 400ms.
  Nothing translates, nothing scales, no print lands on its own. Each keyframe
  therefore opts out of `ReduceMotion.System` rather than being second-guessed on
  top of the branch.
- **The scene scales off the window, never off a measurement.** `CHROME` is what
  everything other than the walk costs; measuring instead would spend a frame at
  the start of the one sequence that cannot stutter.
- The handoff into the Grove is a **route param** (`arrived=<tree id>`), session
  only: the Grove opens at that tree with no scroll animation and holds it at
  full strength for 600ms while the rest of the walk comes up from 0.5. The
  emphasis belongs to the transition, not to the data.

**Tree art ships as ONE alpha-only set** in
[assets/images/grove/](assets/images/grove/), tinted at runtime via
`tintColor` (see [src/lib/groveArt.ts](src/lib/groveArt.ts)). The handoff's light
and dark exports were pixel-identical silhouettes differing only in fill, so one
set halves the payload (3.0MB to 0.58MB) and follows the palette automatically.
Do not add a coloured variant. The olive shipped with two UI glyphs baked into
its corners, painted out on import.

### Auth: getSession(), not getUser(); every sign-in success must route through the gate

All of src/lib reads identity via `supabase.auth.getSession()` (local) — `getUser()` is a network call that hangs after fresh sign-ins. Any new sign-in path must end with `router.replace('/')` (see `sign-in.test.tsx`). CoupleProvider stays live via realtime + explicit `refresh()` at onboarding transitions — screens must clear their loading state when `couple` is null. **The App Review password path is GONE** (Christian's call, 2026-08-11): the `@review.pamwe.app` password field, `scripts/seed_review_accounts.sql` and the hosted Grace/Daniel accounts were all removed; review access is his own account. Don't reintroduce a password path for production; the only `signInWithPassword` left is the `__DEV__`-gated dev sign-in.

### Beta feedback loop

Christian logs findings in the Notion page **"Pamwe Ramblings"** (Notion MCP connector). Triage into rounds, fix in batches, one TestFlight build per round. Current triage state lives in progress.md's top banner.

### Bible translations: public domain only, two sources

The reader ships 6 translations, from **two** APIs ([src/lib/bible.ts](src/lib/bible.ts)):
bible-api.com serves WEB/KJV/ASV/BBE/Darby; **BSB (Berean Standard Bible) comes
from bible.helloao.org**, keyed by USFM book code (`USFM_CODES`, generated from
that API's own book list, not hand-typed). `fetchPassage` is bible-api.com only
(BSB is excluded at the type level) because helloao serves whole chapters, not
free-form references.

**Never add a copyrighted translation.** NIV, ESV, NLT, NKJV, CSB and NASB are
all copyrighted; the only legitimate routes are YouVersion Platform, API.Bible,
or the publisher's own API, and **every one of them is non-commercial: a paywall,
ads, or any paid tier revokes access for the whole app**, not just the Bible
feature. Christian wants to keep the option to charge (2026-07-14), so the answer
is public domain. The BSB is the modern, readable one, public domain since
2023-04-30 ("Licensing is not required for any use"), no attribution needed. NET
is *not* an option: free use is limited to "not-for-sale media".

⚠️ **bolls.life serves NIV/ESV/NLT text unauthenticated with no license
statement. That is unlicensed redistribution.** Pulling from it, or scraping
Bible Gateway, or hardcoding copyrighted text into a seed, would put infringing
text in an App Store binary. Don't, however convenient.

Also: YLT was removed (2026-07-14) because bible-api.com carries it NT-only, so
every OT chapter 404'd behind a "check your connection" error. Chapter cache
hits are authoritative and never revalidate (scripture is immutable); bible-api.com
429s after ~15 requests, which used to surface as random "broken" translations.

### Don't modify the M'Cheyne plan or pull quotes silently

`supabase/seed.sql` has all 365 days of WEB Bible text + reflection prompts. If you find yourself "fixing" a verse or quote, stop — they came from the consultant (M'Cheyne 1842) and the source text.

### NEVER run `expo prebuild` — the ios/ project is hand-maintained

`ios/` is gitignored (except `ExportOptions.plist`) but hand-maintained: entitlements, `$(CURRENT_PROJECT_VERSION)` wiring, purpose strings. A stray prebuild on 2026-07-11 reset Info.plist's `CFBundleVersion` to a literal `1` and stripped `NSPhotoLibraryUsageDescription`, which burned build 10 at Apple processing. New Expo modules need only `npm install` + `pod install` (autolinking). Only `NSPhotoLibraryUsageDescription` is mirrored in `app.json > ios.infoPlist`; the mic and speech purpose strings exist solely as plugin props (which apply only via the banned prebuild) plus the hand-maintained `ios/Pamwe/Info.plist`, which is the real source of truth for all of them.

**If it happens anyway, `scripts/restore_ios_patches.rb` puts it back**: the bundle phase's NODE_ENV/`.env.production` branch and Sentry splice, `PrivacyInfo.xcprivacy` (file + Resources membership), both entitlements wirings, `$(CURRENT_PROJECT_VERSION)` in Info.plist, and the three purpose strings. Canonical copies live in git at [scripts/ios/](scripts/ios/), so the script only puts files back and rewires them, never retypes their contents. It is idempotent, `--check` is a read-only pre-archive gate, and it prints the three things it deliberately cannot restore (`ios/sentry.properties`, `.env.production`, `pod install`).

### Widgets (VerseWidget appex) — home screen 2026-07-12, lock screen 2026-07-31

One app-extension, `VerseWidget`, holding **two** WidgetKit widgets. Both read the same bundled `verses.json`: a **curated** set of uplifting, standalone verses picked by calendar day-of-year (cycling if the set is shorter than the year), rolling over at local midnight. The earlier M'Cheyne-pull-quote set was dropped because it surfaced narrative fragments that mean little out of context. Widget deployment target is **iOS 17.0**; the app stays 16.4.

- **`VerseWidget`** — home screen, small/medium/large, light + dark, tree-of-life emblem. Still **fully self-contained** (no App Group, no bridge). Tapping opens `pamwe://today`.
- **`LockVerseWidget`** — lock screen, `.accessoryRectangular`. Tapping opens the verse in the reader (`pamwe://bible/<Book>/<chapter>?verse=<n>`, an existing route; the book/chapter/verse fields are generated into `verses.json`, never parsed in Swift). Shows the reference **and** "In love N days" from the couple's anniversary, which is the **one** thing that crosses the App Group (see below). The phrase never degrades; the reference gives way if the line ever runs out. The old ladder dropped the words first, so it rendered a bare "126 DAYS" and eventually "126D", a number on a lock screen with nothing saying what it counted. **Header type is per rung, and that is what makes both fit.** The slot cannot be enlarged (iOS fixes `.accessoryRectangular` at ~172x76), so size is the only lever: rungs carrying *both* labels render at 8pt/0.2 tracking, and rungs carrying one render at the 9pt/0.9 an eyebrow uses everywhere else, since they have room to spare. Font and tracking therefore live on `headerRow`, not on the `ViewThatFits`, so each candidate is **measured at the size it will actually draw at**. Verified off device against the worst pairing in `verses.json` ("1 Chron. 16:34" beside "IN LOVE 12,540 DAYS"), verse keeping all three lines.

**Lock Screen constraints that are not negotiable.** iOS renders these in `WidgetRenderingMode.vibrant` and flattens content into its own monochrome material, so custom tint, blur, text shadow and the Pamwe palette do nothing there: the view is built in `.primary`/`.secondary`. The only sanctioned backdrop is `AccessoryWidgetBackground()`, which is the "Clear background" toggle on `LockVerseConfiguration` (an `AppIntentConfiguration`). And `.accessoryRectangular` is only about **172 x 76pt**, roughly half the width the design was drawn at, which is why the header is a `ViewThatFits` ladder that gives up the counter's wording, then the book's full name (`abbr`, "Eccl. 4:9"), before dropping the counter.

**App Group `group.com.christianmangwanda.pamwe`.** Named in *both* `ios/Pamwe/Pamwe.entitlements` and `ios/VerseWidget/VerseWidget.entitlements`; a mismatch is silent and just hides the counter. The app writes one key, `anniversary`, via the local Expo module in [modules/pamwe-widget/](modules/pamwe-widget/), called from `CoupleProvider`. It writes the **resolved** date (the couple's anniversary, else `paired_at`) so the fallback rule lives only in `src/lib/couples.ts` and the widget can never disagree with the You tab. Nothing else crosses.

- **Source lives in [ios/VerseWidget/](ios/VerseWidget/) and IS git-tracked** (a `.gitignore` exception; the rest of `ios/` stays ignored). The view files (`VerseWidgetView.swift`, `Theme.swift`, `VerseData.swift`) are deliberately WidgetKit-free so they can be snapshot-rendered off device.
- **The `.xcodeproj` target is NOT committed but is reproducible**: if `ios/` is ever regenerated, re-run `scripts/add_widget_target.rb` (via CocoaPods' bundled xcodeproj gem — see the script header) to re-splice the target, then `pod install`. `verses.json` is generated by `scripts/gen_widget_verses.py`: the curated references live in that script, and it fetches the exact WEB text from bible-api.com (the app's own Bible source), so verses are never hand-typed. Edit its `REFERENCES` list (or `verses.json` directly) to change the selection.
- **Do not add VerseWidget to the Podfile** — it uses only system frameworks. `pod install` leaves it intact (it does stamp a harmless `RCTNewArchEnabled` into the widget Info.plist each run; leave it).
- Fonts are bundled into the appex (`Fraunces-Italic` for the home verse, `Fraunces-Regular` for the lock verse, `InstrumentSans-SemiBold` for labels) and listed in the widget's `Info.plist > UIAppFonts`; referenced by PostScript name via `Font.custom`.
- The view files import **no WidgetKit** on purpose, so they can be rendered off device with `ImageRenderer` on the Mac. That is the only way to check a lock-screen layout at its real 172x76 without a phone, and it is how the header ladder was tuned.

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
| Reflections history + recaps + on-this-day | [src/lib/reflections.ts](src/lib/reflections.ts), [src/lib/recaps.ts](src/lib/recaps.ts) (returns tappable ITEMS, not joined strings; copy helpers `recapHeadline`/`recapEncouragement`/`recapInsight` are pure and tested) |
| Reflection responses + reply chains | [src/lib/entryResponses.ts](src/lib/entryResponses.ts), [src/components/ReflectionResponses.tsx](src/components/ReflectionResponses.tsx) |
| Verse discussion (note + reactions + comments) | [src/lib/verseDiscussion.ts](src/lib/verseDiscussion.ts), screen [bible/verse.tsx](src/app/(tabs)/bible/verse.tsx) |
| Prayers (category, edit/delete) + reminders | [src/lib/prayers.ts](src/lib/prayers.ts), [src/lib/prayerReminders.ts](src/lib/prayerReminders.ts) |
| Dreams (couple-shared journal) | [src/lib/dreams.ts](src/lib/dreams.ts), [src/components/DreamCard.tsx](src/components/DreamCard.tsx) |
| Push notifications + nudge | [src/lib/notifications.ts](src/lib/notifications.ts) |
| Voice transcription (on-device) | [src/lib/transcription.ts](src/lib/transcription.ts) |
| Shared-layer search | [src/lib/search.ts](src/lib/search.ts) |
| Catch-up / grace days | [src/lib/catchup.ts](src/lib/catchup.ts) |
| Plan generation client | [src/lib/askPamwe.ts](src/lib/askPamwe.ts) (`buildPlan`), screen [plans/build.tsx](src/app/(tabs)/plans/build.tsx) |
| Plan search, browse, sharing | [src/lib/plans.ts](src/lib/plans.ts) (`searchPlans`, `filterPlans`, `topicsIn`, `sharePlan`, `getSharedPlan`) |
| Finished-plan rule + tree awards | [src/lib/planHistory.ts](src/lib/planHistory.ts) (`isFinished`, `finishedPlans`), [src/lib/treeAwards.ts](src/lib/treeAwards.ts) (`TREE_AWARDS` ladder) |
| The Grove scene + You card | [src/lib/grove.ts](src/lib/grove.ts) (geometry + all copy), [you/grove.tsx](src/app/(tabs)/you/grove.tsx), [GroveCard](src/components/GroveCard.tsx), art [src/lib/groveArt.ts](src/lib/groveArt.ts) |
| The planting (arrival sequence) | [PlantingCeremony.tsx](src/components/PlantingCeremony.tsx), geometry `arrivalScene`/`arrivalHeadline` in [src/lib/grove.ts](src/lib/grove.ts), keyframes `landStep`/`standUp`/`riseAt` in [src/lib/motion.ts](src/lib/motion.ts), trigger `justPlanted` in [src/lib/treeAwards.ts](src/lib/treeAwards.ts) |
| Docked tab bar | [src/components/DockedTabBar.tsx](src/components/DockedTabBar.tsx) |
| Motion + haptics | [src/lib/motion.ts](src/lib/motion.ts), [src/lib/haptics.ts](src/lib/haptics.ts) |
| Voice recorder component | [src/components/VoiceRecorder.tsx](src/components/VoiceRecorder.tsx) |
| Design tokens | [src/theme/tokens.ts](src/theme/tokens.ts) (light+dark; via `useTheme()`), [src/constants/typography.ts](src/constants/typography.ts). Legacy [src/constants/colors.ts](src/constants/colors.ts) is frozen — don't use in new code. |
| Ask Pamwe edge function | [supabase/functions/ask-pamwe/index.ts](supabase/functions/ask-pamwe/index.ts) |
| Catalogue vocabulary + tagging rules | [scripts/bible_catalogue_spec.py](scripts/bible_catalogue_spec.py) (the file to argue with; `SPEC_VERSION` history explains every past mistake) |
| Catalogue generator + SQL emitter | [scripts/gen_bible_catalogue.py](scripts/gen_bible_catalogue.py), [scripts/emit_bible_catalogue_sql.py](scripts/emit_bible_catalogue_sql.py); seed [supabase/seeds/bible_catalogue.sql](supabase/seeds/bible_catalogue.sql) (7.7MB, generated) |
| Retrieval over the catalogue | `retrieve_passages(want_themes, allow_cautions, max_rows)` in [supabase/migrations/20260802000001_retrieve_passages.sql](supabase/migrations/20260802000001_retrieve_passages.sql) |
| Seeded plan content | [supabase/seed.sql](supabase/seed.sql) (~14k lines) + `scripts/seed_{john,psalms,cord}_plan.py` |
| Widgets, home + lock (WidgetKit/SwiftUI) | [ios/VerseWidget/](ios/VerseWidget/) (git-tracked source); target splice `scripts/add_widget_target.rb`, verse data `scripts/gen_widget_verses.py` |
| Restoring a regenerated ios/ | [scripts/restore_ios_patches.rb](scripts/restore_ios_patches.rb) (`--check` before an archive), canonical copies [scripts/ios/](scripts/ios/) |
| App Group bridge (anniversary → widget) | [modules/pamwe-widget/](modules/pamwe-widget/) (local Expo module), called from [src/providers/CoupleProvider.tsx](src/providers/CoupleProvider.tsx) |
