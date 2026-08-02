# Pamwe Privacy Policy

**Last updated: 2 August 2026**

Pamwe is a private devotional space for two people. You read Scripture together, write your own reflection, and only see each other's reflection after you have both written yours.

This policy explains what the app collects, where it goes, who can see it, and how to erase it. It describes the app as it actually works, not what an app like this might do.

The short version. Your reflections belong to the two of you. We do not sell your data, we do not show ads, and there is no analytics tracking of what you write. There is one thing worth reading carefully, and it is the section on notifications, because some of what your partner writes can appear on your lock screen.

**Who is responsible for your data:** Christian Mangwanda. Under UK and EU data protection law, we are the data controller.

---

## What Pamwe collects

### Your account

- Your email address.
- Your display name and the single initial shown as your avatar.
- If you sign in with Apple or Google, the name and email address that service shares with us. Apple lets you hide your real address and use a private relay address instead. Pamwe works fine if you do.

Pamwe offers three ways to sign in: an emailed magic link, Sign in with Apple, and Sign in with Google. You choose. We never see your Apple or Google password.

### Your couple

- The invite code that links the two of you, and the date you paired.
- Your reading streak and how many grace days you have used.
- Your time zone. This is read from your phone once, when your couple is created, so the app knows when a day rolls over. There is no setting to change it.
- Your anniversary, if you set one. This is the date you count from, and it is what the Lock Screen widget uses to show how many days you have been together.

### What the two of you write

This is the heart of the app, and it is the most personal thing we hold.

- **Written reflections.** What you write in response to each day's reading.
- **Voice reflections.** The audio recording itself, and how long it is.
- **Transcripts of voice reflections.** Your phone turns your recording into text on the device itself. The audio is not sent anywhere to be transcribed. The finished text is then stored with your reflection so it can be read and searched later.
- **Responses to your partner's reflection.** Hearts, amens, written replies, and lines of theirs you chose to keep.
- **Prayers**, their category, whether they have been answered, and any note you wrote when you marked one answered.
- **"I prayed today" marks**, so your partner can see you prayed.
- **Dreams** you record in the dream journal. Pamwe stores dreams and never interprets them.
- **Verse highlights**, meaning which verses you coloured and in what colour.
- **Verse notes**, meaning notes you wrote against a specific verse.
- **Reading plans you build**, including the title, description and daily readings.

### Your device

- A push notification token, if you allow notifications. This identifies your phone to Apple's notification service so we can deliver a message to it.
- Your notification preferences, including the time you want your morning reminder.

### What Pamwe does not collect

No location. No contacts. No photos. No advertising identifier. No health or fitness data. No payment details, because Pamwe is free and has no purchases of any kind.

Pamwe's App Store listing mentions photo library access. This is a technical requirement caused by a component the app includes, and the app never asks for or reads your photos.

---

## What your partner can see, and what they cannot

Pamwe is built around one rule: your reflection stays sealed until you have both written yours for the same day. Then both reflections open at once, for both of you.

This rule lives in the database itself, not just in the app's screens. Your partner's reflection is not sent to your phone and hidden. It is not sent at all until the moment you have both submitted. The same rule governs voice recordings, which are held in private storage that applies the same check.

**Your partner can see, once a day is open:** your written reflection, your voice recording, its transcript, and any responses you leave on theirs.

**Your partner can always see:** prayers you add, your "I prayed today" marks, dreams you record, verses you highlight, notes you write on verses, and plans you build. These are shared the moment you save them. They are not held back until anything is unlocked.

**Nobody else can see any of it.** Not other couples, not other users of the app.

If your partner deletes their account, everything they wrote is deleted with them, and you keep everything you wrote.

---

## Religious and devotional content

Almost everything you write in Pamwe reveals your religious beliefs. Under UK and EU data protection law, that makes it a special category of personal data with extra protection. This applies to your reflections, your prayers, your dreams, your verse notes, and the plans you build.

Prayers and dreams often carry more than belief. People pray about illness, family trouble, money, grief, fertility, and their relationship. They often name other people who never signed up for Pamwe. We treat all of it as sensitive.

**Our legal basis for holding it is your explicit consent**, given when you create an account and write in the app. You can withdraw that consent at any time by deleting your account, which erases the content. Withdrawing does not undo the past, but it does end our holding of it going forward.

For your account details and the mechanics of the app working, our legal basis is that we need them to provide the service you asked for.

We do not use your religious content to profile you, target you, recommend anything to you, or train any AI model.

---

## Notifications can show what your partner wrote

Please read this one properly, because it is easy to assume otherwise.

Pamwe sends push notifications to tell you your partner has done something. Some of those notifications include the words they wrote:

- **A new prayer** shows the first 80 characters of the prayer in the notification.
- **A reply to your reflection** shows your partner's name and the first 80 characters of their reply.
- **A verse note** shows your partner's name and which verse they marked.

These appear wherever your phone shows notifications, which usually means your lock screen, and they can be visible to anyone holding your phone. To deliver them, the text passes through Expo's push service and Apple's notification service.

Two notifications deliberately say nothing about content: the one telling you your partner has written their reflection, and the one telling you both reflections are ready. Those never quote what was written, because the whole point of the app is that you read them together.

You can turn any of these off in the app, under You, then Settings. Turning them off stops us sending them.

Your morning reminder is scheduled by your phone. It does not travel over the internet at all.

---

## Plans you share, and plans you make public

If you build your own reading plan, it starts private to the two of you. Two separate actions can change that, and both are yours to take:

