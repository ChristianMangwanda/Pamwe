#!/usr/bin/env python3
"""Seed the "A Cord of Three Strands" curated plan (21 days) into Supabase.

Same pattern as scripts/seed_john_plan.py: fetch WEB text from bible-api.com
(public domain), then emit SQL for one plans row + 21 plan_days rows.

Structure: Ecclesiastes 1-12 (days 1-12), then 9 authored companionship
chapters (days 13-21). This deliberately REPLACES the prototype's mechanical
canon walk, which drifted from Ecclesiastes straight into Song of Songs; here
the back half is a curated arc on marriage, covenant, and abiding in Christ —
"the threefold cord" (Eccl 4:12).

WHAT IS PLACEHOLDER / ORIGINAL CONTENT (edit freely later):
  - the companionship-passage selection (days 13-21),
  - each day's `passage_title`,
  - each day's chosen `pull_quote` verse, and
  - each day's `reflection_prompt`.
Authored starting points for Christian's editorial pass, NOT consultant
material. The passage_text is the public-domain World English Bible.

Usage:
  python3 scripts/seed_cord_plan.py > /tmp/cord_seed.sql
"""

import json
import re
import subprocess
import sys
import time

PLAN_ID = "d1b2c3d4-e5f6-7890-abcd-ef1234567893"
PLAN_TITLE = "A Cord of Three Strands"
PLAN_SUBTITLE = "Three weeks on facing life woven together."
DURATION = 21

# Day N -> (fetch reference for bible-api, display reference, title, pull verse, prompt).
DAYS = [
    ("ecclesiastes+1",  "Ecclesiastes 1",      "Everything Is Breath",        2,  "What have you been chasing that keeps leaving you empty? Name it honestly to each other."),
    ("ecclesiastes+2",  "Ecclesiastes 2",      "I Tried Everything",          24, "Where can you receive today as a gift instead of an achievement? Choose one simple good to enjoy together."),
    ("ecclesiastes+3",  "Ecclesiastes 3",      "A Time for Everything",       1,  "What season are you in as a couple right now? Name it, and ask what it's asking of you."),
    ("ecclesiastes+4",  "Ecclesiastes 4",      "Two Are Better Than One",     9,  "Where are you each lifting the other up right now, and where do you quietly need to be lifted?"),
    ("ecclesiastes+5",  "Ecclesiastes 5",      "Let Your Words Be Few",       2,  "Where do too many words get the two of you into trouble? Where might fewer, truer words help?"),
    ("ecclesiastes+6",  "Ecclesiastes 6",      "The Wandering Desire",        9,  "What are you tempted to want more of? Practice contentment with what is already in your hands."),
    ("ecclesiastes+7",  "Ecclesiastes 7",      "The Day of Adversity",        8,  "How have hard days made you wiser together? Thank God for one thing adversity taught you."),
    ("ecclesiastes+8",  "Ecclesiastes 8",      "What We Cannot Know",         15, "What don't you understand right now that you simply have to trust God with? Sit in the mystery together."),
    ("ecclesiastes+9",  "Ecclesiastes 9",      "Live Joyfully Together",      9,  "How can you live more joyfully with each other this week, not someday, but now?"),
    ("ecclesiastes+10", "Ecclesiastes 10",     "Small Follies",               12, "What small folly keeps tripping you up? Ask each other for grace and a gentle nudge."),
    ("ecclesiastes+11", "Ecclesiastes 11",     "Cast Your Bread",             1,  "Where is God inviting you to be generous or take a step of faith together? Name one thing."),
    ("ecclesiastes+12", "Ecclesiastes 12",     "Remember Your Creator",       13, "If it all comes down to fearing God and keeping his ways, what is one way you'll do that together?"),
    ("genesis+2",       "Genesis 2",           "It Is Not Good to Be Alone",  24, "'One flesh': where do you already feel joined, and where are you still learning to be one?"),
    ("ruth+1",          "Ruth 1",              "Where You Go, I Will Go",     16, "Renew Ruth's promise in your own words tonight. What does 'where you go, I will go' mean for you now?"),
    ("proverbs+27",     "Proverbs 27",         "Iron Sharpens Iron",          17, "How does your partner sharpen you? Thank them, and invite one honest word back."),
    ("song+of+solomon+8", "Song of Solomon 8", "Love Strong as Death",        7,  "What 'many waters' has your love already survived? Set each other as a seal on your heart again."),
    ("john+15",         "John 15",             "Abide in the Vine",           5,  "Christ is the true third strand. How are you each abiding in him, not only in each other, right now?"),
    ("1+corinthians+13", "1 Corinthians 13",   "The More Excellent Way",      4,  "Read verses 4-7 slowly, putting your own name where it says 'love.' Where does it convict you? Where does it call you higher?"),
    ("ephesians+4",     "Ephesians 4",         "Bearing With Each Other",     2,  "Is there something you need to forgive, or to ask forgiveness for? Don't let the sun go down on it."),
    ("colossians+3",    "Colossians 3",        "Put On Love",                 14, "What do you need to take off, and what do you need to put on this week for the sake of your home?"),
    ("1+peter+3",       "1 Peter 3",           "Heirs Together",              8,  "You are 'heirs together of the grace of life.' As this plan ends, how will you keep honoring each other?"),
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
    return clean(verses[0]["text"])


def main():
    rows = []
    for i, (fetch_ref, display_ref, title, pull_verse, prompt) in enumerate(DAYS, start=1):
        print(f"[{i}/{DURATION}] {display_ref}...", file=sys.stderr, end=" ", flush=True)
        data = fetch(fetch_ref)
        verses = data.get("verses", [])
        text = data.get("text", "").strip()
        if not verses or not text:
            print("FAILED", file=sys.stderr)
            sys.exit(1)
        rows.append({
            "day": i,
            "ref": display_ref,
            "title": title,
            "text": text,
            "pull_quote": pull_quote_for(verses, pull_verse),
            "pull_quote_ref": f"{display_ref}:{pull_verse}",
            "prompt": prompt,
        })
        print(f"OK ({len(verses)} v)", file=sys.stderr)
        if i < DURATION:
            time.sleep(2.0)

    out = []
    out.append("-- Seed: A Cord of Three Strands (21 days, one chapter a day, WEB translation).")
    out.append("-- Ecclesiastes 1-12 then a curated companionship arc (Gen 2, Ruth 1, Prov 27,")
    out.append("-- Song 8, John 15, 1 Cor 13, Eph 4, Col 3, 1 Pet 3).")
    out.append("-- Passage text = public-domain World English Bible (bible-api.com).")
    out.append("-- Titles, pull-quote choices, prompts, and the day-13-21 selection are ORIGINAL")
    out.append("-- placeholder content authored for Pamwe (not consultant material) — edit freely.")
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
