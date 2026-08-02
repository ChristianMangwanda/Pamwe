import { supabase } from './supabase';

export type FinishedPlan = {
  couplePlanId: string;
  planId: string;
  title: string;
  durationDays: number;
  cadenceDays: number;
  /** When the last entry on it was sealed, which is when it actually ended. */
  finishedOn: string | null;
};

/**
 * Whether a retired enrolment was actually finished, or merely abandoned.
 *
 * "Finished" means current_day reached the plan's last day. NOT status =
 * 'completed': enrollInPlan marks the outgoing plan completed every time a
 * couple switches, so status alone counts abandonments as finishes. The first
 * couple to hit this had three 'completed' rows, two of them sitting at
 * current_day = 1 with no entries at all. Counting those would have grown the
 * tree to full and handed out a badge for plans nobody read.
 */
export function isFinished(row: {
  current_day?: number | null;
  plan?: { duration_days?: number | null } | null;
}): boolean {
  const duration = row.plan?.duration_days ?? 0;
  return duration > 0 && (row.current_day ?? 0) >= duration;
}

async function finishedRows(coupleId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('couple_plans')
    .select('id, plan_id, current_day, cadence_days, created_at, plan:plans(title, duration_days)')
    .eq('couple_id', coupleId)
    .eq('status', 'completed');

  if (error) throw error;
  // Cast because supabase-js types an embedded table as an array without
  // generated types. A many-to-one join returns an object at runtime, which is
  // what every other plan:plans(...) read in the app already relies on.
  return (data ?? []).filter((cp: any) => isFinished(cp));
}

export async function finishedPlanCount(coupleId: string): Promise<number> {
  return (await finishedRows(coupleId)).length;
}

/**
 * Every plan the couple read to the end, newest finish first.
 *
 * couple_plans has no completed_at, so a finish is taken from the last sealed
 * entry on it. That is the moment the couple actually ended it, rather than
 * created_at, which is when they started.
 */
export async function finishedPlans(coupleId: string): Promise<FinishedPlan[]> {
  const rows = await finishedRows(coupleId);
  if (rows.length === 0) return [];

  const { data: entries, error } = await supabase
    .from('entries')
    .select('couple_plan_id, submitted_at')
    .in('couple_plan_id', rows.map((r) => r.id))
    .not('submitted_at', 'is', null);

  if (error) throw error;

  const sealedLast = new Map<string, string>();
  for (const e of (entries ?? []) as any[]) {
    const prev = sealedLast.get(e.couple_plan_id);
    if (!prev || e.submitted_at > prev) sealedLast.set(e.couple_plan_id, e.submitted_at);
  }

  // Newest finish first, falling back to enrolment order for a finished plan
  // with no readable entries (RLS hides a partner's unrevealed day).
  return [...rows]
    .sort((a, b) => {
      const av = sealedLast.get(a.id) ?? a.created_at;
      const bv = sealedLast.get(b.id) ?? b.created_at;
      return av < bv ? 1 : -1;
    })
    .map((row) => ({
      couplePlanId: row.id,
      planId: row.plan_id,
      title: row.plan?.title ?? 'your plan',
      durationDays: row.plan?.duration_days ?? row.current_day ?? 0,
      cadenceDays: row.cadence_days ?? 1,
      finishedOn: sealedLast.get(row.id) ?? null,
    }));
}

/** The most recently finished plan, for Today's empty state. */
export async function lastFinishedPlan(coupleId: string): Promise<FinishedPlan | null> {
  return (await finishedPlans(coupleId))[0] ?? null;
}
