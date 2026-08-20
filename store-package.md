# Pamwe — App Store submission package

Drafted 2026-07-16. Everything section C of [launch-checklist.md](launch-checklist.md) needs,
ready to paste into App Store Connect. Where a value is a judgment call it's marked
**[Christian]**.

---

## 1. URLs (live)

| Field | Value |
|---|---|
| Privacy Policy URL | https://christianmangwanda.github.io/Pamwe/ |
| Support URL | https://christianmangwanda.github.io/Pamwe/support.html |
| Terms of Service (EULA) | leave blank (standard Apple EULA; the in-app Terms screen remains) |

Source: THIS repo's GitHub Pages. `docs/privacy-policy.md` and `docs/support.md`
are rendered by `.github/workflows/pages.yml` on every push to main, and the
placeholder check refuses to publish an unfinished policy. This is the policy
that names dreams, verse notes, the widget and the anniversary, so it is the
one that matches the nutrition labels.

~~⚠️ The old pamwe-site pages are STALE~~ **RESOLVED 2026-08-12:** all three
pamwe-site pages (index, privacy, terms) now serve zero-delay redirects to the
canonical site above, with `rel=canonical` set. Old links keep working, and only
one policy is live. The old content stays in that repo's git history.

## 2. App information

| Field | Value |
|---|---|
| Name | Pamwe |
| Subtitle (30 chars max) | Read the Bible as a couple |
| Primary category | Lifestyle |
| Secondary category | Reference |
| Age rating | Expect **4+**. Questionnaire: answer None/No to every content item (violence, sexual content, profanity, horror, gambling, contests, drugs). No unrestricted web access (the reader shows only fetched Bible chapters). No public user-generated content: everything a user writes is visible only to their one paired partner, enforced server-side. |
| Copyright | © 2026 Christian Mangwanda |

## 3. Description

> Pamwe is a devotional space for two. You and your partner read the same passage,
> reflect on it separately, and what you each wrote stays sealed until you have
> both finished. Then it opens for the two of you at once. That is the whole point.
>
> No feeds. No strangers. Just the two of you, showing up.
>
> THE DAILY RHYTHM
> Read together on a plan you choose: daily, every other day, or weekly. Write
> your reflection or speak it as a voice note. When you have both shared, the
> reveal opens and you read each other's words. Amen closes the day and your
> streak grows like a tree.
>
> READ THE WHOLE BIBLE
> Six public-domain translations, including the World English Bible and the
> Berean Standard Bible. Highlight verses and leave notes only your partner can
> see.
>
> PLANS FOR THE TWO OF YOU
> Curated plans from a year through the whole Bible to 21 days in the Gospel of
> John. Or build your own: tell Ask Pamwe what season you are in and it will
> point you to a place to start. It points to Scripture, it never interprets it.
>
> PRAY TOGETHER
> Keep a shared list of prayers. Mark "I prayed today." Watch answers gather
> over time.
>
> KEPT WORDS
> Every revealed reflection is saved for the two of you. Keep a line from your
> partner's writing and it becomes part of your shared story.
>
> Your reflections belong to the two of you. No ads, no selling data, no
> analytics on what you write. Closer to God. Closer to each other.

**Promotional text** (170 chars, editable without review):

> Read, reflect, and reveal. A daily Bible rhythm for the two of you, with your
> words sealed until you have both shown up.

**Keywords** (90/100 chars):

```
couples,devotional,bible,marriage,prayer,journal,reading plan,scripture,together,christian
```

("Pamwe" and the app name are indexed automatically; don't repeat them.)

## 4. Privacy nutrition labels

**This section is superseded. The authoritative answers live in
[docs/app-store-privacy-answers.md](docs/app-store-privacy-answers.md)
(2 August audit), which declares EIGHT types, not the six drafted here, and is
what `ios/Pamwe/PrivacyInfo.xcprivacy` in the shipped binary mirrors.** Filling
ASC from this older table would contradict the binary's privacy manifest, which
is a rejection. The two additions the audit made:

- **Sensitive Info** (religious beliefs; the entire content layer)
- **Device ID** (the Expo push token, split out from User ID)

Answer the questionnaire from that doc, top to bottom. Its "Not Collected" table
and the two flagged judgment calls are part of the answers.

## 5. Screenshots — 6.9" set (required)

Device: iPhone 16 Pro Max class, **1320 × 2868 px** portrait. Capture on your
phone (best) or a 6.9" simulator against local Supabase (the dev seed couple
works). Light mode for the main set; a couple of dark variants if time allows.

Shot list, in store order (the story: ritual → reveal → depth):

1. **Today** — tree streak, Day N, anchor verse, both avatars done. The hero shot.
2. **Reveal** — "What you each wrote," both cards open. This is the product.
3. **Reading** — a passage mid-scroll, warm serif reader.
4. **Bible reader** — highlights + a note visible, translation picker showing.
5. **Plans** — the browse grid with the four curated plans + Ask Pamwe card.
6. **Prayers** — the shared list with categories and an answered prayer.

Do not show real reflections from you and Ammy; screenshots need seeded or
de-identified content, since every visible word ships to the store page.

## 6. App Review notes (paste into the Notes field)

**A demo couple exists again as of 2026-08-19** (Christian's call, on submit
day), replacing the demo-video plan. The 2026-08-11 removal stands as to WHY
the old one went: `@review.pamwe.app` credentials were committed to a public
repo. The rule that replaced it is not "no demo account", it is **credentials
live in the App Store Connect notes field and nowhere in git**. Nothing below
carries the password, deliberately.

