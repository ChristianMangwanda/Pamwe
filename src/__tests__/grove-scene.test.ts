import {
  SCENE_W, SCENE_H, sceneTrees, footprints, walkFor,
  groveSubtitle, streakFoot, cardCopy,
  ARRIVAL_W, ARRIVAL_H, ARRIVAL_STEPS, arrivalScene, arrivalHeadline,
} from '../lib/grove';
import { TREE_AWARDS } from '../lib/treeAwards';

// The Grove is one scene, so its geometry is pure maths over a 400-wide canvas.
// These guard the things that would be invisible bugs on a phone: art drawn off
// the edge, trees stacked on each other, or the streak quietly planting a tree.

const FIRST = TREE_AWARDS[0].threshold; // 5
const TOP = TREE_AWARDS[TREE_AWARDS.length - 1].threshold; // 100

describe('scene layout', () => {
  it('keeps every tree inside the canvas at every fill state', () => {
    for (const plans of [0, 1, FIRST, 12, 40, TOP, TOP + 50]) {
      for (const t of sceneTrees(plans)) {
        expect(t.left).toBeGreaterThanOrEqual(0);
        expect(t.left + t.width).toBeLessThanOrEqual(SCENE_W);
        expect(t.bottom).toBeGreaterThan(0);
        expect(t.bottom + t.height).toBeLessThan(SCENE_H);
      }
    }
  });

  it('keeps every label inside the canvas', () => {
    for (const t of sceneTrees(7)) {
      expect(t.labelLeft).toBeGreaterThanOrEqual(0);
      expect(t.labelLeft + t.labelWidth).toBeLessThanOrEqual(SCENE_W);
    }
  });

  it('never distorts the artwork', () => {
    for (const t of sceneTrees(TOP)) {
      expect(t.width / t.height).toBeCloseTo(t.award.ratio, 1);
    }
  });

  it('roots the trees in ladder order, climbing', () => {
    const trees = sceneTrees(TOP);
    for (let i = 1; i < trees.length; i++) {
      expect(trees[i].bottom).toBeGreaterThan(trees[i - 1].bottom);
    }
  });

  it('marks earned exactly at the threshold', () => {
    const trees = sceneTrees(FIRST);
    expect(trees[0].earned).toBe(true);
    expect(trees[1].earned).toBe(false);
    expect(sceneTrees(FIRST - 1)[0].earned).toBe(false);
  });
});

describe('footprints', () => {
  it('are solid behind the walk and faint ahead of it', () => {
    const prints = footprints(FIRST, 0);
    expect(prints.some((p) => p.opacity === 1)).toBe(true);
    expect(prints.some((p) => p.opacity < 0.2)).toBe(true);
  });

  it('advance with the streak without ever reaching the next tree', () => {
    const { walked, advance } = walkFor(FIRST, 400);
    const nextBase = sceneTrees(FIRST)[1].bottom;
    expect(advance).toBeGreaterThan(0);
    // A streak moves you toward the next tree. Only a finished plan plants it.
    expect(walked + advance).toBeLessThan(nextBase);
  });

  it('do not advance at all without a streak', () => {
    expect(walkFor(FIRST, 0).advance).toBe(0);
  });

  it('stop advancing once the last tree is standing', () => {
    expect(walkFor(TOP, 365).advance).toBe(0);
  });

  it('come in left and right pairs', () => {
    const prints = footprints(TOP, 0);
    expect(prints.filter((p) => p.foot === 'a').length)
      .toBe(prints.filter((p) => p.foot === 'b').length);
  });
});