- **Sharing.** When you share a plan, the app creates a link. Anyone who has that link can open the plan and see it, including its title and description. Links can be forwarded, so treat a shared plan as something that could reach anyone.
- **Making it public.** This is a second, separate step. A public plan is listed in Browse inside the app, where every Pamwe user can find it, open it, and use it.

Neither happens on its own. Popularity does not make a plan public. Only you can.

Your reflections, prayers, dreams and notes are never part of a shared or public plan. What travels is the plan itself: the title, the description, and the daily readings.

---

## Who else handles your data

We use a small number of services to run the app. They act on our instructions and are not allowed to use your data for their own purposes.

| Service | What it receives | Why |
|---|---|---|
| **Supabase** | Everything stored: your account, all your written and voice content, and your notification settings. | Hosts the database, sign-in, file storage, and server code. This is where Pamwe lives. |
| **Apple** | Your sign-in, if you use Sign in with Apple. Your push notifications, including the ones that quote text. | Signing in, and delivering notifications to your iPhone. |
| **Google** | Your sign-in, only if you choose Sign in with Google. | Signing in. If you never use it, Google receives nothing. |
| **Expo** | Your device's push token, and the content of notifications as they pass through. | Delivering push notifications. |
| **Sentry** | Technical crash reports: the error, the app version, the device model and operating system. | Finding and fixing crashes. Configured not to send personal information. It does not receive your reflections, prayers, dreams or notes. |
| **OpenAI** | Only the sentence you type into the Plans search when you ask for a plan to be built, for example "a plan about being patient with each other". | Turning what you asked for into a reading plan. |
| **Anthropic** | Only the words you type when asking for plan suggestions by book, in the plan builder. | Suggesting which plans might suit. |
| **bible-api.com** and **bible.helloao.org** | Which passage of the Bible is being loaded. Nothing that identifies you or your account. Like any website, they can see your device's IP address. | Fetching the text of the Bible. |

**Your reflections, prayers, dreams, verse notes and responses are never sent to OpenAI or Anthropic.** The only thing that reaches them is the request you type when you deliberately ask for a plan. Neither is permitted to train models on it.

We keep a simple count of how many plan requests you have made each day, to stop the feature being overused, and a record of when you last nudged your partner, to limit nudges to one an hour. Neither holds anything you wrote.

---

## Where your data is stored

Your data is stored in the United States, on Supabase's infrastructure.

If you are in the UK or the EEA, this means your data is transferred outside your home region. That transfer relies on the European Commission's Standard Contractual Clauses, which Supabase has in place, plus the UK Addendum where UK law applies.

Your data is encrypted while travelling to and from your phone, and encrypted while stored.

---

## What is kept on your phone

Some things stay on your device and are not sent anywhere:

- Your signed-in session, so you do not have to sign in every time.
- A cached copy of recent prayers, reflections, plans and stats, so screens load instantly and work briefly without signal.
- Your reading preferences, such as text size and which translation you prefer.
- Your anniversary date, shared with the Pamwe widget so it can show how many days you have been together.

All of this is removed when you delete the app.

---

## How long we keep your data

We keep your content for as long as your account exists. That is deliberate. The point of Pamwe is that your shared history is still there in a year, and going back to what you both wrote is one of the things the app is for. There is no automatic deletion after a period of inactivity.

When you delete your account, deletion happens straight away. It is not a scheduled job and there is no waiting period.

Backups held by Supabase may keep copies for a short period after deletion before they age out. Crash reports held by Sentry are kept to their standard retention period and contain no personal content.

---

## Deleting your account

You can delete your account inside the app at any time: **You, then Settings, then Delete account.** You do not need to email anyone or ask permission.

Deleting your account permanently removes:

- Your written reflections, and your voice recordings and their transcripts.
- Prayers you wrote, and your "I prayed today" marks.
- Dreams you recorded.
- Verse highlights and verse notes you made.
- Your responses to your partner's reflections.
- Your account details, your push token and your settings.

**This cannot be undone.** There is no recovery and no grace period.

What happens to your partner. They keep their own account and everything they wrote. They are unpaired, given a fresh invite code, and told you have left. Their reflections, prayers and dreams are untouched. A reading plan the two of you built together stays with them, because they may still be reading it, but your name is removed from it.

---

## Your rights

If you are in the UK or the EEA, you have the right to see the data we hold about you, correct it, delete it, get a copy of it in a portable form, object to how we use it, and withdraw your consent.

Deleting your account inside the app does the deletion immediately, which is faster than asking us. For anything else, email christianmangwanda@gmail.com and we will respond within one month.

If you think we have handled your data badly, you can complain to your data protection regulator. In the UK that is the Information Commissioner's Office at ico.org.uk.

If you are in California, we do not sell or share your personal information, and we never have.

---

## Children

Pamwe is made for adults in a relationship. It is not directed at children.

You must be at least 13 to use Pamwe.

We do not knowingly collect data from anyone under 13. If you believe a child has an account, email christianmangwanda@gmail.com and we will delete it.

---

## What Pamwe does not do

- No advertising, and no ad networks in the app.
- No selling or renting of your data. Ever.
- No analytics measuring what you read, write, record or pray.
- No profiling, and no automated decisions about you.
- No training AI models on anything you write.
- No sharing your content with anyone beyond the services listed above.

---

## Changes to this policy

If we change this policy in a way that matters, we will update the date at the top and tell you in the app before the change takes effect.

---

## Contact

Questions about your data, requests about your rights, or anything else in this policy:

**christianmangwanda@gmail.com**

Christian Mangwanda
