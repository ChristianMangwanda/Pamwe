import { supabase } from './supabase';
import type { SwatchColor } from '../theme/tokens';

export type RecapPeriod = 'week' | 'month' | 'quarter';

export const RECAP_DAYS: Record<RecapPeriod, number> = { week: 7, month: 30, quarter: 90 };
export const RECAP_LABEL: Record<RecapPeriod, string> = { week: 'This week', month: 'This month', quarter: 'This quarter' };
const PERIOD_WORD: Record<RecapPeriod, string> = { week: 'week', month: 'month', quarter: 'quarter' };

// Pure + testable. Rolling N-day window ending at `nowMs`. (v1 deviation: a rolling
// window rather than timezone-exact calendar boundaries — the timezone is accepted
// for future precision and used only for display today.)
export function recapCutoffISO(period: RecapPeriod, nowMs: number = Date.now()): string {
  return new Date(nowMs - RECAP_DAYS[period] * 86400000).toISOString();
}

// The recap used to hand the screen three finished sentences. It now hands over
// the items themselves, so a passage, a highlight and a prayer can each be
// tapped through to the thing it names. A recap that only tells you what you did
// is a receipt; one you can walk back into is a way in.
export type RecapReadItem = { reference: string };
export type RecapHighlightItem = { book: string; chapter: number; verse: number; color: SwatchColor };
export type RecapPrayerItem = { id: string; text: string };

export type Recap = {
  period: RecapPeriod;
  rangeLabel: string;
  headline: string;
  days: number;       // distinct days I read
  highlights: number; // verses we highlighted
  prayers: number;    // prayers raised
  insight: string | null;   // what the numbers actually say, when they say something
  encouragement: string;    // what to do next
  readItems: RecapReadItem[];
  highlightItems: RecapHighlightItem[];
  prayerItems: RecapPrayerItem[];
};

const uniq = (arr: string[]) => [...new Set(arr)];

// ---- Copy. Pure, so the wording is testable without a database. ----

export function recapHeadline(days: number, prayers: number, period: RecapPeriod): string {
  const word = PERIOD_WORD[period];
  if (days === 0 && prayers === 0) return `A gentle pause this ${word}.`;
  if (days === 0) return `You carried each other in prayer this ${word}.`;
  if (days >= 5) return `${days} days in the Word. Well done, both of you.`;
  return `${days} ${days === 1 ? 'day' : 'days'} in the Word, together.`;
}

export function recapEncouragement(days: number, period: RecapPeriod): string {
  const word = PERIOD_WORD[period];
  if (days >= 5) return `You showed up ${days} times this ${word}.`;
  if (days > 0) return 'Every day you opened the Word planted something. Pick your next reading tonight and keep it growing.';
  return 'The Word will be here when you come back. Start small: one passage, read together.';
}

// prayers.category values, minus 'other', which names no subject and so can
// never be the thing a couple prayed about most.
const CATEGORY_PHRASE: Record<string, string> = {
  family: 'your family',
  health: 'health',
  work: 'work',
  guidance: 'guidance',
  thanks: 'thanksgiving',
};

/** The book part of "1 Samuel 3:1-10", or null when the reference is unparseable here. */
function bookOf(reference: string): string | null {
  const m = reference.trim().match(/^(\d?\s?[A-Za-z][A-Za-z ]*?)\s+\d/);
  return m ? m[1].trim() : null;
}

/** Highest count, but only when it is the sole highest. A tie says nothing. */
function soleLeader(values: (string | null)[]): { key: string; count: number } | null {
  const tally = new Map<string, number>();
  for (const v of values) {
    if (!v) continue;
    tally.set(v, (tally.get(v) ?? 0) + 1);
  }
  let best: { key: string; count: number } | null = null;
  let tied = false;
  for (const [key, count] of tally) {
    if (!best || count > best.count) { best = { key, count }; tied = false; }
    else if (count === best.count) tied = true;
  }
  return tied ? null : best;
}

