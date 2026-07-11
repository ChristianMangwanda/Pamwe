import { treeStage } from '../components/ui/StreakTree';

describe('treeStage thresholds', () => {
  it('is a resting seed at 0', () => expect(treeStage(0)).toBe(0));
  it('is planted at 1-2', () => { expect(treeStage(1)).toBe(1); expect(treeStage(2)).toBe(1); });
  it('takes root at 3', () => expect(treeStage(3)).toBe(2));
  it('grows at 7', () => expect(treeStage(7)).toBe(3));
  it('reaches up at 14', () => expect(treeStage(14)).toBe(4));
  it('blooms at 30 and beyond', () => { expect(treeStage(30)).toBe(5); expect(treeStage(365)).toBe(5); });
});
