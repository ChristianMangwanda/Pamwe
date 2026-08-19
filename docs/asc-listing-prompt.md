# App Store Connect listing prompt

Paste everything below the line into Claude on Chrome (or Claude for Work with
browser access), with App Store Connect open and signed in.

It is deliberately self-contained: a browser agent cannot read this repo, so
every value it needs is inline rather than referenced. If you change
[store-package.md](../store-package.md) or
[app-store-privacy-answers.md](app-store-privacy-answers.md), change this too.

**Two things it cannot do, which stay yours:**

1. **Upload the 14 screenshots.** They are local files in
   `Screenshots/appstore-1284x2778/` (already resized to an accepted size) and a browser agent cannot reach your filesystem.
2. **Submit.** The prompt tells it to stop before submitting, on purpose.

---

You are filling in an App Store Connect listing for an iOS app called Pamwe,
version 1.0.0. I will review everything before anything is submitted.

**Rules for this whole task:**

- **Do not click "Submit for Review" or "Add for Review" under any
  circumstances.** Fill fields, save, and stop. I submit myself.
- Do not invent, improve, shorten or rephrase any copy I give you. Paste it
  exactly as written, including line breaks and capitalisation. This copy is
  final and has been through several passes.
- **There must be no em dashes anywhere.** If you ever generate text yourself,
  use commas, colons or periods.
- If a field already has a value that differs from what I give you, stop and
  tell me rather than overwriting it.
- If a required field is not covered below, stop and ask me. Do not guess.
- Take a note of anything you could not complete and list it at the end.

## 1. App Information

- Name: `Pamwe`
- Subtitle: `Read the Bible as a couple`
- Primary category: **Lifestyle**
- Secondary category: **Reference**
- Copyright: `© 2026 Christian Mangwanda`

## 2. URLs

- Privacy Policy URL: `https://christianmangwanda.github.io/Pamwe/`
- Support URL: `https://christianmangwanda.github.io/Pamwe/support.html`
- Marketing URL: leave blank
- EULA: leave blank, so the standard Apple EULA applies

## 3. Version 1.0.0 information

**Promotional text:**

```
Read, reflect, and reveal. A daily Bible rhythm for the two of you, with your
words sealed until you have both shown up.
```

**Description** (paste exactly, blank lines and all):

```
Pamwe is a devotional space for two. You and your partner read the same passage,
reflect on it separately, and what you each wrote stays sealed until you have
both finished. Then it opens for the two of you at once. That is the whole point.

No feeds. No strangers. Just the two of you, showing up.

THE DAILY RHYTHM
Read together on a plan you choose: daily, every other day, or weekly. Write
your reflection or speak it as a voice note. When you have both shared, the
reveal opens and you read each other's words. Amen closes the day and your
streak grows like a tree.

READ THE WHOLE BIBLE
Six public-domain translations, including the World English Bible and the
Berean Standard Bible. Highlight verses and leave notes only your partner can
see.

PLANS FOR THE TWO OF YOU
Curated plans from a year through the whole Bible to 21 days in the Gospel of
John. Or build your own: tell Ask Pamwe what season you are in and it will
point you to a place to start. It points to Scripture, it never interprets it.

PRAY TOGETHER
Keep a shared list of prayers. Mark "I prayed today." Watch answers gather
over time.

KEPT WORDS
Every revealed reflection is saved for the two of you. Keep a line from your
partner's writing and it becomes part of your shared story.

Your reflections belong to the two of you. No ads, no selling data, no
analytics on what you write. Closer to God. Closer to each other.
```

**Keywords** (one field, comma separated, no spaces after commas):

```
couples,devotional,bible,marriage,prayer,journal,reading plan,scripture,together,christian
```

**Screenshots:** skip these. I upload them myself. Tell me when the rest is
done so I can do it.

## 4. Age rating questionnaire

