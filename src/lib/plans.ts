import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

export async function getPlans() {
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}

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

// Completed runs for the Plans tab's "Completed" section — newest first. A plan
// can appear more than once (re-taking is allowed); the UI dedupes by plan_id.
export async function getCompletedCouplePlans(coupleId: string) {
  const { data, error } = await supabase
    .from('couple_plans')
    .select('id, plan_id, start_date, status, plan:plans(*)')
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
export async function enrollInPlan(coupleId: string, planId: string) {
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

export async function getPlanDay(planId: string, dayNumber: number) {
  const { data, error } = await supabase
    .from('plan_days')
    .select('*')
    .eq('plan_id', planId)
    .eq('day_number', dayNumber)
    .single();

  if (error) throw error;
  return data;
}

export async function advancePlanDay(couplePlanId: string, currentDay: number) {
  const { error } = await supabase
    .from('couple_plans')
    .update({ current_day: currentDay + 1 })
    .eq('id', couplePlanId);

  if (error) throw error;
}

export async function switchPlan(coupleId: string, newPlanId: string) {
  // enrollInPlan completes existing actives itself now; kept as a named
  // export because the switch flow reads better at call sites.
  return enrollInPlan(coupleId, newPlanId);
}
