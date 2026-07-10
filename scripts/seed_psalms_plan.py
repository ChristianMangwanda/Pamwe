#!/usr/bin/env python3
"""Seed the "Psalms of Comfort" curated plan (30 days) into Supabase.

Same pattern as scripts/seed_john_plan.py: fetch WEB text from bible-api.com
(public domain), then emit SQL for one plans row + 30 plan_days rows.

WHAT IS PLACEHOLDER / ORIGINAL CONTENT (edit freely later):
  - the curated psalm selection (the 30 psalms below),
  - each day's `passage_title`,
  - each day's chosen `pull_quote` verse, and
  - each day's `reflection_prompt`.
These are authored starting points for Christian's editorial pass — NOT
consultant material. The passage_text itself is the public-domain World
English Bible, fetched verbatim from bible-api.com.

Usage:
  python3 scripts/seed_psalms_plan.py > /tmp/psalms_seed.sql
"""

import json
import re
import subprocess
import sys
import time

PLAN_ID = "c1b2c3d4-e5f6-7890-abcd-ef1234567892"
PLAN_TITLE = "Psalms of Comfort"
PLAN_SUBTITLE = "Thirty psalms for every season of a shared life."
DURATION = 30

# Day N -> (psalm number, title, pull-quote verse, prompt).
# Ordered to move through the emotional weather of a shared life:
# foundation -> longing -> fear -> lament -> trust -> gratitude -> praise.
DAYS = [
    (1,   "The Two Paths",            3,  "What are the two of you rooting your life in right now? Name one stream you want to be planted beside this season."),
    (16,  "You Are My Portion",       11, "Where have you found fullness of joy together lately? Tell each other one place you've felt God's presence this week."),
    (23,  "The Shepherd",             4,  "What valley are you walking through together right now? How can you be a comfort to each other inside it this week?"),
    (27,  "One Thing I Ask",          1,  "What fear has been loud lately? Say it out loud to each other, then pray it into God's light."),
    (30,  "Joy Comes in the Morning", 5,  "Remember a night of weeping that turned to morning joy in your life together. What did God do?"),
    (34,  "Near the Brokenhearted",   18, "Whose heart in your circle is breaking right now? Pray for them together, and ask how each of you is really doing."),
    (37,  "Delight and Trust",        4,  "What desire have you quietly been carrying? Bring it honestly to God together, and to each other."),
    (40,  "Out of the Pit",           1,  "Where are you waiting on God right now? How can you help each other wait patiently instead of anxiously?"),
    (42,  "As the Deer",              1,  "What is your soul thirsty for this season? Tell each other, and resist the urge to rush past it."),
    (46,  "Be Still",                 10, "When life shakes, where do you each run first? Try being still together for two quiet minutes before you talk."),
    (51,  "Create in Me a Clean Heart", 10, "Is there something you need to confess, to God or to each other? Make room for honesty and grace tonight."),
    (56,  "When I Am Afraid",         3,  "Name one specific fear. Then finish this sentence to each other: 'When I am afraid, I will...'"),
    (62,  "For God Alone",            1,  "Where are you tempted to find your security outside of God? Speak it, and turn back to him together."),
    (63,  "Better Than Life",         3,  "What are you thirsty for that only God can fill? Where might you be asking each other to be God?"),
    (73,  "Nevertheless, With You",   26, "Where have you been comparing your life to others' lately? Name what God has actually given the two of you."),
    (84,  "How Lovely Is Your Dwelling", 10, "When has being in God's presence together felt like coming home? How can you make more room for it this week?"),
    (90,  "Teach Us to Number Our Days", 12, "If you counted your days honestly, what would you want more of together, and what would you let go of?"),
    (91,  "Under His Shelter",        1,  "What does 'shelter' mean for your home right now? Pray God's protection over each other, by name."),
    (103, "Forget None of His Benefits", 2, "List three of God's 'benefits' to you as a couple this year. Say them out loud so you don't forget."),
    (116, "He Heard My Voice",        1,  "Remember a prayer God clearly answered for you. Tell the story to each other again."),
    (118, "This Is the Day",          24, "What is right in front of you today to be glad about? Name it before you name what's hard."),
    (121, "I Lift My Eyes",           2,  "Where have you been looking for help that hasn't come? Lift your eyes higher, together, tonight."),
    (126, "Sowing in Tears",          5,  "What are you sowing in tears right now? Trust each other with the hope of a harvest you can't yet see."),
    (130, "Out of the Depths",        5,  "From what depths do you need to cry out right now? Let the other simply listen, then wait with you."),
    (131, "A Quieted Soul",           2,  "What are you straining to control that you could hand to God? Practice a calm, contented soul together."),
    (133, "Dwelling in Unity",        1,  "Where is your unity strongest right now? Where has it frayed? Tend the frayed edge this week."),
    (138, "He Will Fulfill His Purpose", 8, "What unfinished thing are you trusting God to complete in the two of you? Give thanks in advance."),
    (139, "Fully Known",              23, "To be fully known and still loved: where do you long for that from God? From each other?"),
    (145, "Good to All",              9,  "How has God been specifically good to you? Praise him out loud together. Say it, don't just think it."),
    (146, "Praise, My Soul",          2,  "As this plan ends, what will you keep praising God for? Make one promise to each other for the road ahead."),
]

