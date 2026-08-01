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

// "Genesis 9-10" keys on its FIRST chapter: the couple reads both, so a question
// grounded in the first is still grounded in what they read. Returns null for a
// reference this can't place, which just means the fallback prompt is used.
export function chapterKey(reference: string): string | null {
  const m = /^(.*?)\s+(\d+)(?:\s*-\s*\d+)?$/.exec((reference ?? '').trim());
  return m ? `${m[1]}|${Number(m[2])}` : null;
}

// One query for every chapter a plan touches, resolved before the rows are
// built. A chapter missing from the library is not an error: the caller falls
// back, so a plan on a book the library has not reached yet still works.
async function lookupPassagePrompts(references: string[]): Promise<Map<string, string>> {
  const found = new Map<string, string>();
  const books = [...new Set(references.map((r) => chapterKey(r)?.split('|')[0]).filter(Boolean))];
  if (books.length === 0) return found;

  const { data, error } = await supabase
    .from('passage_prompts')
    .select('book, chapter, prompt')
    .in('book', books as string[]);
  // Never let the library take plan creation down; the fallback covers it.
  if (error || !data) return found;

  for (const row of data) found.set(`${row.book}|${row.chapter}`, row.prompt);
  return found;
}

export type CustomPlanInput = {
  name: string;
  days: number;
  readings: string[]; // passage references, one per day
  prompts?: string[]; // authored prompts; rotates the generic set when absent
  rhythmLabel?: string;
  bookLabel?: string;
  /** Browse tags. Generated plans carry their own; a plan built by hand has none
   *  until it is offered publicly, which is a separate decision. */
  topics?: string[];
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
      topics: input.topics ?? [],
    })
    .select('*')
    .single();
  if (planError) throw planError;

  const readings = input.readings.slice(0, days);
  const prompts = input.prompts && input.prompts.length ? input.prompts : GENERIC_PROMPTS;
  const library = await lookupPassagePrompts(readings);

  const rows = readings.map((ref, i) => {
    // The chapter's own prompt when the library has one, which is the whole
    // point: a question written for THIS chapter rather than a plan-wide prompt
    // dealt round-robin. `prompts[i % prompts.length]` is what made a 14-day
    // Daniel plan ask about the fiery furnace (Daniel 3) on day 5, and it stays
    // only as the fallback for a chapter the library has not reached yet.
    const key = chapterKey(ref);
    const fromLibrary = key ? library.get(key) : undefined;
    return {
      plan_id: plan.id,
      day_number: i + 1,
      passage_reference: ref,
      passage_text: null,
      reflection_prompt: fromLibrary ?? prompts[i % prompts.length],
    };
  });

  const { error: daysError } = await supabase.from('plan_days').insert(rows);
  if (daysError) throw daysError;

  return plan;
}
