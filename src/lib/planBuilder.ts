import { supabase } from './supabase';
import { BIBLE_BOOKS, findBook } from './bible';

// The canon flattened into (book, chapter) pairs, once. Used to walk a plan
// chapter-by-chapter from any starting point.
const CANON: { book: string; chapter: number }[] = [];
for (const b of BIBLE_BOOKS) {
  for (let c = 1; c <= b.chapters; c++) CANON.push({ book: b.name, chapter: c });
}

// Pure canon walk from a start point — one chapter per day, clamped at the canon's
// end (a plan that runs past Revelation 22 repeats the final chapter). Returns
// passage references like "John 1". Used by the builder's Books mode + fallbacks.
export function generateSchedule(startBook: string, startChapter: number, days: number): string[] {
  const startName = findBook(startBook)?.name ?? startBook;
  let idx = CANON.findIndex((e) => e.book === startName && e.chapter === startChapter);
  if (idx < 0) idx = 0;
  const out: string[] = [];
  for (let d = 0; d < days; d++) {
    const e = CANON[Math.min(idx + d, CANON.length - 1)];
    out.push(`${e.book} ${e.chapter}`);
  }
  return out;
}

const GENERIC_PROMPTS = [
  "What stood out to you in today's reading?",
  'Where did you see God at work: in the passage, or in each other?',
  'What is one thing you want to carry into your day together?',
];

export type CustomPlanInput = {
  name: string;
  days: number;
  readings: string[]; // passage references, one per day
  prompts?: string[]; // authored prompts; rotates the generic set when absent
  rhythmLabel?: string;
  bookLabel?: string;
};

// Client-side custom-plan creation (no edge function): one plans row + N plan_days
// rows with passage_text = NULL. The reader live-fetches NULL-text days from
// bible-api.com. RLS scopes the plan to the couple (is_curated=false, couple_id,
// created_by = auth.uid()).
export async function createCustomPlan(coupleId: string, input: CustomPlanInput) {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) throw new Error('Not signed in');

  const days = Math.max(1, Math.min(input.days, input.readings.length));

  const { data: plan, error: planError } = await supabase
    .from('plans')
    .insert({
      title: input.name,
      duration_days: days,
      is_curated: false,
      created_by: userId,
      couple_id: coupleId,
      tagline: 'Made for you',
      book_label: input.bookLabel ?? null,
      rhythm_label: input.rhythmLabel ?? null,
    })
    .select('*')
    .single();
  if (planError) throw planError;

  const prompts = input.prompts && input.prompts.length ? input.prompts : GENERIC_PROMPTS;
  const rows = input.readings.slice(0, days).map((ref, i) => ({
    plan_id: plan.id,
    day_number: i + 1,
    passage_reference: ref,
    passage_text: null,
    reflection_prompt: prompts[i % prompts.length],
  }));

  const { error: daysError } = await supabase.from('plan_days').insert(rows);
  if (daysError) throw daysError;

  return plan;
}
