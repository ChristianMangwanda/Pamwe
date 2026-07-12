# Whole-app copywriting pass — plan + string inventory

**Started:** 2026-07-12. **Status: SWEEP DONE same day.** Christian approved the
Notion-derived voice ("I like this voice"), and the full sweep ran: ~800 strings
reviewed, 119 rewritten across 43 files (app, components, lib, edge functions,
plan metadata seed), plus the mechanical fixes below. tsc clean, 96/96 Jest
(2 test assertions updated to match new copy). Before/after review page:
https://claude.ai/code/artifact/8e03a71d-82b2-4dd5-b2be-b7e817d36478

**Remaining to go live:**
1. Commit + ship app copy with the next build (b12).
2. Hosted (jcyhhxgomhopkoqesbkb, needs Christian's word): redeploy edge
   functions ask-pamwe / notify-partner / notify-freeze; re-apply
   supabase/seeds/plan_metadata.sql (also re-run against local).
3. Flag for Christian: you/privacy.tsx says Anthropic powers "the reading-plan
   builder" but v7's help sheet also sends questions to Anthropic; policy
   accuracy fix is his call.

The error-alert family is now uniform app-wide: title "Couldn't <do the thing>",
body reassures first when a draft survives, ends with one step ("Try again in a
moment."). No "Error"/"Please try again."/"Unknown error" remain.

## The approach (agreed direction)

Christian doesn't want to hand-review ~800 strings. Instead:

1. **Inventory** every user-facing string in the app (DONE, appended below).
2. **Calibrate**: voice derived from Christian's own Notion writing (2026-07-12:
   read 7 pages across registers, dictated product feedback, reflective essays,
   goal pages, journals). Emulation tested on the 12-string calibration set
   below; Christian approves or corrects those before anything is mass-applied.
3. **Voice guide** lives in `copy-voice.md` (checked in) so future features get
   the voice for free. Update it with whatever Christian corrects in step 2.
4. **Sweep**: rewrite all ~800 strings against the guide, present as a
   before/after table grouped by screen for skim review. Christian approves by
   exception, not by reading everything.
5. Ship as its own build round.

## Hard constraints for the sweep

- **No em dashes** anywhere in user-facing copy (verified: currently zero; keep it so).
- **Scripture text and consultant content untouched**: M'Cheyne 365-day text,
  pull quotes, reflection prompts in `supabase/seed.sql`, per-day content in
  `scripts/seed_{john,psalms,cord}_plan.py`.
- Null placeholder glyph stays `·`.
- Plan browse metadata (`supabase/seeds/plan_metadata.sql` taglines/about/etc.)
  IS in scope (developer-authored) but changes need a hosted migration/UPDATE,
  not just a code edit.
- Duplicated strings that must change together:
  - Ask Pamwe off-topic line: `supabase/functions/ask-pamwe/index.ts:50` + `src/lib/askPamwe.ts:86`
  - "Pamwe is resting right now" rate-limit line: `askPamwe.ts:115` + `ask-pamwe/index.ts:232`
  - Prayer status set ("{partnerName} prayed today" / "Waiting for {partnerName}" / "You prayed today"): PrayerCard + PrayerDetailSheet
  - "Pause playback"/"Play recording" a11y labels: AudioPlayer + VoiceRecorder

## The calibration set (12 strings, sent to Christian 2026-07-12)

1. Welcome H1 `(auth)/welcome.tsx:33`: "Grow closer to God, together."
2. Value slide `(onboarding)/value-slides.tsx:20`: "Write privately. Your words stay sealed until you've both reflected. Then you open them together."
3. Journal placeholder `(today)/journal.tsx:182`: "Write honestly. Only {partnerName} will see it, and only once you've both written…"
4. Waiting state `(today)/waiting.tsx:48-50`: "Your reflection is in." / "It stays sealed until {partnerName} has read and reflected too. We'll nudge you both the moment it's ready to open together."
5. Plan completion `(today)/complete.tsx:45-47`: "You finished {planTitle}, together" / "Every day, you both showed up and shared what you saw. That is the whole point."
6. Offline error `(today)/journal.tsx:98`: "You look offline. Your draft is saved. Try again when you're connected."
7. Behind-grace `(today)/index.tsx:201`: "You're a day behind. No rush, just pick it up together when you can."
8. Prayers empty state `prayers/index.tsx:182-184`: "Nothing on your hearts yet" / "Add your first prayer point above, and {partnerName} can pray it with you."
9. Locked-reveal push `notify-partner/index.ts:73`: "Your partner finished today's reflection" / "Write yours to unlock both."
10. Week milestone `src/lib/milestones.ts:19`: "A whole week of showing up for each other and for Him. Keep going."
11. Ask Pamwe deflect `ask-pamwe/index.ts:50`: "Pamwe is here for Scripture, prayer, and your walk together. For that one, you'll want another guide."
12. M'Cheyne tagline `plan_metadata.sql:6`: "The whole story, together"

## Mechanical fixes to fold into the sweep (voice-independent, found during inventory)

- `you/delete-account.tsx:62` grammar bug: "Your partner is unpaired and let know you've left".
- `(onboarding)/plan-select.tsx:61` alert title "Could not change plan" also fires on FIRST enrollment failures, where "change" reads wrong.
- Curly vs straight apostrophes inconsistent: `bible/index.tsx:51` "you’ve" vs `bible/marks.tsx:50` "you've"; `prayers/index.tsx:143` "can’t". Pick one (straight) and normalize.
- "any time" (`you/index.tsx:68`) vs "anytime" (`you/settings.tsx:64`) in the two sign-out alerts.
- `src/lib/bible.ts:169,194` throw "bible-api.com returned HTTP…" messages that can leak into UI error states; give them user-facing wording.
- `(onboarding)/waiting.tsx` is a legacy screen (frozen colors.ts palette) whose copy overlaps invite.tsx; consider consolidating rather than rewriting.

## String counts

- Auth + onboarding: 94 strings, 15 files (4 dev-only, skip)
- Tabs: ~450 strings, 29 files (you-tab legal pages are 55 of them; decide whether terms/privacy get the voice pass or stay formal)
- Components: ~102 · lib/hooks: ~89 · edge functions: 23 · plan metadata: 56

---

# FULL INVENTORY

(Verbatim from the three sweep agents, 2026-07-12.)

## Part 1: Auth + onboarding

# Copy inventory: auth gate + auth + onboarding

Scope: `src/app/index.tsx`, `src/app/_layout.tsx`, `src/app/(auth)/**`, `src/app/(onboarding)/**`
Generated 2026-07-12 for the copywriting pass. Line numbers are 1-indexed against current `main` (e3b8f83).

Em-dash audit: **zero em dashes in user-facing copy.** Seven `—` occurrences exist in this scope, all inside code comments (exempt per the rule): `_layout.tsx:91,111,123`, `index.tsx:30`, `(auth)/sign-in.tsx:46,54`, `(onboarding)/plan-select.tsx:54`.

Notes on dynamic strings: several `Alert.alert` calls pass `e.message` / `error.message` as the body. Those bodies are dynamic (Supabase / OS error text) and are inventoried only where the message string is authored in this scope (e.g. `throw new Error(...)` that surfaces in an alert).

---

## src/app/index.tsx
- `line 57` [type: title] "Can't reach Pamwe"
- `line 59` [type: body] "Check your connection, then try again."
- `line 63` [type: button] "Try again"

(3 strings)

## src/app/_layout.tsx
No user-facing strings. (Providers, fonts, deep-link handling only.)

(0 strings)

## src/app/(auth)/_layout.tsx
No user-facing strings. (Stack config only; route names excluded.)

(0 strings)

## src/app/(auth)/welcome.tsx
- `line 32` [type: title] "Pamwe" (brand eyebrow above the H1)
- `line 33` [type: title] "Grow closer to God, together."
- `line 34` [type: body] "pah-mweh · \"together\" in Shona" (pronunciation line; `·` is the sanctioned separator glyph, not a placeholder)
- `line 38` [type: button] "Get started"
- `line 40` [type: button] "I have an invite code" (text link styled as button)

(5 strings)

## src/app/(auth)/sign-in.tsx
- `line 30` [type: alert] "Error" (title; body is dynamic `error.message` from Supabase OTP)
- `line 38` [type: alert] "Dev sign-in failed" (title; DEV-ONLY path, body dynamic)
- `line 49` [type: error] "No idToken received from Google." (thrown; surfaces as the body of the line 60 alert)
- `line 60` [type: alert] "Google Sign In Error" (title)
- `line 60` [type: alert] "An error occurred." (fallback body when `e.message` is empty)
- `line 79` [type: error] "No identityToken received from Apple." (thrown; surfaces as the body of the line 83 alert)
- `line 83` [type: alert] "Apple Sign In Error" (title)
- `line 83` [type: alert] "An error occurred." (fallback body when `e.message` is empty)
- `line 92` [type: title] "Welcome" (section eyebrow)
- `line 93` [type: title] "Sign in"
- `line 95` [type: body] "Sign in separately from your partner. You'll pair in the next step."
- `line 99` [type: title] "Email address" (field label eyebrow)
- `line 102` [type: placeholder] "you@example.com"
- `line 110` [type: button] "Continue with email"
- `line 115` [type: body] "or" (divider label)
- `line 120` [type: button] "Continue with Google"
- `line 122` [type: button] "Continue with Apple"
- `line 128` [type: title] "Dev only" (DEV-ONLY, `__DEV__` gated)
- `line 129` [type: button] "Sign in as Christian" (DEV-ONLY)
- `line 130` [type: button] "Sign in as Ammy" (DEV-ONLY)

(20 strings, of which 4 are dev-only: lines 38, 128, 129, 130)

## src/app/(auth)/magic-link.tsx
- `line 20` [type: title] "Check your email"
- `line 22` [type: body] "We've sent you a magic link. Tap it to sign in, then come back here."
- `line 26` [type: button] "Back to sign in"

(3 strings)

## src/app/(onboarding)/_layout.tsx
No user-facing strings. (Stack config only.)

(0 strings)

## src/app/(onboarding)/value-slides.tsx
- `line 19` [type: title] "Read together" (slide 1 title)
- `line 19` [type: body] "Move through Scripture side by side: the same passage, the same day, wherever you each are." (slide 1 body)
- `line 20` [type: title] "Reflect, then reveal" (slide 2 title)
- `line 20` [type: body] "Write privately. Your words stay sealed until you've both reflected. Then you open them together." (slide 2 body)
- `line 21` [type: title] "Carry each other" (slide 3 title)
- `line 21` [type: body] "Share prayer points and pray for what the other is walking through, every day." (slide 3 body)
- `line 54` [type: button] "Skip"
- `line 78` [type: button] "Continue"

(8 strings)

## src/app/(onboarding)/name.tsx
- `line 41` [type: alert] "Could not save" (title; body is dynamic `e.message`)
- `line 52` [type: title] "What should we\ncall you?" (renders as two lines: "What should we call you?")
- `line 53` [type: body] "Your partner will see this name."
- `line 59` [type: placeholder] "Your first name"
- `line 71` [type: button] "Continue"

(5 strings)

## src/app/(onboarding)/pair-choice.tsx
- `line 25` [type: title] "Link with your partner"
- `line 27` [type: body] "Pamwe is meant for two. Connect now so everything you read and pray is shared."
- `line 37` [type: button] "Invite your partner" (option-card title; also reused verbatim as accessibilityLabel at line 65)
- `line 38` [type: body] "Send them a code to join you" (option-card subtitle)
- `line 46` [type: button] "I have a code" (option-card title; also reused as accessibilityLabel)
- `line 47` [type: body] "Enter the code your partner sent" (option-card subtitle)

(6 strings)

## src/app/(onboarding)/invite.tsx
- `line 49` [type: alert] "Could not create invite" (title; body is dynamic `e.message`)
- `line 80` [type: body] "Join me on Pamwe. Enter this code to link with me: ${code}" (OS share-sheet message; the only copy the invited partner sees before installing)
- `line 90` [type: title] "Share your code"
- `line 91` [type: body] "Your partner enters this to link with you."
- `line 94` [type: placeholder] "····" (shown in the code card while the code loads; sanctioned `·` glyph)
- `line 98` [type: button] "Copy code" (accessibilityLabel on the copy action)
- `line 100` [type: button] "Copied" (post-copy state of the copy action)
- `line 100` [type: button] "Copy" (default state of the copy action)
- `line 102` [type: button] "Share code" (accessibilityLabel on the share action)
- `line 104` [type: button] "Share"
- `line 110` [type: body] "Waiting for your partner to join…" (live-waiting status line)

(11 strings)

## src/app/(onboarding)/join.tsx
- `line 35` [type: alert] "Could not join" (title; body is dynamic `e.message`)
- `line 44` [type: title] "Enter your code"
- `line 45` [type: body] "Paste the code your partner shared with you."
- `line 51` [type: placeholder] "ABC123"
- `line 64` [type: button] "Connect"

(5 strings)

## src/app/(onboarding)/waiting.tsx
- `line 83` [type: title] "Waiting for your partner"
- `line 86` [type: body] "Share your invite code and we'll connect you as soon as they join."
- `line 91` [type: title] "Your code" (label over the invite code)
- `line 99` [type: button] "Back"

(4 strings)

NOTE for the rewrite pass: this screen still imports the frozen legacy palette (`src/constants/colors.ts`) and predates the invite.tsx redesign; its copy overlaps invite.tsx ("Waiting for your partner…" / code display) and may deserve consolidation, not just a rewrite.

## src/app/(onboarding)/connected.tsx
- `line 20` [type: placeholder] "You" (fallback for the user's display name in the line 54 sentence)
- `line 21` [type: placeholder] "?" (fallback avatar initial)
- `line 22` [type: placeholder] "your partner" (fallback for the partner's display name in the line 54 sentence)
- `line 23` [type: placeholder] "?" (fallback avatar initial)
- `line 53` [type: title] "You're linked."
- `line 54` [type: body] "{me} & {partner}, walking together from today." (interpolated names)
- `line 58` [type: button] "Enter Pamwe"

(7 strings)

## src/app/(onboarding)/plan-select.tsx
- `line 48` [type: error] "No couple found" (thrown; surfaces as the body of the line 61 alert if hit)
- `line 61` [type: alert] "Could not change plan" (title; shown for BOTH first-enroll and switch failures despite the "change" wording)
- `line 61` [type: alert] "Please try again." (fallback body when `err.message` is empty)
- `line 69` [type: alert] "Switch reading plan?" (confirm title, switch mode only)
- `line 70` [type: alert] "Your current plan will be marked complete and the new one will start at day 1. This affects you and your partner." (confirm body)
- `line 72` [type: button] "Cancel" (confirm action)
- `line 73` [type: button] "Switch" (confirm action, destructive style)
- `line 89` [type: title] "Switch plan" (H1, switch mode)
- `line 89` [type: title] "Choose your plan" (H1, first-enroll mode)
- `line 92` [type: body] "Pick a new reading plan. Your current one will be marked complete and the new plan starts at day 1." (subtitle, switch mode)
- `line 93` [type: body] "You and your partner will read through Scripture together, one day at a time." (subtitle, first-enroll mode)
- `line 101` [type: empty-state] "We couldn't load the reading plans. Check your connection and try again."
- `line 103` [type: button] "Try again"
- `line 126` [type: body] "{book_label} · {duration_days} days · {minutes_label}" (plan-card meta template; the literal word "days" is authored copy)
- `line 126` [type: placeholder] "~10 min" (fallback when a plan has no `minutes_label`)
- `line 136` [type: button] "Switch to this plan" (CTA, switch mode)
- `line 136` [type: button] "Begin together" (CTA, first-enroll mode)

(17 strings)

Plan titles/taglines rendered at lines 118 and 123 come from DB (`plans.title`, `plans.tagline`) and are inventoried with the plan-metadata copy, not here. No Scripture quotations appear anywhere in this scope.

---

## Totals

| File | Strings |
|---|---|
| src/app/index.tsx | 3 |
| src/app/_layout.tsx | 0 |
| src/app/(auth)/_layout.tsx | 0 |
| src/app/(auth)/welcome.tsx | 5 |
| src/app/(auth)/sign-in.tsx | 20 (4 dev-only) |
| src/app/(auth)/magic-link.tsx | 3 |
| src/app/(onboarding)/_layout.tsx | 0 |
| src/app/(onboarding)/value-slides.tsx | 8 |
| src/app/(onboarding)/name.tsx | 5 |
| src/app/(onboarding)/pair-choice.tsx | 6 |
| src/app/(onboarding)/invite.tsx | 11 |
| src/app/(onboarding)/join.tsx | 5 |
| src/app/(onboarding)/waiting.tsx | 4 |
| src/app/(onboarding)/connected.tsx | 7 |
| src/app/(onboarding)/plan-select.tsx | 17 |
| **Total** | **94** |

## Part 2: Tabs

# Pamwe copy inventory — src/app/(tabs)/**

Source of truth for the copywriting pass. Every user-facing string, with exact text and line numbers (as of commit e3b8f83). Dynamic segments shown as `${...}` / `{...}` interpolations. Strings marked SCRIPTURE/CONSULTANT must NOT be rewritten. Strings marked (a11y) are VoiceOver accessibility labels, spoken not shown. Layout files (`_layout.tsx` for today/bible/plans/prayers/reflect/you) contain no user-facing copy except the root tab titles below.

EM DASH CHECK: no em dashes in any user-facing string in this scope. The 3 occurrences found (prayers/index.tsx:39,66; you/settings.tsx:32) are code comments, which are exempt.

CONSISTENCY FLAGS (not em dashes, but worth the copywriter's eye):
- Curly vs straight apostrophes: `bible/index.tsx:51` uses "you’ve" (curly) while `bible/marks.tsx:50` uses "you've" (straight); `prayers/index.tsx:143` uses "can’t" (curly). Everything else is straight.
- "any time" (you/index.tsx:68) vs "anytime" (you/settings.tsx:64) in the two sign-out alerts.
- Strings originating outside this scope but rendered on these screens (note for the sweep, source elsewhere): prayer category labels (`src/lib/prayers.ts` CATEGORY_LABEL), recap headline/read/learned/pray copy (`src/lib/recaps.ts`), "From your story" date label (`src/lib/reflections.ts` pickOnThisDay), milestone copy (`src/components/MilestoneCard.tsx`), voice recorder copy (`src/components/VoiceRecorder.tsx`), reflection-response copy (`src/components/ReflectionResponses.tsx`), Ask Pamwe sheet copy (`src/components/AskPamweSheet.tsx`), button "Back" default label (`src/components/ui/BackLink.tsx`).

---

## src/app/(tabs)/_layout.tsx
- `line 20` [type: title] "Today" (tab bar)
- `line 29` [type: title] "Bible" (tab bar)
- `line 38` [type: title] "Plans" (tab bar)
- `line 47` [type: title] "Prayers" (tab bar)
- `line 56` [type: title] "Reflect" (tab bar)
- `line 65` [type: title] "You" (tab bar)

## src/app/(tabs)/(today)/index.tsx
- `line 81` [type: title] "Ready for what's next" (no-active-plan state)
- `line 83` [type: empty-state] "You don't have an active reading plan right now. Choose one to begin a new journey together."
- `line 86` [type: button] "Choose a plan"
- `line 93` [type: body] "M'Cheyne Reading Plan" (fallback plan title)
- `line 101` [type: body] "Your partner" (fallback partner name)
- `line 102` [type: body] "Done" / "Today" (my status chip)
- `line 103` [type: body] "Done" / "Reading…" (partner status chip)
- `line 143` [type: button] "Reveal together"
- `line 145` [type: button] "Waiting for ${partnerName}"
- `line 146` [type: button] "Read Day ${dayNumber}"
- `line 159` [type: alert] title "Already sent" · message "You just sent a nudge." (fallback if server sends none)
- `line 160` [type: alert] title "Could not send" · message "Please try again." (fallback)
- `line 177` [type: button] "Settings" (a11y)
- `line 185` [type: title] "Day {dayNumber}" (hero)
- `line 192` [type: body] "Day {dayNumber}" (progress bar left)
- `line 193` [type: body] "{totalDays} days" (progress bar right)
- `line 201` [type: body] "You're a day behind. No rush, just pick it up together when you can." (catch-up banner)
- `line 202` [type: body] "You're ${behind} days behind. Read today's together tonight and you'll be back in step." (catch-up banner)
- `line 209` [type: body] {verse} = plan_day pull quote / passage reference — SCRIPTURE/CONSULTANT, do not rewrite
- `line 215` [type: body] "You" (partner column name)
- `line 224` [type: body] "{streakCount} day streak"
- `line 234` [type: button] "Nudge ${partnerName}" (a11y)
- `line 236` [type: button] "${partnerName} has been nudged" / "Sending…" / "Nudge ${partnerName} gently" (nudge link, three states)
- `line 241` [type: body] "Today's reading · {passage_reference}"

## src/app/(tabs)/(today)/reading.tsx
- `line 54` [type: title] "Day {dayNumber}" (eyebrow)
- `line 55` [type: title] {passage_title ?? passage_reference} — SCRIPTURE/CONSULTANT content
- `line 66` [type: body] "Gathering the words…" (passage loading state)
- `line 70` [type: error] "We couldn't load this passage."
- `line 71` [type: button] "Try again"
- `line 77` [type: title] "Sit with this" (prompt card eyebrow)
- `line 79` [type: body] {reflection_prompt} — CONSULTANT, do not rewrite
- `line 84` [type: button] "Write your reflection"

## src/app/(tabs)/(today)/journal.tsx
- `line 38` [type: body] "your partner" (fallback partner name)
- `line 39` [type: body] "Reading plan" (fallback plan title)
- `line 81` [type: alert] title "Share with ${partnerName}?" · message "Once shared, your reflection is sealed and cannot be edited."
- `line 82` [type: button] "Cancel" (alert)
- `line 84` [type: button] "Share" (alert)
- `line 96` [type: alert] title "Could not send"
- `line 98` [type: error] "You look offline. Your draft is saved. Try again when you're connected."
- `line 99` [type: error] "Failed to submit. Your draft is saved, so try again." (fallback when err.message empty)
- `line 127` [type: alert] title "Could not send recording"
- `line 129` [type: error] "You look offline. Your recording is still here. Try again when you're connected."
- `line 130` [type: error] "Upload failed. Your recording is still here, so try sending again." (fallback)
- `line 141` [type: title] "Today's prompt" (prompt card label)
- `line 143` [type: body] {reflection_prompt} — CONSULTANT, do not rewrite
- `line 151` [type: body] "Hidden until you've both reflected." (lock hint)
- `line 159` [type: button] "Back to reading" (back link)
- `line 160` [type: title] "{planTitle} · {passage_reference}" (eyebrow)
- `line 161` [type: title] "Your reflection"
- `line 167` [type: button] "Write" / "Voice" (segmented control)
- `line 182` [type: placeholder] "Write honestly. Only ${partnerName} will see it, and only once you've both written…"
- `line 192` [type: button] "Share with ${partnerName}"
- `line 204` [type: body] "Sending to ${partnerName}…" (upload overlay)

## src/app/(tabs)/(today)/waiting.tsx
- `line 25` [type: body] "Your partner" (fallback partner name)
- `line 48` [type: title] "Your reflection is in." (waiting-state headline)
- `line 50` [type: body] "It stays sealed until {partnerName} has read and reflected too. We'll nudge you both the moment it's ready to open together." (waiting-state body)
- `line 57` [type: body] "{partnerName} is reading…" (partner card)
- `line 61` [type: error] "We can't reach the server right now. We'll keep trying."
- `line 66` [type: button] "Back to Today"

## src/app/(tabs)/(today)/reveal.tsx
- `line 34` [type: body] "Your partner" (fallback partner name)
- `line 87` [type: error] "Couldn't load your reflections" (title)
- `line 88` [type: error] "Check your connection and try again."
- `line 90` [type: button] "Try again"
- `line 91` [type: button] "Back to Today"
- `line 102` [type: title] "Revealed together" (eyebrow)
- `line 103` [type: title] "What you each wrote"
- `line 112` [type: body] "You recorded" / "You wrote" (entry card label)
- `line 134` [type: body] "${partnerName} recorded" / "${partnerName} wrote" (entry card label)
- `line 155` [type: button] "Amen, mark day complete" (a11y)
- `line 157` [type: button] "Amen · mark day complete"

## src/app/(tabs)/(today)/complete.tsx
- `line 24` [type: body] "your plan" (fallback plan title)
- `line 44` [type: title] "Plan complete" (eyebrow)
- `line 45` [type: celebration] "You finished {planTitle}, together"
- `line 47` [type: celebration] "Every day, you both showed up and shared what you saw. That is the whole point."
- `line 52` [type: body] "day" / "days read" (stat label)
- `line 54` [type: body] "reflection" / "reflections" (stat label)
- `line 56` [type: body] "day streak" (stat label)
- `line 62` [type: button] "Choose your next plan"

## src/app/(tabs)/bible/index.tsx
- `line 51` [type: body] "Everything you’ve marked, together" / "Nothing marked yet" / "${markCount} marked" (marks entry subtitle; note CURLY apostrophe in "you’ve")
- `line 55` [type: title] "Bible"
- `line 56` [type: body] "Read any passage. World English Bible." (subtitle)
- `line 62` [type: placeholder] "Find a book or reference (e.g. John 3)"
- `line 78` [type: button] "Open chapter" / "Open book" (jump card sublabel)
- `line 91` [type: button] "My highlights & notes" (entry row title)
- `line 103` [type: button] "Search your notes & reflections"
- `line 107` [type: title] "Old Testament" (section eyebrow)
- `line 108` [type: title] "New Testament" (section eyebrow)
- `line 110` [type: empty-state] "No books match \"{query}\"."
- `line 130` [type: body] "{b.chapters} chapter" / "{b.chapters} chapters" (book row meta)

## src/app/(tabs)/bible/[book].tsx
- `line 22` [type: button] "Bible" (back link)
- `line 23` [type: error] "Unknown book" (title)
- `line 24` [type: error] "\"{bookName}\" isn't a recognized Bible book."
- `line 25` [type: button] "Back to books"
- `line 34` [type: button] "Books" (back link)
- `line 36` [type: body] "Pick a chapter." (subtitle)

## src/app/(tabs)/bible/[book]/[chapter].tsx
- `line 101` [type: error] "Unknown passage" (title)
- `line 103` [type: button] "Back to Bible"
- `line 158` [type: button] "Chapters" (a11y)
- `line 160` [type: button] "Chapters" (back link)
- `line 166` [type: button] "Reading options" (a11y, Aa button)
- `line 168` [type: button] "Aa" (typography control glyph)
- `line 176` [type: button] "Translation: ${TRANSLATION_NAMES[translation]}" (a11y)
- `line 188` [type: body] "Day {params.day}" (plan context banner)
- `line 192` [type: button] "Reflect" (plan banner CTA)
- `line 201` [type: body] "Gathering the words…" (loading state)
- `line 205` [type: error] "Could not load this chapter. Check your connection and try again."
- `line 207` [type: button] "Retry"
- `line 229` [type: body] "Tap a verse to highlight or note it." (hint)
- `line 241` [type: button] "Prev"
- `line 248` [type: button] "Next"
- `line 258` [type: title] "Text size" (popover label)
- `line 270` [type: body] "Verse numbers" (popover toggle label; a11y duplicate at line 271)
- `line 274` [type: body] "Appearance" (popover row label)
- `line 293` [type: title] "Highlight" (verse sheet label)
- `line 296` [type: button] "Highlight ${c}" (a11y, swatches: amber/rose/sage/sky)
- `line 298` [type: button] "Clear highlight" (a11y)
- `line 304` [type: title] "Your note" (note preview label)
- `line 310` [type: button] "Edit note" / "Add note"
- `line 316` [type: title] "Translation" (sheet title)

## src/app/(tabs)/bible/marks.tsx
- `line 48` [type: button] "Bible" (back link)
- `line 49` [type: title] "Highlights & notes"
- `line 50` [type: body] "Everything you've marked, together." (subtitle; STRAIGHT apostrophe, unlike bible/index.tsx:51)
- `line 56` [type: empty-state] "Nothing marked yet. Tap any verse while you read to highlight it or leave a note."
- `line 63` [type: title] "Notes" (section eyebrow)
- `line 88` [type: title] "Highlights" (section eyebrow)

## src/app/(tabs)/bible/note.tsx
- `line 38` [type: alert] title "Could not save" · message {e.message} (raw error passthrough)
- `line 47` [type: button] "Cancel"
- `line 51` [type: button] "Save"
- `line 56` [type: title] "Note on this verse" (eyebrow)
- `line 59` [type: placeholder] "What is this stirring in you?"

## src/app/(tabs)/bible/search.tsx
- `line 58` [type: button] "Bible" (back link)
- `line 59` [type: title] "Search together"
- `line 60` [type: body] "Your notes, highlights, and reflections." (subtitle)
- `line 67` [type: placeholder] "Search a word, a verse, a theme"
- `line 77` [type: empty-state] "Nothing yet for \"{query}\"."
- `line 82` [type: title] "Reflections" (section eyebrow)
- `line 99` [type: title] "Notes" (section eyebrow)
- `line 116` [type: title] "Highlights" (section eyebrow)

## src/app/(tabs)/plans/index.tsx
- `line 84` [type: body] "{book_label ?? title} · {duration_days} days" (plan meta line, reused lines 154/192)
- `line 97` [type: title] "Plans"
- `line 99` [type: button] "Ask Pamwe" (a11y, magnifier icon)
- `line 110` [type: title] "Not sure what to read next?" (Ask Pamwe card)
- `line 111` [type: body] "Ask Pamwe for a passage or a plan."
- `line 118` [type: title] "Reading now" (section eyebrow)
- `line 131` [type: body] "Day {currentDay} of {activeTotal}"
- `line 133` [type: button] "View plan"
- `line 144` [type: title] "Your plans" (section eyebrow)
- `line 165` [type: title] "Completed" (section eyebrow)
- `line 175` [type: body] "Completed · {duration_days} days · tap to begin again"
- `line 184` [type: title] "Browse more" (section eyebrow)
- `line 202` [type: button] "Build your own plan"

## src/app/(tabs)/plans/[id].tsx
- `line 96` [type: alert] title "Could not start this plan" · message "Please try again." (fallback)
- `line 101` [type: alert] title "Switch reading plan?" · message "Your current plan will be marked complete and \"${plan.title}\" will start at day 1. This affects you and your partner."
- `line 104` [type: button] "Cancel" (alert)
- `line 105` [type: button] "Begin together" (alert, destructive)
- `line 116` [type: alert] title "Mark this plan complete?" · message "It moves to your finished plans and you can choose what to read next."
- `line 119` [type: button] "Cancel" (alert)
- `line 121` [type: button] "Mark complete" (alert)
- `line 138` [type: alert] title "Could not update the plan" · message "Please try again." (fallback)
- `line 158` [type: error] "We couldn't open this plan"
- `line 160` [type: button] "Go back"
- `line 183` [type: body] {plan.tagline} — DB plan metadata (plans table), edit in seed/DB not here
- `line 193` [type: button] "Back" (a11y)
- `line 202` [type: body] "Days" (meta label)
- `line 206` [type: body] "Scripture" (meta label)
- `line 210` [type: body] "A day" (meta label, under minutes)
- `line 214` [type: title] "About this plan" (section eyebrow)
- `line 215` [type: body] {plan.about ?? plan.subtitle} — DB plan metadata
- `line 219` [type: title] "Reading schedule" (section eyebrow)
- `line 222` [type: body] "{earlierDays} earlier days"
- `line 244` [type: body] "Day {d.day_number}" (schedule row label)
- `line 252` [type: body] "+ {moreDays} more days"
- `line 260` [type: title] "What you'll explore" (section eyebrow; items are DB plan metadata)
- `line 276` [type: title] "What you'll gain" (card eyebrow; items are DB plan metadata)
- `line 292` [type: button] "Continue reading" / "Begin together" (primary CTA)
- `line 295` [type: button] "Mark plan complete"

## src/app/(tabs)/plans/builder.tsx
- `line 25-27` [type: button] "Books" / "Topics" / "Ask Pamwe" (segmented control)
- `line 31-33` [type: button] "A few verses" / "A chapter" / "Go deep" (rhythm segments)
- `line 36-38` [type: body] "A few verses a day" / "One chapter a day" / "A longer sitting" (RHYTHM_LABEL, shown in review + saved to plan)
- `line 41-48` [type: button] topic chips: "Marriage", "Anxiety", "Forgiveness", "Gratitude", "Grief", "New season", "Rest", "Money" (the paired `query` strings are sent to the AI, never displayed; exclude from rewrite unless retargeting the AI)
- `line 106` [type: body] "${bookName}, together" (default plan name)
- `line 117` [type: alert] title "Not connected" · message "You need a partner before building a plan."
- `line 121` [type: body] "${selectedBook ?? 'Custom'} plan" (fallback plan name)
- `line 136` [type: alert] title "Could not create the plan" · message "Please try again." (fallback)
- `line 148` [type: celebration] "Your plan is ready"
- `line 150` [type: celebration] "“{name || 'Your plan'}” is saved under your plans. Open it to begin together."
- `line 153` [type: button] "View plan"
- `line 154` [type: button] "Done"
- `line 162` [type: body] "Starting in ${selectedBook}" (review source label)
- `line 182` [type: title] "Build a plan"
- `line 183` [type: body] "Pick a book, a topic, or ask Pamwe for an idea." (subtitle)
- `line 193` [type: placeholder] "Search books"
- `line 206` [type: body] "{b.chapters} ch" (book row meta)
- `line 243` [type: placeholder] "e.g. We're anxious about a big move. What should we read?"
- `line 252` [type: button] "Ask Pamwe"
- `line 262` [type: title] "How long?"
- `line 263` [type: body] "Choose the length of your journey." (subtitle)
- `line 273` [type: body] "days" (length card label)
- `line 274` [type: body] "Recommended" (length card badge)
- `line 284` [type: title] "Your rhythm"
- `line 285` [type: body] "How much do you want to read each day?" (subtitle)
- `line 289` [type: title] "Reflect together" (toggle row title)
- `line 290` [type: body] "Journal and reveal after each reading." (toggle row sub)
- `line 299` [type: title] "Ready?"
- `line 300` [type: body] "Give your plan a name and review it." (subtitle)
- `line 305` [type: placeholder] "Name your plan"
- `line 311` [type: body] "Source" (review label)
- `line 312` [type: body] "Length" · value "${days} days" (review row)
- `line 313` [type: body] "Rhythm" (review label)
- `line 314` [type: body] "Reflect together" · values "Yes" / "No" (review row)
- `line 322` [type: button] "Continue" / "Next"
- `line 324` [type: button] "Create plan"

## src/app/(tabs)/prayers/index.tsx
- `line 42` [type: body] "Your partner" (fallback partner name)
- `line 117` [type: alert] title "Could not save" · message "That didn't go through. Please try again."
- `line 125` [type: alert] title "Could not update the prayer" · message "Please try again in a moment." (fallback)
- `line 128` [type: alert] (iOS prompt) title "Mark as answered" · message "Add a note about how it was answered (optional)."
- `line 129` [type: button] "Cancel" / "Mark answered" (prompt buttons)
- `line 131` [type: alert] (Android) title "Mark as answered" · message "This moves the prayer to your answered archive."
- `line 132` [type: button] "Cancel" / "Mark answered" (alert buttons)
- `line 143` [type: alert] title "Delete this prayer?" · message "This removes it for both of you and can’t be undone." (CURLY apostrophe in "can’t")
- `line 144` [type: button] "Cancel" (alert)
- `line 146` [type: button] "Delete" (alert, destructive)
- `line 151` [type: alert] title "Could not remove it" · message "Please try again in a moment." (fallback)
- `line 166` [type: title] "Prayer requests"
- `line 167` [type: body] "What you're carrying to Him, together." (subtitle)
- `line 172` [type: button] "Add a prayer point"
- `line 182` [type: empty-state] "Nothing on your hearts yet" (title)
- `line 184` [type: empty-state] "Add your first prayer point above, and {partnerName} can pray it with you."
- `line 208` [type: button] "Open the faithfulness timeline" (a11y)
- `line 210` [type: title] "Answered · {answered.length}" (section header)
- `line 218` [type: body] "You" / {partnerName} (answered card author)

## src/app/(tabs)/prayers/add.tsx
- `line 40` [type: body] "your partner" (fallback partner name)
- `line 55` [type: alert] title "Could not save your prayer" · message "Please try again in a moment." (fallback)
- `line 64` [type: button] "Prayer requests" (back link)
- `line 65` [type: title] "Edit prayer" / "New prayer"
- `line 66` [type: body] "Name it, and carry it to Him together." (subtitle)
- `line 68` [type: title] "Your prayer" (eyebrow)
- `line 73` [type: placeholder] "e.g. Wisdom as we decide about the move…"
- `line 78` [type: body] "{text.length} / {MAX_LENGTH}" (character counter)
- `line 80` [type: title] "What is it about?" (eyebrow; chip labels come from CATEGORY_LABEL in src/lib/prayers.ts, outside this scope)
- `line 101` [type: title] "Let {partnerName} know" (notify toggle title)
- `line 103` [type: body] "They'll get a gentle notification to pray with you."
- `line 106` [type: button] "Notify ${partnerName}" (a11y)
- `line 110` [type: body] "{partnerName} will see" (preview label)
- `line 113` [type: body] notification preview: line "${myName} added a prayer point" · subline "“{text}”" or "“…”"
- `line 123` [type: button] "Save changes" / "Share prayer"

## src/app/(tabs)/prayers/timeline.tsx
- `line 27` [type: body] "Carried {days} day" / "Carried {days} days"
- `line 28` [type: body] "Carried {w} week" / "Carried {w} weeks"
- `line 30` [type: body] "Carried {m} month" / "Carried {m} months"
- `line 58` [type: button] "Prayers" (back link)
- `line 61` [type: title] "Answered"
- `line 63` [type: body] "A record of His faithfulness, together." (subtitle)
- `line 71` [type: empty-state] "Nothing answered yet" (title)
- `line 73` [type: empty-state] "When you mark a prayer answered, it will be gathered here as part of your story."
- `line 89` [type: body] "Answered {longDate}" (card eyebrow)
- `line 100` [type: body] "You asked" / "${partnerName} asked" · "· {longDate}" (card meta)

## src/app/(tabs)/reflect/index.tsx
- `line 90` [type: title] "Reflections"
- `line 92` [type: button] "Their words" (a11y, bookmark icon)
- `line 96` [type: body] "What you've come across, together." (subtitle)
- `line 103` [type: empty-state] "No reflections yet" (title)
- `line 105` [type: empty-state] "When you read a plan day and reflect, what you each write will gather here."
- `line 113` [type: title] "From your story · {onThisDay.label}" (label text from src/lib/reflections.ts)
- `line 123` [type: button] "All" (filter chip; other chips are book names)
- `line 149` [type: button] "Read" (card CTA)

## src/app/(tabs)/reflect/[id].tsx
- `line 77` [type: body] "Your partner" (fallback partner name)
- `line 91` [type: title] "Day ${dayNumber}" (fallback title)
- `line 96` [type: button] "Reflections" (back link)
- `line 100` [type: body] "Day {dayNumber} · {planTitle}"
- `line 104` [type: title] "The passage" (card eyebrow; passage text itself is SCRIPTURE)
- `line 108` [type: error] "Couldn't load the passage."
- `line 115` [type: title] "What you each wrote" (section eyebrow)
- `line 116` [type: body] "You wrote" / "You recorded" (card labels)
- `line 122` [type: body] "${partnerName} wrote" / "${partnerName} recorded" (card labels)
- `line 159` [type: empty-state] "No reflection." (missing entry in card)

## src/app/(tabs)/reflect/words.tsx
- `line 31` [type: body] "Your partner" (fallback partner name)
- `line 50` [type: button] "Reflections" (back link)
- `line 53` [type: title] "Their words"
- `line 55` [type: body] "The lines that stayed with you." (subtitle)
- `line 63` [type: empty-state] "Nothing kept yet" (title)
- `line 65` [type: empty-state] "When a line in {partnerName}'s reflection stays with you, keep it from the reveal and it will live here."
- `line 78` [type: body] "${partnerName}'s words" / "Your words, kept by ${partnerName}" (card meta)

## src/app/(tabs)/you/index.tsx
- `line 62` [type: body] "You" (fallback name)
- `line 64` [type: body] "your partner" (fallback partner name)
- `line 68` [type: alert] title "Sign out?" · message "You can sign back in any time." ("any time", two words; settings.tsx:64 says "anytime")
- `line 69` [type: button] "Cancel" (alert)
- `line 70` [type: button] "Sign out" (alert, destructive)
- `line 80` [type: title] "You"
- `line 89` [type: body] "Walking with {partnerName} · {streak} day streak"
- `line 95` [type: body] "Days read" (stat label)
- `line 96` [type: body] "Reflections" (stat label)
- `line 97` [type: body] "Prayers" (stat label)
- `line 100` [type: title] "Appearance" (section eyebrow)
- `line 102` [type: button] "Light"
- `line 103` [type: button] "Dark"
- `line 106` [type: title] "Settings" (section eyebrow)
- `line 108` [type: button] "Notifications & reminders" (row)
- `line 109` [type: button] "Change reading plan" (row)
- `line 110` [type: button] "Your recaps" (row)
- `line 111` [type: button] "You & ${partner?.display_name ?? 'partner'}" (row)
- `line 114` [type: title] "About" (section eyebrow)
- `line 116` [type: button] "Privacy policy" (row)
- `line 117` [type: button] "Terms of service" (row)
- `line 121` [type: button] "Sign out"
- `line 123` [type: body] "Scripture: World English Bible · public domain" (footer)

## src/app/(tabs)/you/settings.tsx
- `line 51` [type: alert] title "Could not save" · message "Please try again." (fallback)
- `line 64` [type: alert] title "Sign out?" · message "You can sign back in anytime." ("anytime", one word; you/index.tsx:68 says "any time")
- `line 65` [type: button] "Cancel" (alert)
- `line 67` [type: button] "Sign out" (alert, destructive)
- `line 82` [type: button] "You" (back link)
- `line 83` [type: title] "Settings"
- `line 85` [type: title] "Notifications" (section eyebrow)
- `line 90` [type: error] "Notifications are turned off for Pamwe in your phone settings. Tap to turn them back on." (permission banner)
- `line 95` [type: body] "Morning reminder" (row label; preset chips are times "06:00"–"08:00")
- `line 109` [type: body] "Partner reflections" · description "When your partner submits, so both unlock." (toggle row)
- `line 111` [type: body] "New prayers" · description "When your partner adds a prayer point." (toggle row)
- `line 114` [type: title] "Plan" (section eyebrow)
- `line 116` [type: button] "Change reading plan" (action row)
- `line 119` [type: title] "Account" (section eyebrow)
- `line 123` [type: body] "Signed in as" (label)
- `line 128` [type: button] "Sign out" (action row)
- `line 130` [type: button] "Delete account" (action row, destructive)

## src/app/(tabs)/you/couple.tsx
- `line 35` [type: body] "You" (fallback name)
- `line 37` [type: body] "your partner" (fallback partner name)
- `line 50` [type: button] "You" (back link)
- `line 51` [type: title] "You & {partner?.display_name ?? 'partner'}"
- `line 62` [type: body] "{myName} & {partnerName}"
- `line 64` [type: body] "{streak} day streak · together since {pairedAt}"
- `line 69` [type: body] "Days together" (stat label)
- `line 70` [type: body] "Revealed" (stat label)
- `line 71` [type: body] "Prayers" (stat label)
- `line 78` [type: body] "Reflections sealed until you both write" (privacy row label)
- `line 79` [type: body] "On" (privacy row status)
- `line 82-84` [type: body] "Reflections are visible only to you and {partnerName}. A reflection stays sealed until you've both written for that day. We never surface it early, to anyone."

## src/app/(tabs)/you/recaps.tsx
- `line 18-20` [type: button] "Week" / "Month" / "Quarter" (segmented control)
- `line 46` [type: button] "You" (back link)
- `line 47` [type: title] "Your recap"
- `line 49` [type: body] "A look back at what you've walked through together." (subtitle)
- `line 62` [type: body] "Days read" (stat label)
- `line 63` [type: body] "Highlights" (stat label)
- `line 64` [type: body] "Prayers" (stat label)
- `line 67` [type: title] "What you read" (card title; body from src/lib/recaps.ts)
- `line 68` [type: title] "What you learned" (card title; body from src/lib/recaps.ts)
- `line 69` [type: title] "What you prayed for" (card title; body from src/lib/recaps.ts)
- `line 71` [type: title] "Sent to you both" (eyebrow)
- `line 74` [type: body] "Your ${recap.period} together is ready 🌿" (notification preview line; subline is recap.headline from lib)

## src/app/(tabs)/you/delete-account.tsx
- `line 26` [type: alert] title "Could not delete account" · message "Please try again." (fallback)
- `line 32-33` [type: alert] title "Delete your account?" · message "This permanently removes your reflections and prayers. It cannot be undone."
- `line 35` [type: button] "Cancel" (alert)
- `line 36` [type: button] "Delete forever" (alert, destructive)
- `line 45` [type: button] "Cancel" (header)
- `line 47` [type: title] "Delete account" (header)
- `line 52` [type: title] "This removes you from Pamwe"
- `line 56` [type: body] "• Your reflections and the prayers you wrote are deleted."
- `line 59` [type: body] "• Your partner keeps their own reflections and prayers."
- `line 62` [type: body] "• Your partner is unpaired and let know you've left." (grammar flag: "and let know" reads broken; likely meant "and told you've left" or "and notified that you've left")
- `line 65` [type: body] "• This is immediate and cannot be undone."
- `line 71` [type: button] "Delete my account"
- `line 78` [type: button] "Keep my account"

## src/app/(tabs)/you/privacy.tsx
- `line 24` [type: title] "Privacy policy"
- `line 25` [type: body] "Last updated July 9, 2026"
- `line 28-31` [type: body] "Pamwe is a private devotional space for you and your partner. This policy explains, plainly, what the app collects, where it goes, who can see it, and how to erase it. The short version: your reflections belong to the two of you, we don't sell or share your data, and there are no ads."
- `line 34` [type: title] "What Pamwe collects"
- `line 36-38` [type: body] "Account: your email address and, if you sign in with Apple or Google, the name and email those services share. Your display name and avatar initial."
- `line 40-42` [type: body] "Content you create: written reflections, voice reflections (audio recordings), prayers and \"I prayed\" marks, verse highlights and notes, and any custom reading plans you build."
- `line 45-46` [type: body] "Progress: your reading plan, current day, streak, and the timezone captured once when your couple was created (used to know when a day rolls over)."
- `line 49-50` [type: body] "Device: if you allow notifications, a push token and your notification preferences. We don't collect your location, contacts, or photos."
- `line 53` [type: title] "Who can see your reflections"
- `line 55-59` [type: body] "Only you and your partner. No one else, ever. A reflection stays sealed until both of you have submitted for the same day; then it is revealed to both of you at once. This rule is enforced by the database itself (row-level security), not just by the app's screens. Voice recordings live in private storage governed by the same rule. Prayers, highlights, and notes are shared between the two of you only."
- `line 62` [type: title] "Services Pamwe relies on"
- `line 64` [type: body] "Supabase stores your account, content, and voice recordings, encrypted in transit."
- `line 67-69` [type: body] "Apple (and Google, if you use Google sign-in) handle sign-in; Apple and Expo deliver push notifications. Notification content is minimal, e.g. that your partner has reflected, never what they wrote."
- `line 72-74` [type: body] "Anthropic powers \"Ask Pamwe\", the reading-plan builder. When you use it, the request you type (e.g. \"a plan about patience\") is sent to Anthropic's AI service to generate plan suggestions. Your reflections, prayers, and notes are never sent."
- `line 77-78` [type: body] "Bible text is fetched from bible-api.com by chapter reference. The request contains only the passage being read, nothing about you."
- `line 81-82` [type: body] "If crash reporting is enabled, technical crash data goes to Sentry to help fix bugs. It does not include the content of your reflections or prayers."
- `line 85` [type: title] "What Pamwe does not do"
- `line 87-89` [type: body] "No ads. No selling of data. No sharing your content with third parties beyond the services above, which act only on our instructions. No analytics on what you write, record, or pray. No training AI models on your content."
- `line 92` [type: title] "How long we keep it"
- `line 94-95` [type: body] "Your content is kept for as long as your account exists, so your shared history is always there for the two of you. Delete your account and it goes with you."
- `line 98` [type: title] "Deleting your data"
- `line 100-103` [type: body] "You can delete your account any time in Settings → Delete account. This permanently removes your reflections, voice recordings, prayers, prayer marks, highlights, notes, and account details. Your partner keeps their own reflections and prayers and is unpaired. Deletion is not reversible."
- `line 106` [type: title] "Children"
- `line 108-109` [type: body] "Pamwe is not directed at children under 13, and we don't knowingly collect their data. If you believe a child has created an account, contact us and we'll delete it."
- `line 112` [type: title] "Changes to this policy"
- `line 114-115` [type: body] "If this policy changes in a way that matters, we'll update the date above and let you know in the app before the change takes effect."
- `line 118` [type: title] "Contact"
- `line 120` [type: body] "Questions about your data: christianmangwanda@gmail.com"

## src/app/(tabs)/you/terms.tsx
- `line 24` [type: title] "Terms of service"
- `line 25` [type: body] "Last updated July 9, 2026"
- `line 28-29` [type: body] "These terms are an agreement between you and Pamwe. By creating an account or using the app, you accept them. If you don't agree, please don't use Pamwe."
- `line 32` [type: title] "Who can use Pamwe"
- `line 34-36` [type: body] "You must be at least 13 years old (or the minimum age of digital consent where you live) and able to enter into this agreement. Pamwe is designed for two partners reading together; each account belongs to one person."
- `line 39` [type: title] "Your content"
- `line 41-44` [type: body] "Everything you write, record, and mark in Pamwe is yours. You grant us only the limited license needed to store your content, back it up, and show it to you and your partner under the app's reveal rules, nothing more. We claim no ownership and will never publish, sell, or use your content to train AI models."
- `line 47` [type: title] "Our content"
- `line 49-51` [type: body] "Scripture text is from the World English Bible and other public-domain translations. Reading plans, prompts, and the app's design are ours or our licensors'; you may use them within the app for personal, non-commercial purposes."
- `line 54` [type: title] "Ask Pamwe (AI suggestions)"
- `line 56-59` [type: body] "The plan builder uses an AI service to suggest reading plans. Suggestions are generated automatically and may be imperfect, so review a plan before beginning it. Scripture references in a generated plan should always be checked against the text itself."
- `line 62` [type: title] "Not professional advice"
- `line 64-66` [type: body] "Pamwe is a devotional companion, not a substitute for pastoral care, counseling, therapy, or medical advice. If you or your partner are in crisis, please reach out to a qualified professional or an emergency service."
- `line 69` [type: title] "Acceptable use"
- `line 71-74` [type: body] "Use Pamwe only for its purpose: a shared devotional practice between you and your partner. Don't attempt to access another couple's data, probe or disrupt the service, reverse-engineer the app, use it for anything unlawful, or upload content that is abusive or infringes someone else's rights."
- `line 77` [type: title] "Your account"
- `line 79-82` [type: body] "Keep your sign-in method secure. It's the key to a space two people share. You're responsible for activity under your account. You can delete your account at any time in Settings; deletion is permanent and unpairs your partner, who keeps their own content."
- `line 85` [type: title] "Availability and changes"
- `line 87-90` [type: body] "Pamwe is provided \"as is\" and \"as available\", without warranties of any kind. Features may change, and the service may be interrupted or discontinued. If Pamwe ever winds down, we will aim to give you notice and a way to keep what you've written."
- `line 93` [type: title] "Limitation of liability"
- `line 95-98` [type: body] "To the fullest extent the law allows, Pamwe and its creator are not liable for indirect, incidental, or consequential damages arising from your use of the app, including lost data beyond what reasonable backups can restore. Nothing in these terms limits liability where the law does not permit it."
- `line 101` [type: title] "Ending your use"
- `line 103-105` [type: body] "You can stop using Pamwe at any time. We may suspend or remove accounts that violate these terms or misuse the service, and we'll tell you why unless the law prevents it."
- `line 108` [type: title] "Changes to these terms"
- `line 110-112` [type: body] "If these terms change materially, we'll update the date above and notify you in the app before the change takes effect. Continuing to use Pamwe after that means you accept the new terms."
- `line 115` [type: title] "Contact"
- `line 117` [type: body] "Questions about these terms: christianmangwanda@gmail.com"

## Part 3: Components, lib, edge functions, plan metadata

# Pamwe user-facing copy inventory — components / lib+hooks / edge functions / plan metadata

Scope: src/components/**, src/lib/**, src/hooks/**, supabase/functions/**, plan browse metadata seeds.
Excluded: code comments, console output, test files, Scripture text, the M'Cheyne 365-day passage text / pull quotes / reflection prompts in `supabase/seed.sql` (consultant content — noted below, not inventoried).
Strings marked "(a11y)" are accessibilityLabel values (spoken by VoiceOver, not drawn on screen). Strings marked "(thrown)" are `throw new Error(...)` messages that screens may surface in generic error handling.

## src/components/AskPamweSheet.tsx
- `line 18` [type: button] "What should we read when we feel distant?" (suggestion chip)
- `line 19` [type: button] "How does the reveal work?" (suggestion chip)
- `line 20` [type: button] "A psalm for a hard day?" (suggestion chip)
- `line 64` [type: title] "Ask Pamwe" (eyebrow)
- `line 65` [type: title] "How can we help you read?"
- `line 67` [type: body] "Pamwe can point you to passages and help with the app. It won't interpret Scripture for you, that's yours to read together."
- `line 75` [type: body] "Ask about a passage, a plan, or the app" (input placeholder)
- `line 92` [type: button] "Ask Pamwe"

## src/components/AudioPlayer.tsx
- `line 47` [type: error] "Couldn't load recording."
- `line 67` [type: button] "Pause playback" (a11y)
- `line 67` [type: button] "Play recording" (a11y)

## src/components/MilestoneCard.tsx
- `line 32` [type: button] "Amen" (dismiss; title/body come from MILESTONE_COPY in src/lib/milestones.ts)

## src/components/NotificationPreview.tsx
- `line 19` [type: title] "Pamwe" (mock lock-screen banner app name)
- `line 20` [type: body] "now" (mock banner timestamp)

## src/components/PamweFab.tsx
- `line 54` [type: button] "Ask Pamwe" (a11y, the floral bubble)

## src/components/PamweWordmark.tsx
- `line 17` [type: title] "Pamwe" / "pamwe" (brand wordmark, capital prop switches)

## src/components/PrayerCard.tsx
- `line 39` [type: body] "today" (relativeTime)
- `line 40` [type: body] "yesterday" (relativeTime)
- `line 41` [type: body] "{days} days ago" (relativeTime)
- `line 43` [type: body] "1 week ago" (relativeTime)
- `line 44` [type: body] "{weeks} weeks ago" (relativeTime)
- `line 46` [type: body] "1 month ago" / "{months} months ago" (relativeTime)
- `line 86` [type: body] "{partnerName} prayed today"
- `line 87` [type: body] "Waiting for {partnerName}"
- `line 89` [type: body] "You prayed today"
- `line 90` [type: button] "I prayed today"
- `line 96` [type: button] "Edit prayer" (a11y)
- `line 98` [type: button] "Edit"
- `line 100` [type: button] "Delete prayer" (a11y)
- `line 102` [type: button] "Delete"
- `line 133` [type: button] "Prayer options" (a11y)

## src/components/PrayerDetailSheet.tsx
- `line 14` [type: button] "8:00 AM" (reminder preset)
- `line 15` [type: button] "12:00 PM" (reminder preset)
- `line 16` [type: button] "9:00 PM" (reminder preset)
- `line 63` [type: alert] "Notifications are off" (title)
- `line 63` [type: alert] "Turn on notifications for Pamwe to set a reminder." (body)
- `line 82` [type: body] "{partnerName} prayed today"
- `line 83` [type: body] "Waiting for {partnerName}"
- `line 85` [type: body] "You prayed today"
- `line 86` [type: body] "Not prayed yet"
- `line 105` [type: body] "Answered"
- `line 125` [type: button] "Mark as answered"
- `line 132` [type: button] "Edit"
- `line 136` [type: button] "Delete"
- `line 146` [type: title] "Remind me to pray"
- `line 147` [type: body] "A daily nudge on this phone."
- `line 153` [type: button] "Daily prayer reminder" (a11y, switch)

## src/components/ReflectionResponses.tsx
- `line 76` [type: alert] "Could not save" (title)
- `line 76` [type: alert] "Please try again." (body)
- `line 91` [type: alert] "Could not send" (title)
- `line 91` [type: alert] "Please try again." (body)
- `line 111` [type: alert] "Could not keep that line" (title)
- `line 111` [type: alert] "Please try again." (body)
- `line 118` [type: alert] "Remove this?" (title)
- `line 118` [type: alert] "It will be removed for both of you." (body)
- `line 119` [type: button] "Cancel"
- `line 121` [type: button] "Remove"
- `line 124` [type: alert] "Could not remove" (title)
- `line 124` [type: alert] "Please try again." (body)
- `line 139` [type: body] "{partnerName} responded"
- `line 145` [type: body] "{partnerName} kept this line of yours"
- `line 160` [type: button] "Heart" (a11y)
- `line 165` [type: button] "Amen" (a11y)
- `line 168` [type: button] "Amen"
- `line 171` [type: button] "Reply" (a11y)
- `line 174` [type: button] "Reply"
- `line 178` [type: button] "Keep a line" (a11y)
- `line 181` [type: button] "Keep a line"
- `line 188` [type: body] "Tap the line that stayed with you."
- `line 211` [type: body] "Say something to {partnerName}" (input placeholder)
- `line 219` [type: button] "Send"
- `line 230` [type: button] "Remove" (a11y)

## src/components/VersePassage.tsx
- `line 80` [type: body] " ✎" (inline glyph marking a noted verse — glyph, not prose)

## src/components/VoiceRecorder.tsx
- `line 103` [type: alert] "Microphone access needed" (title)
- `line 104` [type: alert] "Enable microphone access in Settings to record a voice reflection." (body)
- `line 119` [type: alert] "Could not start recording" (title; body is err.message or "Unknown error")
- `line 119` [type: alert] "Unknown error" (fallback body)
- `line 131` [type: alert] "Recording failed" (title)
- `line 131` [type: alert] "No audio file was produced." (body)
- `line 138` [type: alert] "Could not stop recording" (title)
- `line 138` [type: alert] "Unknown error" (fallback body)
- `line 158` [type: body] "Pamwe needs microphone access to record your voice reflection. Enable it in Settings."
- `line 185` [type: body] "{m:ss} left" (recording countdown)
- `line 185` [type: body] "Up to {N} minutes" (idle hint)
- `line 189` [type: button] "Stop recording" (a11y)
- `line 194` [type: button] "Start recording" (a11y)
- `line 218` [type: button] "Pause playback" (a11y)
- `line 218` [type: button] "Play recording" (a11y)
- `line 227` [type: body] "Your reflection"
- `line 232` [type: button] "Send to partner"
- `line 233` [type: button] "Re-record"

## src/components/ui/BackLink.tsx
- `line 8` [type: button] "Back" (default label; callers may override)

## src/components/ui/BottomSheet.tsx
- `line 25` [type: button] "Close" (a11y, scrim)

## src/components/ui/CategoryChip.tsx
- `line 11` [type: body] "Other" (fallback when category is unknown; labels come from CATEGORY_LABEL in src/lib/prayers.ts)

## src/components/ui/StreakTree.tsx
- `line 22` [type: body] "Ready to plant" (stage word, uppercased on render)
- `line 23` [type: body] "Planted"
- `line 24` [type: body] "Taking root"
- `line 25` [type: body] "Growing"
- `line 26` [type: body] "Reaching up"
- `line 27` [type: body] "In full bloom"

(Other ui/ components — Avatar, Button, Card, Floral, Glass, ProgressBar, Screen, SectionEyebrow, SegmentedControl, Spinner, StreakBar, StripedBanner, Switch, Text, TwineDivider, DockedTabBar — carry no hardcoded user-facing strings; their text comes from props.)

## src/lib/askPamwe.ts
- `line 38` [type: body] "A plan for you" (fallback rec title when model omits one)
- `line 39` [type: body] "{N} days" (fallback rec meta)
- `line 86` [type: body] "Pamwe is here for Scripture, prayer, and your walk together. For that one, you'll want another guide." (client OFF_TOPIC_FALLBACK, duplicates the server line)
- `line 105` [type: error] "Pamwe could not find the words just now. Please try again."
- `line 115` [type: error] "Pamwe is resting right now. Please try again in a moment."
- `line 124` [type: title] "Meet Jesus, Together" (fallback rec 1 title)
- `line 125` [type: body] "The Gospel of John · 21 days" (fallback rec 1 meta)
- `line 130` [type: body] "What did Jesus reveal about himself in today’s reading?" (fallback prompt)
- `line 131` [type: body] "Where do you each need his grace this week?" (fallback prompt)
- `line 132` [type: body] "What is one thing you want to remember together?" (fallback prompt)
- `line 136` [type: title] "Words for Every Weather" (fallback rec 2 title)
- `line 137` [type: body] "Psalms of comfort · 14 days" (fallback rec 2 meta)
- `line 145` [type: body] "What is your soul carrying right now?" (fallback prompt)
- `line 146` [type: body] "How can you be a comfort to each other today?" (fallback prompt)
- `line 147` [type: body] "Where do you need to trust God together?" (fallback prompt)
- `line 151` [type: title] "The Way of Love" (fallback rec 3 title)
- `line 152` [type: body] "Love, patience & grace · 7 days" (fallback rec 3 meta)
- `line 160` [type: body] "Where is love asking more of you this week?" (fallback prompt)
- `line 161` [type: body] "What would it look like to be patient with each other today?" (fallback prompt)
- `line 162` [type: body] "How has God been patient with you?" (fallback prompt)

## src/lib/milestones.ts
- `line 18` [type: title] "Seven days, together"
- `line 19` [type: body] "A whole week of showing up for each other and for Him. Keep going."
- `line 22` [type: title] "Thirty days, together"
- `line 23` [type: body] "A month of small faithful mornings. This is becoming who you are."
- `line 26` [type: title] "One hundred days, together"
- `line 27` [type: body] "A hundred days of shared words and quiet constancy. What a gift you are building."

## src/lib/prayerReminders.ts
- `line 53` [type: notification] "A prayer to carry" (local daily reminder title; body is the prayer text, truncated at 90 chars with "…")

## src/lib/notifications.ts
- `line 160` [type: error] "Not authenticated" (thrown)
- `line 179` [type: error] "Could not send a nudge right now."
- `line 183` [type: error] "Could not send a nudge right now."
- `line 192` [type: notification] "Good morning" (local morning reminder title)
- `line 193` [type: notification] "Today's reading is waiting for you and your partner." (local morning reminder body)

## src/lib/prayers.ts
- `line 8` [type: body] "Family" / "Health" / "Work" / "Guidance" / "Thanks" / "Other" (CATEGORY_LABEL, prayer category chips) — 6 strings
- `line 47` [type: error] "Not authenticated" (thrown)
- `line 100` [type: error] "Not authenticated" (thrown)

## src/lib/planBuilder.ts
- `line 27` [type: body] "What stood out to you in today's reading?" (generic reflection prompt for custom plans)
- `line 28` [type: body] "Where did you see God at work: in the passage, or in each other?" (generic prompt)
- `line 29` [type: body] "What is one thing you want to carry into your day together?" (generic prompt)
- `line 48` [type: error] "Not signed in" (thrown)
- `line 60` [type: metadata] "Made for you" (tagline written onto every custom plan row)

## src/lib/recaps.ts
- `line 6` [type: title] "This week" / "This month" / "This quarter" (RECAP_LABEL) — 3 strings
- `line 86` [type: body] "A gentle pause this {week|month|quarter}." (recap headline)
- `line 87` [type: body] "You carried each other in prayer this {word}." (recap headline)
- `line 88` [type: body] "{N} day(s) in the Word, together." (recap headline)
- `line 91` [type: body] "You're building a real rhythm: {N} days of showing up for each other. Keep going."
- `line 93` [type: body] "Small steps still count. Every day in the Word plants something between you."
- `line 94` [type: body] "A quiet season is still a season. When you return to the Word, it will be here."
- `line 96` [type: body] "You'll see what you read here once you've read a few days." (empty "What you read")
- `line 99` [type: body] "Nothing new brought to prayer this {word}." (empty "What you prayed for")

## src/lib/reflections.ts
- `line 74` [type: body] "Day {N}" (fallback reference when plan_days row missing)
- `line 81` [type: body] "A voice reflection" (snippet fallback for voice-only days without transcript)
- `line 87` [type: body] "Reading plan" (fallback plan title)
- `line 110` [type: body] "About a month ago" (From-your-story card label)
- `line 112` [type: body] "A week ago" (From-your-story card label)
- `line 137` [type: body] "Reading plan" (fallback plan title, detail)

## src/lib/couples.ts
- `line 17` [type: error] "Not authenticated" (thrown)
- `line 50` [type: error] "Not authenticated" (thrown)
- `line 60` [type: error] "Invalid or expired invite code" (thrown; surfaced on the join screen)
- `line 61` [type: error] "You can't join your own invite" (thrown; surfaced on the join screen)

## src/lib/bible.ts
- `line 97` [type: metadata] "World English Bible" (translation picker)
- `line 98` [type: metadata] "King James Version"
- `line 99` [type: metadata] "American Standard Version"
- `line 100` [type: metadata] "Bible in Basic English"
- `line 101` [type: metadata] "Young's Literal Translation"
- `line 102` [type: metadata] "Darby Translation"
- `line 106` [type: metadata] "WEB" / "KJV" / "ASV" / "BBE" / "YLT" / "DBY" (translation abbreviations) — 6 strings
- `line 169` [type: error] "bible-api.com returned HTTP {status} for {book} {chapter}" (thrown; internal-sounding, may leak into a generic error state)
- `line 194` [type: error] "bible-api.com returned HTTP {status} for {reference}" (thrown; same caveat)
- Note: `BIBLE_BOOKS` (lines 15-84) renders the 66 canonical book names in the Bible tab; standard canon names, not copywriting material — not itemized.

## src/lib/entries.ts
- `lines 55, 107, 147` [type: error] "Not authenticated" (thrown, 3 occurrences)

## src/lib/verseMarks.ts
- `lines 56, 77` [type: error] "Not authenticated" (thrown, 2 occurrences)

## src/lib/entryResponses.ts
- `lines 53, 79, 94` [type: error] "Not authenticated" (thrown, 3 occurrences)

## src/lib/account.ts
- `line 21` [type: error] "Not authenticated" (thrown)

(src/lib/catchup.ts, haptics.ts, motion.ts, planArtwork.ts, plans.ts, search.ts, supabase.ts, transcription.ts and src/hooks/usePushRouting.ts, useTodayEntry.ts carry no user-facing strings.)

## supabase/functions/notify-partner/index.ts
- `line 68` [type: notification] "Both reflections are in" (push title, mutual submit)
- `line 69` [type: notification] "Open Pamwe to see what you both wrote." (push body)
- `line 72` [type: notification] "Your partner finished today's reflection" (push title, first submit)
- `line 73` [type: notification] "Write yours to unlock both." (push body)

## supabase/functions/notify-new-prayer/index.ts
- `line 54` [type: notification] "Your partner added a prayer" (push title; body is the prayer text truncated at 80 chars with "…")

## supabase/functions/notify-freeze/index.ts
- `line 45` [type: notification] "Today is a fresh start" (push title, sent to both partners)
- `line 46` [type: notification] "Yesterday was a freeze day, so your streak is safe. Pick up where you left off." (push body)

## supabase/functions/notify-nudge/index.ts
- `line 57` [type: error] "You just sent a nudge. Give it a little while." (cooldown message; surfaced verbatim in the app via nudgePartner)
- `line 71` [type: body] "Your partner" (fallback sender name when display_name is empty)
- `line 78` [type: notification] "{myName} is thinking of you" (push title)
- `line 79` [type: notification] "Ready to read together today?" (push body)
- Note: "Method not allowed" / "Unauthorized" / "No couple" / "No partner" responses are HTTP plumbing the client never shows — not itemized.

## supabase/functions/delete-account/index.ts
- `line 116` [type: notification] "Your partner has left Pamwe" (push title to surviving partner)
- `line 117` [type: notification] "Your own reflections are saved. You can pair again whenever you're ready." (push body)

## supabase/functions/ask-pamwe/index.ts
(The system prompts SYSTEM_CORE/SYSTEM_PLANS/SYSTEM_HELP are out of scope per instructions; the strings below are returned verbatim to clients. Caveat: for the help sheet, non-200 `error` strings are replaced client-side by askPamweHelp's own fallback, so the ones users actually see verbatim are OFF_TOPIC_MESSAGE and the 200-status payloads; the rest still define server voice.)
- `line 50` [type: body] "Pamwe is here for Scripture, prayer, and your walk together. For that one, you'll want another guide." (OFF_TOPIC_MESSAGE, the fixed gentle line, returned with status 200 and shown verbatim)
- `line 151` [type: error] "Ask Pamwe isn't configured yet."
- `line 160` [type: error] "Invalid request."
- `line 163` [type: error] "Tell Pamwe what you'd like to read about."
- `line 164` [type: error] "Please keep it under 300 characters."
- `line 179` [type: error] "Pamwe needs to rest for today. Ask again tomorrow." (daily cap)
- `line 182` [type: error] "One question at a time. Give Pamwe a breath and try again." (cooldown)
- `line 209` [type: error] "Pamwe couldn't help with that one. Try another idea." (model refusal)
- `line 221` [type: error] "Pamwe's answer came back garbled. Please try again." (JSON parse failure)
- `line 232` [type: error] "Pamwe is resting right now. Please try again in a moment." (catch-all)

## supabase/seeds/plan_metadata.sql
M'Cheyne (plan a1b2c3d4-…):
- `line 6` [type: metadata] "The whole story, together" (tagline)
- `line 7` [type: metadata] "The classic plan that walks you through the Old Testament once and the New Testament and Psalms twice in a year: the whole redemptive story, shared." (about)
- `line 9` [type: metadata] "The arc from Genesis to Revelation" (explore)
- `line 10` [type: metadata] "How every book points to Christ" (explore)
- `line 11` [type: metadata] "Old and New in conversation" (explore)
- `line 12` [type: metadata] "Staying faithful across a full year" (explore)
- `line 15` [type: metadata] "A grasp of the whole Bible" (gain)
- `line 16` [type: metadata] "A year-long shared discipline" (gain)
- `line 17` [type: metadata] "Roots that steady your marriage" (gain)
- `line 19` [type: metadata] "~20 min" (minutes_label)
- `line 20` [type: metadata] "Four readings a day" (rhythm_label)
- `line 21` [type: metadata] "Whole Bible" (book_label)

Gospel of John (plan b1b2c3d4-…):
- `line 25` [type: metadata] "Meet Jesus, together" (tagline)
- `line 26` [type: metadata] "Read the fourth gospel side by side and watch how Jesus meets ordinary people, and your marriage, with grace and truth." (about)
- `line 28` [type: metadata] "The seven signs of John" (explore)
- `line 29` [type: metadata] "Who Jesus says He is" (explore)
- `line 30` [type: metadata] "Belief that changes a home" (explore)
- `line 31` [type: metadata] "Abiding as a daily practice" (explore)
- `line 34` [type: metadata] "A clearer picture of Jesus" (gain)
- `line 35` [type: metadata] "Conversations about faith you've never had" (gain)
- `line 36` [type: metadata] "A gospel-shaped way of loving each other" (gain)
- `line 38` [type: metadata] "~12 min" (minutes_label)
- `line 39` [type: metadata] "One chapter a day" (rhythm_label)
- `line 40` [type: metadata] "John" (book_label)

Psalms of Comfort (plan c1b2c3d4-…):
- `line 44` [type: metadata] "Words for every weather" (tagline)
- `line 45` [type: metadata] "Thirty psalms for the full range of a shared life: joy, fear, gratitude, and grief. Honest words to bring to God as a couple." (about)
- `line 47` [type: metadata] "Praying your real emotions" (explore)
- `line 48` [type: metadata] "Lament without losing faith" (explore)
- `line 49` [type: metadata] "Praise as a daily rhythm" (explore)
- `line 50` [type: metadata] "Trust when the ground shifts" (explore)
- `line 53` [type: metadata] "Language for feelings you can't name" (gain)
- `line 54` [type: metadata] "A calmer, more honest prayer life" (gain)
- `line 55` [type: metadata] "Comfort you can return to any night" (gain)
- `line 57` [type: metadata] "~8 min" (minutes_label)
- `line 58` [type: metadata] "A psalm a day" (rhythm_label)
- `line 59` [type: metadata] "Psalms" (book_label)

A Cord of Three Strands (plan d1b2c3d4-…):
- `line 63` [type: metadata] "An unbreakable marriage" (tagline)
- `line 64` [type: metadata] "A three-week walk through Ecclesiastes on what it means to face life woven together, with God as the third strand that holds when you can't." (about)
- `line 66` [type: metadata] "Why two are better than one" (explore)
- `line 67` [type: metadata] "Facing changing seasons as a team" (explore)
- `line 68` [type: metadata] "Letting God be the strand that holds" (explore)
- `line 69` [type: metadata] "Rhythms that outlast feelings" (explore)
- `line 72` [type: metadata] "A shared language for hard seasons" (gain)
- `line 73` [type: metadata] "A habit of praying before deciding" (gain)
- `line 74` [type: metadata] "Deeper trust through honest reflection" (gain)
- `line 76` [type: metadata] "~10 min" (minutes_label)
- `line 77` [type: metadata] "One chapter a day" (rhythm_label)
- `line 78` [type: metadata] "Ecclesiastes" (book_label)

## supabase/seed.sql (plan browse metadata only)
- `line 10` [type: metadata] "M'Cheyne Reading Plan" (plan title)
- `line 11` [type: metadata] "Read through the Bible in one year with Robert Murray M'Cheyne's classic plan" (plan subtitle)
- Note: the 365 `plan_days` rows (passage text, pull quotes, reflection prompts) are consultant content (M'Cheyne 1842 + WEB source text) — exist here but are OUT of the copy-pass scope per CLAUDE.md ("Don't modify the M'Cheyne plan or pull quotes silently").

## scripts/seed_john_plan.py (generates the John plan's browse metadata)
- `line 16` [type: metadata] "Gospel of John" (plan title)
- `line 17` [type: metadata] "Walk through John's gospel one chapter a day." (plan subtitle)

## scripts/seed_psalms_plan.py
- `line 27` [type: metadata] "Psalms of Comfort" (plan title)
- `line 28` [type: metadata] "Thirty psalms for every season of a shared life." (plan subtitle)

## scripts/seed_cord_plan.py
- `line 32` [type: metadata] "A Cord of Three Strands" (plan title)
- `line 33` [type: metadata] "Three weeks on facing life woven together." (plan subtitle)
- Note: the per-day titles/pull verses/prompts inside seed_psalms_plan.py and seed_cord_plan.py are day content analogous to the M'Cheyne day rows; developer-authored but part of the seeded reading content, flagged here without itemizing (30 + 21 days).

## Em dashes
No em dashes found in any user-facing string in scope. Every `—` hit in these files is inside a code comment (exempt per the rule). Verified across src/components, src/lib, src/hooks, supabase/functions, and supabase/seeds/plan_metadata.sql.