assert len(DAYS) == DURATION, f"expected {DURATION} days, got {len(DAYS)}"


def fetch(reference: str) -> dict:
    url = f"https://bible-api.com/{reference}?translation=web"
    last_err = ""
    for attempt in range(4):
        if attempt > 0:
            backoff = 10 * attempt
            print(f"(retry {attempt} in {backoff}s)", file=sys.stderr, end=" ", flush=True)
            time.sleep(backoff)
        result = subprocess.run(
            ["curl", "-sSL", "--max-time", "30", "-A", "Pamwe-App/1.0", url],
            capture_output=True, text=True, timeout=45,
        )
        if result.returncode == 0:
            try:
                return json.loads(result.stdout)
            except json.JSONDecodeError:
                last_err = f"bad JSON ({len(result.stdout)} chars)"
                continue
        last_err = result.stderr.strip() or f"exit {result.returncode}"
    raise RuntimeError(f"curl failed after retries: {last_err}")


def clean(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def sql_escape(s: str) -> str:
    return s.replace("'", "''")


def pull_quote_for(verses: list, verse_no: int) -> str:
    for v in verses:
        if v["verse"] == verse_no:
            return clean(v["text"])
    # Fallback: first verse in the psalm.
    return clean(verses[0]["text"])


def main():
    rows = []
    for i, (psalm, title, pull_verse, prompt) in enumerate(DAYS, start=1):
        print(f"[{i}/{DURATION}] Psalm {psalm}...", file=sys.stderr, end=" ", flush=True)
        data = fetch(f"psalms+{psalm}")
        verses = data.get("verses", [])
        text = data.get("text", "").strip()
        if not verses or not text:
            print("FAILED", file=sys.stderr)
            sys.exit(1)
        rows.append({
            "day": i,
            "ref": f"Psalm {psalm}",
            "title": title,
            "text": text,
            "pull_quote": pull_quote_for(verses, pull_verse),
            "pull_quote_ref": f"Psalm {psalm}:{pull_verse}",
            "prompt": prompt,
        })
        print(f"OK ({len(verses)} v)", file=sys.stderr)
        if i < DURATION:
            time.sleep(2.0)

    out = []
    out.append("-- Seed: Psalms of Comfort (30 days, one psalm a day, WEB translation).")
    out.append("-- Passage text = public-domain World English Bible (bible-api.com).")
    out.append("-- Titles, pull-quote choices, and reflection prompts are ORIGINAL placeholder")
    out.append("-- content authored for Pamwe (not consultant material) — edit freely.")
    out.append("INSERT INTO public.plans (id, title, subtitle, duration_days, is_curated, created_by)")
    out.append(
        f"VALUES ('{PLAN_ID}', '{sql_escape(PLAN_TITLE)}', '{sql_escape(PLAN_SUBTITLE)}', "
        f"{DURATION}, true, NULL)"
    )
    out.append("ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, subtitle = EXCLUDED.subtitle;")
    out.append("")
    for d in rows:
        out.append(
            "INSERT INTO public.plan_days (plan_id, day_number, passage_reference, passage_title, "
            "passage_text, pull_quote, pull_quote_ref, reflection_prompt) VALUES ("
            f"'{PLAN_ID}', {d['day']}, "
            f"'{sql_escape(d['ref'])}', '{sql_escape(d['title'])}', "
            f"'{sql_escape(d['text'])}', "
            f"'{sql_escape(d['pull_quote'])}', '{sql_escape(d['pull_quote_ref'])}', "
            f"'{sql_escape(d['prompt'])}') "
            "ON CONFLICT (plan_id, day_number) DO UPDATE SET "
            "passage_reference = EXCLUDED.passage_reference, passage_title = EXCLUDED.passage_title, "
            "passage_text = EXCLUDED.passage_text, pull_quote = EXCLUDED.pull_quote, "
            "pull_quote_ref = EXCLUDED.pull_quote_ref, reflection_prompt = EXCLUDED.reflection_prompt;"
        )
    sys.stdout.write("\n".join(out) + "\n")


if __name__ == "__main__":
    main()
