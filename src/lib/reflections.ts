import { supabase } from './supabase';
import { parseReference } from './bible';

export type ReflectionSummary = {
  id: string; // `${couplePlanId}_${dayNumber}` — the detail route param
  couplePlanId: string;
  planId: string | null;
  planTitle: string;
  dayNumber: number;
  reference: string;
  title: string | null;
  book: string;
  snippet: string;
  revealedAt: string;
};

const ENTRY_COLS = 'id, couple_plan_id, day_number, user_id, entry_type, text_content, audio_url, audio_duration_seconds, submitted_at';

// A reflection appears in the history only once BOTH partners have submitted for that
// day. RLS already hides a partner's entry until mutual submit, so a day is "revealed"
// exactly when we can see two entries for it (mine + partner's). Non-mutual days
// surface only my own entry → dropped here.
export async function getRevealedReflections(coupleId: string): Promise<ReflectionSummary[]> {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return [];
  const meId = user.id;

  // One round trip for the lead-in: entries joined to their couple_plans row.
  // This used to be two sequential queries just to conclude "no reflections
  // yet", which made the empty state as slow as a full load.
  const { data: entries, error: eErr } = await supabase
    .from('entries')
    .select(`${ENTRY_COLS}, couple_plan:couple_plans!inner(plan_id, couple_id)`)
    .eq('couple_plan.couple_id', coupleId)
    .not('submitted_at', 'is', null);
  if (eErr) throw eErr;
  if (!entries || entries.length === 0) return [];

  // Group by (couple_plan_id, day_number), keeping only mutual pairs.
  const groups = new Map<string, { cpId: string; planId: string | null; day: number; mine?: any; partner?: any }>();
  for (const e of entries) {
    const key = `${e.couple_plan_id}_${e.day_number}`;
    let g = groups.get(key);
    if (!g) {
      g = { cpId: e.couple_plan_id, planId: (e as any).couple_plan?.plan_id ?? null, day: e.day_number };
      groups.set(key, g);
    }
    if (e.user_id === meId) g.mine = e; else g.partner = e;
  }
  const pairs = [...groups.values()].filter((g) => g.mine && g.partner);
  if (pairs.length === 0) return [];

  // Batch-fetch plan_days per plan for the references/titles.
  const byPlan = new Map<string, Set<number>>();
  for (const g of pairs) {
    if (!g.planId) continue;
    (byPlan.get(g.planId) ?? byPlan.set(g.planId, new Set()).get(g.planId)!).add(g.day);
  }
  const planDay = new Map<string, any>(); // `${planId}_${day}`
  const planTitle = new Map<string, string>();
  for (const [planId, days] of byPlan) {
    const [pdRes, pRes] = await Promise.all([
      supabase.from('plan_days').select('day_number, passage_reference, passage_title').eq('plan_id', planId).in('day_number', [...days]),
      supabase.from('plans').select('title').eq('id', planId).single(),
    ]);
    for (const pd of pdRes.data ?? []) planDay.set(`${planId}_${pd.day_number}`, pd);
    if (pRes.data?.title) planTitle.set(planId, pRes.data.title);
  }

  const items: ReflectionSummary[] = pairs.map((g) => {
    const planId = g.planId;
    const pd = planId ? planDay.get(`${planId}_${g.day}`) : null;
    const reference = pd?.passage_reference ?? `Day ${g.day}`;
    const textEntry = g.mine.entry_type === 'text' ? g.mine : g.partner.entry_type === 'text' ? g.partner : null;
    const snippet = textEntry?.text_content?.trim() || 'A voice reflection';
    const revealedAt = [g.mine.submitted_at, g.partner.submitted_at].sort().reverse()[0];
    return {
      id: `${g.cpId}_${g.day}`,
      couplePlanId: g.cpId,
      planId,
      planTitle: (planId && planTitle.get(planId)) || 'Reading plan',
      dayNumber: g.day,
      reference,
      title: pd?.passage_title ?? null,
      book: parseReference(reference)?.book.name ?? reference,
      snippet,
      revealedAt,
    };
  });

  items.sort((a, b) => (a.revealedAt < b.revealedAt ? 1 : -1));
  return items;
}

// Full detail for one revealed day (re-fetched fresh for the detail screen).
export async function getReflectionDetail(couplePlanId: string, dayNumber: number) {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  const meId = user?.id;

  const { data: cp } = await supabase.from('couple_plans').select('plan_id').eq('id', couplePlanId).single();
  const planId = cp?.plan_id ?? null;

  const [pdRes, eRes, pRes] = await Promise.all([
    planId
      ? supabase.from('plan_days').select('passage_reference, passage_title, passage_text, reflection_prompt').eq('plan_id', planId).eq('day_number', dayNumber).single()
      : Promise.resolve({ data: null }),
    supabase.from('entries').select(ENTRY_COLS).eq('couple_plan_id', couplePlanId).eq('day_number', dayNumber).not('submitted_at', 'is', null),
    planId ? supabase.from('plans').select('title').eq('id', planId).single() : Promise.resolve({ data: null }),
  ]);

  const entries = (eRes as any).data ?? [];
  return {
    planId,
    dayNumber,
    planTitle: (pRes as any).data?.title ?? 'Reading plan',
    planDay: (pdRes as any).data,
    mine: entries.find((e: any) => e.user_id === meId) ?? null,
    partner: entries.find((e: any) => e.user_id !== meId) ?? null,
  };
}
