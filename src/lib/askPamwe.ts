import { supabase } from './supabase';
import { parseReference } from './bible';
import { generateSchedule } from './planBuilder';

export type PlanRecommendation = {
  title: string;
  meta: string;
  days: number;
  rhythm: 'verses' | 'chapter' | 'deep';
  readings: string[]; // normalized passage references, one per day
  prompts: string[];
};

const RHYTHMS = ['verses', 'chapter', 'deep'] as const;

// Validate a raw recommendation: keep only readings whose book resolves, normalize
// each reference's spelling, renumber the days, and derive `days` from what survived.
// Returns null if nothing usable remains.
function normalize(rec: any): PlanRecommendation | null {
  const raw = Array.isArray(rec?.readings) ? [...rec.readings] : [];
  raw.sort((a, b) => (Number(a?.day) || 0) - (Number(b?.day) || 0));

  const readings: string[] = [];
  for (const r of raw) {
    const ref = typeof r === 'string' ? r : r?.reference;
    if (!ref) continue;
    const parsed = parseReference(String(ref));
    if (!parsed) continue;
    readings.push(`${parsed.book.name} ${parsed.chapter ?? 1}`);
  }
  if (readings.length === 0) return null;

  const prompts = Array.isArray(rec?.prompts)
    ? rec.prompts.filter((p: any) => typeof p === 'string' && p.trim()).map((p: string) => p.trim())
    : [];

  return {
    title: String(rec?.title ?? 'A plan for you').trim(),
    meta: String(rec?.meta ?? `${readings.length} days`).trim(),
    days: readings.length,
    rhythm: RHYTHMS.includes(rec?.rhythm) ? rec.rhythm : 'chapter',
    readings,
    prompts,
  };
}

// A hung request is not an error, so it never reached the fallback: the
// builder spun forever (build 7 "forever loading"). Abort hard at 15s; a
// normal answer lands in 7-13s and the fallback covers the rest.
const INVOKE_TIMEOUT_MS = 15_000;

// Ask Pamwe: invoke the edge function, validate the recommendations, and fall back
// to gentle hardcoded starting points on any failure (missing key, network, refusal,
// timeout, or all-invalid readings) so the builder always has something to offer.
export async function askPamwe(query: string): Promise<PlanRecommendation[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), INVOKE_TIMEOUT_MS);
  try {
    const { data, error } = await supabase.functions.invoke('ask-pamwe', {
      body: { query, mode: 'plans' },
      signal: controller.signal,
    });
    if (error) throw error;
    // Off-topic (the model flagged it): the builder just shows its gentle
    // starting points rather than surface the deflection here.
    if (data?.off_topic) return fallbackRecs();
    const recs = Array.isArray(data?.recommendations) ? data.recommendations : [];
    const normalized = recs.map(normalize).filter(Boolean) as PlanRecommendation[];
    if (normalized.length === 0) return fallbackRecs();
    return normalized.slice(0, 3);
  } catch {
    return fallbackRecs();
  } finally {
    clearTimeout(timer);
  }
}


export function fallbackRecs(): PlanRecommendation[] {
  return [
    {
      title: 'Meet Jesus, together',
      meta: 'The Gospel of John · 21 days',
      days: 21,
      rhythm: 'chapter',
      readings: generateSchedule('John', 1, 21),
      prompts: [
        "What did Jesus reveal about himself in today's reading?",
        'Where do you each need his grace this week?',
        'What is one thing you want to remember together?',
      ],
    },
    {
      title: 'Words for every weather',
      meta: 'Psalms of comfort · 14 days',
      days: 14,
      rhythm: 'verses',
      readings: [
        'Psalm 1', 'Psalm 23', 'Psalm 27', 'Psalm 34', 'Psalm 42', 'Psalm 46', 'Psalm 62',
        'Psalm 63', 'Psalm 91', 'Psalm 103', 'Psalm 121', 'Psalm 130', 'Psalm 139', 'Psalm 145',
      ],
      prompts: [
        'What is your soul carrying right now?',
        'How can you be a comfort to each other today?',
        'Where do you need to trust God together?',
      ],
    },
    {
      title: 'The Way of Love',
      meta: 'Love, patience & grace · 7 days',
      days: 7,
      rhythm: 'verses',
      readings: [
        '1 Corinthians 13', 'Colossians 3', 'Ephesians 4', 'Romans 12',
        '1 John 4', 'Philippians 2', 'Ruth 1',
      ],
      prompts: [
        'Where is love asking more of you this week?',
        'What would it look like to be patient with each other today?',
        'How has God been patient with you?',
      ],
    },
  ];
}

