import { TREE_AWARDS, TreeAward, currentAward, earnedAwards, nextAward } from './treeAwards';

// The Grove is one scene seen end to end, not a list: a path climbing from
// where a couple started to where they stand, with a tree rooted at every
// threshold they passed and the trees still ahead standing pale further up.
//
// All geometry is in DESIGN UNITS on a 400-wide canvas (Claude Design's
// handoff). Screens scale by deviceWidth / SCENE_W, so a wider phone gets a
// bigger walk rather than a differently shaped one.

export const SCENE_W = 400;
export const SCENE_H = 1930;

/** Where the walk starts, measured UP from the bottom of the scene. */
const START = 60;
/** Where the last tree stands. Above it the path continues, unlabelled. */
const TOP_BASE = 1470;

/**
 * Where each tree is rooted, DERIVED from the ladder rather than hardcoded.
 *
 * The handoff shipped fixed positions tuned for thresholds 1,2,3,5,8,13, where
 * the first tree was one plan away and the opening stretch was meant to be
 * crossed almost at once. Under the real ladder the opening stretch is five
 * plans, months of reading, and on the fixed spacing it was a 60 unit sliver of
 * a 1930 unit scene: the prints barely moved during the one stretch most
 * couples are actually walking.
 *
 * Distance follows the square root of the plans in each stretch, so a longer
 * climb is visibly longer without the 40 plan stretch swallowing the scene.
 * Change a threshold in treeAwards and the walk re-spaces itself.
 */
const BASE: number[] = (() => {
  const gaps = TREE_AWARDS.map((a, i) => a.threshold - (i ? TREE_AWARDS[i - 1].threshold : 0));
  const weights = gaps.map((g) => Math.sqrt(Math.max(1, g)));
  const total = weights.reduce((s, w) => s + w, 0);
  let acc = 0;
  return weights.map((w) => {
    acc += w;
    return Math.round(START + (acc / total) * (TOP_BASE - START));
  });
})();

/** The path meanders instead of running straight, so the walk reads as a walk. */
export function pathX(y: number): number {
  return 195 + 22 * Math.sin(y / 230);
}

export type SceneTree = {
  award: TreeAward;
  earned: boolean;
  left: number;
  bottom: number;
  width: number;
  height: number;
  /** Label sits above the tree, aligned to whichever side of the path it stands on. */
  labelLeft: number;
  labelWidth: number;
  labelAlign: 'flex-start' | 'flex-end' | 'center';
  a11y: string;
};

export type Footprint = {
  key: string;
  /** 'a' is the left foot, 'b' the right. */
  foot: 'a' | 'b';
  left: number;
  bottom: number;
  width: number;
  height: number;
  rotate: number;
  opacity: number;
};

/**
 * How far up the path the couple has walked, and how far the current streak
 * carries them past it.
 *
 * `walked` stops at the last tree they planted. `advance` is the ground being
 * covered right now: reading days push the prints toward the next tree without
 * ever planting it, which is how day streaks live here without minting a second
 * kind of trophy.
 */
export function walkFor(finishedPlans: number, streakDays: number) {
  const earned = earnedAwards(finishedPlans);
  const next = nextAward(finishedPlans);
  const lastBase = earned.length ? BASE[earned.length - 1] : START;
  const lastThreshold = earned.length ? earned[earned.length - 1].threshold : 0;

  if (!next) return { earned, next, walked: BASE[BASE.length - 1], advance: 0 };

  const nextBase = BASE[TREE_AWARDS.indexOf(next)];
  const span = Math.max(1, next.threshold - lastThreshold);
  const done = Math.max(0, finishedPlans - lastThreshold);
  const gap = nextBase - lastBase;

  // FINISHED PLANS carry the solid prints, because they are the real distance
  // covered. The handoff moved the prints on streak alone, which was fine when
  // the next tree was one plan away; at gaps of 5 to 40 plans it meant a couple
  // four fifths of the way to their fig looked exactly like one who had just
  // started. Never all the way: arriving is what planting is for.
  const walked = lastBase + (done / span) * gap * 0.82;

  // The streak then covers a little more ground on top, at half strength. It
  // moves you, it never plants anything.
  const room = nextBase - walked;
  const advance = (Math.min(streakDays, 120) / 120) * room * 0.6;

  return { earned, next, walked, advance };
}

