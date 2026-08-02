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

  it('starts at the first finished plan, so finishing one always earns a tree', () => {
    expect(TREE_AWARDS[0].threshold).toBe(1);
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
      expect(currentAward(a.threshold)?.key).toBe(a.key);
    }
  });

  it('holds the previous tree between thresholds', () => {
    // 4 sits between the jacaranda (3) and the oak (5).
    expect(currentAward(4)?.key).toBe('jacaranda');
  });

  it('stays on the last tree well past the top', () => {
    const last = TREE_AWARDS[TREE_AWARDS.length - 1];
    expect(currentAward(last.threshold + 100)?.key).toBe(last.key);
  });
});

describe('nextAward', () => {
  it('points at the first tree before anything is finished', () => {
    expect(nextAward(0)?.key).toBe(TREE_AWARDS[0].key);
  });

  it('points past the tree just earned', () => {
    expect(nextAward(1)?.key).toBe('olive');
    expect(nextAward(3)?.key).toBe('oak');
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
