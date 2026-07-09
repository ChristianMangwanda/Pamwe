#!/usr/bin/env python3
"""Fetch John 1-21 from bible-api.com and emit SQL to seed the plan into Supabase.

Runs the same way scripts/fetch_web_text.py does — bible-api.com, WEB translation,
2.1s sleep between requests for rate limiting.

Output: SQL with INSERT for one plans row + 21 plan_days rows.
"""

import json
import subprocess
import sys
import time

PLAN_ID = "b1b2c3d4-e5f6-7890-abcd-ef1234567891"
PLAN_TITLE = "Gospel of John"
PLAN_SUBTITLE = "Walk through John's gospel one chapter a day."
DURATION = 21

# A small rotating set of prompts. Day N uses prompt at index N-1 mod len.
PROMPTS = [
    "What did Jesus reveal about himself in this chapter?",
    "What word, image, or verse stayed with you?",
    "Where did you see grace or truth at work?",
    "How did Jesus respond to those who came to him?",
    "What does this chapter ask you to believe?",
    "Where did you notice yourself in the story?",
    "What do you want to remember from today's reading?",
]


def fetch_chapter(chapter: int) -> dict:
    url = f"https://bible-api.com/john+{chapter}?translation=web"
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


def derive_pull_quote(verses: list) -> tuple[str, str]:
    """Pick the first verse whose text length is 40-200 chars. Return (text, ref)."""
    for v in verses:
        text = v["text"].strip()
        if 40 <= len(text) <= 200:
            ref = f"John {v['chapter']}:{v['verse']}"
            return text, ref
    # Fallback to first verse
    v = verses[0]
    text = v["text"].strip()
    return text[:200], f"John {v['chapter']}:{v['verse']}"


def sql_escape(s: str) -> str:
    return s.replace("'", "''")


def main():
    days_data = []
    for ch in range(1, DURATION + 1):
        print(f"[{ch}/{DURATION}] John {ch}...", file=sys.stderr, end=" ", flush=True)
        data = fetch_chapter(ch)
        verses = data.get("verses", [])
        text = data.get("text", "").strip()
        if not verses or not text:
            print("FAILED", file=sys.stderr)
            sys.exit(1)
        pull_quote, pull_ref = derive_pull_quote(verses)
        prompt = PROMPTS[(ch - 1) % len(PROMPTS)]
        days_data.append({
            "day": ch,
            "ref": f"John {ch}",
            "title": f"John {ch}",
            "text": text,
            "pull_quote": pull_quote,
            "pull_quote_ref": pull_ref,
            "prompt": prompt,
        })
        print(f"OK ({len(verses)} v, {len(text)} chars)", file=sys.stderr)
        if ch < DURATION:
            time.sleep(4.0)

    # Emit SQL
    out = []
    out.append(f"-- Seed: Gospel of John (21 days, one chapter per day, WEB translation)")
    out.append(f"INSERT INTO public.plans (id, title, subtitle, duration_days, is_curated, created_by)")
    out.append(
        f"VALUES ('{PLAN_ID}', '{sql_escape(PLAN_TITLE)}', '{sql_escape(PLAN_SUBTITLE)}', "
        f"{DURATION}, true, NULL)"
    )
    out.append(f"ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, subtitle = EXCLUDED.subtitle;")
    out.append("")
    for d in days_data:
        out.append(
            f"INSERT INTO public.plan_days (plan_id, day_number, passage_reference, passage_title, "
            f"passage_text, pull_quote, pull_quote_ref, reflection_prompt) VALUES ("
            f"'{PLAN_ID}', {d['day']}, "
            f"'{sql_escape(d['ref'])}', '{sql_escape(d['title'])}', "
            f"'{sql_escape(d['text'])}', "
            f"'{sql_escape(d['pull_quote'])}', '{sql_escape(d['pull_quote_ref'])}', "
            f"'{sql_escape(d['prompt'])}') "
            f"ON CONFLICT (plan_id, day_number) DO UPDATE SET passage_text = EXCLUDED.passage_text;"
        )
    sys.stdout.write("\n".join(out) + "\n")


if __name__ == "__main__":
    main()