export function recapInsight(prayerCategories: string[], readRefs: string[], period: RecapPeriod): string | null {
  const word = PERIOD_WORD[period];

  const named = prayerCategories.filter((c) => CATEGORY_PHRASE[c]);
  if (named.length >= 3) {
    const lead = soleLeader(named);
    if (lead) return `Most of what you prayed for this ${word} was ${CATEGORY_PHRASE[lead.key]}.`;
  }

  if (readRefs.length >= 3) {
    const lead = soleLeader(readRefs.map(bookOf));
    if (lead) return `You spent most of your reading in ${lead.key}.`;
  }

  return null;
}

export async function getRecap(coupleId: string, timezone: string, period: RecapPeriod): Promise<Recap> {
  const cutoff = recapCutoffISO(period);
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  const meId = user?.id;

  const { data: cps } = await supabase.from('couple_plans').select('id, plan_id').eq('couple_id', coupleId);
  const cpIds = (cps ?? []).map((c) => c.id);
  const cpPlan = new Map((cps ?? []).map((c) => [c.id, c.plan_id as string]));

  // My submitted entries in range → days read + which passages.
  let myEntries: any[] = [];
  if (cpIds.length && meId) {
    const { data } = await supabase
      .from('entries')
      .select('couple_plan_id, day_number, submitted_at')
      .in('couple_plan_id', cpIds)
      .eq('user_id', meId)
      .not('submitted_at', 'is', null)
      .gte('submitted_at', cutoff);
    myEntries = data ?? [];
  }

  // Resolve those days' references (batch per plan).
  const refByPlanDay = new Map<string, string>();
  const wantByPlan = new Map<string, Set<number>>();
  for (const e of myEntries) {
    const planId = cpPlan.get(e.couple_plan_id);
    if (!planId) continue;
    (wantByPlan.get(planId) ?? wantByPlan.set(planId, new Set()).get(planId)!).add(e.day_number);
  }
  for (const [planId, days] of wantByPlan) {
    const { data } = await supabase.from('plan_days').select('day_number, passage_reference').eq('plan_id', planId).in('day_number', [...days]);
    for (const pd of data ?? []) refByPlanDay.set(`${planId}_${pd.day_number}`, pd.passage_reference);
  }
  const readRefs = uniq(
    myEntries
      .map((e) => refByPlanDay.get(`${cpPlan.get(e.couple_plan_id)}_${e.day_number}`))
      .filter(Boolean) as string[],
  );

  // Highlights + prayers in range. Rows, not counts: the screen links each one
  // back to the verse or the prayer it came from.
  const { data: hlRows } = await supabase
    .from('verse_highlights').select('book, chapter, verse, color, created_at')
    .eq('couple_id', coupleId).gte('created_at', cutoff).order('created_at', { ascending: false });
  const highlightRows = hlRows ?? [];

  const { data: prayerRows } = await supabase
    .from('prayers').select('id, text, category').eq('couple_id', coupleId).gte('created_at', cutoff).order('created_at', { ascending: false });
  const prayers = prayerRows ?? [];

  // Distinct dates, not row count: two plans read on one day is one day of
  // showing up, and counting it twice made the number quietly flattering.
  const days = new Set(myEntries.map((e) => String(e.submitted_at).slice(0, 10))).size;

  return {
    period,
    rangeLabel: RECAP_LABEL[period],
    headline: recapHeadline(days, prayers.length, period),
    days,
    highlights: highlightRows.length,
    prayers: prayers.length,
    insight: recapInsight(prayers.map((p) => p.category as string), readRefs, period),
    encouragement: recapEncouragement(days, period),
    readItems: readRefs.slice(0, 8).map((reference) => ({ reference })),
    highlightItems: highlightRows.slice(0, 6).map((h) => ({
      book: h.book as string,
      chapter: h.chapter as number,
      verse: h.verse as number,
      color: h.color as SwatchColor,
    })),
    prayerItems: prayers.slice(0, 3).map((p) => ({ id: p.id as string, text: p.text as string })),
  };
}