export function sceneTrees(finishedPlans: number): SceneTree[] {
  return TREE_AWARDS.map((award, i) => {
    const earned = finishedPlans >= award.threshold;
    const last = i === TREE_AWARDS.length - 1;
    const maxW = last ? 240 : 140;
    let height = award.height;
    let width = Math.round(height * award.ratio);
    if (width > maxW) {
      width = maxW;
      height = Math.round(maxW / award.ratio);
    }
    const bottom = BASE[i];
    const px = pathX(bottom);
    // Alternate sides so the walk weaves between them; the last is centred
    // because it is the one you are meant to stop in front of.
    const side = i % 2 === 0 ? -1 : 1;
    const left = last
      ? Math.round(195 - width / 2)
      : side === -1
        ? Math.max(4, Math.round(px - 32 - width))
        : Math.min(SCENE_W - 14 - width, Math.round(px + 32));

    const labelWidth = Math.max(96, width);
    const labelLeft = Math.max(
      6,
      Math.min(
        SCENE_W - 16 - labelWidth,
        last ? Math.round(195 - labelWidth / 2) : side === -1 ? left : left + width - labelWidth,
      ),
    );

    return {
      award,
      earned,
      left,
      bottom,
      width,
      height,
      labelLeft,
      labelWidth,
      labelAlign: last ? 'center' : side === -1 ? 'flex-start' : 'flex-end',
      a11y: earned
        ? `${award.name}, planted`
        : `${award.name}, not planted yet, unlocks at ${award.threshold} plans`,
    };
  });
}

/**
 * Prints behind you are solid, the stretch your streak is covering is half
 * strength, and the route you have not walked sits faint until you do.
 */
export function footprints(finishedPlans: number, streakDays: number): Footprint[] {
  const { walked, advance } = walkFor(finishedPlans, streakDays);
  const out: Footprint[] = [];
  const top = BASE[BASE.length - 1] - 40;
  let n = 0;
  for (let y = 40; y < top; y += 30) {
    const px = pathX(y);
    const behind = y <= walked;
    const fresh = !behind && y <= walked + advance;
    const opacity = behind ? 1 : fresh ? 0.5 : 0.14;
    const h = behind || fresh ? 17 : 14;
    const w = Math.round(h * 0.62);
    out.push({
      key: `l${n}`, foot: 'a', left: Math.round(px - 8 - w / 2), bottom: Math.round(y - h / 2),
      width: w, height: h, rotate: -7, opacity,
    });
    out.push({
      key: `r${n}`, foot: 'b', left: Math.round(px + 8 - w / 2), bottom: Math.round(y + 15 - h / 2),
      width: w, height: h, rotate: 7, opacity: opacity * 0.9,
    });
    n++;
  }
  return out;
}

// ---- The arrival: the moment a tree is planted, on the completion screen ----
//
// The same walk, cropped to its last stretch, on its own 300 x 370 canvas. The
// tree before this one sits small and pale at the foot of the path, the prints
// climb past where the new tree stands, and the tree grows last.
//
// The prints climb ABOVE the new tree rather than stopping at it, which is
// deliberate and is the handoff's own composition: you came up through here,
// the tree marks it, and the path carries on. Nothing about a planted tree is
// an ending.

export const ARRIVAL_W = 300;
export const ARRIVAL_H = 370;
/** Twelve prints, six strides: the last stretch, at walking pace. */
export const ARRIVAL_STEPS = 12;

export type ArrivalBox = { left: number; bottom: number; width: number; height: number };
export type ArrivalStep = ArrivalBox & { key: string; foot: 'a' | 'b'; rotate: number };
export type Arrival = {
  tree: ArrivalBox;
  /** The tree before this one. Null for the fig, which has nothing behind it. */
  prev: (ArrivalBox & { id: string }) | null;
  steps: ArrivalStep[];
};

export function arrivalScene(award: TreeAward): Arrival {
  // Big enough to be the subject, never so big it leaves the canvas. The cedar
  // is the narrow one and the fig the wide one, so both bounds matter.
  let height = Math.min(200, award.height);
  let width = Math.round(height * award.ratio);
  if (width > 150) {
    width = 150;
    height = Math.round(150 / award.ratio);
  }

  const i = TREE_AWARDS.indexOf(award);
  const before = i > 0 ? TREE_AWARDS[i - 1] : null;

  const steps: ArrivalStep[] = [];
  for (let n = 0; n < ARRIVAL_STEPS; n++) {
    const right = n % 2 === 1;
    steps.push({
      key: `s${n}`,
      foot: right ? 'b' : 'a',
      left: Math.round(116 + (right ? 8 : -8) - 6),
      bottom: 50 + n * 24 + (right ? 12 : 0),
      width: 12,
      height: 20,
      rotate: right ? 7 : -7,
    });
  }

  return {
    tree: { left: Math.round(200 - width / 2), bottom: 56, width, height },
    prev: before
      ? { id: before.id, left: 6, bottom: 0, width: Math.round(64 * before.ratio), height: 64 }
      : null,
    steps,
  };
}

