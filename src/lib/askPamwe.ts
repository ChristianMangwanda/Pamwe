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

// Ask Pamwe: invoke the edge function, validate the recommendations, and fall back
// to gentle hardcoded starting points on any failure (missing key, network, refusal,
// or all-invalid readings) so the builder always has something to offer.
export async function askPamwe(query: string): Promise<PlanRecommendation[]> {
  try {
    const { data, error } = await supabase.functions.invoke('ask-pamwe', {
      body: { query },
    });
    if (error) throw error;
    const recs = Array.isArray(data?.recommendations) ? data.recommendations : [];
    const normalized = recs.map(normalize).filter(Boolean) as PlanRecommendation[];
    if (normalized.length === 0) return fallbackRecs();
    return normalized.slice(0, 3);
  } catch {
    return fallbackRecs();
  }
}

export function fallbackRecs(): PlanRecommendation[] {
  return [
    {
      title: 'Meet Jesus, Together',
      meta: 'The Gospel of John · 21 days',
      days: 21,
      rhythm: 'chapter',
      readings: generateSchedule('John', 1, 21),
      prompts: [
        'What did Jesus reveal about himself in today’s reading?',
        'Where do you each need his grace this week?',
        'What is one thing you want to remember together?',
      ],
    },
    {
      title: 'Words for Every Weather',
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