describe('the arrival', () => {
  // The planting draws on its own small canvas, so the same off-canvas and
  // distortion traps apply here, for every one of the six trees.
  it('keeps the tree, the prints and the tree before inside the canvas', () => {
    for (const award of TREE_AWARDS) {
      const s = arrivalScene(award);
      for (const box of [s.tree, ...(s.prev ? [s.prev] : []), ...s.steps]) {
        expect(box.left).toBeGreaterThanOrEqual(0);
        expect(box.left + box.width).toBeLessThanOrEqual(ARRIVAL_W);
        expect(box.bottom).toBeGreaterThanOrEqual(0);
        expect(box.bottom + box.height).toBeLessThanOrEqual(ARRIVAL_H);
      }
    }
  });

  it('never distorts the artwork', () => {
    for (const award of TREE_AWARDS) {
      const s = arrivalScene(award);
      expect(s.tree.width / s.tree.height).toBeCloseTo(award.ratio, 1);
    }
    // The cedar is the narrow one and the fig the wide one, so both the height
    // cap and the width cap get exercised.
    expect(arrivalScene(TREE_AWARDS[TREE_AWARDS.length - 1]).tree.width).toBeLessThanOrEqual(150);
  });

  it('shows the tree before this one, and nothing before the first', () => {
    expect(arrivalScene(TREE_AWARDS[0]).prev).toBeNull();
    for (let i = 1; i < TREE_AWARDS.length; i++) {
      expect(arrivalScene(TREE_AWARDS[i]).prev?.id).toBe(TREE_AWARDS[i - 1].id);
    }
  });

  it('walks the last stretch in left and right strides, climbing', () => {
    const { steps } = arrivalScene(TREE_AWARDS[0]);
    expect(steps).toHaveLength(ARRIVAL_STEPS);
    expect(steps.filter((s) => s.foot === 'a')).toHaveLength(ARRIVAL_STEPS / 2);
    for (let i = 1; i < steps.length; i++) {
      expect(steps[i].bottom).toBeGreaterThan(steps[i - 1].bottom);
      expect(steps[i].foot).not.toBe(steps[i - 1].foot);
    }
  });

  it('names the tree with the right article, keeping Lebanon capitalised', () => {
    expect(arrivalHeadline(TREE_AWARDS.find((a) => a.id === 'fig')!)).toBe('A fig tree.');
    expect(arrivalHeadline(TREE_AWARDS.find((a) => a.id === 'olive')!)).toBe('An olive tree.');
    expect(arrivalHeadline(TREE_AWARDS.find((a) => a.id === 'oak')!)).toBe('An oak.');
    expect(arrivalHeadline(TREE_AWARDS.find((a) => a.id === 'cedar')!)).toBe('A cedar of Lebanon.');
    expect(arrivalHeadline(TREE_AWARDS.find((a) => a.id === 'redwood')!)).toBe('A redwood.');
  });
});

describe('copy', () => {
  const all = [
    groveSubtitle(0), groveSubtitle(3), groveSubtitle(FIRST), groveSubtitle(TOP),
    streakFoot(0, 0), streakFoot(1, 0), streakFoot(15, FIRST), streakFoot(120, FIRST), streakFoot(30, TOP),
    cardCopy(0).caption, cardCopy(3).caption, cardCopy(FIRST).caption, cardCopy(TOP).caption,
  ];

  it('never uses an em dash', () => {
    for (const line of all) expect(line).not.toContain('—');
  });

  it('never claims a streak is unbroken, which it cannot know', () => {
    // The streak counts reading days with a four-day forgiveness window, so a
    // couple can hold it while missing calendar days. Christian's call.
    for (const line of all) expect(line.toLowerCase()).not.toContain('unbroken');
  });

  it('tells a couple with plans but no tree that they are under way', () => {
    const s = groveSubtitle(3);
    expect(s).toContain('Nothing planted yet');
    expect(s).toContain('under way');
  });

  it('counts down to the next tree correctly', () => {
    expect(groveSubtitle(FIRST)).toContain(`${TREE_AWARDS[1].threshold - FIRST} plans to go`);
  });

  it('uses the singular for one plan to go', () => {
    expect(groveSubtitle(TREE_AWARDS[1].threshold - 1)).toContain('one plan to go');
  });

  it('does not end the walk at the top of the ladder', () => {
    expect(groveSubtitle(TOP)).toContain('keeps going');
    expect(cardCopy(TOP).caption).toContain('keeps going');
  });
});
