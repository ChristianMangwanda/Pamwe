import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

// Session-lifetime caches: plan content is immutable once seeded/created, so
// revisits render instantly instead of paying free-tier latency every focus.
let curatedCache: any[] | null = null;
const planCache = new Map<string, any>();
const planDaysCache = new Map<string, any[]>();

// Curated plans for the browse grid — shortest/most approachable first, the
// 365-day M'Cheyne last. Custom (couple-built) plans are excluded.
export async function getCuratedPlans() {
  if (curatedCache) return curatedCache;
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .eq('is_curated', true)
    .order('duration_days', { ascending: true })
    .order('title', { ascending: true });

  if (error) throw error;
  curatedCache = data ?? [];
  return curatedCache;
}

// A couple's own custom plans (the "Your plans" section). Empty until the
// builder ships (rebuild Phase 7). RLS already scopes custom plans to the couple.
export async function getCouplePlans(coupleId: string) {
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .eq('is_curated', false)
    .eq('couple_id', coupleId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

// Which of a couple's own plans have ever been enrolled in. A built plan the
// couple saved but never started has no couple_plans row at all, which is what
// separates "Saved for later" from "Your plans".
export async function getEnrolledPlanIds(coupleId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('couple_plans')
    .select('plan_id')
    .eq('couple_id', coupleId);

  if (error) throw error;
  return new Set((data ?? []).map((r: any) => r.plan_id as string));
}

/**
 * Delete a saved plan. plan_days cascade with it; couple_plans.plan_id does
 * NOT cascade, so a plan anyone has ever started refuses to delete and the
 * couple's history survives. That FK is the real guard: the UI only hides the
 * button.
 */
export async function deletePlan(planId: string): Promise<void> {
  const { error } = await supabase.from('plans').delete().eq('id', planId);
  if (error) throw error;
}

// Completed runs for the Plans tab's "Completed" section — newest first. A plan
// can appear more than once (re-taking is allowed); the UI dedupes by plan_id.
export async function getCompletedCouplePlans(coupleId: string) {
  const { data, error } = await supabase
    .from('couple_plans')
    .select('id, plan_id, start_date, status, current_day, plan:plans(*)')
    .eq('couple_id', coupleId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

const planStorageKey = (planId: string) => `pamwe:plan:${planId}`;

// Last-seen plan row for stale-while-revalidate: plan content is immutable
// once seeded/created, so the detail header can paint from disk on a cold
// launch while getPlan refreshes it.
export async function getPlanCached(planId: string): Promise<any | null> {
  const inSession = planCache.get(planId);
  if (inSession) return inSession;
  try {
    const v = await AsyncStorage.getItem(planStorageKey(planId));
    return v ? JSON.parse(v) : null;
  } catch {
    return null;
  }
}

export async function getPlan(planId: string) {
  const cached = planCache.get(planId);
  if (cached) return cached;
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .eq('id', planId)
    .single();

  if (error) throw error;
  planCache.set(planId, data);
  AsyncStorage.setItem(planStorageKey(planId), JSON.stringify(data)).catch(() => {});
  return data;
}

// A window of the day-by-day schedule for a plan's detail page. Text is
// intentionally omitted, and only the rendered window is fetched — M'Cheyne
// has 365 rows but the screen shows 40.
export async function getPlanDayList(planId: string, fromDay = 1, limit = 40) {
  const cacheKey = `${planId}:${fromDay}:${limit}`;
  const cached = planDaysCache.get(cacheKey);
  if (cached) return cached;
  const { data, error } = await supabase
    .from('plan_days')
    .select('day_number, passage_reference, passage_title, pull_quote_ref')
    .eq('plan_id', planId)
    .gte('day_number', fromDay)
    .order('day_number', { ascending: true })
    .limit(limit);

  if (error) throw error;
  const days = data ?? [];
  planDaysCache.set(cacheKey, days);
  return days;
}

// Explicit "Mark plan complete" from the plan detail screen. The DB trigger also
// flips status on the final mutual submit; this is the user-initiated path.
export async function completePlan(couplePlanId: string) {
  const { error } = await supabase
    .from('couple_plans')
    .update({ status: 'completed' })
    .eq('id', couplePlanId);

  if (error) throw error;
}

export async function getActiveCouPlan(coupleId: string) {
  // maybeSingle + limit(1): if a second active row ever appears despite the
  // couple_plans_one_active index, degrade to the newest instead of erroring
  // (a .single() here used to hard-fail the whole Today tab).
  const { data, error } = await supabase
    .from('couple_plans')
    .select('*, plan:plans(*)')
    .eq('couple_id', coupleId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

// Enrolling always completes any existing active enrollment first, so every
// entry point (onboarding plan-select, plan detail, Today fallbacks) is safe.
// The DB's couple_plans_one_active unique index is the backstop.
// One plan day per N calendar days. Every day suits M'Cheyne; the slower
// rhythms exist because a daily ritual is more than most couples can hold.
export type Cadence = 1 | 2 | 7;

// Labels stay short because they sit in a 3-way segmented control; the blurb
// carries the meaning.
export const CADENCE_OPTIONS: { value: Cadence; label: string; blurb: string }[] = [
  { value: 1, label: 'Every day', blurb: 'A reading a day, the way the plans are written.' },
  { value: 2, label: 'Every 2 days', blurb: 'A gentler rhythm, with room to breathe between readings.' },
  { value: 7, label: 'Once a week', blurb: 'One reading a week, for a slower season.' },
];

export async function enrollInPlan(coupleId: string, planId: string, cadenceDays: Cadence = 1) {
  const { error: completeError } = await supabase
    .from('couple_plans')
    .update({ status: 'completed' })
    .eq('couple_id', coupleId)
    .eq('status', 'active');

  if (completeError) throw completeError;

  const { data, error } = await supabase
    .from('couple_plans')
    .insert({
      couple_id: coupleId,
      plan_id: planId,
      start_date: new Date().toISOString().split('T')[0],
      current_day: 1,
      cadence_days: cadenceDays,
      status: 'active',
    })
    .select('*, plan:plans(*)')
    .single();

  if (error) {
    // 23505 on couple_plans_one_active: the partner enrolled at the same
    // moment (both land on plan-select right after pairing). Their enrollment
    // IS the couple's plan — adopt it instead of surfacing an error.
    if ((error as { code?: string }).code === '23505') {
      const existing = await getActiveCouPlan(coupleId);
      if (existing) return existing;
    }
    throw error;
  }
  return data;
}

// The current plan day, with a persistent cache so Today's anchor verse renders
// on a cold launch with no network. Plan-day content is immutable once seeded.
const planDayStorageKey = (planId: string, day: number) => `pamwe:planDay:${planId}:${day}`;

export async function getPlanDay(planId: string, dayNumber: number) {
  try {
    const { data, error } = await supabase
      .from('plan_days')
      .select('*')
      .eq('plan_id', planId)
      .eq('day_number', dayNumber)
      .single();
    if (error) throw error;
    AsyncStorage.setItem(planDayStorageKey(planId, dayNumber), JSON.stringify(data)).catch(() => {});
    return data;
  } catch (err) {
    const cached = await AsyncStorage.getItem(planDayStorageKey(planId, dayNumber)).catch(() => null);
    if (cached) {
      // A corrupt cache entry must not turn a recoverable network error into
      // a SyntaxError; fall through to the original failure instead.
      try { return JSON.parse(cached); } catch {}
    }
    throw err;
  }
}

// #23: custom-plan days ship with passage_text NULL and live-fetch it. Write
// the fetched text back so the day never hits bible-api.com again (their ~15
// request budget made repeat fetches surface as random failures). The NULL
// guard means seeded curated text can never be overwritten; RLS
// (plan_days_update_custom) additionally restricts writes to the couple's own
// custom plans. Best-effort: callers fire and forget.
export async function savePlanDayPassage(planDayId: string, passageText: string) {
  await supabase
    .from('plan_days')
    .update({ passage_text: passageText })
    .eq('id', planDayId)
    .is('passage_text', null);
}

// Change the rhythm mid-plan. Only the pace changes: the day they're on, their
// entries and their streak all stand.
export async function setPlanCadence(couplePlanId: string, cadenceDays: Cadence) {
  const { error } = await supabase
    .from('couple_plans')
    .update({ cadence_days: cadenceDays })
    .eq('id', couplePlanId);

  if (error) throw error;
}

// Called from the reveal's Amen. Guarding on the day we think we're on makes a
// double tap (or a retry after a lost response) a no-op instead of skipping a
// day, which is what the DB trigger used to do for itself.
export async function advancePlanDay(couplePlanId: string, currentDay: number) {
  const { error } = await supabase
    .from('couple_plans')
    .update({ current_day: currentDay + 1 })
    .eq('id', couplePlanId)
    .eq('current_day', currentDay);

  if (error) throw error;
}

export async function switchPlan(coupleId: string, newPlanId: string, cadenceDays: Cadence = 1) {
  // enrollInPlan completes existing actives itself now; kept as a named
  // export because the switch flow reads better at call sites.
  return enrollInPlan(coupleId, newPlanId, cadenceDays);
}

// ---------------------------------------------------------------------------
// Browse and search
//
// Search is local and synchronous over plans already fetched. A couple has a
// handful of plans and the browse list is small, so a round trip per keystroke
// would be slower and worse. It is also pure, which makes it testable.
export type SearchablePlan = {
  title?: string | null;
  subtitle?: string | null;
  tagline?: string | null;
  book_label?: string | null;
  topics?: string[] | null;
  duration_days?: number | null;
};

/** Case and punctuation insensitive tokens, so "1 Corinthians" matches "corinthians". */
function haystack(p: SearchablePlan): string {
  return [p.title, p.subtitle, p.tagline, p.book_label, ...(p.topics ?? [])]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

/**
 * Every whitespace-separated term must appear somewhere in the plan, so extra
 * words narrow rather than widen. Returns everything for an empty query.
 */
export function searchPlans<T extends SearchablePlan>(plans: T[], query: string): T[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return plans;
  return plans.filter((p) => {
    const hay = haystack(p);
    return terms.every((t) => hay.includes(t));
  });
}

/** Plans matching a topic tag and/or a length, for the browse chips. */
export function filterPlans<T extends SearchablePlan>(
  plans: T[],
  topic: string | null,
  days: number | null,
): T[] {
  return plans.filter((p) => {
    if (topic && !(p.topics ?? []).includes(topic)) return false;
    if (days && (p.duration_days ?? 0) !== days) return false;
    return true;
  });
}

/** The topics actually present in a set of plans, most common first, so the
 *  chips never offer a filter that would return nothing. */
export function topicsIn(plans: SearchablePlan[]): string[] {
  const counts = new Map<string, number>();
  for (const p of plans) {
    for (const t of p.topics ?? []) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([t]) => t);
}

/** Everything browsable: our curated plans plus any that have been offered
 *  publicly. Not cached like getCuratedPlans, because the public set grows. */
export async function getBrowsablePlans() {
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .or('is_curated.eq.true,is_public.eq.true')
    .order('duration_days', { ascending: true })
    .order('title', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/** How many couples have read each plan. Goes through an RPC because
 *  couple_plans is readable only for your own couple, and the function answers
 *  only for plans that are actually offered publicly. */
export async function getReaderCounts(planIds: string[]): Promise<Record<string, number>> {
  if (planIds.length === 0) return {};
  const { data, error } = await supabase.rpc('plan_reader_counts', { p_plan_ids: planIds });
  if (error) return {}; // a missing count is a missing caption, never a broken page
  const out: Record<string, number> = {};
  for (const row of (data ?? []) as any[]) out[row.plan_id] = row.couples;
  return out;
}

/** Mint (or reuse) the share link for a plan this couple built. */
export async function sharePlan(planId: string): Promise<string> {
  const { data, error } = await supabase.rpc('share_plan', { p_plan_id: planId });
  if (error) throw error;
  return `pamwe://plan/${data}`;
}

export type SharedPlanPreview = {
  id: string;
  title: string;
  subtitle: string | null;
  tagline: string | null;
  duration_days: number;
  topics: string[];
  couples: number;
};

/** Read a shared plan from its token, for the accept screen. Returns null when
 *  the link is stale or wrong, which the screen reports rather than crashing. */
export async function getSharedPlan(token: string): Promise<SharedPlanPreview | null> {
  const { data, error } = await supabase.rpc('get_shared_plan', { p_token: token });
  if (error) return null;
  const row = Array.isArray(data) ? data[0] : data;
  return row ?? null;
}
