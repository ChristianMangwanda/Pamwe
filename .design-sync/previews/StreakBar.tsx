import { StreakBar, Text } from 'pamwe';

const col: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 16, padding: 20, width: 220 };

export function WeekProgress() {
  return (
    <div style={col}>
      <StreakBar count={0} />
      <StreakBar count={3} />
      <StreakBar count={5} />
      <StreakBar count={7} />
    </div>
  );
}

export function WithLabel() {
  return (
    <div style={{ ...col, gap: 8, alignItems: 'center' }}>
      <StreakBar count={4} />
      <Text variant="label" color="#7A6A55">4 days this week</Text>
    </div>
  );
}

export function LongerRange() {
  return (
    <div style={col}>
      <StreakBar count={9} max={14} />
    </div>
  );
}
