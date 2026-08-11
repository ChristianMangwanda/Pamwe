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

⚠️ The old pamwe-site pages (christianmangwanda.github.io/pamwe-site/) are STALE
(July 16: no dreams, no verse notes, no widget). Take that site down or redirect
it before submitting, so two contradictory policies are not both live.
**[Christian]**

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

Data collection declaration (Collect → Yes):

| ASC category | Data | Linked to identity? | Tracking? | Purpose |
|---|---|---|---|---|
| Contact Info → Email Address | Sign-in email | Yes | No | App functionality |
| Contact Info → Name | Display name from Apple/Google or typed | Yes | No | App functionality |
| User Content → Audio Data | Voice reflections | Yes | No | App functionality |
| User Content → Other User Content | Written reflections, prayers, verse notes/highlights, custom plans | Yes | No | App functionality |
| Identifiers → User ID | Account UUID, Expo push token | Yes | No | App functionality |
| Diagnostics → Crash Data | Sentry crash reports | No | No | App functionality |

Everything else: not collected. **Tracking: No** (nothing is used for cross-app
tracking or advertising; no ATT prompt needed). No Usage Data category: there
are no analytics events.

Processors to keep in mind if Apple asks (matches the privacy page): Supabase
(storage), Anthropic (Ask Pamwe queries only, never journal content), Apple and
Google (auth), Expo and APNs (push delivery), bible-api.com and bible.helloao.org
(passage fetch, no user data), Sentry (crash data).

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

**The demo-couple path was removed 2026-08-11** (Christian's call: review runs
on his own account). The `@review.pamwe.app` password sign-in, the seed script
and the hosted Grace/Daniel accounts are all gone. When submitting, write the
review notes around whatever access Christian provides at that time; Apple's
guideline 2.1 still requires that a reviewer can reach the core loop, which
needs a paired couple, so the notes must say how the reviewer sees a reveal
(demo video, or credentials supplied then).

## 7. Anthropic spend alert (Ask Pamwe cost guard)

The server already rate-limits Ask Pamwe to 20 calls/day per user with a 10s
cooldown. Add a billing-level guard at https://console.anthropic.com:

1. Settings → Billing → **Spend limits**: set a monthly limit (suggest $25; at
   Haiku pricing that is thousands of Ask Pamwe calls).
2. Same page: add an **email alert** at 50% of the limit.
3. This needs your console login, so it can't be automated from here. Two
   minutes, one time.

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
- [ ] Fill nutrition labels (section 4) + age rating (section 2) in ASC.
- [ ] Paste description/promo/keywords (section 3) + URLs (section 1).
- [ ] Set the Anthropic spend limit (section 7).
- [ ] Then: production archive → upload → submit for review with the notes in
      section 6.
