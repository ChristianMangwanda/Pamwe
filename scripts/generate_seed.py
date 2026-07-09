#!/usr/bin/env python3
"""Generate Supabase seed SQL for the M'Cheyne reading plan with WEB text.

Reads scripts/mcheyne_with_text.json (output of fetch_web_text.py) and
produces supabase/seed.sql with:
- 1 plan row
- 365 plan_day rows (passage text, pull quote, reflection prompt)
"""

import json
import re

REFLECTION_PROMPTS = [
    "What stood out to you in today's reading? Share it with your partner tonight.",
    "How does this passage speak to where you are right now in life?",
    "Is there something in this passage you've never noticed before?",
    "What is one thing you can carry from this reading into your day together?",
    "How might God be using this passage to shape your marriage?",
    "What does this passage reveal about God's character?",
    "Is there a promise in today's reading that you both can hold onto?",
    "What questions does this passage raise for you?",
    "How can you and your partner live out what you've read today?",
    "What emotions did this passage stir in you?",
    "Is there a command, a promise, or an example to follow here?",
    "How does this passage challenge something you currently believe or do?",
    "What would change in your relationship if you fully trusted this passage?",
    "What does this text teach about love, faithfulness, or perseverance?",
    "If you could sit with the author of this passage, what would you ask?",
    "How does this passage connect to the bigger story of Scripture?",
    "Is there a verse here you want to memorize together?",
    "What does this passage say about how God sees you?",
    "How can you pray for your partner based on today's reading?",
    "What is the hardest truth in this passage to accept?",
    "Where do you see grace in today's reading?",
    "How does this passage point to Jesus?",
    "What is one way this reading might change how you treat your partner today?",
    "Is there a pattern in this passage that mirrors something in your own life?",
    "What would it look like to be obedient to what you've read?",
    "How does today's passage speak to the season your relationship is in?",
    "What comfort does this reading offer during difficult times?",
    "Is there something here you want to discuss further together?",
    "What does this passage teach about trust?",
    "How can this reading shape your prayers this week?",
]


def escape_sql(s: str) -> str:
    """Escape single quotes for SQL string literals."""
    if s is None:
        return ""
    return s.replace("'", "''")


def extract_pull_quote(verses: list, passage_ref: str) -> tuple:
    """Extract a compelling pull quote from the passage verses.

    Returns (quote_text, quote_reference).
    Picks the first verse that's between 40-200 chars and has substance.
    """
    if not verses:
        return (None, None)

    # Try to find a good verse (not too short, not too long)
    candidates = []
    for v in verses:
        text = v["text"].strip()
        if 40 <= len(text) <= 200:
            candidates.append(v)

    if not candidates:
        # Fallback to first verse with at least 20 chars
        candidates = [v for v in verses if len(v["text"].strip()) >= 20]

    if not candidates:
        candidates = verses[:1]

    # Pick the first good candidate
    chosen = candidates[0]
    book_match = re.match(r'^(.+?)\s+\d', passage_ref)
    book_name = book_match.group(1) if book_match else passage_ref

    quote_text = chosen["text"].strip()
    quote_ref = f"{book_name} {chosen['chapter']}:{chosen['verse']}"

    return (quote_text, quote_ref)


def main():
    with open("scripts/mcheyne_with_text.json") as f:
        days = json.load(f)

    # Check all days have text
    errors = [d for d in days if not d.get("passage_text")]
    if errors:
        print(f"WARNING: {len(errors)} days missing passage text:")
        for e in errors:
            print(f"  Day {e['day_number']}: {e.get('passage_reference', '?')} - {e.get('error', 'no text')}")
        print()

    plan_id = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"

    lines = []
    lines.append("-- ============================================================")
    lines.append("-- M'Cheyne Bible Reading Plan — Seed Data")
    lines.append("-- Generated from PLAN2.pdf + World English Bible (public domain)")
    lines.append("-- ============================================================")
    lines.append("")
    lines.append("-- Insert the plan")
    lines.append(f"INSERT INTO public.plans (id, title, subtitle, duration_days, is_curated)")
    lines.append(f"VALUES (")
    lines.append(f"  '{plan_id}',")
    lines.append(f"  'M''Cheyne Reading Plan',")
    lines.append(f"  'Read through the Bible in one year with Robert Murray M''Cheyne''s classic plan',")
    lines.append(f"  365,")
    lines.append(f"  true")
    lines.append(f") ON CONFLICT (id) DO NOTHING;")
    lines.append("")
    lines.append("-- Insert plan days (365 rows)")

    for day in days:
        day_num = day["day_number"]
        ref = escape_sql(day.get("passage_reference", ""))
        text = escape_sql(day.get("passage_text", ""))
        verses = day.get("verses", [])

        if not text:
            text = f"[Passage text for {ref} could not be loaded]"

        # Generate pull quote
        pq_text, pq_ref = extract_pull_quote(verses, day.get("passage_reference", ""))
        pq_text_sql = f"'{escape_sql(pq_text)}'" if pq_text else "NULL"
        pq_ref_sql = f"'{escape_sql(pq_ref)}'" if pq_ref else "NULL"

        # Rotate through reflection prompts
        prompt = REFLECTION_PROMPTS[(day_num - 1) % len(REFLECTION_PROMPTS)]

        lines.append(f"INSERT INTO public.plan_days (plan_id, day_number, passage_reference, passage_title, passage_text, pull_quote, pull_quote_ref, reflection_prompt)")
        lines.append(f"VALUES ('{plan_id}', {day_num}, '{escape_sql(ref)}', '{escape_sql(ref)}', '{text}', {pq_text_sql}, {pq_ref_sql}, '{escape_sql(prompt)}')")
        lines.append(f"ON CONFLICT (plan_id, day_number) DO UPDATE SET passage_text = EXCLUDED.passage_text, pull_quote = EXCLUDED.pull_quote, pull_quote_ref = EXCLUDED.pull_quote_ref;")
        lines.append("")

    sql = "\n".join(lines)

    with open("supabase/seed.sql", "w") as f:
        f.write(sql)

    print(f"Generated supabase/seed.sql with {len(days)} plan days")
    print(f"  Plan ID: {plan_id}")
    print(f"  Days with text: {len([d for d in days if d.get('passage_text')])}")
    print(f"  Days missing text: {len(errors)}")


if __name__ == "__main__":
    main()