Expected result is **4+**. Answer **None** or **No** to every content
question: violence of any kind, sexual content or nudity, profanity or crude
humour, horror or fear themes, alcohol, tobacco or drug use, mature or
suggestive themes, gambling, contests, and medical or treatment information.

Two that need care rather than a reflex answer:

- **Unrestricted web access: No.** The app has no browser. Its reader displays
  Bible chapters fetched from fixed endpoints and nothing else.
- **User-generated content that is shared publicly: No.** Everything a user
  writes is visible only to their one paired partner, and that is enforced by
  the database, not only the interface. There is no feed, no discovery, no
  public profile, and no way to reach a stranger's writing.

## 5. App Privacy

First the two top-level questions:

- "Do you or your third-party partners collect data from this app?" → **Yes**
- "Is any of this data used to track you?" → **No**

Because tracking is No everywhere, the app needs no App Tracking Transparency
prompt.

Declare exactly these **eight** data types. For every one of them the only
purpose to tick is **App Functionality**. Do not tick Analytics, Product
Personalization, Developer's Advertising or Marketing, or Third-Party
Advertising anywhere. Tracking is **No** for all eight.

| Data type | Linked to the user's identity |
|---|---|
| Contact Info → Email Address | Yes |
| Contact Info → Name | Yes |
| Sensitive Info → Sensitive Info | Yes |
| User Content → Audio Data | Yes |
| User Content → Other User Content | Yes |
| Identifiers → User ID | Yes |
| Identifiers → Device ID | Yes |
| Diagnostics → Crash Data | **No** |

Crash Data is the only one that is **not** linked to identity. That is
deliberate and verified in the code, so do not "correct" it to Yes.

**Everything else is Not Collected**, including: phone number, physical
address, other contact info, health and fitness, financial info, location,
contacts, photos or videos, emails or text messages, gameplay content,
customer support, browsing history, search history, purchases, product
interaction, advertising data, other usage data, performance data, other
diagnostic data, surroundings, body, and any other data types.

This label has to match the privacy policy at the URL above, so do not add or
drop a type to make a form easier to finish. If App Store Connect will not
accept one of these answers, stop and tell me exactly which and why.

## 6. Review notes and demo account

There IS a demo account now. **Stop and ask me for the password** before you
fill anything in this section, and never guess or invent one.

Fill the "Sign-In Required" section: tick that a sign-in is required, and enter
the user name `grace@appreview.pamwe.app` with the password I give you.

Then paste this into the App Review Notes field:

```
Pamwe is a devotional app for exactly two people, a couple. Every feature is
built around one pair of accounts: the couple reads the same passage, each
writes a private reflection, and both reflections unlock only after both
partners have submitted. There is no solo mode, no public content, no feed,
and no way to see any writing except your one partner's. This is enforced by
the database, not just the UI.

DEMO ACCOUNT
Email: grace@appreview.pamwe.app
Password: (in the credentials fields above)

This account is one half of a couple that is already paired, so you can see
the whole app without a second device. Enter the email on the sign-in screen
and a password field will appear.

TO SEE THE CORE FEATURE
Open the Today tab and write a short reflection for Day 6. Her partner has
already submitted his, so as soon as you submit yours, both unlock and you
will see his writing. Before you submit, his words are not readable by this
account at all.

Account deletion (guideline 5.1.1(v)) is in the app: You tab, Settings,
Delete account. Please do not delete the demo account itself, as it is shared
with other reviews. The app is free with no purchases, no ads, and no
tracking. Notifications are optional and configurable in Settings.
```

## 7. Pricing and availability

- Price: **Free**, no in-app purchases.
- Availability: all territories.
- **Release: set it to release manually**, not automatically on approval. I
  want to choose the moment it goes live.

## 8. Build

Do **not** attach a build. I will pick the build myself.

---

When you are done: save everything, then give me a list of what you filled in,
what you skipped, and anything App Store Connect rejected or questioned. Do
not submit.
