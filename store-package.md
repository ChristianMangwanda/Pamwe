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

**The demo-couple path was removed 2026-08-11** (Christian's call; the leaked
`@review.pamwe.app` accounts and the password sign-in are gone). Mechanically
that means no credentials CAN be supplied: release builds have no password
field, his own account signs in by magic link or Apple ID, and neither works
from a reviewer's desk. **So the plan is a demo video**, recorded on the two
phones during the pause/leave pass (same evening, same setup). Guideline 2.1
prefers a demo account; video is the documented alternative when an account
cannot demonstrate the app alone. **If Apple rejects on 2.1, the fallback is a
fresh pre-paired review couple with a password path in b29, credentials only in
the ASC notes field, never in git.** That is a new decision for Christian at
that point, not a standing one.

Draft notes (fill the video link before submitting):

> Pamwe is a devotional app for exactly two people, a couple. Every feature is
> built around one pair of accounts: the couple reads the same passage, each
> writes a private reflection, and both reflections unlock only after both
> partners have submitted. There is no solo mode, no public content, no feed,
> and no way to see any writing except your one partner's. This is enforced by
> the database, not just the UI.
>
> Signing in alone (Sign in with Apple works immediately) shows onboarding and
> ends at the invite-code screen, because the app cannot go further without a
> second person. Since the core loop requires two paired humans, we have
> recorded a full walkthrough on two phones showing sign-in, pairing, the daily
> reading, both partners writing, the mutual reveal, prayers, and account
> deletion: [VIDEO LINK]
>
> Account deletion (guideline 5.1.1(v)) is in the app: You tab, Settings,
> Delete account. The app is free with no purchases, no ads, and no tracking.
> Notifications are optional and configurable in Settings.

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
- [ ] Record the two-phone demo video for the review notes (section 6) during
      the pause/leave verification pass. Same evening, same two phones.
- [ ] Fill nutrition labels from
      [docs/app-store-privacy-answers.md](docs/app-store-privacy-answers.md)
      (EIGHT types; section 4 here is superseded) + age rating (section 2).
- [ ] Paste description/promo/keywords (section 3) + URLs (section 1).
- [ ] Attach **build 30** (already uploaded 2026-08-15) to version 1.0.0 and
      submit with the section 6 notes. It was b28 until the catch-up round;
      b30 is b28 plus that work, and its database half is already live on
      hosted. No new archive unless the two-phone pass forces a fix; then it
      is b31 through the usual pipeline.
- [ ] **Ammy needs b30 installed** before the two-phone evening. The catch-up
      fix only exists client-side on b30, so testing it with her on b29 shows
      the old one-day-at-a-time wall and reads as a failure that is not one.
