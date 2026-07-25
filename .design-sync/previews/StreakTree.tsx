import { StreakTree } from 'pamwe';

const row: React.CSSProperties = { display: 'flex', alignItems: 'flex-end', gap: 18, padding: 20 };

export function GrowthStages() {
  return (
    <div style={row}>
      <StreakTree count={0} />
      <StreakTree count={1} />
      <StreakTree count={3} />
      <StreakTree count={7} />
      <StreakTree count={14} />
      <StreakTree count={30} />
    </div>
  );
}

export function ReadyToPlant() {
  return (
    <div style={{ padding: 20 }}>
      <StreakTree count={0} />
    </div>
  );
}

export function InFullBloom() {
  return (
    <div style={{ padding: 20 }}>
      <StreakTree count={34} />
    </div>
  );
}
