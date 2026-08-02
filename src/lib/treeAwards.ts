// The award ladder: a tree for every plan a couple finishes together, from
// somewhere in the world, each bigger than the last.
//
// This replaces a ceiling. The tree used to run out at 3 finished plans and
// then say "In full bloom" forever, which turned the one milestone the app
// really has into something you could exhaust in a season. Trees do not stop
// growing, and neither should the record of two people reading together.
//
// No supabase import on purpose, like StreakTree: it is a pure function of a
// count, so it unit tests as the plain data it is.

export type TreeAward = {
  key: string;
  name: string;
  threshold: number;
  /** One line, shown when the tree is theirs. */
  line: string;
};

export const TREE_AWARDS: TreeAward[] = [
  { key: 'fig', name: 'Fig tree', threshold: 1, line: 'Your first plan finished together, and a fig tree planted.' },
  { key: 'olive', name: 'Olive tree', threshold: 2, line: 'Two plans finished. Olive trees grow slowly and last for centuries.' },
  { key: 'jacaranda', name: 'Jacaranda', threshold: 3, line: 'Three plans finished. The jacaranda turns whole streets purple.' },
  { key: 'oak', name: 'Oak', threshold: 5, line: 'Five plans finished. Oaks hold their ground for hundreds of years.' },
  { key: 'baobab', name: 'Baobab', threshold: 8, line: 'Eight plans finished. The baobab carries whole seasons in its trunk.' },
  { key: 'cedar', name: 'Cedar of Lebanon', threshold: 12, line: 'Twelve plans finished. Cedars crowned the mountains of Lebanon.' },
  { key: 'redwood', name: 'Redwood', threshold: 20, line: 'Twenty plans finished. Redwoods are the tallest living things on Earth.' },
];

/** The biggest tree earned so far, or null before the first finished plan. */
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

export type TreeStage = 0 | 1 | 2 | 3 | 4 | 5;

// The drawing has six stages and the ladder has seven rungs, so the last three
// share full bloom. The picture saturates; the award does not, which is the
// point: past the oak the tree's NAME is what keeps growing.
const STAGE_BY_KEY: Record<string, TreeStage> = {
  fig: 2, olive: 3, jacaranda: 4, oak: 5, baobab: 5, cedar: 5, redwood: 5,
};

export function awardStage(finishedPlans: number): TreeStage {
  const award = currentAward(finishedPlans);
  return award ? STAGE_BY_KEY[award.key] : 0;
}
