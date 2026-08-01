import { treeStage, stemTopFor, TREE_FULL_AT } from '../components/ui/StreakTree';

// The tree counts FINISHED PLANS now, not days read. It used to sit on Today
// beside the streak bar telling the same story twice, so it moved to the
// completion screen and the You tab, where a rarer thing carries more weight.
//
// These are written against TREE_FULL_AT rather than hardcoded counts, so
// recalibrating the ceiling does not mean rewriting the suite.

describe('treeStage over finished plans', () => {
  it('is a resting seed before the first plan is finished', () => {
    expect(treeStage(0)).toBe(0);
  });

  it('shows growth for the very first finished plan', () => {
    // A couple who finished a whole plan must never still look unplanted.
    expect(treeStage(1)).toBeGreaterThan(0);
  });

  it('reaches full bloom exactly at the ceiling', () => {
    expect(treeStage(TREE_FULL_AT)).toBe(5);
  });

  it('stays at full however many plans follow', () => {
    expect(treeStage(TREE_FULL_AT + 1)).toBe(5);
    expect(treeStage(TREE_FULL_AT * 10)).toBe(5);
  });

  it('never goes backwards as plans accumulate', () => {
    for (let n = 1; n <= TREE_FULL_AT * 2; n++) {
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
    expect(stemTopFor(TREE_FULL_AT)).toBe(20);
  });

  it('never shrinks as plans accumulate', () => {
    for (let n = 1; n <= TREE_FULL_AT * 2; n++) {
      expect(stemTopFor(n)).toBeLessThanOrEqual(stemTopFor(n - 1));
    }
  });

  it('stays inside the viewBox at any count', () => {
    for (const n of [0, 1, TREE_FULL_AT, 99]) {
      expect(stemTopFor(n)).toBeGreaterThanOrEqual(20);
      expect(stemTopFor(n)).toBeLessThanOrEqual(70);
    }
  });
});
