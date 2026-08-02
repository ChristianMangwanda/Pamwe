// The award ladder: a tree for every stretch of plans a couple finishes
// together, from somewhere in the world, each bigger than the last.
//
// Six species, because six are drawn. The seventh rung ships when a real couple
// is near the redwood, and above it the path keeps going unlabelled rather than
// ending, which is the one thing the previous ladder got wrong: it capped at 3
// and then said "In full bloom" forever.
//
// THRESHOLDS ARE DELIBERATELY WIDE (Christian, 2026-08-02). Measured against
// the only real couple on hosted: 15 reading days sealed in the 20 days since
// they started, which is 0.75 reading days per calendar day, or roughly 23
// finished plans a year at a 12-day average plan. So the fig lands around two
// and a half months in, the oak inside the first year, and the redwood is a
// four-year walk. The doubling shape is the point: the early trees arrive while
// encouragement still matters, and the last two stay genuinely rare.
//
// No supabase import on purpose: it is a pure function of a count, so it unit
// tests as the plain data it is.

export type TreeAward = {
  id: string;
  name: string;
  threshold: number;
  /** One line, shown when the tree is theirs. */
  line: string;
  /** Natural height on the Grove path, in design units (the 400pt-wide scene). */
  height: number;
  /** width / height of the artwork, so the scene never distorts it. */
  ratio: number;
};

export const TREE_AWARDS: TreeAward[] = [
  {
    id: 'fig',
    name: 'Fig tree',
    threshold: 5,
    line: 'Five plans finished together, and a fig tree planted.',
    height: 96,
    ratio: 1.02,
  },
  {
    id: 'olive',
    name: 'Olive tree',
    threshold: 10,
    line: 'Ten plans finished. Olive trees grow slowly and last for centuries.',
    height: 116,
    ratio: 1.067,
  },
  {
    id: 'oak',
    name: 'Oak',
    threshold: 20,
    line: 'Twenty plans finished. Oaks hold their ground for hundreds of years.',
    height: 150,
    ratio: 0.929,
  },
  {
    id: 'baobab',
    name: 'Baobab',
    threshold: 40,
    line: 'Forty plans finished. The baobab carries whole seasons in its trunk.',
    height: 186,
    ratio: 0.811,
  },
  {
    id: 'cedar',
    name: 'Cedar of Lebanon',
    threshold: 80,
    line: 'Eighty plans finished. Cedars crowned the mountains of Lebanon.',
    height: 232,
    ratio: 0.453,
  },
  {
    id: 'redwood',
    name: 'Redwood',
    threshold: 100,
    line: 'A hundred plans finished. Redwoods are the tallest living things on Earth.',
    height: 290,
    ratio: 0.753,
  },
];

/** The biggest tree earned so far, or null before the first one is planted. */
export function currentAward(finishedPlans: number): TreeAward | null {
  let earned: TreeAward | null = null;
  for (const award of TREE_AWARDS) {
    if (finishedPlans >= award.threshold) earned = award;
  }
  return earned;
}

/** The next tree to reach, or null once the redwood is standing. */
export function nextAward(finishedPlans: number): TreeAward | null {
  return TREE_AWARDS.find((a) => finishedPlans < a.threshold) ?? null;
}

/** Every tree already planted, in ladder order. */
export function earnedAwards(finishedPlans: number): TreeAward[] {
  return TREE_AWARDS.filter((a) => finishedPlans >= a.threshold);
}

export type TreeStage = 0 | 1 | 2 | 3 | 4 | 5;

// The legacy StreakTree drawing has six stages and the ladder has six rungs, so
// they map one to one. It still backs the completion screen until the arrival
// sequence replaces it.
export function awardStage(finishedPlans: number): TreeStage {
  const i = TREE_AWARDS.findIndex((a) => a.id === currentAward(finishedPlans)?.id);
  return (i < 0 ? 0 : Math.min(5, i + 1)) as TreeStage;
}
