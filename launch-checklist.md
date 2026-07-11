# Pamwe — App Store Launch Checklist

> **STATUS UPDATE 2026-07-10 (end of day):** TestFlight is LIVE — builds 1–7 shipped, Christian + Ammy testing as internal testers. Now DONE from the lists below: A1 app icon (floral P; splash/android marks still template), A2 key rotated + hosted secret set, A4 auth providers configured (Google needs Skip-nonce ON — done), A5 Sentry wired (DSN in .env.production), C1 app record created, D1 internal TestFlight, D2 in progress (couples beta running; feedback loop = Notion "Pamwe Ramblings"). P0 #5 (reveal skipped for first submitter) STILL OPEN. A6 (push banner end-to-end) still to verify on device. Remaining big rocks: section C store package (privacy URL, screenshots, review strategy), section E scale hardening, green-list features (progress.md top banner).

**Created:** 2026-07-10 · Status verified against the live hosted project (`jcyhhxgomhopkoqesbkb`) and git history.
Companion docs: [progress.md](progress.md) (build history), [debug-tour-2026-07-09.md](debug-tour-2026-07-09.md) (issue numbers referenced below as #N).

---

## ✅ Already done (verified 2026-07-10 — don't redo)

- Apple Developer Program approved; entitlements re-enabled (`aps-environment` + Sign in with Apple); EAS `projectId` stamped into app.json.
- Hosted cutover complete: all 16 migrations applied; **all 4 plans seeded (437 plan_days) with browse metadata**; `voice-entries` bucket + locked-reveal storage policies; all **5 edge functions ACTIVE** with correct `verify_jwt`; webhook secrets in Vault; `couple_plans_one_active` unique index in place (#4 server side).
- RLS write-path P0s fixed (#1 submit, #2 join) + security hardening (#8 anon couple reads, #9 prayer injection, #12–14) via `20260709000002/3/5`.
- Client-side P0s fixed (commit `1f413a5`): magic-link fragment/PKCE handling (#3), push-token lifecycle (#6), morning-reminder clobber (#7), couples error handling (#15–17), AppState token refresh (#26), Google-cancel alert (#27).
- EAS preview/production profiles carry hosted Supabase env (#47).
- Submission prerequisites already satisfied in code: `ITSAppUsesNonExemptEncryption=false`, in-app account deletion (guideline 5.1.1(v)), Sign in with Apple offered alongside Google (guideline 4.8), WEB attribution footer, in-app Privacy/Terms screens, mic permission string, `autoIncrement` build numbers.

---

## A. Ship blockers — must close before the first TestFlight build

- [ ] **Real app icon** (#49). `assets/images/icon.png` **and** `assets/expo.icon` are still the Expo template default → guaranteed rejection (2.3.8 / 4.0). Also replace `splash-icon.png` and the notification icon (both inherit it). 1024×1024, no alpha for the store icon.
- [ ] **Rotate `ANTHROPIC_API_KEY`** (#48) — it was pasted in chat. New key → `supabase/functions/.env` (local) + `supabase secrets set ANTHROPIC_API_KEY=…` (hosted). Confirm the hosted secret exists at all (Ask Pamwe silently falls back to hardcoded recs without it).
- [ ] **P0 #5 — reveal ceremony skipped for the first submitter.** Not touched by the P0-fix commit (`useTodayEntry.ts` / `(today)/index.tsx` unchanged). If A submits, closes the app, and B submits later, A never sees "Reveal together" — the core emotional payoff. Fix (track highest revealed-but-unopened day) or consciously accept for beta.
- [ ] **Hosted Auth config** in the Supabase dashboard: Site URL; redirect allow-list includes `pamwe://` + `pamwe://(auth)/magic-link`; Apple + Google provider credentials point at `jcyhhxgomhopkoqesbkb` (Google URL scheme in app.json must match).
- [ ] **Resolve Sentry drift (#29):** `@sentry/react-native` 8.x with no config plugin and no DSN. Either wire it properly (plugin + DSN + test event) or remove the dependency — don't ship a half-linked native pod.
- [ ] **Production push check:** archive build must carry `aps-environment=production` (current entitlements file says `development`; EAS/Xcode normally flips it — verify in the built IPA) and a banner must actually arrive via TestFlight.

## B. On-device validation pass (real iPhone, ideally off home Wi-Fi)

One structured pass on the TestFlight/dev build against **hosted**:

- [ ] Apple sign-in and Google sign-in end-to-end (fresh account each).
- [ ] Magic-link email: request → tap link → session lands (first real test of the #3 fix).
- [ ] Pairing across two physical devices (invite code → join → connected).
- [ ] Full daily loop: read → journal (text) → waiting realtime fires → reveal → Amen → day advances, streak ticks.
- [ ] Voice loop: record → interruption behavior → upload → partner playback after mutual submit.
- [ ] Submit → **push banner arrives on the partner's phone** (all 4 webhook paths if feasible: partner-submit, new prayer, freeze, morning reminder).
- [ ] Ask Pamwe live latency + result quality; builder → custom plan → next-day reading fetches.
- [ ] Dark mode visual sweep (glass tint, floral tint, highlight ink, keyboards/alerts).
- [ ] Prayer swipe feel; scroll-vs-swipe conflict.
- [ ] Account deletion both directions; remaining partner's app state.

## C. App Store Connect — submission package

- [ ] Create the app record: bundle ID `com.christianmangwanda.pamwe`, name **Pamwe** (check availability early — name squatting is common), subtitle, primary category (Lifestyle; Reference as secondary).
- [ ] **Hosted privacy policy URL + support URL** — required fields; the in-app screens don't satisfy them. Publish web versions of the existing privacy/terms copy (GitHub Pages is enough) and add a support contact.
- [ ] **Privacy nutrition labels:** collected & linked to identity — email, name, user content (journal text, voice recordings, prayers, notes/highlights), push token. No tracking, no ads. Disclose processors: Supabase (data), Anthropic (Ask Pamwe queries only), Google/Apple (auth), bible-api.com (passage fetch).
- [ ] Age rating questionnaire (expect 4+).
- [ ] Screenshots: 6.9" set required (6.5" recommended). Cover the story: Today ritual, reveal, Bible reader with highlights, Plans grid, Prayers. Light + dark variants if time allows.
- [ ] Description, keywords, promotional text.
- [ ] **App Review access strategy — decide now.** Reviewers sign in with their own Apple ID and land in onboarding needing a *partner* — the core loop is locked for them (guideline 2.1 requires full access). Recommended: create two pre-paired demo accounts on hosted with sample entries, add an email+password sign-in path for them (Supabase already supports password auth; the current password UI is `__DEV__`-gated), and put both credentials + a walkthrough (and optionally a screen-recording link) in the review notes.

## D. TestFlight beta

- [ ] `eas build -p ios --profile production` → `eas submit` → internal TestFlight.
- [ ] Christian + Ammy run the real daily loop for ~1 week (streak correctness across days, pushes, reveal, freeze behavior).
- [ ] Fix what the week surfaces; then external TestFlight group (requires Beta App Review — a dry run of real review) with a handful of couples.

## E. Wide-deployment hardening (before — or immediately after — public release)

**Backend / cost:**
- [ ] **Upgrade Supabase to Pro.** Free-tier projects pause after ~1 week of inactivity and have hard email/storage caps — a paused backend bricks every install. Pro also unlocks daily backups/PITR.
- [ ] **Custom SMTP** for magic-link email (built-in Supabase mail is a few emails/hour, dev-only). Resend/Postmark + sender domain.
- [ ] **Ask Pamwe rate limit (#11):** per-user N/hour counter → 429; set an Anthropic spend alert. Currently any authed user can loop 4096-token calls against the API bill.
- [ ] Dead push-token cleanup (#33): handle Expo `DeviceNotRegistered` receipts in the notify-* functions.
- [ ] Advisor follow-up: revoke `EXECUTE` on `public.rls_auto_enable` from `anon`/`authenticated` (only WARN-level advisor finding worth acting on; the RLS-helper warnings are by design).

**Highest-value open P2s at scale** (full list in the debug tour):
- [ ] #18 expired invite code bricks the couple (no regenerate path).
- [ ] #19 CoupleProvider has no realtime → ghost partner/plan state until relaunch.
- [ ] #20 draft-autosave races submit → spurious "Could not submit".
- [ ] #23 custom-plan daily reading re-fetches bible-api.com uncached → breaks under their rate limiting. Persist fetched text back into `plan_days.passage_text`.
- [ ] #25 streak resets when submits straddle midnight (product decision + grace window).
- [ ] #30 voice signed-URL expiry (1h) with no re-sign on play.
- [ ] #34 empty-200 poisons the chapter cache until restart.
- [ ] #35 plan-detail schedule window never reaches day >40 (M'Cheyne).
- [ ] #44 join accepts 4-char codes (always 6).
- [ ] #45 three pre-auth components still import the frozen light-only palette (wrong colors in dark mode).

**Ops:**
- [ ] Monitoring loop: Sentry DSN live (if kept), periodic `get_advisors` + Supabase logs, Anthropic usage dashboard.
- [ ] Decide the timezone story if long-distance couples appear (v1: captured once at couple creation, immutable — documented decision).

## F. Explicitly out of scope for iOS launch

- **Android / Play Store** — builds but never validated end-to-end. Separate track: FCM credentials, Play Console record, data-safety form, on-device pass.
- Recap LLM summaries, editable timezone, plan-builder "reflect together" rhythm semantics — known v1 deviations, revisit post-launch.

---

**Suggested order:** A (blockers) → B (device pass) → C (ASC package, can overlap B) → D (TestFlight weeks) → E (hardening during beta) → submit for review.
