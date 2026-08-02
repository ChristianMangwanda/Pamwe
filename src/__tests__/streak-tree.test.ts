import { treeStage, stemTopFor } from '../components/ui/StreakTree';
import { TREE_AWARDS } from '../lib/treeAwards';

// The tree counts FINISHED PLANS now, not days read. It used to sit on Today
// beside the streak bar telling the same story twice, so it moved to the
// completion screen and the You tab, where a rarer thing carries more weight.
//
// The drawing has six stages and the award ladder has more rungs than that, so
// the picture saturates while the award name keeps growing. These are written
// against TREE_AWARDS rather than hardcoded counts.

// The drawing tops out at the cedar; the redwood shares full bloom with it.
const FULL_AT = TREE_AWARDS.find((a) => a.id === 'cedar')!.threshold;
const TOP = TREE_AWARDS[TREE_AWARDS.length - 1].threshold;

describe('treeStage over finished plans', () => {
  it('is a resting seed before the first plan is finished', () => {
    expect(treeStage(0)).toBe(0);
  });

  it('shows growth once the first tree is planted', () => {
    // A couple who finished a whole plan must never still look unplanted.
    expect(treeStage(TREE_AWARDS[0].threshold)).toBeGreaterThan(0);
  });

  it('reaches full bloom at the cedar', () => {
    expect(treeStage(FULL_AT)).toBe(5);
  });

  it('stays at full however many plans follow', () => {
    expect(treeStage(FULL_AT + 1)).toBe(5);
    expect(treeStage(TOP * 10)).toBe(5);
  });

  it('never goes backwards as plans accumulate', () => {
    for (let n = 1; n <= TOP + 5; n++) {
      expect(treeStage(n)).toBeGreaterThanOrEqual(treeStage(n - 1));
    }
  });

  it('treats a negative count as unplanted rather than throwing', () => {
    expect(treeStage(-1)).toBe(0);
  });
});

describe('stemTopFor', () => {
  // Lower y is taller: the viewBox puts the ground at y=72 and the stem grows up.
  it('is shortest unplanted and tallest in full bloom', () => {
    expect(stemTopFor(0)).toBe(70);
    expect(stemTopFor(FULL_AT)).toBe(20);
  });

  it('never shrinks as plans accumulate', () => {
    for (let n = 1; n <= TOP + 5; n++) {
      expect(stemTopFor(n)).toBeLessThanOrEqual(stemTopFor(n - 1));
    }
  });

  it('stays inside the viewBox at any count', () => {
    for (const n of [0, 1, FULL_AT, TOP, 99]) {
      expect(stemTopFor(n)).toBeGreaterThanOrEqual(20);
      expect(stemTopFor(n)).toBeLessThanOrEqual(70);
    }
  });
});
