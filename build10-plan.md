# Build 10 — "Complete the loops" round (2026-07-11)

Christian's directive: knock out items 1-6 from the morning review plus the Ask Pamwe
bubble fix, all in one build. Copywriting pass explicitly deferred to another day.
Widget stays parked for its own session. Take the time to build the right thing.

## Execution order (dependencies drive it: JS first, native last, one commit each)

### A. Ask Pamwe bubble redesign (Christian's b9 feedback: "blends in")
- True bubble: surface-colored circle, crisp border, tight real shadow, accent
  flower glyph (inverts in dark mode), subtle halo ring so it never visually
  touches content behind it. Slightly larger tap target.
- Never disturbs features: matching scroll-end padding on every tab it lives on
  so the last row can always scroll clear.
- Shrink-on-scroll experiment behind a one-line flag (`FAB_SHRINK_ON_SCROLL`):
  rests full-size, tucks mostly off-edge while scrolling, returns on stop.

### B. Realtime responses
- Migration: add `entry_responses` to the `supabase_realtime` publication
  (local now, hosted with the batch in step G).
- Subscribe on reveal + reflect detail (same channel pattern as prayers):
  a heart/reply from the partner appears live.

### C. Finish "what stuck with me"
- The `quote` kind + `saveQuote()` shipped in b9; build the missing UI:
  long-press a sentence in the partner's text reflection (reveal + reflect
  detail) → "Keep this line" confirmation → saved.
- New "Their words" keepsake view collecting every line each of you kept,
  newest first, with the day/reference it came from. Entry point: bookmark
  icon on the Reflect header. Voice entries: excluded until transcription
  lands (nothing to quote yet).

### D. "On this day" resurfacing
- A quiet "From your story" card at the top of Reflect when an old revealed
  reflection exists from ~a month ago (fallback: a week): date, reference,
  snippet, tap → detail. Pure client over existing reflections data.

### E. Milestones + plan-completion celebration
- Day-milestone moments at streak 7 / 30 / 100: a quiet celebration card on
  Today (popIn + celebrate haptic, shown once per milestone, AsyncStorage-
  gated) in the same visual language as the tree.
- Restore the completion celebration for the manual "Mark plan complete"
  path: complete.tsx accepts a `justCompleted` param (title + days + stats
  snapshot) instead of reading the active plan, so manual completion gets the
  same moment as finishing the final day.

### F. Real push notifications (JOINT — needs Christian twice, ~15 min total)
The four webhook functions have been firing into the void since launch; this
lights up partner-submitted, new-prayer, nudge, and freeze banners at once.
1. **Christian, in your own terminal:** `npx eas-cli login` then `eas init`
   in the repo (stamps the EAS projectId into app.json — my push-token code
   already reads it and un-skips itself).
2. **Christian:** `eas credentials` → iOS → push key → create/upload APNs
   key (it walks you through the Apple portal part).
3. **Me:** re-enable `aps-environment` in ios/Pamwe/Pamwe.entitlements +
   app.json push config, verify token registration path, pod-safe rebuild
   check. (The savePushToken guard from b8 stays; no PATCH storms.)
4. On-device after b10: banner test both directions, then the nudge button
   delivers for real.

### G. Voice transcription (native, last before release)
- Install the speech-recognition module (SDK 56 compatible), permission
  string, pod install.
- Migration: `entries.transcript` (nullable text) — local + hosted.
- VoiceRecorder: after recording stops, transcribe the file on-device;
  attach transcript on submit. Fail-soft: no transcript, entry still works.
- Reflect snippets + shared-layer search read transcript for voice entries.
- Real recognition quality can only be judged on-device: b10 test item.

### H. Release
- Gates after every step (tsc + jest), commit per feature, push at the end.
- Hosted applies in one batch (realtime publication + transcript column)
  with Christian's go; then bump CURRENT_PROJECT_VERSION → 10, archive,
  verify bundle, upload to TestFlight.

## Needs Christian (gathered in one place)
1. Step F1/F2: `eas init` + APNs key (interactive, your accounts).
2. One word to apply the hosted migration batch when I get there.
3. Still outstanding from b7: "resolve the three Sentry issues".

## Progress log
(updated as we go)
