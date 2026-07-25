# Pamwe — App Store submission package

Drafted 2026-07-16. Everything section C of [launch-checklist.md](launch-checklist.md) needs,
ready to paste into App Store Connect. Where a value is a judgment call it's marked
**[Christian]**.

---

## 1. URLs (live)

| Field | Value |
|---|---|
| Privacy Policy URL | https://christianmangwanda.github.io/pamwe-site/privacy.html |
| Support URL | https://christianmangwanda.github.io/pamwe-site/ |
| Terms of Service (EULA) | https://christianmangwanda.github.io/pamwe-site/terms.html (optional field; standard Apple EULA also fine) |

Source repo: https://github.com/ChristianMangwanda/pamwe-site (public, GitHub Pages
from `main`). To edit: change the HTML, push to main, live in about a minute.
The web privacy/terms copy mirrors the in-app screens, with two updates: the
Anthropic paragraph now covers the help sheet as well as the builder, and the
Bible sources mention bible.helloao.org (BSB). **[Christian: if you want different
Anthropic wording, edit both the site and `you/privacy.tsx` together.]**

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
phone (best) or a 6.9" simulator against local Supabase seeded with the review
couple (`scripts/seed_review_accounts.sql` content works locally too). Light
mode for the main set; a couple of dark variants if time allows.

Shot list, in store order (the story: ritual → reveal → depth):

1. **Today** — tree streak, Day N, anchor verse, both avatars done. The hero shot.
2. **Reveal** — "What you each wrote," both cards open. This is the product.
3. **Reading** — a passage mid-scroll, warm serif reader.
4. **Bible reader** — highlights + a note visible, translation picker showing.
5. **Plans** — the browse grid with the four curated plans + Ask Pamwe card.
6. **Prayers** — the shared list with categories and an answered prayer.

Do not show real reflections from you and Ammy; sign in as the demo couple
(Grace and Daniel) so every visible word is seeded content written for display.

## 6. App Review notes (paste into the Notes field)

> Pamwe is built for two partners who pair with an invite code, so a normal solo
> sign-up cannot reach the core loop. A pre-paired demo couple is set up for review:
>
> Email: grace@review.pamwe.app
> Password: Pamwe-Review-2026
>
> On the sign-in screen, type the email and a password field appears (this
> domain signs in with a password instead of an email magic link). You will land
> on the Today tab as Grace, three days into the Gospel of John plan with her
> partner Daniel.
>
> To see the core mechanic: tap the reading for the current day, then Reflect,
> write anything, and share it. Daniel's reflection for the day is already
> submitted, so your submission unseals both and shows the reveal. The Reflect
> tab holds two earlier revealed days. The Bible, Plans, and Prayers tabs are
> fully browsable. Account deletion is under You → Delete account.
>
> A second reviewer account (daniel@review.pamwe.app, same password) is the
> partner side of the same couple if you need to see both ends.

## 7. Anthropic spend alert (Ask Pamwe cost guard)

The server already rate-limits Ask Pamwe to 20 calls/day per user with a 10s
cooldown. Add a billing-level guard at https://console.anthropic.com:

1. Settings → Billing → **Spend limits**: set a monthly limit (suggest $25; at
   Haiku pricing that is thousands of Ask Pamwe calls).
2. Same page: add an **email alert** at 50% of the limit.
3. This needs your console login, so it can't be automated from here. Two
   minutes, one time.

## 8. Submission checklist (what remains after this doc)

- [ ] Run `scripts/seed_review_accounts.sql` on hosted (via Supabase MCP when
      it's authorized; AFTER the b14 migrations go up).
- [ ] Verify the reviewer sign-in on TestFlight: type grace@review.pamwe.app,
      password field appears, sign-in lands on Today.
- [ ] Capture the 6 screenshots (section 5).
- [ ] Fill nutrition labels (section 4) + age rating (section 2) in ASC.
- [ ] Paste description/promo/keywords (section 3) + URLs (section 1).
- [ ] Set the Anthropic spend limit (section 7).
- [ ] Then: production archive → upload → submit for review with the notes in
      section 6.