// ---------------------------------------------------------------------------
// Build mode: one plan, generated. Unlike askPamwe() above this does NOT fall
// back to hardcoded recommendations. A build is a direct answer to something
// the couple typed, and quietly handing them a stock Psalms plan instead would
// be worse than saying it did not work.
/** Shown only if the server somehow flags off-topic without sending its own
 *  line. The server owns this wording; this is the belt. */
const OFF_TOPIC_FALLBACK =
  "Pamwe stays in its lane: Scripture, prayer, and the two of you. For that one, you'll want another guide.";

export type BuiltReading = { day: number; reference: string; note: string };

export type BuiltPlan = {
  title: string;
  meta: string;
  days: number;
  rhythm: 'passage' | 'chapter' | 'deep';
  topics: string[];
  readings: BuiltReading[];
  prompts: string[];
};

export type BuildResult =
  | { kind: 'plan'; plan: BuiltPlan }
  | { kind: 'off_topic'; message: string }
  | { kind: 'error'; message: string };

const BUILD_TIMEOUT_MS = 30_000; // two model passes, so roughly double the one-shot budget

/**
 * Normalises a generated plan without flattening it.
 *
 * The older normalize() above rewrites every reading to "Book Chapter", which
 * silently threw away the verse range. That was correct when the schema could
 * only express chapters; here it would undo the whole point, so this one keeps
 * the reference as written and only drops readings whose book cannot be
 * resolved at all.
 */
function normalizeBuilt(raw: any): BuiltPlan | null {
  const list = Array.isArray(raw?.readings) ? [...raw.readings] : [];
  list.sort((a, b) => (Number(a?.day) || 0) - (Number(b?.day) || 0));

  const readings: BuiltReading[] = [];
  for (const r of list) {
    const ref = String(r?.reference ?? '').trim();
    if (!ref || !parseReference(ref)) continue;
    readings.push({
      day: readings.length + 1,
      reference: ref,
      note: String(r?.note ?? '').trim(),
    });
  }
  if (readings.length < 3) return null;

  const prompts = Array.isArray(raw?.prompts)
    ? raw.prompts.filter((p: any) => typeof p === 'string' && p.trim()).map((p: string) => p.trim())
    : [];
  const topics = Array.isArray(raw?.topics)
    ? raw.topics
        .filter((t: any) => typeof t === 'string' && t.trim())
        .map((t: string) => t.trim().toLowerCase())
        .slice(0, 4)
    : [];

  return {
    title: String(raw?.title ?? 'A plan for you').trim(),
    meta: String(raw?.meta ?? `${readings.length} days`).trim(),
    days: readings.length,
    rhythm: ['passage', 'chapter', 'deep'].includes(raw?.rhythm) ? raw.rhythm : 'passage',
    topics,
    readings,
    prompts,
  };
}

export async function buildPlan(query: string): Promise<BuildResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), BUILD_TIMEOUT_MS);
  try {
    const { data, error } = await supabase.functions.invoke('ask-pamwe', {
      body: { query, mode: 'build' },
      signal: controller.signal,
    });
    if (error) throw error;

    if (data?.off_topic) {
      return { kind: 'off_topic', message: String(data.message ?? OFF_TOPIC_FALLBACK) };
    }
    if (data?.error) return { kind: 'error', message: String(data.error) };

    const plan = normalizeBuilt(data);
    if (!plan) return { kind: 'error', message: "Pamwe couldn't shape that one. Try saying it a different way." };
    return { kind: 'plan', plan };
  } catch {
    return { kind: 'error', message: 'Pamwe is resting for a moment. Try again in a bit.' };
  } finally {
    clearTimeout(timer);
  }
}
