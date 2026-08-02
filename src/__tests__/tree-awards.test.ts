import { TREE_AWARDS, currentAward, nextAward, awardStage } from '../lib/treeAwards';

// The ladder replaced a ceiling of 3 finished plans, past which the tree said
// "In full bloom" forever. What matters here is that it keeps going and never
// goes backwards.

describe('TREE_AWARDS', () => {
  it('is ordered by threshold, strictly ascending', () => {
    for (let i = 1; i < TREE_AWARDS.length; i++) {
      expect(TREE_AWARDS[i].threshold).toBeGreaterThan(TREE_AWARDS[i - 1].threshold);
    }
  });

  it('gates the first tree behind a real stretch of reading', () => {
    // Christian's call, 2026-08-02: the fig is at 5 so a tree means something.
    // If this ever drops to 1 again it should be a deliberate decision, not a
    // drift, which is what this assertion is here to catch.
    expect(TREE_AWARDS[0].threshold).toBe(5);
  });

  it('widens the gaps as it climbs, so the last trees stay rare', () => {
    const gaps = TREE_AWARDS.slice(1).map((a, i) => a.threshold - TREE_AWARDS[i].threshold);
    for (let i = 1; i < gaps.length - 1; i++) {
      expect(gaps[i]).toBeGreaterThanOrEqual(gaps[i - 1]);
    }
  });

  it('has no em dashes in any user-facing line', () => {
    for (const a of TREE_AWARDS) {
      expect(a.line).not.toContain('—');
      expect(a.name).not.toContain('—');
    }
  });
});

describe('currentAward', () => {
  it('is nothing before the first plan is finished', () => {
    expect(currentAward(0)).toBeNull();
    expect(currentAward(-1)).toBeNull();
  });

  it('awards exactly at each threshold', () => {
    for (const a of TREE_AWARDS) {
      expect(currentAward(a.threshold)?.id).toBe(a.id);
    }
  });

  it('holds the previous tree between thresholds', () => {
    // 12 sits between the olive (10) and the oak (20).
    expect(currentAward(12)?.id).toBe('olive');
  });

  it('plants nothing before the first threshold, however close', () => {
    // The first tree is at 5, so four finished plans still show an empty grove.
    expect(currentAward(4)).toBeNull();
  });

  it('stays on the last tree well past the top', () => {
    const last = TREE_AWARDS[TREE_AWARDS.length - 1];
    expect(currentAward(last.threshold + 100)?.id).toBe(last.id);
  });
});

describe('nextAward', () => {
  it('points at the first tree before anything is finished', () => {
    expect(nextAward(0)?.id).toBe(TREE_AWARDS[0].id);
  });

  it('points past the tree just earned', () => {
    expect(nextAward(5)?.id).toBe('olive');
    expect(nextAward(20)?.id).toBe('baobab');
  });

  it('keeps pointing at the fig while the grove is still empty', () => {
    expect(nextAward(0)?.id).toBe('fig');
    expect(nextAward(4)?.id).toBe('fig');
  });

  it('is null once the last tree is standing', () => {
    const last = TREE_AWARDS[TREE_AWARDS.length - 1];
    expect(nextAward(last.threshold)).toBeNull();
  });
});

describe('awardStage', () => {
  it('never goes backwards', () => {
    for (let n = 1; n <= 40; n++) {
      expect(awardStage(n)).toBeGreaterThanOrEqual(awardStage(n - 1));
    }
  });

  it('stays within the drawing it feeds', () => {
    for (let n = 0; n <= 40; n++) {
      expect(awardStage(n)).toBeGreaterThanOrEqual(0);
      expect(awardStage(n)).toBeLessThanOrEqual(5);
    }
  });
});
