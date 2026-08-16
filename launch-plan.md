# Pamwe 1.0 — App Store launch plan

**Deadline: LIVE on the App Store by Monday, August 24, 2026.**
**Submit for review: Wednesday, August 19.** Set 2026-08-12 (Christian + Claude).

The gap between "on TestFlight for two people" and "live for strangers" is
small and known. Screenshots are captured and de-identified, the backlog is
closed, and what remains is one evening of two-phone verification, one day of
listing and infrastructure work, and Apple's clock. The Aug 24 date buys a full
buffer for one rejection round, which past processing rejections say is worth
having.

**Updated 2026-08-15: the launch build is b30, not b28**, and hosted is at 71
migrations rather than 67. Catching up was broken once someone fell more than
one day behind: they could write one reflection and then had to wait for their
partner, who might be behind too. b30 fixes it, the database half is already
applied to hosted, and b30 is uploaded. The round is written up in progress.md.
It has not been on a phone yet, so **b30 is a candidate, not yet the build**.

**Domain decision (2026-08-12): launch WITHOUT one.** Apple accepts any public
URL for the privacy policy, so it lives on GitHub Pages. The only thing a
domain genuinely gates is custom-SMTP magic-link email (Resend must verify a
domain you own); Sign in with Apple is live and carries strangers, so magic
link stays the limited secondary path until real users justify the purchase.
This is the free-tier rule applied to launch. Revisit alongside universal
links when there are users.

---

## Schedule

### Now → Sun Aug 16 — verification week

- [x] ~~**b28 on both phones** (TestFlight). Then resolve PAMWE-IOS-6.~~
      **Done differently, 2026-08-15.** Neither phone landed on b28: Christian
      is on b30 and Ammy on b29, and `3432d39` is an ancestor of both, so the
      channel fix is running on both phones, which is what the condition meant.
      PAMWE-IOS-6 **resolved**; nothing has fired since 2026-08-11 on b27.
- [ ] **Get Ammy onto b30.** New 2026-08-15 and it now gates the item below.
      b30 fixes catching up (see progress.md), but the client half only works
      on b30: on b29 her catch-up screen still offers one day at a time, so a
      two-phone catch-up test with her on b29 shows the OLD wall and reads as
      the fix having failed. Her build is otherwise safe against the migrated
      database, it is just half the feature. The server half (one push per
      run, out-of-order completion) already reaches her.
- [ ] **The two-phone pause/leave pass with Ammy.** The one item progress.md
      calls "the whole remaining risk": ask on one phone, accept on the other,
      withdraw, leave, and check the farewell note appears exactly once. Needs
      Ammy, so schedule the evening first and let everything else fit around it.
      **Same evening: record the App Review demo video** (two phones, full
      loop: sign-in, pairing, reading, both writing, the reveal, prayers,
      account deletion). The review-notes draft in store-package.md section 6
      needs the link.
- [x] ~~Privacy policy + support page on GitHub Pages.~~ **Already live**
      (verified 2026-08-12): the policy is the site root at
      https://christianmangwanda.github.io/Pamwe/ and support at /support.html,
      published by `.github/workflows/pages.yml`, current at 2 August with no
      placeholders. The STALE duplicate at /pamwe-site/ now redirects there
      (all three pages, fixed 2026-08-12).

### Mon Aug 17 – Tue Aug 18 — the listing

Everything to paste lives in [store-package.md](store-package.md), updated
2026-08-12. The ASC session is data entry, not writing:

- [ ] Metadata from store-package.md sections 1–3: name, subtitle, categories,
      description, promo text, keywords, URLs.
- [ ] Upload the de-identified screenshot set (`Screenshots/appstore/`, 14
      shots).
- [ ] **App Privacy questionnaire from
      [docs/app-store-privacy-answers.md](docs/app-store-privacy-answers.md)**,
      top to bottom: eight types, App Functionality only, tracking No. It
      matches `PrivacyInfo.xcprivacy` in the b28 binary; a mismatch is a
      rejection. (store-package.md's own older six-type table is superseded and
      marked as such.)
- [ ] Age rating questionnaire (expect 4+; answers in store-package.md § 2).
- [ ] Review notes from store-package.md section 6, with the demo-video link
      filled in. **The one open decision:** the notes lean on a video because
      no credentials can exist (no password path in release builds). If Apple
      rejects on guideline 2.1, the fallback is a fresh pre-paired review
      couple with a password path in b29; that call is Christian's, made only
      if the rejection happens.
- [x] ~~Sanity check the welcome screen~~ **Checked 2026-08-12, already
      correct**: sign-in leads with "Continue with Apple" (primary), Google
      secondary, magic-link email behind a ghost "Use an email address"
      toggle. No change, so this forces no b29.

### Wed Aug 19 — submit

- [ ] If the two-phone pass found nothing, **build 30 is the launch build**
      (updated 2026-08-15; it was b28 before the catch-up round), already
      uploaded: attach it to the 1.0.0 version and submit. No new archive
      unless the pass forced a fix (then it's b31 through the usual pipeline:
      `restore_ios_patches.rb --check` first, bump all 4
      CURRENT_PROJECT_VERSION spots, grep the bundle for the hosted ref).

### Aug 20–23 — Apple review + buffer

- [ ] Review typically clears in 1–2 days. The buffer absorbs one rejection
      round (metadata or privacy-questionnaire nits are the likely class).
      Answer rejections same-day.

### Mon Aug 24 — live

- [ ] Release (manual release toggle, so it goes live when tapped, not
      mid-fix).
- [ ] Confirm Sentry is quiet on the release build; watch the first
      real-user signups against the magic-link limits.

---

## Out of scope for 1.0, by decision

Android (iOS-only until demand), the domain + Resend SMTP + universal links
(until real users), the 7th Grove rung (until a couple nears the redwood),
paid Supabase tier (keepalive workflow covers pausing), Anthropic credits
(OpenAI is the provider; auto-recharge is set).
