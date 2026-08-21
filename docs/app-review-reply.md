# App Review reply, Guideline 2.1 Information Needed (2026-08-20)

Apple's 2026-08-20 "Changes needed" is their standard first-app information
request: a screen recording plus seven informational items.

**This is now a resubmission, not a reply-only.** Two launch blockers were
found while preparing the recording, so the binary has changed and **build 36
must be attached**:

1. **The reviewer could not do what the notes asked.** The demo couple's plan
   was seeded ahead of its own cadence, so `expectedDay` computed 3 while
   `current_day` was 6, and the directional gate refused to open Day 6. Grace's
   Today screen said "Day 6 opens on Monday" with no way in. Fixed in the data
   (the plan now starts 2026-07-16 at a weekly cadence, so Day 6 is exactly
   current), not in the app.
2. **Every couple-less account was trapped, then spinning.** Today lived at a
   route that resolved to `/`, the same URL as the auth gate, so the gate never
   ran; b33's CoupleFence then looped against it. Fixed by un-grouping the
   route (commit `0772e1c`), verified on device for both a couple-less and a
   paired account.
3. **In-app account deletion did not work, in any build ever shipped.**
   `delete_account` was revoked from every role that could call it during the
   2026-08-08 security round, so the edge function answered 500 and the app
   said only "Edge Function returned a non-2xx status code". This is guideline
   5.1.1(v) and Apple tests it. The fix is a grant, so it is server-side and
   already live; b35 additionally moves Account to the top of Settings and
   makes the app repeat what the server actually said.

Verified before drafting: the reviewer signed in as Grace on 2026-08-19, so the
credentials work.

---

## Part A. The recording script (Christian, one device, one take, ~5 min)

Recorded on the iPhone 17 Pro Max. Claude joins the new couple live from the
Mac as **Jordan** (`jordan@appreview.pamwe.app`, created 2026-08-20), which is
what lets one device show registration, pairing, the waiting state, the
reveal, and deletion end to end.

**Before starting: tell Claude you are about to record**, so the join command
is armed. If a retake is needed, say so first: Jordan must be un-paired
between takes, which takes seconds but must happen.

1. Start the iOS screen recording (Control Center), go to the home screen,
   **launch Pamwe from the icon** (the recording must begin at launch).
2. **The new user**: Welcome → Sign up → **"Use an email address"** → type
   `alex@appreview.pamwe.app` → the password field appears → same password as
   Grace → Sign in. Value slides → name → pair choice → **create an invite**.

   **Neither email nor Apple works for this.** Magic links are capped on the
   free tier and the daily limit was reached on 2026-08-20. Sign in with Apple
   is worse: it resolves to whichever account that Apple ID is already tied to,
   which on Christian's phone is his own, so the take starts inside a real
   couple instead of onboarding. A review-domain address is the only
   deterministic door: `sign-in.tsx` shows a password field for
   `@appreview.pamwe.app` and nothing else, so it needs no email and behaves
   identically every time. `alex@appreview.pamwe.app` is created couple-less
   for exactly this, and is deleted on camera at the end. If a retake is
   needed, Claude recreates it in seconds.
3. On the invite-code screen, **hold**. Type the 6-character code into the
   Claude chat on the Mac. Within a few seconds Jordan joins and the screen
   flips to **connected** on camera, by itself. That flip is the pairing
   demo.
4. On the connected screen tap **"Not now"** for notifications (do not tap
   the notification offer; iOS 27 beta will not render the prompt on this
   phone).
5. **Plan select**: pick **Gospel of John**. Lands on Today, Day 1.
6. **The locked half of the mechanic**: open the reading, then the journal,
   and choose **voice**. The microphone and speech-recognition permission
   prompts appear on camera: grant both. Record a short reflection (a
   sentence is enough), send it. The **waiting screen** appears: your words
   are sealed until Jordan writes. Linger two seconds.
7. **You tab → Sign out.**
8. **Login + the revealed half**: Welcome → Log in → "Use an email address" →
   type `grace@appreview.pamwe.app` (the password field appears on camera) →
   password → sign in. Today shows **Day 6** with Daniel already submitted.
9. Open the reading → journal → write a short **text** reflection → submit →
   **the reveal opens with Daniel's words**. Leave a heart, keep a line, tap
   **Amen**.
10. **Quick tour, 10 seconds each**: Reflect (history), Prayers (add one,
    mark "I prayed today"), Bible (open a chapter, highlight a verse, leave a
    note), You → the Grove.
11. **Deletion**: You → Sign out → Welcome → Log in → `alex@appreview.pamwe.app`
    + the password again → You → **Settings, where Account is now the first
    section** → **Delete account** → confirm. It lands on the welcome screen.
    Stop the recording.

    This half failed on the first attempt and the fix is server-side, so it
    needs no new build: `delete_account` had been revoked from every role that
    could call it. Deletion is verified working against hosted. Account was
    also moved to the top of Settings for this (b36), so it is no longer three
    screens of toggles down.

**After the take, tell Claude it is done.** Two server-side steps follow
before the reply is sent: Grace's Day 6 is reset so the reviewer's
instructions stay true, and the Jordan/relay couple is cleaned up.

