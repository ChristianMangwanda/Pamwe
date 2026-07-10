import { supabase } from './supabase';

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

export type Recap = {
  period: RecapPeriod;
  rangeLabel: string;
  headline: string;
  days: number;       // days I read
  highlights: number; // verses we highlighted
  prayers: number;    // prayers raised
  read: string;       // "What you read" — passage references
  learned: string;    // deterministic encouragement
  pray: string;       // "What you prayed for" — prayer snippets
};

const uniq = (arr: string[]) => [...new Set(arr)];

export async function getRecap(coupleId: string, timezone: string, period: RecapPeriod): Promise<Recap> {
  const cutoff = recapCutoffISO(period);
  const { data: { user } } = await supabase.auth.getUser();
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

  // Highlights + prayers in range.
  const { count: highlights } = await supabase
    .from('verse_highlights').select('id', { count: 'exact', head: true })
    .eq('couple_id', coupleId).gte('created_at', cutoff);

  const { data: prayerRows } = await supabase
    .from('prayers').select('text').eq('couple_id', coupleId).gte('created_at', cutoff).order('created_at', { ascending: false });
  const prayerTexts = (prayerRows ?? []).map((p) => p.text as string);

  const days = myEntries.length;
  const prayers = prayerTexts.length;
  const word = PERIOD_WORD[period];

  const headline = days === 0 && prayers === 0
    ? `A gentle pause this ${word}.`
    : days === 0
      ? `You carried each other in prayer this ${word}.`
      : `${days} ${days === 1 ? 'day' : 'days'} in the Word, together.`;

  const learned = days >= 5
    ? `You're building a real rhythm: ${days} days of showing up for each other. Keep going.`
    : days > 0
      ? 'Small steps still count. Every day in the Word plants something between you.'
      : 'A quiet season is still a season. When you return to the Word, it will be here.';

  const read = readRefs.length ? readRefs.slice(0, 8).join(', ') : "You'll see what you read here once you've read a few days.";
  const pray = prayerTexts.length
    ? prayerTexts.slice(0, 3).map((t) => `“${t.length > 90 ? t.slice(0, 87) + '…' : t}”`).join('  ')
    : 'Nothing new brought to prayer this ' + word + '.';

  return { period, rangeLabel: RECAP_LABEL[period], headline, days, highlights: highlights ?? 0, prayers, read, learned, pray };
}