**How it works.** Grace and Daniel are two real accounts, really paired, on the
hosted project. Nothing is bypassed and no policy was loosened: the reviewer is
one half of an ordinary couple. Signing in as Grace shows a plan six days in,
five days of reflections with both partners' words already revealed, prayers,
dreams, a three year anniversary and a Grove with a planted fig.

**The part that demonstrates the core mechanic.** Day 6 is seeded with Daniel
already submitted and Grace not. So the reviewer writes one reflection, and the
locked reveal opens on the spot, with Daniel's words appearing. They experience
the whole point of the app alone, on one device. Verified against the live
database: before Grace submits, Daniel's day 6 row is not readable by her at
all, which is the RLS doing it rather than the interface.

**Password sign-in in the release build** is limited to addresses on the review
domain. A field appears for those and for nothing else, so no general password
path is open to real users.

Draft notes:

> Pamwe is a devotional app for exactly two people, a couple. Every feature is
> built around one pair of accounts: the couple reads the same passage, each
> writes a private reflection, and both reflections unlock only after both
> partners have submitted. There is no solo mode, no public content, no feed,
> and no way to see any writing except your one partner's. This is enforced by
> the database, not just the UI.
>
> DEMO ACCOUNT
> Email: grace@appreview.pamwe.app
> Password: (in the credentials fields above)
>
> This account is one half of a couple that is already paired, so you can see
> the whole app without a second device. Enter the email on the sign-in screen
> and a password field will appear.
>
> TO SEE THE CORE FEATURE
> Open the Today tab and write a short reflection for Day 6. Her partner has
> already submitted his, so as soon as you submit yours, both unlock and you
> will see his writing. Before you submit, his words are not readable by this
> account at all.
>
> Account deletion (guideline 5.1.1(v)) is in the app: You tab, Settings,
> Delete account. Please do not delete the demo account itself, as it is shared
> with other reviews. The app is free with no purchases, no ads, and no
> tracking. Notifications are optional and configurable in Settings.

## 6b. Standing App Review information (added 2026-08-20, per Apple's request)

Apple's 2.1 Information Needed reply (2026-08-20) asked that the following live
in the Notes field of every future submission. The full reply that answered it,
including the recording script, is [docs/app-review-reply.md](docs/app-review-reply.md).

- **Devices tested**: iPhone 17 Pro Max and iPhone 16 Pro, physical devices on
  iOS 26, via TestFlight (32 builds since 2026-07-10).
- **External services**: Supabase (database, auth, storage, functions), Sign in
  with Apple, Google Sign-In, Expo push + APNs, Sentry (no personal content),
  OpenAI and Anthropic (only the sentence a user types when asking for a plan;
  references come from the app's own catalogue, never model generation),
  bible-api.com and bible.helloao.org (public domain Bible text). All disclosed
  in the privacy policy.
- **Regional differences**: none; identical in all territories.
- **Regulated industry / protected material**: none; all six translations are
  public domain (WEB, KJV, ASV, BBE, Darby, and BSB, public domain since
  2023-04-30, "licensing is not required for any use"); the M'Cheyne plan is
  from 1842.
- **UGC**: visible only to the one paired partner, enforced server-side; no
  strangers, feed, or discovery, so no reporting surface; the safety mechanisms
  are pause/leave and in-app account deletion.
- **Second demo account**: jordan@appreview.pamwe.app (created 2026-08-20 to
  demonstrate pairing in the review recording; same password as Grace, held in
  ASC only, never in git).

**Fill the ASC "Sign-in required" fields** with the email above and the password
Christian holds. Do not paste the password into this file.

## 7. Model spend guard — DONE, superseded

Resolved 2026-08-11: **OpenAI auto-recharge is set** (the default provider for
plan builds; the spend-alert story lives there now). Anthropic is parked with
no credits by decision; the by-book builder falls back to its stock
recommendations, which is the accepted state. The server-side limit (20/day
per user, 10s cooldown) is live. Nothing left to do here.

## 8. Submission checklist (what remains after this doc)

- [x] ~~Review demo accounts~~ removed entirely 2026-08-11 (see section 6).
- [x] Screenshots captured AND de-identified 2026-08-11. **Upload the set in
      `Screenshots/appstore/`** (14 shots, 1320x2868): the real couple is
      replaced by a fictional "Caleb & Abby" (same C/A initials, so the avatars
      needed no edits) and the four real journal excerpts on the Reflections
      shot are display copy, patched with the app's own bundled fonts by
      `scripts/deidentify_screenshots.py`. The originals in `Screenshots/`
      still hold real content; the whole folder is gitignored (public repo)
      and only the `appstore/` set may leave the machine.
- [x] Stale pamwe-site policies redirected to the canonical site (2026-08-12).
- [x] ~~Anthropic spend limit~~ superseded: OpenAI auto-recharge set 2026-08-11
      (section 7).
- [x] ~~Record the two-phone demo video~~ **Superseded 2026-08-19**: a real
      pre-paired demo couple replaced it (section 6). No video needed.
- [ ] Fill nutrition labels from
      [docs/app-store-privacy-answers.md](docs/app-store-privacy-answers.md)
      (EIGHT types; section 4 here is superseded) + age rating (section 2).
- [ ] Paste description/promo/keywords (section 3) + URLs (section 1).
- [ ] Attach **build 32** (uploaded 2026-08-19) to version 1.0.0 and
      submit with the section 6 notes. It was b28 until the catch-up round;
      b30 is b28 plus that work, and its database half is already live on
      hosted. No new archive unless the two-phone pass forces a fix; then it
      is b31 through the usual pipeline.
- [ ] **Ammy needs b30 installed** before the two-phone evening. The catch-up
      fix only exists client-side on b30, so testing it with her on b29 shows
      the old one-day-at-a-time wall and reads as a failure that is not one.