/** What the planting is called, as a sentence on its own. */
export function arrivalHeadline(award: TreeAward): string {
  // Only the first letter drops case, so "Cedar of Lebanon" keeps its Lebanon.
  const name = award.name.charAt(0).toLowerCase() + award.name.slice(1);
  return `${'aeiou'.includes(name[0]) ? 'An' : 'A'} ${name}.`;
}

const WORDS = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
];
/** Small numbers read better as words in this voice; big ones stay numerals. */
export function word(n: number): string {
  return WORDS[n] ?? String(n);
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** The line under the Grove title, for every fill state. */
export function groveSubtitle(finishedPlans: number): string {
  const earned = earnedAwards(finishedPlans);
  const next = nextAward(finishedPlans);
  if (earned.length === 0) {
    const togo = TREE_AWARDS[0].threshold - finishedPlans;
    if (finishedPlans === 0) {
      return 'Nothing planted yet. Finish five reading plans together and a fig tree goes in the ground.';
    }
    return `Nothing planted yet, but the path is under way. ${cap(word(togo))} more ${togo === 1 ? 'plan' : 'plans'} and a fig tree goes in the ground.`;
  }
  const last = earned[earned.length - 1];
  if (!next) {
    return 'Six trees, the whole walk. A hundred plans finished, and above the redwood the path keeps going.';
  }
  const togo = next.threshold - finishedPlans;
  const before = earned.length - 1;
  const head = before === 0 ? `${last.name}, standing.` : `${last.name}, and ${word(before)} before it.`;
  return `${head} ${next.name} at ${next.threshold} plans, ${togo === 1 ? 'one plan to go.' : `${togo} plans to go.`}`;
}

/**
 * The line under the ledger. Reading days move the prints, so this is where the
 * streak reports for duty.
 *
 * "Unbroken" was the design's word and it is retired: the streak counts READING
 * DAYS COMPLETED with a four-day forgiveness window, so a couple can hold 15
 * while missing calendar days, and calling that unbroken claims more than the
 * number knows.
 */
export function streakFoot(streakDays: number, finishedPlans: number): string {
  const next = nextAward(finishedPlans);
  if (streakDays <= 0) return 'Read together and the prints start moving again.';
  const days = `${streakDays} ${streakDays === 1 ? 'day' : 'days'}`;
  if (!next) return `${days} in the Word together, and still walking.`;
  const target = next.name.toLowerCase().replace('cedar of lebanon', 'cedar');
  if (streakDays >= 100) return `${days} in the Word together. The prints are almost at the ${target}.`;
  if (streakDays >= 30) return `${days} in the Word together. The prints are well past your last tree.`;
  if (streakDays >= 7) return `${days} in the Word together. Fresh prints ahead of your last tree.`;
  return `${days} in the Word together. Keep reading and the prints go on ahead.`;
}

/** The You tab card: a crop of the same walk, not a portrait of one tree. */
export function cardCopy(finishedPlans: number) {
  const earned = earnedAwards(finishedPlans);
  const next = nextAward(finishedPlans);
  const title = earned.length ? earned[earned.length - 1].name : 'Your grove';
  const pill = earned.length
    ? `${finishedPlans} ${finishedPlans === 1 ? 'plan' : 'plans'}`
    : finishedPlans > 0
      ? `${finishedPlans} ${finishedPlans === 1 ? 'plan' : 'plans'}`
      : 'Not started';
  const caption = !next
    ? 'Six trees standing. The path keeps going.'
    : earned.length
      ? `Next tree at ${next.threshold} plans: ${next.name.toLowerCase()}.`
      : finishedPlans > 0
        ? `${next.threshold - finishedPlans} more and a fig tree goes in the ground.`
        : 'Finish a plan together and the walk begins.';
  return { title, pill, caption, earned, next };
}

export { currentAward, nextAward, earnedAwards };
