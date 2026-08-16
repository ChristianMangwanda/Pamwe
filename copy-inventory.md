# Copy inventory

**Being edited in Notion**: [Pamwe copy](https://app.notion.com/p/3beb4b905447819eb250c7816e7cba08),
one page per section, 956 entries. That is where Christian's rewrites are
going; this file is the source of truth for where each ID lives in the code,
and gets updated once the rewrites are applied.

## Where this stands (2026-08-16)

Christian filled in **57 lines** in Notion. **48 are applied** in this commit;
the Notion pages still hold the originals beside them.

**Nine still need his decision.** Do not apply these without an answer:

| ID | Why it is held |
|---|---|
| `T-92` | Missing word (*let your partner **know***), and it is a full-width button, so the sentence will wrap. |
| `T-103` | "just waiting on your partner" sits under the writing field **before** you have written. Nobody is waiting yet. Belongs on the waiting screen. |
| `T-106` | "once it's in, it's in not edit it after this" reads as missing a word. |
| `T-183` | Run-on, and *grow* should be *grew*. |
| `T-45` | It is an eyebrow: small, uppercase, letter-spaced. A full sentence renders as `WELL, DONE!! YOU COMPLETED TODAY'S READING`, and the headline below already says it. |
| `F-23` | ALL CAPS, *MY* should be the partner's name, *STIR* should be *stirs*. |
| `W-09` | Changes what the line does: the original warned that an email you stop reading takes your journal with it. |
| `N-08` | "Read today's word" is the **dream** push body. Points at the reading, not the dream. **Edge function: needs a redeploy, not just a build.** |
| `R-28` | Not copy. The six prayer categories are a DB enum with a check constraint; adding "relationship" is a migration plus chips plus recap phrases. |

**Five applied changes that cost something**, flagged so they can be reverted
deliberately rather than discovered later:

- **`O-04`** Onboarding slide 2 no longer contains the word *sealed*. Nothing in
  onboarding now explains that reflections stay hidden until both partners write.
- **`T-102`** The journal placeholder lost "Only {partner} will ever see this",
  which was the privacy reassurance at the moment someone decides how honest to be.
- **`T-159`, `T-70`** Both dropped their "your words are still safe / still
  sealed" half.
- **`R-22`/`R-23` vs `R-24`** Now "I prayed" / "You prayed" but
  "{partner} prayed **today**". The mark is per-day; the labels disagree.
- **"Houston, we have a problem"** now covers two unrelated failures (`O-68`
  plan load, `T-141` server unreachable).

Mechanical liberties taken on the applied 48: sentence-cased the all-lowercase
and ALL-CAPS entries to match the rest of the app, fixed double spaces and a
space-before-comma, collapsed a nine-dot ellipsis, and unwrapped `T-17` from the
backticks it was typed inside.

**Not started:** the voice skill. The point of the exercise is to distil the
pattern in Christian's rewrites into a reusable skill; that waits until the nine
open lines are settled, so the sample is complete.

---

Every line of developer-authored text Pamwe shows a person, in the order they
meet it. Scripture, Bible book names, translation names and plan content from
`seed.sql` are excluded: they are quoted source material, not our voice.

**How to use this.** Each entry is:

```
- **T-21** — You're a day behind. Let's get you back on track.
  `catch-up banner, one day behind · (today)/index.tsx:487`
  →
```

Write your version after the `→`. Leave it blank to keep the line as it is.
Curly braces are values filled in at runtime: `{partner}` is your partner's
display name, `{me}` yours, `{n}` a number, `{ref}` a Scripture reference.

Line numbers are as of build 30 and will drift as we edit. The ID is what
matters.

**Sections**

| | | |
|---|---|---|
| [W](#w--welcome--sign-in) Welcome & sign in | [O](#o--onboarding) Onboarding | [T](#t--today) Today |
| [B](#b--bible) Bible | [P](#p--plans) Plans | [R](#r--prayers--dreams) Prayers & Dreams |
| [F](#f--reflect) Reflect | [Y](#y--you) You | [E](#e--pause-leave-archive-delete) Endings |
| [N](#n--notifications) Notifications | [A](#a--ask-pamwe) Ask Pamwe | [G](#g--the-grove) The Grove |
| [S](#s--system--shared) System & shared | [X](#x--widgets) Widgets | [L](#l--legal) Legal |

---

## W · Welcome & sign in

### Welcome (`(auth)/welcome.tsx`)

- **W-01** — Welcome to Pamwe
  `hero title · welcome.tsx:43`
  →

- **W-02** — Growing in Christ
  `tagline under the mark · welcome.tsx:44`
  →

- **W-03** — Sign up
  `primary button · welcome.tsx:49`
  →

- **W-04** — Log in
  `secondary button · welcome.tsx:50`
  →

- **W-05** — I have a code
  `ghost button, the invited partner's door · welcome.tsx:51`
  →

- **W-06** — By continuing you agree to our Terms and Privacy Policy.
  `consent line, "Terms and Privacy Policy" is the tappable part · welcome.tsx:55-63`
  →

### Sign in (`(auth)/sign-in.tsx`)

- **W-07** — Sign up
  `screen title when arriving from Sign up · sign-in.tsx:29`
  →

- **W-08** — Log in
  `screen title when arriving from Log in · sign-in.tsx:29`
  →

- **W-09** — Whichever you choose is how your reflections find you again on a new phone.
  `subtitle under the title · sign-in.tsx:111`
  →

- **W-10** — Continue with Apple
  `button · sign-in.tsx:117`
  →

- **W-11** — Continue with Google
  `button · sign-in.tsx:119`
  →

- **W-12** — Use an email address
  `ghost button that opens the email field · sign-in.tsx:121`
  →

- **W-13** — Email address
  `eyebrow above the email field · sign-in.tsx:127`
  →

- **W-14** — you@example.com
  `email field placeholder · sign-in.tsx:130`
  →

- **W-15** — Continue with email
  `button · sign-in.tsx:139`
  →

- **W-16** — Couldn't send the email
  `alert title, magic link failed · sign-in.tsx:39`
  →

- **W-17** — Couldn't sign in with Google
  `alert title · sign-in.tsx:69`
  →

- **W-18** — Couldn't sign in with Apple
  `alert title · sign-in.tsx:92`
  →

- **W-19** — Something went wrong. Try again.
  `alert body, fallback for both providers · sign-in.tsx:69, 92`
  →

- **W-20** — Google didn't finish signing you in. Try again.
  `error thrown when Google returns no token · sign-in.tsx:58`
  →

- **W-21** — Apple didn't finish signing you in. Try again.
  `error thrown when Apple returns no token · sign-in.tsx:88`
  →

### Magic link (`(auth)/magic-link.tsx`)

- **W-22** — Check your email
  `title · magic-link.tsx:20`
  →

- **W-23** — We've sent you a sign-in link. Tap it, then come back here.
  `subtitle · magic-link.tsx:22`
  →

- **W-24** — Back to sign in
  `ghost button · magic-link.tsx:26`
  →

---

## O · Onboarding

### Value slides (`(onboarding)/value-slides.tsx`)

- **O-01** — Read together
  `slide 1 title · value-slides.tsx:19`
  →

- **O-02** — Move through Scripture side by side: the same passage, the same day, wherever you each are.
  `slide 1 body · value-slides.tsx:19`
  →

- **O-03** — Reflect, then reveal
  `slide 2 title · value-slides.tsx:20`
  →

- **O-04** — You each write alone. It stays sealed until you've both finished. Then you open it together.
  `slide 2 body · value-slides.tsx:20`
  →

- **O-05** — Carry each other
  `slide 3 title · value-slides.tsx:21`
  →

- **O-06** — Share prayer points. Pray for what the other is walking through, every day.
  `slide 3 body · value-slides.tsx:21`
  →

- **O-07** — Skip
  `top-right link · value-slides.tsx:54`
  →

- **O-08** — Continue
  `button on every slide · value-slides.tsx:78`
  →

### Your name (`(onboarding)/name.tsx`)

- **O-09** — What should we call you?
  `title, breaks after "we" · name.tsx:52`
  →

- **O-10** — Your partner will see this name.
  `subtitle · name.tsx:53`
  →

- **O-11** — Your first name
  `field placeholder · name.tsx:59`
  →

- **O-12** — Continue
  `button · name.tsx:71`
  →

- **O-13** — Couldn't save your name
  `alert title · name.tsx:40`
  →

### Pair choice (`(onboarding)/pair-choice.tsx`)

- **O-14** — Link with your partner
  `title · pair-choice.tsx:25`
  →

- **O-15** — Pamwe is meant for two. Once you're linked, everything you read and pray is shared.
  `subtitle · pair-choice.tsx:27`
  →

- **O-16** — Invite your partner
  `option 1 title · pair-choice.tsx:37`
  →

- **O-17** — Send them a code to join you
  `option 1 subtitle · pair-choice.tsx:38`
  →

- **O-18** — I have a code
  `option 2 title · pair-choice.tsx:46`
  →

- **O-19** — Enter the code your partner sent
  `option 2 subtitle · pair-choice.tsx:47`
  →

### Invite (`(onboarding)/invite.tsx`)

- **O-20** — Last step
  `eyebrow · invite.tsx:98`
  →

- **O-21** — Send your partner this code
  `title · invite.tsx:99`
  →

- **O-22** — They type it in and you are linked.
  `subtitle · invite.tsx:100`
  →

- **O-23** — Expires today
  `under the code, last day · lib/invite.ts:48`
  →

- **O-24** — Expires tomorrow
  `under the code · lib/invite.ts:49`
  →

- **O-25** — Expires in {n} days
  `under the code, normal case · lib/invite.ts:50`
  →

- **O-26** — Expired
  `under the code, already dead · lib/invite.ts:46`
  →

- **O-27** — Show a QR code instead
  `toggle, closed · invite.tsx:136`
  →

- **O-28** — Hide QR code
  `toggle, open · invite.tsx:136`
  →

- **O-29** — Point their camera at this.
  `hint under the QR square · invite.tsx:121`
  →

- **O-30** — Copy
  `button beside the code · invite.tsx:144`
  →

- **O-31** — Copied
  `button after tapping, 1.6s · invite.tsx:144`
  →

- **O-32** — Share the code
  `primary button · invite.tsx:152`
  →

- **O-33** — Later
  `ghost button · invite.tsx:153`
  →

- **O-34** — Couldn't create your code
  `alert title · invite.tsx:63`
  →

- **O-35** — I want us to read the Bible together, a little each day. Join me on Pamwe.
  `line 1 of the shared invite message · lib/invite.ts:24`
  →

- **O-36** — Tap to link with me: {link}
  `line 2 of the shared invite message · lib/invite.ts:26`
  →

- **O-37** — Or enter this code in the app: {code}
  `line 3 of the shared invite message · lib/invite.ts:28`
  →

### Waiting for them to join (`(onboarding)/code-sent.tsx`)

- **O-38** — Your code
  `back link label · code-sent.tsx:51`
  →

- **O-39** — Waiting for your partner
  `title · code-sent.tsx:56`
  →

- **O-40** — This screen moves on by itself the moment they join.
  `subtitle · code-sent.tsx:58`
  →

- **O-41** — Send the code again
  `button · code-sent.tsx:63`
  →

### Join (`(onboarding)/join.tsx`)

- **O-42** — Enter your code
  `title, typed by hand · join.tsx:68`
  →

- **O-43** — Ready to link
  `title, code arrived by link or QR · join.tsx:68`
  →

- **O-44** — Paste the code your partner shared with you.
  `subtitle, typed by hand · join.tsx:73`
  →

- **O-45** — Your partner's code is filled in. Tap connect and you're together.
  `subtitle, code arrived by link · join.tsx:72`
  →

- **O-46** — ABC123
  `code field placeholder · join.tsx:80`
  →

- **O-47** — Connect
  `button · join.tsx:93`
  →

- **O-48** — Couldn't connect you
  `alert title · join.tsx:58`
  →

- **O-49** — That code didn't work. Check it with your partner and try again.
  `alert body. Deliberately the SAME line for unknown, spent and expired codes: a
  distinguishable error tells a stranger which codes are real ·
  migrations/20260808000001:140`
  →

- **O-50** — You can't join your own invite
  `alert body · migrations/20260808000001:144`
  →

- **O-51** — You are already connected to a partner
  `alert body · migrations/20260808000001:75, 126`
  →

### Connected (`(onboarding)/connected.tsx`)

- **O-52** — {partner} joined
  `title · connected.tsx:87`
  →

- **O-53** — Pamwe can tell you the moment {partner} has written, so neither of you is left waiting without knowing.
  `push permission card, shown only when iOS has never been asked · connected.tsx:91`
  →

- **O-54** — Tell me when {partner} writes
  `button that triggers the iOS permission prompt · connected.tsx:102`
  →

- **O-55** — Not now
  `secondary button · connected.tsx:104`
  →

- **O-56** — Begin today's reading
  `button when permission was already answered · connected.tsx:111`
  →

- **O-57** — your partner
  `stand-in name before the partner profile loads · connected.tsx:29`
  →

### Choose a plan (`(onboarding)/plan-select.tsx`)

- **O-58** — Choose your plan
  `title, first time · plan-select.tsx:102`
  →

- **O-59** — You and your partner will read through Scripture together, one day at a time.
  `subtitle, first time · plan-select.tsx:106`
  →

- **O-60** — Switch plan
  `title, changing plans · plan-select.tsx:102`
  →

- **O-61** — Pick a new reading plan. Your current one will be marked complete and the new plan starts at day 1.
  `subtitle, changing plans · plan-select.tsx:105`
  →

- **O-62** — How often?
  `eyebrow above the rhythm control · plan-select.tsx:153`
  →

- **O-63** — Begin together
  `button, first time · plan-select.tsx:166`
  →

- **O-64** — Switch to this plan
  `button, changing plans · plan-select.tsx:166`
  →

- **O-65** — Switch reading plan?
  `confirm alert title · plan-select.tsx:82`
  →

- **O-66** — Your current plan will be marked complete. The new one starts at day 1, for both of you.
  `confirm alert body · plan-select.tsx:83`
  →

- **O-67** — Switch
  `confirm alert destructive button · plan-select.tsx:86`
  →

- **O-68** — We couldn't load the reading plans. Check your connection and try again.
  `empty state when the fetch fails · plan-select.tsx:114`
  →

- **O-69** — Try again
  `button on that empty state · plan-select.tsx:116`
  →

- **O-70** — Couldn't set your plan
  `alert title · plan-select.tsx:74`
  →

- **O-71** — That didn't go through. Give it another try in a moment.
  `alert body · plan-select.tsx:74`
  →

- **O-72** — We couldn't find your couple. Check your connection and try again.
  `error thrown when the couple lookup fails mid-enrol · plan-select.tsx:61`
  →

### Reading rhythm (used here, in Settings, and in the builder)

- **O-73** — Every day
  `cadence option label · lib/plans.ts:168`
  →

- **O-74** — A reading a day, the way the plans are written.
  `cadence blurb · lib/plans.ts:168`
  →

- **O-75** — Every 2 days
  `cadence option label · lib/plans.ts:169`
  →

- **O-76** — A gentler rhythm, with room to breathe between readings.
  `cadence blurb · lib/plans.ts:169`
  →

- **O-77** — Once a week
  `cadence option label · lib/plans.ts:170`
  →

- **O-78** — One reading a week, for a slower season.
  `cadence blurb · lib/plans.ts:170`
  →

---

## T · Today

### Home (`(tabs)/(today)/index.tsx`)

- **T-01** — Day {n}
  `the big number · index.tsx:416`
  →

- **T-02** — {n} days
  `right end of the progress row, plan length · index.tsx:424`
  →

- **T-03** — You
  `your own column under the verse card · index.tsx:504`
  →

- **T-04** — Today
  `your status before you write · index.tsx:288`
  →

- **T-05** — Done
  `status once that person has written · index.tsx:288-289`
  →

- **T-06** — Reading…
  `partner's status before they write · index.tsx:289`
  →

- **T-07** — Your partner
  `stand-in name before the partner profile loads · index.tsx:160`
  →

- **T-08** — {n} day streak
  `under the streak bar · index.tsx:515`
  →

- **T-09** — Read Day {n}
  `primary button, nothing written yet · index.tsx:340`
  →

- **T-10** — Waiting for {partner}
  `primary button, you have written and they have not · index.tsx:339`
  →

- **T-11** — Reveal together
  `primary button, both have written · index.tsx:335`
  →

- **T-12** — Nudge {partner} gently
  `link under the button while you are waiting · index.tsx:530`
  →

- **T-13** — Sending…
  `that link, in flight · index.tsx:530`
  →

- **T-14** — {partner} has been nudged
  `that link, after · index.tsx:530`
  →

- **T-15** — Today's reading · {ref}
  `line under the button · index.tsx:535`
  →

- **T-16** — Waiting for you
  `eyebrow on the unseen-reveal card · index.tsx:441`
  →

- **T-17** — {partner} marked yesterday complete. You haven't read it together yet.
  `unseen reveal, it was yesterday · index.tsx:446`
  →

- **T-18** — Day {n} was revealed and you haven't read it together yet.
  `unseen reveal, an older day · index.tsx:447`
  →

- **T-19** — {n} days were revealed and you haven't read them together yet. Start with day {n}.
  `unseen reveal, several queued · index.tsx:444`
  →

- **T-20** — Open day {n}
  `call to action on that card · index.tsx:450`
  →

- **T-21** — You're a day behind. Let's get you back on track.
  `catch-up banner, one day · index.tsx:487`
  →

- **T-22** — You're {n} days behind. Let's get you back on track.
  `catch-up banner, more than one · index.tsx:488`
  →

- **T-23** — See what you missed
  `call to action on the catch-up banner · index.tsx:491`
  →

- **T-24** — Couldn't refresh just now. Tap to try again.
  `quiet line when a refresh fails but the day is still on screen · index.tsx:459`
  →

- **T-25** — Nudge saved
  `alert title when the nudge was logged but no banner could land · index.tsx:357`
  →

- **T-26** — {partner} has notifications off, so it won't buzz their phone.
  `that alert's body · index.tsx:357`
  →

- **T-27** — Already sent
  `alert title, nudge cooldown · index.tsx:360`
  →

- **T-28** — You just sent a nudge.
  `that alert's fallback body · index.tsx:360`
  →

- **T-29** — Couldn't send the nudge
  `alert title · index.tsx:361`
  →

- **T-30** — Try again in a moment.
  `that alert's fallback body · index.tsx:361`
  →

**Today, when the plan or the day cannot load**

- **T-31** — This day isn't there
  `title, the plan has no row for this day · index.tsx:210`
  →

- **T-32** — Your plan has no reading for this day. Your reflections are all still here.
  `body · index.tsx:214`
  →

- **T-33** — Go to your plans
  `button · index.tsx:219`
  →

- **T-34** — Couldn't load today
  `title, the fetch failed · index.tsx:210`
  →

- **T-35** — Your plan and your words are safe. Check your connection and try again.
  `body · index.tsx:215`
  →

- **T-36** — Try again
  `button · index.tsx:221`
  →

- **T-37** — Read your reflections
  `secondary button on both of the above · index.tsx:224`
  →

**Today, with no active plan**

- **T-38** — Plan complete
  `eyebrow, you just finished one · index.tsx:248`
  →

- **T-39** — You finished {plan}, together
  `title · index.tsx:250`
  →

- **T-40** — {n} days, finished on {date}. Every one of them is still in your reflections. Ready for what's next?
  `body · index.tsx:252-255`
  →

- **T-41** — Ready for what's next
  `title, never had a plan · index.tsx:259`
  →

- **T-42** — You don't have an active reading plan right now. Choose one and begin together.
  `body · index.tsx:260`
  →

- **T-43** — Pick your next plan
  `button · index.tsx:266`
  →

- **T-44** — Build your own
  `secondary button · index.tsx:269`
  →

### The day is done (`components/DayClosed.tsx`)

- **T-45** — Today is done
  `eyebrow · DayClosed.tsx:37`
  →

- **T-46** — You read Day {n} together.
  `headline · DayClosed.tsx:38`
  →

- **T-47** — One day kept. The next one is what makes it a rhythm.
  `streak line, first day · DayClosed.tsx:45`
  →

- **T-48** — {n} days kept, this one among them.
  `streak line, more than one · DayClosed.tsx:46`
  →

- **T-49** — Day {n} opens {when}.
  `when the next day arrives · DayClosed.tsx:59`
  →

- **T-50** — now
  `{when}, already open · lib/catchup.ts:145`
  →

- **T-51** — tomorrow morning
  `{when}, next day · lib/catchup.ts:146`
  →

- **T-52** — on {weekday}
  `{when}, inside the week · lib/catchup.ts:150`
  →

- **T-53** — on {month day}
  `{when}, a week or more out · lib/catchup.ts:152`
  →

- **T-54** — Read what you both wrote
  `door back into the reveal · DayClosed.tsx:65`
  →

- **T-55** — Pray together
  `door to Prayers · DayClosed.tsx:66`
  →

- **T-56** — See your grove
  `door to the Grove · DayClosed.tsx:67`
  →

### Catch up (`(tabs)/(today)/catchup.tsx`)

- **T-57** — Catch up
  `title · catchup.tsx:137`
  →

- **T-58** — You are on pace. Today is the only one open.
  `subtitle, nothing missed · catchup.tsx:140`
  →

- **T-59** — One day slipped by. Take it whenever you two can sit down.
  `subtitle, one missed · catchup.tsx:142`
  →

- **T-60** — {n} days slipped by. Take them at your own pace, together.
  `subtitle, several missed · catchup.tsx:143`
  →

- **T-61** — Nothing to catch up on. You are exactly where you meant to be.
  `empty state · catchup.tsx:151`
  →

- **T-62** — Start here
  `tag on the first day you still owe · catchup.tsx:181`
  →

- **T-63** — Today
  `tag on today's row · catchup.tsx:182`
  →

- **T-64** — Open the reading
  `row label when the passage reference failed to load · catchup.tsx:189`
  →

- **T-65** — You have written yours.
  `note on a day you already sealed · catchup.tsx:193`
  →

- **T-66** — Take them all in one sitting if you want to. Each one stays sealed until {partner} has written theirs.
  `footnote when more than one day is owed · catchup.tsx:206`
  →

### Caught up (`components/BackInStep.tsx`)

- **T-67** — Caught up
  `eyebrow · BackInStep.tsx:119`
  →

- **T-68** — Day {n}
  `each day that landed, as a chip · BackInStep.tsx:129`
  →

- **T-69** — {n} days, in one sitting.
  `headline · BackInStep.tsx:135`
  →

- **T-70** — You are back in step. Each one stays sealed until they have written theirs.
  `line · BackInStep.tsx:140`
  →

- **T-71** — Back to Today
  `button · BackInStep.tsx:145`
  →

### Activity (`(tabs)/(today)/activity.tsx`)

- **T-72** — While you were away
  `title · activity.tsx:74`
  →

- **T-73** — What {partner} has been doing.
  `subtitle · activity.tsx:76`
  →

- **T-74** — Nothing new since you last looked. When {partner} writes, prays or marks a verse, it will be here.
  `empty state · activity.tsx:85`
  →

- **T-75** — {partner} left a heart on your reflection
  `row title · lib/activity.ts:71`
  →

- **T-76** — {partner} said amen to your reflection
  `row title · lib/activity.ts:72`
  →

- **T-77** — {partner} kept a line from your reflection
  `row title · lib/activity.ts:73`
  →

- **T-78** — {partner} replied to you
  `row title · lib/activity.ts:74`
  →

- **T-79** — {partner} added a prayer
  `row title · lib/activity.ts:76`
  →

- **T-80** — {partner} wrote down a dream
  `row title · lib/activity.ts:77`
  →

- **T-81** — {partner} took note of {ref}
  `row title · lib/activity.ts:78`
  →

- **T-82** — {partner} said something on {ref}
  `row title, a comment under a verse note · lib/activity.ts:81`
  →

- **T-83** — {partner} responded on {ref}
  `row title, a heart or amen on a verse note · lib/activity.ts:82`
  →

- **T-84** — {partner} did something
  `row title, fallback · lib/activity.ts:83`
  →

- **T-85** — a verse
  `stands in for {ref} when the verse is unknown · lib/activity.ts:66`
  →

- **T-86** — Just now
  `timestamp, under a minute · activity.tsx:127`
  →

- **T-87** — {n} min ago
  `timestamp, under an hour · activity.tsx:128`
  →

- **T-88** — {n} hours ago
  `timestamp, under a day · activity.tsx:130`
  →

- **T-89** — {n} days ago
  `timestamp, under a week · activity.tsx:132`
  →

### The reading page (`(tabs)/(today)/reading.tsx`, the fallback route)

- **T-90** — Day {n}
  `eyebrow · reading.tsx:63`
  →

- **T-91** — Sit with this
  `eyebrow above the reflection prompt · reading.tsx:86`
  →

- **T-92** — Write your reflection
  `button · reading.tsx:94`
  →

- **T-93** — Gathering the words…
  `while the passage loads · reading.tsx:75`
  →

- **T-94** — We couldn't load this passage.
  `when it fails · reading.tsx:79`
  →

- **T-95** — Try again
  `button · reading.tsx:80`
  →

### Journal (`(tabs)/(today)/journal.tsx`)

- **T-96** — Back to reading
  `back link · journal.tsx:311`
  →

- **T-97** — {plan} · {ref}
  `eyebrow · journal.tsx:312`
  →

- **T-98** — Your reflection
  `title · journal.tsx:313`
  →

- **T-99** — Write
  `mode toggle, text · journal.tsx:319`
  →

- **T-100** — Voice
  `mode toggle, voice · journal.tsx:319`
  →

- **T-101** — Today's prompt
  `label on the prompt card · journal.tsx:247`
  →

- **T-102** — Write it as it is. Only {partner} will ever see this, and only after they've written theirs.
  `the writing field's placeholder · journal.tsx:342`
  →

- **T-103** — Sealed until you've both written.
  `lock hint under the field and under the recorder · journal.tsx:257`
  →

- **T-104** — Share with {partner}
  `primary button · journal.tsx:359`
  →

- **T-105** — Share with {partner}?
  `confirm alert title · journal.tsx:124`
  →

- **T-106** — Once it's shared, it's sealed. No edits after this.
  `confirm alert body · journal.tsx:124`
  →

- **T-107** — Share
  `confirm alert button · journal.tsx:127`
  →

- **T-108** — Couldn't send it
  `alert title, text · journal.tsx:141`
  →

- **T-109** — You're offline. Don't worry, your words are saved. Send them when you're back.
  `alert body, no connection · journal.tsx:143`
  →

- **T-110** — Your words are saved. Try sending them again.
  `alert body, other failures · journal.tsx:144`
  →

- **T-111** — Sending to {partner}…
  `overlay while a recording uploads · journal.tsx:393`
  →

- **T-112** — Couldn't send the recording
  `alert title, voice · journal.tsx:233`
  →

- **T-113** — You're offline. Don't worry, your recording is still here. Send it when you're back.
  `alert body, no connection · journal.tsx:235`
  →

- **T-114** — Your recording is still here. Try sending it again.
  `alert body, other failures · journal.tsx:236`
  →

- **T-115** — Your recording is still here
  `card offering a take that never landed · journal.tsx:371`
  →

- **T-116** — {n} seconds, saved on this phone and never sent.
  `that card's body · journal.tsx:374`
  →

- **T-117** — Send it now
  `button on that card · journal.tsx:378`
  →

- **T-118** — Discard
  `secondary button on that card · journal.tsx:380`
  →

- **T-119** — Discard this recording?
  `confirm alert title · journal.tsx:168`
  →

- **T-120** — It has not been sent, and this cannot be undone.
  `confirm alert body · journal.tsx:169`
  →

- **T-121** — Keep it
  `confirm alert cancel · journal.tsx:171`
  →

**Journal, when the day is not open yet**

- **T-122** — Day {n} is not open yet
  `title · journal.tsx:293`
  →

- **T-123** — You have read today. This one opens {when}, so you can meet it together.
  `body · journal.tsx:295`
  →

- **T-124** — The Bible tab is always open if you want to keep reading tonight.
  `second line · journal.tsx:300`
  →

### Voice recorder (`components/VoiceRecorder.tsx`)

- **T-125** — Up to {n} minutes
  `hint before recording · VoiceRecorder.tsx:214`
  →

- **T-126** — {m:ss} left
  `hint while recording · VoiceRecorder.tsx:214`
  →

- **T-127** — Your reflection
  `label under the playback scrubber · VoiceRecorder.tsx:262`
  →

- **T-128** — Send to your partner
  `button on the preview · VoiceRecorder.tsx:267`
  →

- **T-129** — Re-record
  `ghost button on the preview · VoiceRecorder.tsx:268`
  →

- **T-130** — Microphone access needed
  `alert title · VoiceRecorder.tsx:120`
  →

- **T-131** — Enable microphone access in Settings to record a voice reflection.
  `alert body · VoiceRecorder.tsx:121`
  →

- **T-132** — Pamwe needs microphone access to record your voice reflection. Enable it in Settings.
  `in-place message when permission was refused · VoiceRecorder.tsx:186`
  →

- **T-133** — Couldn't start recording
  `alert title · VoiceRecorder.tsx:136`
  →

- **T-134** — Couldn't stop recording
  `alert title · VoiceRecorder.tsx:158`
  →

- **T-135** — That one didn't record
  `alert title, no file came back · VoiceRecorder.tsx:152`
  →

- **T-136** — No audio came through. Try once more.
  `that alert's body · VoiceRecorder.tsx:152`
  →

- **T-137** — Something went wrong. Try again.
  `fallback body on the two recorder alerts · VoiceRecorder.tsx:136, 158`
  →

### Waiting (`(tabs)/(today)/waiting.tsx`)

- **T-138** — Yours is in.
  `title · waiting.tsx:90`
  →

- **T-139** — It stays sealed until {partner} has written too. The moment you both have, we'll tell you. Some things are worth the wait.
  `body · waiting.tsx:92`
  →

- **T-140** — {partner} is reading…
  `partner card · waiting.tsx:99`
  →

- **T-141** — We can't reach the server right now. We'll keep trying.
  `quiet line when the poll fails · waiting.tsx:103`
  →

- **T-142** — Keep going: 1 day left
  `button when one caught-up day remains · waiting.tsx:110`
  →

- **T-143** — Keep going: {n} days left
  `button when several remain · waiting.tsx:110`
  →

- **T-144** — Back to Today
  `button · waiting.tsx:121`
  →

### The reveal ceremony (`components/RevealCeremony.tsx`)

- **T-145** — Amen
  `the one word the ceremony ends on · RevealCeremony.tsx:394`
  →

### Reveal (`(tabs)/(today)/reveal.tsx`)

- **T-146** — Revealed together
  `eyebrow · reveal.tsx:282`
  →

- **T-147** — What you each wrote
  `title · reveal.tsx:283`
  →

- **T-148** — You wrote
  `label on your card · reveal.tsx:296`
  →

- **T-149** — You recorded
  `label on your card, voice · reveal.tsx:296`
  →

- **T-150** — {partner} wrote
  `label on their card · reveal.tsx:319`
  →

- **T-151** — {partner} recorded
  `label on their card, voice · reveal.tsx:319`
  →

- **T-152** — Amen · mark day complete
  `the button that moves the plan on · reveal.tsx:354`
  →

- **T-153** — Marking the day
  `that button, in flight · reveal.tsx:354`
  →

- **T-154** — Couldn't mark the day complete
  `alert title · reveal.tsx:194`
  →

- **T-155** — Your reflections are safe. Check your connection and try again.
  `alert body · reveal.tsx:195`
  →

- **T-156** — Back to Today
  `alert cancel · reveal.tsx:197`
  →

- **T-157** — Try again
  `alert confirm · reveal.tsx:198`
  →

- **T-158** — That plan is finished
  `title when the reveal outlives its plan · reveal.tsx:226`
  →

- **T-159** — Every day you read together is still in your reflections. Start a new plan whenever you're both ready.
  `body · reveal.tsx:228`
  →

- **T-160** — Couldn't load your reflections
  `title, the fetch failed · reveal.tsx:246`
  →

- **T-161** — Check your connection and try again.
  `body · reveal.tsx:247`
  →

### Responses on a reflection (`components/ReflectionResponses.tsx`)

- **T-162** — Amen
  `label on the amen chip · ReflectionResponses.tsx:268`
  →

- **T-163** — Reply
  `label on the reply chip, and on each bubble · ReflectionResponses.tsx:274, 219`
  →

- **T-164** — Keep a line
  `label on the keep chip · ReflectionResponses.tsx:281`
  →

- **T-165** — Tap the line that stayed with you.
  `hint above the line picker · ReflectionResponses.tsx:288`
  →

- **T-166** — Say something to {partner}
  `reply box placeholder · ReflectionResponses.tsx:177`
  →

- **T-167** — Send
  `reply button · ReflectionResponses.tsx:186`
  →

- **T-168** — You
  `who label on your own bubble · ReflectionResponses.tsx:199`
  →

- **T-169** — You kept this line
  `label on a line you kept · ReflectionResponses.tsx:198`
  →

- **T-170** — {partner} kept this line of yours
  `label on a line they kept · ReflectionResponses.tsx:198`
  →

- **T-171** — {partner} responded
  `badge on your own reflection when they hearted or amened it · ReflectionResponses.tsx:248`
  →

- **T-172** — Remove this?
  `confirm alert title · ReflectionResponses.tsx:143`
  →

- **T-173** — It'll be removed for both of you.
  `confirm alert body · ReflectionResponses.tsx:146`
  →

- **T-174** — It'll be removed for both of you, along with the replies under it.
  `confirm alert body when the reply has answers under it · ReflectionResponses.tsx:145`
  →

- **T-175** — Remove
  `confirm alert destructive button · ReflectionResponses.tsx:150`
  →

- **T-176** — Couldn't save that
  `alert title, heart or amen failed · ReflectionResponses.tsx:98`
  →

- **T-177** — Couldn't send that
  `alert title, reply failed · ReflectionResponses.tsx:113`
  →

- **T-178** — Your reply is still here. Try again in a moment.
  `that alert's body · ReflectionResponses.tsx:113`
  →

- **T-179** — Couldn't keep that line
  `alert title · ReflectionResponses.tsx:133`
  →

- **T-180** — Couldn't remove that
  `alert title · ReflectionResponses.tsx:159`
  →

### Plan complete (`(tabs)/(today)/complete.tsx`)

- **T-181** — Plan complete
  `eyebrow · complete.tsx:91`
  →

- **T-182** — You finished {plan}, together
  `title · complete.tsx:92`
  →

- **T-183** — Day after day, you both showed up and said what you saw. That is the whole point.
  `body · complete.tsx:94`
  →

- **T-184** — days read
  `stat label · complete.tsx:99`
  →

- **T-185** — day
  `stat label when the plan was one day · complete.tsx:99`
  →

- **T-186** — reflections
  `stat label · complete.tsx:101`
  →

- **T-187** — reflection
  `stat label, singular · complete.tsx:101`
  →

- **T-188** — day streak
  `stat label · complete.tsx:103`
  →

- **T-189** — Pick your next plan
  `button · complete.tsx:116`
  →

- **T-190** — Read it again
  `secondary button · complete.tsx:119`
  →

- **T-191** — Couldn't start it again
  `alert title · complete.tsx:80`
  →

### The planting (`components/PlantingCeremony.tsx`)

- **T-192** — Planting
  `eyebrow · PlantingCeremony.tsx:119`
  →

- **T-193** — A fig tree. / An olive tree. / An oak. / A baobab. / A cedar of Lebanon. / A redwood.
  `headline, built from the tree's name · lib/grove.ts:251-255`
  →

- **T-194** — See your grove
  `button · PlantingCeremony.tsx:191`
  →

- **T-195** — Not now
  `ghost button · PlantingCeremony.tsx:192`
  →

---

## B · Bible

### Books (`(tabs)/bible/index.tsx`)

- **B-01** — Bible
  `title, and the tab label · index.tsx:55 · (tabs)/_layout.tsx:42`
  →

- **B-02** — Read any passage. World English Bible.
  `subtitle. Note it names WEB but the reader now ships six translations ·
  index.tsx:56`
  →

- **B-03** — Find a book or reference (e.g. John 3)
  `search field placeholder · index.tsx:62`
  →

- **B-04** — Open chapter
  `label on the jump card when a chapter was typed · index.tsx:78`
  →

- **B-05** — Open book
  `label on the jump card when only a book was typed · index.tsx:78`
  →

- **B-06** — My highlights & notes
  `row into the marks screen · index.tsx:91`
  →

- **B-07** — Everything you've marked, together
  `that row's subtitle, before the count loads · index.tsx:51`
  →

- **B-08** — Nothing marked yet
  `that row's subtitle, no marks · index.tsx:51`
  →

- **B-09** — {n} marked
  `that row's subtitle, with marks · index.tsx:51`
  →

- **B-10** — Search Scripture & your notes
  `row into the search screen · index.tsx:103`
  →

- **B-11** — Old Testament
  `section label · index.tsx:107`
  →

- **B-12** — New Testament
  `section label · index.tsx:108`
  →

- **B-13** — {n} chapters
  `under each book name · index.tsx:130`
  →

- **B-14** — No books match "{query}".
  `empty state · index.tsx:110`
  →

### Chapter picker (`(tabs)/bible/[book].tsx`)

- **B-15** — Books
  `back link · [book].tsx:34`
  →

- **B-16** — Pick a chapter.
  `subtitle · [book].tsx:36`
  →

- **B-17** — Unknown book
  `title when the book name does not resolve · [book].tsx:23`
  →

- **B-18** — We couldn't find a book called "{name}".
  `body · [book].tsx:24`
  →

- **B-19** — Back to books
  `button · [book].tsx:25`
  →

### Reader (`(tabs)/bible/[book]/[chapter].tsx`)

- **B-20** — Chapters
  `back link · [chapter].tsx:255`
  →

- **B-21** — Gathering the words…
  `while the chapter loads · [chapter].tsx:298`
  →

- **B-22** — We couldn't load this chapter. Check your connection and try again.
  `error card · [chapter].tsx:302`
  →

- **B-23** — Try again
  `link on that card · [chapter].tsx:304`
  →

- **B-24** — Press and hold a verse to highlight or note it.
  `hint under the passage · [chapter].tsx:344`
  →

- **B-25** — Read the whole of {book} {chapter}
  `button when only a plan passage is shown · [chapter].tsx:337`
  →

- **B-26** — Just the reading
  `that button, once the whole chapter is open · [chapter].tsx:337`
  →

- **B-27** — Day {n}
  `on the plan banner at the top of the reader · [chapter].tsx:283`
  →

- **B-28** — Reflect
  `button on the plan banner · [chapter].tsx:287`
  →

- **B-29** — Write your reflection
  `the same offer again at the end of the reading · [chapter].tsx:359`
  →

- **B-30** — Prev
  `chapter navigation · [chapter].tsx:372`
  →

- **B-31** — Next
  `chapter navigation · [chapter].tsx:379`
  →

- **B-32** — Text size
  `label in the Aa popover · [chapter].tsx:389`
  →

- **B-33** — Verse numbers
  `toggle in the Aa popover · [chapter].tsx:401`
  →

- **B-34** — Appearance
  `light/dark toggle in the Aa popover · [chapter].tsx:405`
  →

- **B-35** — Unknown passage
  `screen shown when the route names no real chapter · [chapter].tsx:141`
  →

- **B-36** — Back to Bible
  `link on that screen · [chapter].tsx:143`
  →

**The verse sheet (long press)**

- **B-37** — Highlight
  `label above the four swatches · [chapter].tsx:424`
  →

- **B-38** — Your note
  `label on the note preview when it is yours · [chapter].tsx:242`
  →

- **B-39** — {partner}'s note
  `label on the note preview when it is theirs · [chapter].tsx:243`
  →

- **B-40** — Say something back
  `link under a note nobody has answered · [chapter].tsx:446`
  →

- **B-41** — {n} said back
  `link under a note with comments · [chapter].tsx:446`
  →

- **B-42** — Add note
  `button, no note yet · [chapter].tsx:453`
  →

- **B-43** — Edit note
  `button, note exists · [chapter].tsx:453`
  →

- **B-44** — Translation
  `title of the translation sheet · [chapter].tsx:459`
  →

- **B-45** — Couldn't save that highlight
  `alert title · [chapter].tsx:205`
  →

- **B-46** — Couldn't remove that highlight
  `alert title · [chapter].tsx:218`
  →

- **B-47** — Try again in a moment.
  `body on both · [chapter].tsx:205, 218`
  →

### Note editor (`(tabs)/bible/note.tsx`)

- **B-48** — Cancel
  `top-left link · note.tsx:51`
  →

- **B-49** — Note on this verse
  `eyebrow · note.tsx:61`
  →

- **B-50** — What is this stirring in you?
  `field placeholder · note.tsx:65`
  →

- **B-51** — Save note
  `button · note.tsx:76`
  →

- **B-52** — Remove note
  `button when the field has been emptied · note.tsx:76`
  →

- **B-53** — Couldn't save your note
  `alert title · note.tsx:42`
  →

### Highlights and notes (`(tabs)/bible/marks.tsx`)

- **B-54** — Bible
  `back link · marks.tsx:48`
  →

- **B-55** — Highlights & notes
  `title · marks.tsx:49`
  →

- **B-56** — Everything you've marked, together.
  `subtitle · marks.tsx:50`
  →

- **B-57** — Nothing marked yet. Tap any verse while you read to highlight it or leave a note.
  `empty state. Note it says "tap" but the gesture is a press and hold ·
  marks.tsx:56`
  →

- **B-58** — Notes
  `section label · marks.tsx:63`
  →

- **B-59** — Highlights
  `section label · marks.tsx:88`
  →

### Search (`(tabs)/bible/search.tsx`)

- **B-60** — Search together
  `title · search.tsx:81`
  →

- **B-61** — Scripture, and everything the two of you have written.
  `subtitle · search.tsx:82`
  →

- **B-62** — Search a word, a verse, a theme
  `field placeholder · search.tsx:89`
  →

- **B-63** — Nothing for "{query}".
  `empty state · search.tsx:100`
  →

- **B-64** — Try fewer words. Wording differs between translations, so the line you remember may read a little differently here.
  `hint under that empty state · search.tsx:105`
  →

- **B-65** — Scripture
  `results group label · search.tsx:113`
  →

- **B-66** — Reflections
  `results group label · search.tsx:134`
  →

- **B-67** — Notes
  `results group label · search.tsx:151`
  →

- **B-68** — Highlights
  `results group label · search.tsx:168`
  →

### The discussion on a verse (`(tabs)/bible/verse.tsx`)

- **B-69** — What you found here
  `title · verse.tsx:147`
  →

- **B-70** — Neither of you has written on this verse yet. A note here is the start of the conversation.
  `empty state · verse.tsx:154`
  →

- **B-71** — Add a note
  `button on that empty state · verse.tsx:161`
  →

- **B-72** — You wrote
  `label above the note when it is yours · verse.tsx:167`
  →

- **B-73** — {partner} wrote
  `label above the note when it is theirs · verse.tsx:167`
  →

- **B-74** — Amen
  `label on the amen chip · verse.tsx:182`
  →

- **B-75** — Edit note
  `link on the note card · verse.tsx:188`
  →

- **B-76** — Say something to {partner}
  `comment box placeholder · verse.tsx:218`
  →

- **B-77** — Send
  `comment button · verse.tsx:227`
  →

- **B-78** — You
  `who label on your own comment · verse.tsx:47`
  →

- **B-79** — Remove this?
  `confirm alert title · verse.tsx:116`
  →

- **B-80** — It'll be removed for both of you.
  `confirm alert body · verse.tsx:116`
  →

- **B-81** — Couldn't save that
  `alert title, heart or amen failed · verse.tsx:93`
  →

- **B-82** — Couldn't send that
  `alert title, comment failed · verse.tsx:109`
  →

- **B-83** — Your words are still here. Try again in a moment.
  `that alert's body · verse.tsx:109`
  →

- **B-84** — Couldn't remove that
  `alert title · verse.tsx:122`
  →

---

## P · Plans

### Plans (`(tabs)/plans/index.tsx`)

- **P-01** — Plans
  `title, and the tab label · index.tsx:132 · (tabs)/_layout.tsx:50`
  →

- **P-02** — Search plans, a book, or a theme
  `search field placeholder. This field is also the only door to plan generation ·
  index.tsx:140`
  →

- **P-03** — {n} matches
  `results eyebrow · index.tsx:158`
  →

- **P-04** — Nothing saved matches that
  `results eyebrow, no matches · index.tsx:158`
  →

- **P-05** — Build a plan about "{query}"
  `the generate card under search results · index.tsx:180`
  →

- **P-06** — Pamwe shapes the readings for the two of you.
  `that card's subtitle · index.tsx:182`
  →

- **P-07** — Reading now
  `eyebrow above the active plan · index.tsx:191`
  →

- **P-08** — Day {n} of {n}
  `under the active plan's progress bar · index.tsx:204`
  →

- **P-09** — View plan
  `link on the active plan card · index.tsx:206`
  →

- **P-10** — Start something
  `eyebrow above the two doors · index.tsx:218`
  →

- **P-11** — Build a plan
  `door title · index.tsx:225`
  →

- **P-12** — Say what you are walking through. Pamwe shapes the readings.
  `door subtitle · index.tsx:227`
  →

- **P-13** — Browse
  `door title · index.tsx:236`
  →

- **P-14** — {n} plans by topic and length, and what other couples read.
  `door subtitle · index.tsx:238`
  →

- **P-15** — Your plans
  `section eyebrow, plans you have started · index.tsx:245`
  →

- **P-16** — Saved for later
  `section eyebrow, plans built but never started · index.tsx:257`
  →

- **P-17** — {n} plans finished together
  `row into plan history · index.tsx:270`
  →

- **P-18** — Plans you've read together
  `that row when nothing was finished to the end · index.tsx:271`
  →

### Browse (`(tabs)/plans/browse.tsx`)

- **P-19** — Browse
  `title · browse.tsx:86`
  →

- **P-20** — Plans by topic and length, and what other couples read.
  `subtitle · browse.tsx:88`
  →

- **P-21** — Topic
  `filter group label · browse.tsx:93`
  →

- **P-22** — Length
  `filter group label · browse.tsx:103`
  →

- **P-23** — {n} days
  `length chips · browse.tsx:106`
  →

- **P-24** — All plans
  `results eyebrow, no filter · browse.tsx:112`
  →

- **P-25** — {n} plans
  `results eyebrow, filtered · browse.tsx:112`
  →

- **P-26** — Nothing here yet with that shape. Pamwe can build one instead.
  `empty state, taps through to Build · browse.tsx:118`
  →

- **P-27** — Read by {n} couples
  `badge on a plan more than one couple has read · browse.tsx:134`
  →

### Build a plan (`(tabs)/plans/build.tsx`)

- **P-28** — Build a plan
  `title · build.tsx:111`
  →

- **P-29** — Say what the two of you are walking through. Pamwe finds the passages and shapes the days.
  `blurb · build.tsx:113`
  →

- **P-30** — A season, a question, a book, a theme
  `field placeholder · build.tsx:120`
  →

- **P-31** — learning to trust again after a hard year
  `starter chip 1 · build.tsx:21`
  →

- **P-32** — what the New Testament says about faith
  `starter chip 2 · build.tsx:22`
  →

- **P-33** — praying together when we disagree
  `starter chip 3 · build.tsx:23`
  →

- **P-34** — waiting on something that has not come
  `starter chip 4 · build.tsx:24`
  →

- **P-35** — Build the plan
  `button · build.tsx:142`
  →

- **P-36** — Build another
  `that button once a plan is on screen · build.tsx:142`
  →

- **P-37** — Reading, and shaping the days.
  `line under the loader · build.tsx:153`
  →

- **P-38** — Your plan
  `eyebrow on the result · build.tsx:167`
  →

- **P-39** — Day {n}
  `each row of the generated plan · build.tsx:176`
  →

- **P-40** — Start together
  `button · build.tsx:184`
  →

- **P-41** — Save for later
  `secondary button · build.tsx:185`
  →

- **P-42** — Try a different shape
  `link that regenerates · build.tsx:189`
  →

- **P-43** — Couldn't start it
  `alert title · build.tsx:86`
  →

- **P-44** — Couldn't save it
  `alert title · build.tsx:102`
  →

- **P-45** — Try again in a moment.
  `body on both · build.tsx:86, 102`
  →

### The step builder (`(tabs)/plans/builder.tsx`)

- **P-46** — Build a plan
  `step 1 title · builder.tsx:183`
  →

- **P-47** — Pick a book or a topic to build from.
  `step 1 subtitle · builder.tsx:184`
  →

- **P-48** — Books
  `mode toggle · builder.tsx:28`
  →

- **P-49** — Topics
  `mode toggle · builder.tsx:29`
  →

- **P-50** — Search books
  `field placeholder · builder.tsx:195`
  →

- **P-51** — Marriage / Anxiety / Forgiveness / Gratitude / Grief / New season / Rest / Money
  `the eight topic chips · builder.tsx:43-50`
  →

- **P-52** — Scripture on building a strong, God-centered marriage.
  `what the Marriage chip asks for. Never shown; it is the prompt behind the chip ·
  builder.tsx:43`
  →

- **P-53** — Passages for a couple walking through anxiety and worry.
  `prompt behind the Anxiety chip · builder.tsx:44`
  →

- **P-54** — A plan on learning to forgive each other.
  `prompt behind the Forgiveness chip · builder.tsx:45`
  →

- **P-55** — Readings to grow in gratitude together.
  `prompt behind the Gratitude chip · builder.tsx:46`
  →

- **P-56** — Comfort from Scripture while grieving together.
  `prompt behind the Grief chip · builder.tsx:47`
  →

- **P-57** — Guidance for a couple starting a new season of life.
  `prompt behind the New season chip · builder.tsx:48`
  →

- **P-58** — Passages about Sabbath, rest, and trusting God.
  `prompt behind the Rest chip · builder.tsx:49`
  →

- **P-59** — What the Bible says about money and generosity for a couple.
  `prompt behind the Money chip · builder.tsx:50`
  →

- **P-60** — How long?
  `step 2 title · builder.tsx:242`
  →

- **P-61** — Pick how many days you'll read together.
  `step 2 subtitle · builder.tsx:243`
  →

- **P-62** — Recommended
  `badge on the suggested length · builder.tsx:254`
  →

- **P-63** — Your rhythm
  `step 3 title · builder.tsx:264`
  →

- **P-64** — How much do you want to read each day?
  `step 3 subtitle · builder.tsx:265`
  →

- **P-65** — A few verses / A chapter / Go deep
  `the three rhythm segments · builder.tsx:33-35`
  →

- **P-66** — A few verses a day / One chapter a day / A longer sitting
  `how each rhythm is written on the review screen and the plan · builder.tsx:38-40`
  →

- **P-67** — Reflect together
  `toggle title · builder.tsx:269`
  →

- **P-68** — Journal and reveal after each reading.
  `toggle subtitle · builder.tsx:270`
  →

- **P-69** — Ready?
  `step 4 title · builder.tsx:279`
  →

- **P-70** — Give your plan a name and review it.
  `step 4 subtitle · builder.tsx:280`
  →

- **P-71** — Name your plan
  `field placeholder · builder.tsx:285`
  →

- **P-72** — Source / Length / Rhythm / Reflect together
  `the four review rows · builder.tsx:291-294`
  →

- **P-73** — Starting in {book}
  `the Source value when a book was picked · builder.tsx:163`
  →

- **P-74** — {book}, together
  `the name suggested when a book is picked · builder.tsx:107`
  →

- **P-75** — Continue
  `button on step 1 · builder.tsx:302`
  →

- **P-76** — Next
  `button on steps 2 and 3 · builder.tsx:302`
  →

- **P-77** — Create plan
  `button on step 4 · builder.tsx:304`
  →

- **P-78** — Your plan is ready
  `success title · builder.tsx:149`
  →

- **P-79** — "{name}" is saved under your plans. Open it to begin together.
  `success body · builder.tsx:151`
  →

- **P-80** — View plan
  `success button · builder.tsx:154`
  →

- **P-81** — Done
  `success ghost button · builder.tsx:155`
  →

- **P-82** — Not connected
  `alert title when there is no partner yet · builder.tsx:118`
  →

- **P-83** — You need a partner before building a plan.
  `that alert's body · builder.tsx:118`
  →

- **P-84** — Couldn't create the plan
  `alert title · builder.tsx:137`
  →

### Plan detail (`(tabs)/plans/[id].tsx`)

- **P-85** — Days / Scripture / A day
  `the three meta columns under the banner · [id].tsx:307, 311, 315`
  →

- **P-86** — About this plan
  `section eyebrow · [id].tsx:319`
  →

- **P-87** — Reading schedule
  `section eyebrow · [id].tsx:324`
  →

- **P-88** — {n} earlier days
  `above the schedule window · [id].tsx:327`
  →

- **P-89** — + {n} more days
  `below the schedule window · [id].tsx:357`
  →

- **P-90** — What you'll explore
  `section eyebrow · [id].tsx:365`
  →

- **P-91** — What you'll gain
  `card eyebrow · [id].tsx:381`
  →

- **P-92** — Begin together
  `primary button · [id].tsx:397`
  →

- **P-93** — Continue reading
  `primary button on the plan you are already reading · [id].tsx:397`
  →

- **P-94** — Mark plan complete
  `link, only once the last day is reached · [id].tsx:401`
  →

- **P-95** — End this plan
  `link, before the last day · [id].tsx:401`
  →

- **P-96** — Share with another couple
  `link, only on a plan you built · [id].tsx:412`
  →

- **P-97** — Making a link…
  `that link, in flight · [id].tsx:412`
  →

- **P-98** — Remove this plan
  `link, only on a saved plan neither of you has started · [id].tsx:423`
  →

- **P-99** — Removing…
  `that link, in flight · [id].tsx:423`
  →

- **P-100** — Switch reading plan?
  `confirm alert title · [id].tsx:136`
  →

- **P-101** — Your current plan is marked complete. "{plan}" starts at day 1, for both of you.
  `confirm alert body · [id].tsx:137`
  →

- **P-102** — Mark this plan complete?
  `confirm alert title, last day reached · [id].tsx:202`
  →

- **P-103** — It moves to your finished plans and you can choose what to read next.
  `confirm alert body · [id].tsx:204`
  →

- **P-104** — Mark complete
  `confirm alert button · [id].tsx:209`
  →

- **P-105** — End this plan?
  `confirm alert title, before the last day · [id].tsx:202`
  →

- **P-106** — The days you read together stay in your reflections. You can start it again any time.
  `confirm alert body · [id].tsx:205`
  →

- **P-107** — Remove this saved plan?
  `confirm alert title · [id].tsx:154`
  →

- **P-108** — It disappears for both of you. Plans you have read together stay in your history.
  `confirm alert body · [id].tsx:155`
  →

- **P-109** — Remove
  `confirm alert destructive button · [id].tsx:161`
  →

- **P-110** — We're reading "{plan}" on Pamwe. Come read it with us: {link}
  `the message when a plan is shared · [id].tsx:185`
  →

- **P-111** — We couldn't open this plan
  `title when the plan will not load · [id].tsx:263`
  →

- **P-112** — Go back
  `button · [id].tsx:265`
  →

- **P-113** — Couldn't start this plan
  `alert title · [id].tsx:131`
  →

- **P-114** — Couldn't update the plan
  `alert title · [id].tsx:243`
  →

- **P-115** — Couldn't make a link
  `alert title · [id].tsx:188`
  →

- **P-116** — Couldn't remove it
  `alert title · [id].tsx:170`
  →

- **P-117** — This plan has already been read together, so it stays.
  `that alert's body · [id].tsx:170`
  →

- **P-118** — Couldn't start that plan. Try again in a moment.
  `error thrown when an enrolment does not land · lib/plans.ts:195`
  →

### Plans you've read (`(tabs)/plans/finished.tsx`)

- **P-119** — Plans you've read
  `title · finished.tsx:47`
  →

- **P-120** — Every plan you opened together, finished or ended.
  `subtitle · finished.tsx:49`
  →

- **P-121** — The first plan you read together shows up here.
  `empty state · finished.tsx:55`
  →

- **P-122** — {n} days · finished {date}
  `meta on a plan read to the end · finished.tsx:83, 93`
  →

- **P-123** — Read {n} of {n} days · ended {date}
  `meta on a plan stopped part way · finished.tsx:84, 93`
  →

### A plan someone shared (`app/plan/[token].tsx`)

- **P-124** — Shared with you
  `eyebrow · [token].tsx:92`
  →

- **P-125** — {n} days, read together.
  `body · [token].tsx:99`
  →

- **P-126** — {n} couples have walked it.
  `appended when more than one couple has read it · [token].tsx:100`
  →

- **P-127** — Starting this sets aside {plan}. Everything you have written stays in your reflections.
  `warning when they already have a plan · [token].tsx:104`
  →

- **P-128** — the plan you are reading
  `stands in for {plan} when the title is unknown · [token].tsx:105`
  →

- **P-129** — Start it together
  `button · [token].tsx:110`
  →

- **P-130** — Not now
  `secondary button · [token].tsx:111`
  →

- **P-131** — You'll need Pamwe first
  `title for a visitor with no couple · [token].tsx:69`
  →

- **P-132** — Someone shared a reading plan with you. Sign in and pair with your partner, then open the link again.
  `body · [token].tsx:71`
  →

- **P-133** — Get started
  `button · [token].tsx:73`
  →

- **P-134** — That link has expired
  `title when the token no longer resolves · [token].tsx:81`
  →

- **P-135** — Ask them to share it again, or find something together in Plans.
  `body · [token].tsx:83`
  →

- **P-136** — Browse plans
  `button · [token].tsx:85`
  →

- **P-137** — Couldn't start it
  `alert title · [token].tsx:52`
  →

---

## R · Prayers & Dreams

### The list (`(tabs)/prayers/index.tsx`)

- **R-01** — Prayers
  `tab label · (tabs)/_layout.tsx:59`
  →

- **R-02** — Prayer requests
  `title, Prayers side · index.tsx:274`
  →

- **R-03** — What you're carrying to Him, together.
  `subtitle, Prayers side · index.tsx:276`
  →

- **R-04** — Dreams
  `title, Dreams side · index.tsx:274`
  →

- **R-05** — The ones that stayed with you.
  `subtitle, Dreams side · index.tsx:276`
  →

- **R-06** — PRAYERS / DREAMS
  `the toggle between the two · index.tsx:280`
  →

- **R-07** — Add a prayer point
  `primary button, Prayers side · index.tsx:293`
  →

- **R-08** — Write down a dream
  `primary button, Dreams side · index.tsx:293`
  →

- **R-09** — No prayers here yet
  `empty title · index.tsx:328`
  →

- **R-10** — Write the first one down. {partner} will pray it with you.
  `empty body · index.tsx:330`
  →

- **R-11** — No dreams written down yet
  `empty title, Dreams · index.tsx:305`
  →

- **R-12** — When one stays with you in the morning, put it here. {partner} can pray it with you.
  `empty body, Dreams · index.tsx:307`
  →

- **R-13** — Answered · {n}
  `header above the answered list, taps into the timeline · index.tsx:356`
  →

- **R-14** — Delete this prayer?
  `confirm alert title · index.tsx:202`
  →

- **R-15** — This removes it for both of you and can't be undone.
  `confirm alert body, prayers and dreams · index.tsx:202, 221`
  →

- **R-16** — Delete this dream?
  `confirm alert title · index.tsx:221`
  →

- **R-17** — Couldn't save that
  `alert title, "I prayed today" failed · index.tsx:168`
  →

- **R-18** — That didn't go through. Try again in a moment.
  `that alert's body · index.tsx:168`
  →

- **R-19** — Couldn't update the prayer
  `alert title, marking answered failed · index.tsx:191`
  →

- **R-20** — Couldn't remove it
  `alert title, delete failed · index.tsx:210, 228`
  →

### Prayer card (`components/PrayerCard.tsx`)

- **R-21** — You
  `who label on your own prayer · PrayerCard.tsx:80`
  →

- **R-22** — I prayed today
  `the tappable row on your partner's prayer · PrayerCard.tsx:90`
  →

- **R-23** — You prayed today
  `that row once you have · PrayerCard.tsx:89`
  →

- **R-24** — {partner} prayed today
  `on your own prayer, once they have · PrayerCard.tsx:86`
  →

- **R-25** — Waiting for {partner}
  `on your own prayer, before they have · PrayerCard.tsx:87`
  →

- **R-26** — Edit / Delete
  `the two swipe actions on your own card · PrayerCard.tsx:98, 102`
  →

- **R-27** — today / yesterday / {n} days ago / 1 week ago / {n} weeks ago / 1 month ago / {n} months ago
  `the relative timestamp on every prayer and dream · PrayerCard.tsx:39-46`
  →

- **R-28** — Family / Health / Work / Guidance / Thanks / Other
  `the six category chips · lib/prayers.ts:8`
  →

### Prayer sheet (`components/PrayerDetailSheet.tsx`)

- **R-29** — Answered
  `label on an answered prayer · PrayerDetailSheet.tsx:105`
  →

- **R-30** — Not prayed yet
  `status on your partner's prayer before you pray · PrayerDetailSheet.tsx:86`
  →

- **R-31** — Mark as answered
  `primary button · PrayerDetailSheet.tsx:125`
  →

- **R-32** — Remind me to pray
  `reminder toggle title · PrayerDetailSheet.tsx:146`
  →

- **R-33** — A daily nudge on this phone. It stops once you pray for it.
  `reminder toggle subtitle · PrayerDetailSheet.tsx:147`
  →

- **R-34** — 8:00 AM / 12:00 PM / 9:00 PM
  `the three reminder times · PrayerDetailSheet.tsx:14-16`
  →

- **R-35** — Notifications are off
  `alert title when a reminder cannot be set · PrayerDetailSheet.tsx:63`
  →

- **R-36** — Turn on notifications for Pamwe to set a reminder.
  `that alert's body · PrayerDetailSheet.tsx:63`
  →

### Marking a prayer answered (`components/AnsweredSheet.tsx`)

- **R-37** — Answered
  `sheet title · AnsweredSheet.tsx:43`
  →

- **R-38** — How was it answered? This is optional, and it is what the timeline remembers.
  `hint · AnsweredSheet.tsx:49`
  →

- **R-39** — She got the job.
  `field placeholder · AnsweredSheet.tsx:57`
  →

- **R-40** — Mark answered
  `button · AnsweredSheet.tsx:65`
  →

- **R-41** — Not yet
  `secondary button · AnsweredSheet.tsx:66`
  →

### Add or edit a prayer (`(tabs)/prayers/add.tsx`)

- **R-42** — Prayer requests
  `back link · add.tsx:64`
  →

- **R-43** — New prayer
  `title · add.tsx:65`
  →

- **R-44** — Edit prayer
  `title, editing · add.tsx:65`
  →

- **R-45** — Name it, and carry it to Him together.
  `subtitle · add.tsx:66`
  →

- **R-46** — Your prayer
  `eyebrow above the field · add.tsx:68`
  →

- **R-47** — e.g. Wisdom as we decide about the move…
  `field placeholder · add.tsx:73`
  →

- **R-48** — What is it about?
  `eyebrow above the category chips · add.tsx:80`
  →

- **R-49** — Let {partner} know
  `notify toggle title · add.tsx:101`
  →

- **R-50** — They'll get a gentle notification to pray with you.
  `notify toggle subtitle · add.tsx:102`
  →

- **R-51** — {partner} will see
  `label above the mock notification · add.tsx:110`
  →

- **R-52** — {me} added a prayer point
  `the mock notification's line. Note the real push says "Your partner added a
  prayer" (N-05), so these two do not match · add.tsx:113`
  →

- **R-53** — Share prayer
  `button · add.tsx:123`
  →

- **R-54** — Save changes
  `button, editing · add.tsx:123`
  →

- **R-55** — Couldn't save your prayer
  `alert title · add.tsx:55`
  →

### Add or edit a dream (`(tabs)/prayers/dream-add.tsx`)

- **R-56** — Dreams
  `back link · dream-add.tsx:55`
  →

- **R-57** — New dream
  `title · dream-add.tsx:56`
  →

- **R-58** — Edit dream
  `title, editing · dream-add.tsx:56`
  →

- **R-59** — Write it down while it's still close.
  `subtitle · dream-add.tsx:58`
  →

- **R-60** — What you saw
  `eyebrow above the field · dream-add.tsx:61`
  →

- **R-61** — e.g. I was standing at the edge of a river I couldn't cross…
  `field placeholder · dream-add.tsx:66`
  →

- **R-62** — {partner} can read this once you save it. Pamwe keeps the record, it doesn't tell you what it means.
  `the note under the field. This is the whole "dreams are recorded, never
  interpreted" rule, said out loud · dream-add.tsx:74`
  →

- **R-63** — Save dream
  `button · dream-add.tsx:81`
  →

- **R-64** — Couldn't save your dream
  `alert title · dream-add.tsx:46`
  →

### Dream card (`components/DreamCard.tsx`)

- **R-65** — Pray about this
  `the one action on a dream card · DreamCard.tsx:106`
  →

### Answered timeline (`(tabs)/prayers/timeline.tsx`)

- **R-66** — Answered
  `title · timeline.tsx:88`
  →

- **R-67** — A record of His faithfulness, together.
  `subtitle · timeline.tsx:90`
  →

- **R-68** — Nothing answered yet
  `empty title · timeline.tsx:98`
  →

- **R-69** — When you mark a prayer answered, it gathers here. Part of your story.
  `empty body · timeline.tsx:99`
  →

- **R-70** — Answered {date}
  `card eyebrow · timeline.tsx:116`
  →

- **R-71** — You asked · {date}
  `meta on your own prayer · timeline.tsx:127`
  →

- **R-72** — {partner} asked · {date}
  `meta on theirs · timeline.tsx:127`
  →

- **R-73** — Carried {n} days / Carried {n} weeks / Carried {n} months
  `how long it was carried before the answer · timeline.tsx:28-31`
  →

- **R-74** — Still carrying this
  `link that reopens an answered prayer · timeline.tsx:141`
  →

- **R-75** — Still carrying this one?
  `confirm alert title · timeline.tsx:62`
  →

- **R-76** — It goes back among your active prayers. The note about how it was answered is cleared.
  `confirm alert body · timeline.tsx:63`
  →

- **R-77** — Leave it answered
  `confirm alert cancel · timeline.tsx:65`
  →

- **R-78** — Still carrying
  `confirm alert confirm · timeline.tsx:67`
  →

- **R-79** — Couldn't reopen it
  `alert title · timeline.tsx:74`
  →

---

## F · Reflect

### History (`(tabs)/reflect/index.tsx`)

- **F-01** — Reflect
  `tab label · (tabs)/_layout.tsx:68`
  →

- **F-02** — Reflections
  `title · index.tsx:116`
  →

- **F-03** — What you've come across, together.
  `subtitle · index.tsx:122`
  →

- **F-04** — No reflections yet
  `empty title · index.tsx:129`
  →

- **F-05** — When you read a day together and reflect, what you each write will gather here.
  `empty body · index.tsx:131`
  →

- **F-06** — From your story · {label}
  `eyebrow on the on-this-day card · index.tsx:139`
  →

- **F-07** — All
  `first filter chip · index.tsx:149`
  →

- **F-08** — Read
  `the link on every card · index.tsx:175`
  →

- **F-09** — Newer / Older
  `the two pager buttons · index.tsx:186, 193`
  →

- **F-10** — Page {n} of {n}
  `between them · index.tsx:190`
  →

### One day (`(tabs)/reflect/[id].tsx`)

- **F-11** — Reflections
  `back link · [id].tsx:133`
  →

- **F-12** — Day {n} · {plan}
  `under the title · [id].tsx:137`
  →

- **F-13** — You read {ref}
  `the banner that opens the passage · [id].tsx:151`
  →

- **F-14** — What you each wrote
  `section eyebrow · [id].tsx:157`
  →

- **F-15** — You wrote / You recorded
  `label on your card · [id].tsx:158`
  →

- **F-16** — {partner} wrote / {partner} recorded
  `label on their card · [id].tsx:165`
  →

- **F-17** — No reflection.
  `when a card has nothing in it · [id].tsx:204`
  →

- **F-18** — We couldn't load this reflection. Check your connection and try again.
  `error card · [id].tsx:110`
  →

- **F-19** — Try again
  `button on that card · [id].tsx:113`
  →

### Their words (`(tabs)/reflect/words.tsx`)

- **F-20** — Their words
  `title · words.tsx:53`
  →

- **F-21** — The lines that stayed with you.
  `subtitle · words.tsx:55`
  →

- **F-22** — Nothing kept yet
  `empty title · words.tsx:63`
  →

- **F-23** — When a line in {partner}'s reflection stays with you, keep it from the reveal. It will live here.
  `empty body · words.tsx:65`
  →

- **F-24** — {partner}'s words
  `meta on a line you kept · words.tsx:78`
  →

- **F-25** — Your words, kept by {partner}
  `meta on a line they kept · words.tsx:78`
  →

---

## Y · You

### You (`(tabs)/you/index.tsx`)

- **Y-01** — You
  `title, and the tab label · index.tsx:93 · (tabs)/_layout.tsx:78`
  →

- **Y-02** — Walking with {partner} · {n} day streak
  `line under your name · index.tsx:101`
  →

- **Y-03** — Days read / Reflections / Prayers
  `the three stat cards · index.tsx:108-110`
  →

- **Y-04** — Appearance
  `section eyebrow · index.tsx:123`
  →

- **Y-05** — Light / Dark / Auto
  `the three appearance options · index.tsx:125-127`
  →

- **Y-06** — Settings
  `section eyebrow · index.tsx:130`
  →

- **Y-07** — Notifications & reminders
  `row · index.tsx:132`
  →

- **Y-08** — Change reading plan
  `row · index.tsx:133`
  →

- **Y-09** — Your recaps
  `row · index.tsx:134`
  →

- **Y-10** — You & {partner}
  `row · index.tsx:135`
  →

- **Y-11** — About
  `section eyebrow · index.tsx:138`
  →

- **Y-12** — Privacy policy
  `row · index.tsx:140`
  →

- **Y-13** — Terms of service
  `row · index.tsx:141`
  →

- **Y-14** — Sign out
  `link · index.tsx:145`
  →

- **Y-15** — Scripture: World English Bible · public domain
  `footer. Note the reader ships six translations now · index.tsx:147`
  →

- **Y-16** — Sign out?
  `confirm alert title · index.tsx:81`
  →

- **Y-17** — You can sign back in anytime.
  `confirm alert body · index.tsx:81`
  →

### Settings (`(tabs)/you/settings.tsx`)

- **Y-18** — Settings
  `title · settings.tsx:182`
  →

- **Y-19** — Notifications
  `section eyebrow · settings.tsx:184`
  →

- **Y-20** — Notifications are turned off for Pamwe in your phone settings. Tap to turn them back on.
  `banner when iOS has refused · settings.tsx:189`
  →

- **Y-21** — Notifications are on for Pamwe, but this phone could not register with Apple. Tap to try again, or restart the phone if it keeps failing.
  `banner when no token can be minted · settings.tsx:203`
  →

- **Y-22** — This phone is allowed to show notifications but is not connected to your account yet. Tap to reconnect it.
  `banner when the registration row is missing · settings.tsx:204`
  →

- **Y-23** — Turn on notifications to know when your partner has written, without checking.
  `banner when iOS has never been asked · settings.tsx:215`
  →

- **Y-24** — Morning reminder
  `toggle · settings.tsx:225`
  →

- **Y-25** — A gentle nudge that the day's reading is ready.
  `toggle description · settings.tsx:226`
  →

- **Y-26** — Another time
  `link to the time picker · settings.tsx:257`
  →

- **Y-27** — At {time}, tap to change
  `that link when the chosen time is not one of the five presets · settings.tsx:257`
  →

- **Y-28** — Partner reflections
  `toggle · settings.tsx:273`
  →

- **Y-29** — When your partner submits, replies to you, nudges you, or is thinking of you.
  `toggle description · settings.tsx:273`
  →

- **Y-30** — Prayers
  `toggle · settings.tsx:275`
  →

- **Y-31** — When your partner adds one, plus a Sunday look at what still needs praying for.
  `toggle description · settings.tsx:275`
  →

- **Y-32** — New dreams
  `toggle · settings.tsx:277`
  →

- **Y-33** — When your partner writes down a dream.
  `toggle description · settings.tsx:277`
  →

- **Y-34** — Verse notes
  `toggle · settings.tsx:279`
  →

- **Y-35** — When your partner takes note of a verse. Once per verse, not on every edit.
  `toggle description · settings.tsx:279`
  →

- **Y-36** — Weekly recap
  `toggle · settings.tsx:282`
  →

- **Y-37** — Sunday morning, a look back at your week.
  `toggle description · settings.tsx:283`
  →

- **Y-38** — On the lock screen
  `section eyebrow · settings.tsx:299`
  →

- **Y-39** — What a notification shows before you unlock.
  `line under that eyebrow · settings.tsx:303`
  →

- **Y-40** — Show it
  `option · settings.tsx:309`
  →

- **Y-41** — Keep it private
  `option · settings.tsx:310`
  →

- **Y-42** — "{partner} just wrote theirs"
  `the example shown under "Show it" · settings.tsx:329`
  →

- **Y-43** — "Something is waiting for you in Pamwe"
  `the example shown under "Keep it private". Note the real generic push says
  "Pamwe / Something is waiting for you." (N-31, N-32), so these do not match ·
  settings.tsx:330`
  →

- **Y-44** — Plan
  `section eyebrow · settings.tsx:334`
  →

- **Y-45** — Reading rhythm
  `label above the cadence control · settings.tsx:340`
  →

- **Y-46** — Change reading plan
  `row · settings.tsx:356`
  →

- **Y-47** — Pause Pamwe
  `row · settings.tsx:360`
  →

- **Y-48** — Account
  `section eyebrow · settings.tsx:363`
  →

- **Y-49** — Your name
  `row · settings.tsx:365`
  →

- **Y-50** — Signed in as
  `label above the email address · settings.tsx:369`
  →

- **Y-51** — Sign out
  `row · settings.tsx:374`
  →

- **Y-52** — Leave the pair
  `row · settings.tsx:379`
  →

- **Y-53** — Delete account
  `row, the one in accent · settings.tsx:381`
  →

- **Y-54** — Couldn't save that
  `alert title, a preference or the cadence failed to save · settings.tsx:90, 99`
  →

### Your name (`(tabs)/you/name.tsx`)

- **Y-55** — Settings
  `back link · name.tsx:57`
  →

- **Y-56** — Your name
  `title · name.tsx:58`
  →

- **Y-57** — This is the name your partner sees on your reflections.
  `subtitle · name.tsx:60`
  →

- **Y-58** — Your first name
  `field placeholder · name.tsx:68`
  →

- **Y-59** — Save
  `button · name.tsx:80`
  →

- **Y-60** — Couldn't save your name
  `alert title · name.tsx:46`
  →

### You & your partner (`(tabs)/you/couple.tsx`)

- **Y-61** — You & {partner}
  `title · couple.tsx:62`
  →

- **Y-62** — {n} day streak · together since {month year}
  `line under both names · couple.tsx:74`
  →

- **Y-63** — Days together / Revealed / Prayers
  `the three stat cards · couple.tsx:80-82`
  →

- **Y-64** — Your anniversary
  `row · couple.tsx:94`
  →

- **Y-65** — Set the date you got together
  `that row's hint before one is set · couple.tsx:96`
  →

- **Y-66** — Set / Change
  `that row's action · couple.tsx:99`
  →

- **Y-67** — Reflections sealed until you both write
  `the privacy row · couple.tsx:106`
  →

- **Y-68** — On
  `its state · couple.tsx:107`
  →

- **Y-69** — Reflections are visible only to you and {partner}. Each one stays sealed until you've both written for that day. We never show it early, to anyone.
  `the paragraph under it · couple.tsx:109`
  →

### Anniversary (`(tabs)/you/anniversary.tsx`)

- **Y-70** — Couple
  `back link · anniversary.tsx:55`
  →

- **Y-71** — Your anniversary
  `title · anniversary.tsx:56`
  →

- **Y-72** — The date you got together. It sets the days together count here and on your Lock Screen.
  `blurb · anniversary.tsx:57`
  →

- **Y-73** — Save
  `button · anniversary.tsx:77`
  →

- **Y-74** — Could not save
  `alert title · anniversary.tsx:46`
  →

- **Y-75** — Check your connection and try again.
  `that alert's body · anniversary.tsx:46`
  →

### Recaps (`(tabs)/you/recaps.tsx`)

- **Y-76** — Your recap
  `title · recaps.tsx:79`
  →

- **Y-77** — A look back at what you've walked through together.
  `subtitle · recaps.tsx:80`
  →

- **Y-78** — Week / Month / Quarter
  `the three period segments · recaps.tsx:21-23`
  →

- **Y-79** — This week / This month / This quarter
  `the range eyebrow above the headline · lib/recaps.ts:7`
  →

- **Y-80** — A gentle pause this {week}.
  `headline, nothing read and nothing prayed · lib/recaps.ts:45`
  →

- **Y-81** — You carried each other in prayer this {week}.
  `headline, prayers but no reading · lib/recaps.ts:46`
  →

- **Y-82** — {n} days in the Word. Well done, both of you.
  `headline, five days or more · lib/recaps.ts:47`
  →

- **Y-83** — {n} days in the Word, together.
  `headline, one to four days · lib/recaps.ts:48`
  →

- **Y-84** — Most of what you prayed for this {week} was {your family / health / work / guidance / thanksgiving}.
  `insight line · lib/recaps.ts:96 · phrases at lib/recaps.ts:60-66`
  →

- **Y-85** — You spent most of your reading in {book}.
  `insight line · lib/recaps.ts:101`
  →

- **Y-86** — Days read / Highlights / Prayers
  `the three stat cards · recaps.tsx:104-106`
  →

- **Y-87** — What you read
  `card title · recaps.tsx:109`
  →

- **Y-88** — After a few days of reading together, it shows up here.
  `that card, empty · recaps.tsx:111`
  →

- **Y-89** — What you marked
  `card title · recaps.tsx:120`
  →

- **Y-90** — Highlight a verse while you read and it waits for you here.
  `that card, empty · recaps.tsx:122`
  →

- **Y-91** — Keep going
  `card title · recaps.tsx:132`
  →

- **Y-92** — You showed up {n} times this {week}. That rhythm is the rare thing: keep it.
  `encouragement, five days or more · lib/recaps.ts:53`
  →

- **Y-93** — Every day you opened the Word planted something. Pick your next reading tonight and keep it growing.
  `encouragement, one to four days · lib/recaps.ts:54`
  →

- **Y-94** — The Word will be here when you come back. Start small: one passage, read together.
  `encouragement, nothing read · lib/recaps.ts:55`
  →

- **Y-95** — What you prayed for
  `card title · recaps.tsx:136`
  →

- **Y-96** — No new prayers this {week}.
  `that card, empty · recaps.tsx:138`
  →

- **Y-97** — We couldn't load your recap. Check your connection and try again.
  `error card · recaps.tsx:91`
  →

- **Y-98** — Try again
  `button on that card · recaps.tsx:93`
  →

### The Grove screen (`(tabs)/you/grove.tsx`)

- **Y-99** — Your grove
  `title · grove.tsx:159`
  →

- **Y-100** — planted
  `note under a tree that is standing · grove.tsx:116`
  →

- **Y-101** — at {n} plans
  `note under a tree not yet planted · grove.tsx:116`
  →

- **Y-102** — Still being planted
  `above the last tree, where the path keeps going · grove.tsx:199`
  →

- **Y-103** — Finished together
  `ledger eyebrow · grove.tsx:207`
  →

- **Y-104** — No plans finished yet. The first one goes here.
  `ledger, empty · grove.tsx:209`
  →

- **Y-105** — Not planted yet
  `eyebrow in the sheet for an unearned tree · grove.tsx:235`
  →

- **Y-106** — Unlocks at {n} plans finished. You have {none yet / n}, so {one plan / n plans} to go.
  `the gate line in that sheet · grove.tsx:259`
  →

- **Y-107** — Browse reading plans
  `button in that sheet · grove.tsx:244`
  →

---

## G · The Grove

The tree names and lines (`lib/treeAwards.ts`), the subtitle and ledger lines
(`lib/grove.ts`), and the You tab card (`components/GroveCard.tsx`).

### The six trees (`lib/treeAwards.ts`)

- **G-01** — Fig tree
  `name, 5 plans · treeAwards.ts:36`
  →

- **G-02** — Five plans finished together, and a fig tree planted.
  `its line · treeAwards.ts:37`
  →

- **G-03** — Olive tree
  `name, 10 plans · treeAwards.ts:44`
  →

- **G-04** — Ten plans finished. Olive trees grow slowly and last for centuries.
  `its line · treeAwards.ts:45`
  →

- **G-05** — Oak
  `name, 20 plans · treeAwards.ts:52`
  →

- **G-06** — Twenty plans finished. Oaks hold their ground for hundreds of years.
  `its line · treeAwards.ts:53`
  →

- **G-07** — Baobab
  `name, 40 plans · treeAwards.ts:60`
  →

- **G-08** — Forty plans finished. The baobab carries whole seasons in its trunk.
  `its line · treeAwards.ts:61`
  →

- **G-09** — Cedar of Lebanon
  `name, 80 plans · treeAwards.ts:67`
  →

- **G-10** — Eighty plans finished. Cedars crowned the mountains of Lebanon.
  `its line · treeAwards.ts:69`
  →

- **G-11** — Redwood
  `name, 100 plans · treeAwards.ts:75`
  →

- **G-12** — A hundred plans finished. Redwoods are the tallest living things on Earth.
  `its line · treeAwards.ts:77`
  →

### The subtitle under "Your grove" (`lib/grove.ts`)

- **G-13** — Nothing planted yet. Finish five reading plans together and a fig tree goes in the ground.
  `no plans finished · grove.ts:273`
  →

- **G-14** — Nothing planted yet, but the path is under way. {Three} more plans and a fig tree goes in the ground.
  `some plans, no tree yet. Small numbers are spelled out · grove.ts:275`
  →

- **G-15** — {Tree}, standing. {Next tree} at {n} plans, {n} plans to go.
  `one tree planted · grove.ts:283-284`
  →

- **G-16** — {Tree}, and {two} before it. {Next tree} at {n} plans, {n} plans to go.
  `several planted · grove.ts:283-284`
  →

- **G-17** — Six trees, the whole walk. A hundred plans finished, and above the redwood the path keeps going.
  `every tree planted · grove.ts:279`
  →

### The line under the ledger (`lib/grove.ts`)

- **G-18** — Read together and the prints start moving again.
  `no streak · grove.ts:298`
  →

- **G-19** — {n} days in the Word together. Keep reading and the prints go on ahead.
  `under a week · grove.ts:305`
  →

- **G-20** — {n} days in the Word together. Fresh prints ahead of your last tree.
  `a week or more · grove.ts:304`
  →

- **G-21** — {n} days in the Word together. The prints are well past your last tree.
  `a month or more · grove.ts:303`
  →

- **G-22** — {n} days in the Word together. The prints are almost at the {tree}.
  `a hundred days or more · grove.ts:302`
  →

- **G-23** — {n} days in the Word together, and still walking.
  `every tree planted · grove.ts:300`
  →

### The You tab card (`lib/grove.ts` + `components/GroveCard.tsx`)

- **G-24** — Your grove
  `card title before the first tree · grove.ts:312`
  →

- **G-25** — Not started
  `card pill, no plans finished · grove.ts:317`
  →

- **G-26** — {n} plans
  `card pill · grove.ts:314`
  →

- **G-27** — Finish a plan together and the walk begins.
  `caption, nothing finished · grove.ts:324`
  →

- **G-28** — {n} more and a fig tree goes in the ground.
  `caption, some plans but no tree · grove.ts:323`
  →

- **G-29** — Next tree at {n} plans: {tree}.
  `caption, at least one tree · grove.ts:321`
  →

- **G-30** — Six trees standing. The path keeps going.
  `caption, every tree planted · grove.ts:319`
  →

---

## E · Pause, leave, archive, delete

### Pause (`(tabs)/you/pause.tsx`)

- **E-01** — Take a break
  `eyebrow · pause.tsx:92`
  →

- **E-02** — Pause Pamwe
  `title · pause.tsx:93`
  →

- **E-03** — Pages and reminders stop for you both. Your streak stays where it is and starts again from there.
  `blurb · pause.tsx:94`
  →

- **E-04** — Ask {partner} to pause
  `button · pause.tsx:99`
  →

- **E-05** — Cancel
  `ghost button · pause.tsx:100`
  →

- **E-06** — Asked {partner}
  `title once the ask has gone · pause.tsx:78`
  →

- **E-07** — Nothing changes until {partner} agrees. Today is still there, and so are the reminders.
  `blurb while waiting · pause.tsx:81`
  →

- **E-08** — Withdraw the request
  `button · pause.tsx:86`
  →

- **E-09** — Couldn't ask just now
  `alert title · pause.tsx:45`
  →

- **E-10** — Couldn't withdraw that
  `alert title · pause.tsx:60`
  →

### Answering an ask (`components/CoupleRequestCard.tsx`, sits on Today)

- **E-11** — A pause
  `card eyebrow · CoupleRequestCard.tsx:45`
  →

- **E-12** — {partner} has asked to pause Pamwe for a while.
  `the line · CoupleRequestCard.tsx:49`
  →

- **E-13** — Pages and reminders stop for you both. Your streak keeps its place.
  `the detail · CoupleRequestCard.tsx:54`
  →

- **E-14** — Agree to pause
  `button · CoupleRequestCard.tsx:59`
  →

- **E-15** — Starting again
  `card eyebrow · CoupleRequestCard.tsx:45`
  →

- **E-16** — {partner} would like to start reading again.
  `the line · CoupleRequestCard.tsx:50`
  →

- **E-17** — Today comes back, and the streak picks up where it stopped.
  `the detail · CoupleRequestCard.tsx:55`
  →

- **E-18** — Start again
  `button · CoupleRequestCard.tsx:59`
  →

- **E-19** — Not yet
  `ghost button on both · CoupleRequestCard.tsx:63`
  →

- **E-20** — Couldn't answer that
  `alert title · CoupleRequestCard.tsx:36`
  →

### Today, while paused (`components/PausedToday.tsx`)

- **E-21** — Paused {DAY MONTH}
  `the banner pill · PausedToday.tsx:59`
  →

- **E-22** — Day {n} is saved
  `title with a streak · PausedToday.tsx:68`
  →

- **E-23** — Everything is saved
  `title with no streak · PausedToday.tsx:68`
  →

- **E-24** — No pages and no reminders. Your streak starts again at {n}.
  `blurb · PausedToday.tsx:71-72`
  →

- **E-25** — Ask {partner} to restart
  `button · PausedToday.tsx:99`
  →

- **E-26** — Waiting for {partner} to agree.
  `line while your restart ask is open · PausedToday.tsx:81`
  →

- **E-27** — {partner} has asked to start again.
  `line when theirs is open · PausedToday.tsx:94`
  →

- **E-28** — Read old notes
  `ghost button · PausedToday.tsx:105`
  →

### Leaving (`(tabs)/you/leave.tsx`)

- **E-29** — Sad to see you go
  `eyebrow, step 1 · leave.tsx:63`
  →

- **E-30** — Ending the journey
  `title, step 1 · leave.tsx:64`
  →

- **E-31** — Your {n} reflections stay readable for you both, in an archive nobody can change.
  `blurb, step 1 · leave.tsx:68`
  →

- **E-32** — Everything you have written stays readable for you both, in an archive nobody can change.
  `blurb, step 1, before the count loads · leave.tsx:67`
  →

- **E-33** — Continue
  `button, step 1 · leave.tsx:72`
  →

- **E-34** — Go back
  `ghost button, both steps · leave.tsx:73, 103`
  →

- **E-35** — Leave the pair
  `title, step 2 · leave.tsx:79`
  →

- **E-36** — A note to {PARTNER}, if you want
  `label above the farewell field · leave.tsx:82`
  →

- **E-37** — She reads it once.
  `that field's placeholder. Note the hardcoded "She" · leave.tsx:87`
  →

- **E-38** — {partner} sees this once, and then it is gone.
  `hint under the field · leave.tsx:97`
  →

- **E-39** — Leave
  `button, step 2 · leave.tsx:102`
  →

- **E-40** — Couldn't finish that
  `alert title · leave.tsx:49`
  →

### After it ends (`(onboarding)/left.tsx`)

- **E-41** — You left the pair
  `title, for whoever left · left.tsx:56`
  →

- **E-42** — Your partnership has ended
  `title, for the other one · left.tsx:56`
  →

- **E-43** — The archive is saved for you both.
  `blurb · left.tsx:59`
  →

- **E-44** — They left you a note
  `label above the farewell note, shown once · left.tsx:67`
  →

- **E-45** — Archive
  `label on the archive row · left.tsx:74`
  →

- **E-46** — {n} days, {n} notes
  `the archive row's value · left.tsx:76`
  →

- **E-47** — Everything you wrote
  `that value before the summary loads · left.tsx:76`
  →

- **E-48** — Read only
  `on the right of that row · left.tsx:79`
  →

- **E-49** — Open the archive
  `button · left.tsx:86`
  →

- **E-50** — Start again with someone
  `ghost button · left.tsx:91`
  →

### The archive (`app/archive.tsx`)

- **E-51** — Read only, sealed {DAY MONTH}
  `the banner pill · archive.tsx:105`
  →

- **E-52** — {n} days / {n} notes
  `the counts under the banner · archive.tsx:111-113`
  →

- **E-53** — A voice reflection.
  `stands in for an entry with no words · archive.tsx:130`
  →

- **E-54** — Nothing was written before this ended.
  `when the archive holds no entries · archive.tsx:120`
  →

- **E-55** — Nothing archived
  `title when there is no archive at all · archive.tsx:95`
  →

- **E-56** — An archive appears here when a partnership ends.
  `its body · archive.tsx:97`
  →

- **E-57** — Export a copy
  `button · archive.tsx:137`
  →

- **E-58** — Couldn't export
  `alert title · archive.tsx:71 · you/delete-account.tsx:36`
  →

**The exported file** (`lib/archive.ts` `exportText`)

- **E-59** — Pamwe
  `first line of the export · archive.ts:107`
  →

- **E-60** — Read together until {date}
  `second line · archive.ts:108`
  →

- **E-61** — {n} reflections
  `third line · archive.ts:109`
  →

- **E-62** — {date} · Day {n}
  `header on each entry · archive.ts:122`
  →

- **E-63** — (a voice reflection)
  `stands in for an entry with no words · archive.ts:121`
  →

- **E-64** — Someone
  `stands in for a name that could not be resolved · archive.ts:120 · archive.tsx:127`
  →

### Delete account (`(tabs)/you/delete-account.tsx`)

- **E-65** — Cancel
  `top-left link · delete-account.tsx:69`
  →

- **E-66** — Delete account
  `header label · delete-account.tsx:71`
  →

- **E-67** — Delete my account
  `title · delete-account.tsx:76`
  →

- **E-68** — Your profile and your own reflections go today. The days you read together stay with {partner}.
  `blurb · delete-account.tsx:82`
  →

- **E-69** — Your reflections and the prayers you wrote are deleted.
  `bullet 1 · delete-account.tsx:89`
  →

- **E-70** — Your partner keeps their own reflections and prayers.
  `bullet 2 · delete-account.tsx:92`
  →

- **E-71** — Your partner is unpaired and told that you've left.
  `bullet 3 · delete-account.tsx:95`
  →

- **E-72** — This is immediate and cannot be undone.
  `bullet 4 · delete-account.tsx:98`
  →

- **E-73** — Keep a copy first
  `label on the export card · delete-account.tsx:105`
  →

- **E-74** — One file, everything you have written.
  `its line · delete-account.tsx:106`
  →

- **E-75** — Export everything
  `button on that card · delete-account.tsx:110`
  →

- **E-76** — Delete my account
  `the destructive button · delete-account.tsx:121`
  →

- **E-77** — Keep my account
  `the way out · delete-account.tsx:128`
  →

- **E-78** — Delete your account?
  `confirm alert title · delete-account.tsx:56`
  →

- **E-79** — This permanently removes your reflections and prayers. It cannot be undone.
  `confirm alert body · delete-account.tsx:57`
  →

- **E-80** — Delete forever
  `confirm alert destructive button · delete-account.tsx:60`
  →

- **E-81** — Couldn't delete your account
  `alert title · delete-account.tsx:50`
  →

---

## N · Notifications

Every banner that lands on a phone. These are the highest-stakes lines in the
app: they render on a locked screen in front of whoever is holding it.

### Sent by the server (Edge Functions)

- **N-01** — Your partner just wrote theirs
  `title, one partner submitted · notify-partner/index.ts:139`
  →

- **N-02** — Write yours and open them together.
  `its body · notify-partner/index.ts:140`
  →

- **N-03** — Both reflections are in
  `title, both submitted · notify-partner/index.ts:135`
  →

- **N-04** — Open Pamwe and read them together.
  `its body · notify-partner/index.ts:136`
  →

- **N-05** — Your partner added a prayer
  `title. Does not name them, unlike every other push · notify-new-prayer/index.ts:105`
  →

- **N-06** — (the first ~80 characters of the prayer)
  `its body. Real words on a lock screen · notify-new-prayer/index.ts:106`
  →

- **N-07** — Your partner wrote down a dream
  `title. Also does not name them · notify-new-dream/index.ts:82`
  →

- **N-08** — Open Pamwe to read it together.
  `its body · notify-new-dream/index.ts:83`
  →

- **N-09** — {partner} replied to your reflection
  `title, a reply on your reflection · notify-new-response/index.ts:130`
  →

- **N-10** — {partner} replied to you
  `title, a reply answering your reply · notify-new-response/index.ts:130`
  →

- **N-11** — {partner} took note of {ref}
  `title · notify-new-note/index.ts:88`
  →

- **N-12** — {partner} said something on {ref}
  `title · notify-verse-comment/index.ts:90`
  →

- **N-13** — Want to see it?
  `body on both of the above · notify-new-note/index.ts:89, notify-verse-comment/index.ts:91`
  →

- **N-14** — {me} is thinking of you
  `title, the nudge · notify-nudge/index.ts:114`
  →

- **N-15** — Ready to read together today?
  `its body · notify-nudge/index.ts:115`
  →

- **N-16** — {me} is thinking of you
  `title, the heart button · notify-thinking/index.ts:113`
  →

- **N-17** — No task, no reading. Just that.
  `its body · notify-thinking/index.ts:114`
  →

- **N-18** — Your partner has left Pamwe
  `title, after an account deletion · delete-account/index.ts:101`
  →

- **N-19** — Your own reflections are saved. You can pair again whenever you're ready.
  `its body · delete-account/index.ts:102`
  →

**Pause and restart** (`notify-couple-request/index.ts`)

- **N-20** — {partner} asked to pause Pamwe
  `title · index.ts:97`
  →

- **N-21** — Nothing stops until you agree.
  `its body · index.ts:99`
  →

- **N-22** — {partner} would like to start again
  `title · index.ts:97`
  →

- **N-23** — Nothing changes until you agree.
  `its body · index.ts:100`
  →

- **N-24** — Pamwe is paused
  `title, the pause was agreed · index.ts:102`
  →

- **N-25** — Pages and reminders have stopped for you both.
  `its body · index.ts:104`
  →

- **N-26** — You are reading again
  `title, the restart was agreed · index.ts:102`
  →

- **N-27** — Today is back, and your streak picks up where it stopped.
  `its body · index.ts:105`
  →

- **N-28** — Not pausing for now / Not restarting for now
  `title, the ask was declined · index.ts:107`
  →

- **N-29** — Nothing has changed.
  `its body · index.ts:108`
  →

- **N-30** — That pause was withdrawn / That restart was withdrawn
  `title · index.ts:110`
  →

**When the lock screen is set to "Keep it private"** (`_shared/push.ts`)

- **N-31** — Pamwe
  `the title every push above is replaced with · push.ts:60`
  →

- **N-32** — Something is waiting for you.
  `the body every push above is replaced with · push.ts:60`
  →

### Scheduled on the phone

- **N-33** — Good morning, {me}
  `morning reminder title · lib/notifications.ts:544`
  →

- **N-34** — Good morning
  `that title when no name is known · lib/notifications.ts:544`
  →

- **N-35** — Let's read today's word.
  `its body · lib/notifications.ts:545`
  →

- **N-36** — Your week together is ready
  `Sunday 9am recap title · lib/notifications.ts:315`
  →

- **N-37** — Look back on what you read and prayed for.
  `its body · lib/notifications.ts:316`
  →

- **N-38** — Your prayers for the week
  `Sunday 6pm prayer review title · lib/notifications.ts:379`
  →

- **N-39** — Check which ones still need praying for.
  `its body · lib/notifications.ts:380`
  →

- **N-40** — Time to pray
  `per-prayer reminder title · lib/prayerReminders.ts:96`
  →

- **N-41** — (the prayer, trimmed to ~90 characters)
  `its body · lib/prayerReminders.ts:74, 97`
  →

### What the app says about a nudge that did not land

- **N-42** — You just sent a nudge. Give it a little while.
  `nudge cooldown · notify-nudge/index.ts:79`
  →

- **N-43** — They know. Give it a little while.
  `thinking-of-you cooldown · notify-thinking/index.ts:81`
  →

- **N-44** — The nudge didn't send. Try again in a moment.
  `nudge failure · lib/notifications.ts:476, 483, 487`
  →

- **N-45** — That didn't send. Try again in a moment.
  `thinking-of-you failure · lib/notifications.ts:497, 504, 508`
  →

- **N-46** — You're not paired with anyone yet.
  `either, with no partner · lib/notifications.ts:482, 503`
  →

- **N-47** — Sent
  `alert title when thinking-of-you was logged but no banner landed · components/ThinkingButton.tsx:33`
  →

- **N-48** — They have notifications off, so it won't buzz their phone.
  `that alert's body · components/ThinkingButton.tsx:33`
  →

- **N-49** — Already sent
  `alert title, thinking-of-you cooldown · components/ThinkingButton.tsx:37`
  →

- **N-50** — You just sent one.
  `its fallback body · components/ThinkingButton.tsx:37`
  →

- **N-51** — Couldn't send that
  `alert title · components/ThinkingButton.tsx:39`
  →

---

## A · Ask Pamwe

Plan generation. The rule behind all of it: **Pamwe points, never preaches.**
It does not interpret Scripture and does not settle doctrine.

### What it says when it will not answer

- **A-01** — Pamwe stays in its lane: Scripture, prayer, and the two of you. For that one, you'll want another guide.
  `the off-topic line. One fixed sentence, never the model's own words ·
  ask-pamwe/index.ts:60 · mirrored at lib/askPamwe.ts:134`
  →

- **A-02** — Tell Pamwe what you'd like to read about.
  `empty query · ask-pamwe/index.ts:554`
  →

- **A-03** — Keep it under {n} characters.
  `over-long query · ask-pamwe/index.ts:555`
  →

- **A-04** — Tell Pamwe a bit more about what you two are walking through.
  `the ask was too thin to build from · ask-pamwe/index.ts:688`
  →

- **A-05** — Pamwe couldn't gather enough for that one. Try saying it another way.
  `too few passages matched · ask-pamwe/index.ts:696`
  →

- **A-06** — That book is short enough to read in one sitting together. Ask for a theme to build a plan around it.
  `a named book with too few chapters · ask-pamwe/index.ts:672`
  →

- **A-07** — Pamwe couldn't shape that one. Try saying it a different way.
  `the answer came back unusable · lib/askPamwe.ts:242`
  →

### What it says when something is wrong

- **A-08** — Pamwe couldn't help with that one. Try another idea.
  `the model refused · ask-pamwe/index.ts:733, 764`
  →

- **A-09** — Pamwe put that one together wrong. Try asking again.
  `the answer failed validation · ask-pamwe/index.ts:617, 717`
  →

- **A-10** — Pamwe's answer came back garbled. Ask again soon.
  `unparseable response · ask-pamwe/index.ts:767`
  →

- **A-11** — Pamwe is resting for a moment. Ask again soon.
  `a transient model failure · ask-pamwe/index.ts:106`
  →

- **A-12** — Pamwe is resting for a moment. Try again in a bit.
  `the client's own version, for a timeout or a dead network · lib/askPamwe.ts:249`
  →

- **A-13** — Pamwe is resting for today. Ask again tomorrow.
  `daily rate limit, 20 a day · ask-pamwe/index.ts:575`
  →

- **A-14** — One question at a time. Give Pamwe a breath and try again.
  `the 10 second cooldown · ask-pamwe/index.ts:578`
  →

- **A-15** — Ask Pamwe isn't configured yet.
  `no API key on the server · ask-pamwe/index.ts:559, 590`
  →

- **A-16** — (the "account is out of credit" line)
  `the 503 shown when a key is dead or the balance is empty. Deliberately NOT
  "resting for a moment": that reads as weather, and this one stays broken until
  someone tops the account up. UNAVAILABLE_MESSAGE at ask-pamwe/index.ts:104`
  →

### The stock plans it falls back to in the by-book builder (`lib/askPamwe.ts`)

- **A-17** — Meet Jesus, together
  `title · askPamwe.ts:82`
  →

- **A-18** — The Gospel of John · 21 days
  `its meta line · askPamwe.ts:83`
  →

- **A-19** — Words for every weather
  `title · askPamwe.ts:94`
  →

- **A-20** — Psalms of comfort · 14 days
  `its meta line · askPamwe.ts:95`
  →

- **A-21** — Love, patience & grace · 7 days
  `the third plan's meta line · askPamwe.ts:110`
  →

- **A-22** — Where do you each need his grace this week?
  `a stock reflection prompt · askPamwe.ts:89`
  →

- **A-23** — What is one thing you want to remember together?
  `a stock reflection prompt · askPamwe.ts:90`
  →

- **A-24** — What is your soul carrying right now?
  `a stock reflection prompt · askPamwe.ts:103`
  →

- **A-25** — How can you be a comfort to each other today?
  `a stock reflection prompt · askPamwe.ts:104`
  →

- **A-26** — Where do you need to trust God together?
  `a stock reflection prompt · askPamwe.ts:105`
  →

- **A-27** — Where is love asking more of you this week?
  `a stock reflection prompt · askPamwe.ts:118`
  →

- **A-28** — What would it look like to be patient with each other today?
  `a stock reflection prompt · askPamwe.ts:119`
  →

- **A-29** — How has God been patient with you?
  `a stock reflection prompt · askPamwe.ts:120`
  →

### The system prompt (not shown to anyone, but it is the voice)

- **A-30** — You are Ask Pamwe, a gentle, quiet guide inside Pamwe, a devotional app where a Christian couple reads Scripture together, reflects individually, then reveals their reflections to each other. …
  `the whole brief, including "you point, you never preach" and the no-em-dash
  rule · ask-pamwe/index.ts:390-453. Worth reading in full and rewriting in your
  voice, since every generated day note comes out of it`
  →

---

## S · System & shared

- **S-01** — Today / Bible / Plans / Prayers / Reflect / You
  `the six tab labels · (tabs)/_layout.tsx:33, 42, 50, 59, 68, 78`
  →

- **S-02** — Back
  `the default back link everywhere · components/ui/BackLink.tsx:8`
  →

- **S-03** — Can't reach Pamwe
  `the auth gate, when the couple lookup fails · app/index.tsx:118`
  →

- **S-04** — Check your connection, then try again.
  `its body · app/index.tsx:120`
  →

- **S-05** — Try again
  `its button · app/index.tsx:124`
  →

- **S-06** — This screen stopped
  `the error boundary, the last thing anyone sees when a screen crashes ·
  components/RouteErrorBoundary.tsx:35`
  →

- **S-07** — Nothing you wrote is lost. Reflections save as you type, and everything else lives on the server.
  `its first paragraph · RouteErrorBoundary.tsx:37`
  →

- **S-08** — It has been reported. Try again, and if it keeps happening the line below is the part worth sending on.
  `its second paragraph · RouteErrorBoundary.tsx:40`
  →

- **S-09** — Unknown error
  `what shows when the error carries no message · RouteErrorBoundary.tsx:69`
  →

- **S-10** — Try again
  `its button · RouteErrorBoundary.tsx:51`
  →

- **S-11** — Couldn't load this recording. Try again in a moment.
  `audio player, the signed URL failed · components/AudioPlayer.tsx:92`
  →

- **S-12** — Couldn't load this recording. Tap play to try again.
  `audio player, the file failed to load · components/AudioPlayer.tsx:124`
  →

- **S-13** — Not authenticated
  `thrown by every lib function with no session. Should never reach a person, but
  it does surface in alert bodies if it ever does · lib/entries.ts:67 and ~12 others`
  →

- **S-14** — Not signed in
  `the same thing, worded differently · lib/planBuilder.ts:78`
  →

- **S-15** — Your words are saved. Try sending them again.
  `thrown when a text submit does not land · lib/entries.ts:138`
  →

- **S-16** — Your recording is still here. Try sending it again.
  `thrown when a voice submit does not land · lib/entries.ts:272`
  →

- **S-17** — Loading
  `the loading indicator's screen-reader label · components/ui/PamweLoading.tsx:32`
  →

- **S-18** — Close
  `every bottom sheet's close button, screen reader only · components/ui/BottomSheet.tsx:34`
  →

- **S-19** — Pamwe
  `the mark's screen-reader label · components/PamweBloom.tsx:71`
  →

**Mock notification card** (`components/NotificationPreview.tsx`, used in the
add-prayer screen)

- **S-20** — Pamwe
  `the app name on the mock banner · NotificationPreview.tsx:19`
  →

- **S-21** — now
  `its timestamp · NotificationPreview.tsx:20`
  →

---

## X · Widgets

### Home screen (`ios/VerseWidget/`)

- **X-01** — Verse of the Day
  `the widget's name in the iOS gallery · VerseWidget.swift:64`
  →

- **X-02** — One verse each morning, to carry into the day.
  `its description in the gallery · VerseWidget.swift:65`
  →

- **X-03** — VERSE OF THE DAY
  `the eyebrow on the widget itself · VerseWidgetView.swift:153`
  →

### Lock screen (`ios/VerseWidget/LockVerseWidget.swift`)

- **X-04** — Verse on the Lock Screen
  `its name in the gallery · LockVerseWidget.swift:18, 94`
  →

- **X-05** — One verse a day, under your clock.
  `its description · LockVerseWidget.swift:20, 95`
  →

- **X-06** — Clear background
  `the one configuration option · LockVerseWidget.swift:23`
  →

- **X-07** — In love 1 day
  `the counter, first day · LockVerseView.swift:70`
  →

- **X-08** — In love {n} days
  `the counter · LockVerseView.swift:70`
  →

### The verses themselves

The curated set lives in `scripts/gen_widget_verses.py` (`REFERENCES`) and is
fetched as real WEB text from bible-api.com. **The verses are Scripture, so they
are not up for rewriting** — but which verses are chosen is a copy decision.
Change the list in that script and re-run it.

---

## L · Legal

Two long documents. They are user-facing, but they are also the text Apple reads
at review, and `you/privacy.tsx` must stay in step with `docs/privacy-policy.md`,
which is published at the App Store listing's privacy URL. **A contradiction
between the two is a rejection.** Rewriting them is worth doing as one deliberate
pass rather than line by line, so they are listed here by section only.

### Privacy policy (`(tabs)/you/privacy.tsx` + `docs/privacy-policy.md`)

- **L-01** — Privacy policy · Last updated August 2, 2026
  `title and date · privacy.tsx:27-28`
  →

- **L-02** — Pamwe is a private devotional space for you and your partner… The short version: your reflections belong to the two of you, we don't sell or share your data, and there are no ads.
  `the opening paragraph, the one people actually read · privacy.tsx:30-35`
  →

- **L-03** — What Pamwe collects · Who can see your reflections · Notifications can show what your partner wrote · Plans you share or make public · Religious content · Services Pamwe relies on · What Pamwe does not do · How long we keep it · Deleting your data · Children · Changes to this policy · Contact
  `the twelve section headings · privacy.tsx:37-159`
  →

### Terms of service (`(tabs)/you/terms.tsx`)

- **L-04** — Terms of service · Last updated July 9, 2026
  `title and date · terms.tsx:24-25`
  →

- **L-05** — These terms are an agreement between you and Pamwe. By creating an account or using the app, you accept them. If you don't agree, please don't use Pamwe.
  `the opening paragraph · terms.tsx:27-30`
  →

- **L-06** — Who can use Pamwe · Your content · Our content · Ask Pamwe (AI suggestions) · Not professional advice · Acceptable use · Your account · Availability and changes · Limitation of liability · Ending your use · Changes to these terms · Contact
  `the twelve section headings · terms.tsx:32-118`
  →

---

## Not in this document

- **Scripture.** All of it, in every translation. Quoted source material.
- **The M'Cheyne plan's 365 days**, their pull quotes and their reflection
  prompts (`supabase/seed.sql`). They came from the consultant and the source
  text; CLAUDE.md says do not edit them silently.
- **The other three curated plans** (John 21, Psalms 30, Cord 21) and their
  browse metadata, seeded by `scripts/seed_*_plan.py`. Their taglines, about
  text, "what you'll explore" and "what you'll gain" lines ARE our voice and
  are worth a pass of their own; say the word and I will pull them out as a
  section N of this file.
- **The 1,189 chapter reflection prompts** in `passage_prompts`, generated once.
  Same: our voice, but a separate job.
- **App Store listing copy** (name, subtitle, description, keywords, what's
  new). That lives in [store-package.md](store-package.md).
- **Bible book names, translation names, category keys, dates and numbers.**







