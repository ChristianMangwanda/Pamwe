import { swatches } from '../theme/tokens';

// Per-plan banner tint. The soft highlight swatches are theme-independent and
// read gently in both light and dark. Curated plans get an intentional color by
// theme; everything else gets a stable color hashed from its id so a couple's
// custom plans stay visually consistent between sessions.

const PALETTE = [swatches.amber, swatches.rose, swatches.sage, swatches.sky] as const;

// Keyword hints for the curated catalog (matched case-insensitively on title).
const KEYWORD_TINT: { match: string; tint: string }[] = [
  { match: 'psalm', tint: swatches.sky },   // comfort, water
  { match: 'john', tint: swatches.amber },  // gospel warmth
  { match: 'cord', tint: swatches.rose },   // togetherness
  { match: 'love', tint: swatches.rose },
  { match: "m'cheyne", tint: swatches.sage },
  { match: 'mcheyne', tint: swatches.sage },
];

function hashPick(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length];
}

export function bannerTintForPlan(plan: { id?: string; title?: string } | null | undefined): string {
  if (!plan) return PALETTE[0];
  const title = (plan.title ?? '').toLowerCase();
  const keyed = KEYWORD_TINT.find((k) => title.includes(k.match));
  if (keyed) return keyed.tint;
  return hashPick(plan.id ?? title);
}
