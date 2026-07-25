import { Switch, Text } from 'pamwe';

const col: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 18, padding: 20, width: 300 };
const row: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between' };

export function OnAndOff() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: 20 }}>
      <Switch value={true} onValueChange={() => {}} accessibilityLabel="On" />
      <Switch value={false} onValueChange={() => {}} accessibilityLabel="Off" />
    </div>
  );
}

export function NotificationSettings() {
  return (
    <div style={col}>
      <div style={row}>
        <Text variant="body">Daily reading reminder</Text>
        <Switch value={true} onValueChange={() => {}} accessibilityLabel="Daily reading reminder" />
      </div>
      <div style={row}>
        <Text variant="body">When Ammy submits</Text>
        <Switch value={true} onValueChange={() => {}} accessibilityLabel="When Ammy submits" />
      </div>
      <div style={row}>
        <Text variant="body">Prayer reminders</Text>
        <Switch value={false} onValueChange={() => {}} accessibilityLabel="Prayer reminders" />
      </div>
    </div>
  );
}
