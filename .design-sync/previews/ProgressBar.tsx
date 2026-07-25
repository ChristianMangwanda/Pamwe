import { ProgressBar, Text } from 'pamwe';

const col: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 18, padding: 20, width: 300 };
const group: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6 };

export function Sweep() {
  return (
    <div style={col}>
      <div style={group}>
        <Text variant="label">Just started</Text>
        <ProgressBar progress={0.25} />
      </div>
      <div style={group}>
        <Text variant="label">Past halfway</Text>
        <ProgressBar progress={0.6} />
      </div>
      <div style={group}>
        <Text variant="label">Nearly there</Text>
        <ProgressBar progress={0.9} />
      </div>
    </div>
  );
}

export function PlanProgress() {
  return (
    <div style={col}>
      <div style={group}>
        <Text variant="body">The Gospel of John, day 14 of 21</Text>
        <ProgressBar progress={14 / 21} />
      </div>
      <div style={group}>
        <Text variant="body">M'Cheyne, day 172 of 365</Text>
        <ProgressBar progress={172 / 365} />
      </div>
      <div style={group}>
        <Text variant="body">Psalms for the two of you, day 27 of 30</Text>
        <ProgressBar progress={27 / 30} />
      </div>
    </div>
  );
}

export function EdgesAndHeights() {
  return (
    <div style={col}>
      <div style={group}>
        <Text variant="label">Empty, 0 of 365</Text>
        <ProgressBar progress={0} />
      </div>
      <div style={group}>
        <Text variant="label">Complete</Text>
        <ProgressBar progress={1} />
      </div>
      <div style={group}>
        <Text variant="label">Slim, height 4</Text>
        <ProgressBar progress={0.5} height={4} />
      </div>
      <div style={group}>
        <Text variant="label">Tall, height 10</Text>
        <ProgressBar progress={0.5} height={10} />
      </div>
    </div>
  );
}