---

## Part B. The reply text (paste into the App Review message thread, attach the video)

> Thank you for the review. Answers to each point below, and the requested
> screen recording is attached.
>
> 1. SCREEN RECORDING
> Two recordings are attached, both captured on a physical iPhone 17 Pro Max.
>
> The first begins at app launch and shows: signing in with a second,
> unpaired account created for this recording, which walks the full
> onboarding a new user sees, ending on the invite
> code the app gives them; a second person joining with that code,
> live, which is how Pamwe pairs two people and is the only way past this
> point; declining the notification offer; choosing a reading plan and a
> rhythm; the day's passage; writing a reflection and sending it; the waiting
> state, where that reflection stays sealed because the partner has not
> written yet; signing out; signing in with the demo account you hold
> credentials for; the Bible reader, the shared prayer list and the couple's
> progress screen; and then the core mechanic end to end, writing the second
> reflection of a day and the mutual reveal opening with the partner's words,
> closed with Amen.
>
> The second shows in-app account deletion for guideline 5.1.1(v): You,
> Settings, Delete account, confirm, ending on the welcome screen with the
> account gone.
>
> 2. DEVICES AND SYSTEMS TESTED
> iPhone 17 Pro Max and iPhone 16 Pro, both physical devices on iOS 26,
> through 32 TestFlight builds since 10 July 2026.
>
> 3. WHAT THE APP DOES AND FOR WHOM
> Pamwe is a devotional app for exactly two people, a couple. Each day the
> two partners read the same Bible passage and each writes or records a
> private reflection. Neither partner can see the other's words until both
> have submitted; then the reveal opens for both at once. There is no solo
> mode, no feed, no public content, and no way to see any writing except
> your one partner's. The audience is adult couples who want a shared
> Scripture habit. The problem it solves: shared devotional time usually
> collapses into one partner reading to the other, or into nothing. The
> sealed-until-both-write mechanic gives each partner a private voice and a
> reason to show up.
>
> 4. SETUP AND ACCESS
> A demo account is provided in the credentials fields:
> grace@appreview.pamwe.app. Enter that address on the sign-in screen and a
> password field appears. Grace is one half of a real, already-paired couple.
> To see the core feature: open the Today tab, tap "Read Day 6", then write a
> short reflection and send it.
> Her partner has already submitted his, so as soon as
> you submit yours both unlock and his writing appears. Before you submit,
> his words are not readable by this account at all; that is enforced by
> database row security, not by the interface. The demo account needs only
> the email address and password above: no Apple or Google account is
> required to review any part of the app. Signing in alone with any new
> account ends at the invite-code screen, because the app cannot proceed
> without a second person. Please do not delete the demo account, as it is
> shared across review rounds.
>
> 5. EXTERNAL SERVICES
> Supabase: database, authentication, file storage, and server functions.
> Sign in with Apple and Google Sign-In: authentication options. Expo push
> service and Apple Push Notification service: notification delivery.
> Sentry: crash reporting, configured to send no personal content. OpenAI
> and Anthropic APIs: used only when a user deliberately asks for a reading
> plan to be built or suggested; the sentence they type is the only content
> sent, and Bible references come from the app's own pre-tagged catalogue of
> public domain text, never from model generation. bible-api.com and
> bible.helloao.org: fetch public domain Bible text. All of these are
> disclosed in the privacy policy at the URL on file.
>
> 6. REGIONAL DIFFERENCES
> None. The app's features and content are identical in all territories.
>
> 7. REGULATED INDUSTRY AND PROTECTED MATERIAL
> Pamwe does not operate in a regulated industry. All six Bible translations
> it ships are public domain: the World English Bible, King James Version,
> American Standard Version, Bible in Basic English, Darby Translation, and
> the Berean Standard Bible, which its publisher released into the public
> domain on 30 April 2023 with the statement that licensing is not required
> for any use. The M'Cheyne reading plan dates from 1842. No copyrighted
> translation is included.
>
> A note on user-generated content, since the recording checklist asks about
> reporting and blocking: every word a user writes in Pamwe is visible only
> to the one partner they explicitly paired with, enforced server-side.
> There are no strangers, no discovery, no feed, and no public surface, so
> there is no reporting mechanism to show. The safety mechanisms that do
> exist are shown or described in the recording: either partner can pause or
> end the pairing from inside the app, and account deletion is available in
> the app under You, Settings, Delete account.

---

## Record of what was sent

- [ ] Video recorded per Part A, attached in the App Review thread
- [ ] Part B pasted and sent
- [ ] Grace Day 6 reset confirmed after the take
- [ ] Jordan/relay couple cleaned up after the take
- [ ] **Build 36 attached** (the binary changed: route-collision fix `0772e1c`, Settings reorder)
- [ ] **Day 6 confirmed open** on the demo account immediately before sending.
      It is exactly current through 2026-08-26; after that Grace is behind and
      Day 6 opens as catch-up, which still works but reads differently. To make
      it current again, set the active `couple_plans` row's `start_date` to
      `current_date - 35`.
