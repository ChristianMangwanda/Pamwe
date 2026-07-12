// Streak milestones worth pausing for. milestoneFor returns the highest
// milestone the streak has reached, and the Today screen celebrates it once
// (an AsyncStorage high-water mark per couple keeps it from repeating).
export const MILESTONES = [7, 30, 100] as const;

export type Milestone = (typeof MILESTONES)[number];

export function milestoneFor(streak: number): Milestone | null {
  let hit: Milestone | null = null;
  for (const m of MILESTONES) {
    if (streak >= m) hit = m;
  }
  return hit;
}

export const MILESTONE_COPY: Record<Milestone, { title: string; body: string }> = {
  7: {
    title: 'Seven days, together',
    body: 'Seven days. You both kept showing up, for each other and for Him. Keep going.',
  },
  30: {
    title: 'Thirty days, together',
    body: 'Thirty days. A whole month of showing up for each other. This is becoming who you are.',
  },
  100: {
    title: 'One hundred days, together',
    body: 'One hundred days. You showed up, then showed up again, for each other and for Him. That is the whole point.',
  },
};
