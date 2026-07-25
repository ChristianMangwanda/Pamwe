import { TwineDivider, Text, Avatar } from 'pamwe';

const card: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  width: 340,
  background: '#FAF5EA',
  borderRadius: 14,
  padding: 26,
  boxSizing: 'border-box',
  textAlign: 'center',
};

export function BetweenReflections() {
  return (
    <div style={card}>
      <Text variant="label" color="#9A8A72">Christian wrote</Text>
      <div style={{ height: 6 }} />
      <Text variant="journal">
        I keep coming back to how Abram left without knowing where the road went.
      </Text>
      <div style={{ height: 14 }} />
      <TwineDivider width={140} />
      <div style={{ height: 14 }} />
      <Text variant="label" color="#9A8A72">Ammy wrote</Text>
      <div style={{ height: 6 }} />
      <Text variant="journal">
        Blessed to be a blessing. That order feels important, receiving first, then giving.
      </Text>
    </div>
  );
}

export function BetweenPartners() {
  return (
    <div style={{ ...card, flexDirection: 'row', justifyContent: 'center', gap: 4 }}>
      <Avatar initial="C" dashed={false} />
      <div style={{ paddingTop: 22 }}>
        <TwineDivider width={40} />
      </div>
      <Avatar initial="?" />
    </div>
  );
}

export function Widths() {
  return (
    <div style={card}>
      <Text variant="label" color="#9A8A72">Width 40</Text>
      <div style={{ height: 6 }} />
      <TwineDivider width={40} />
      <div style={{ height: 16 }} />
      <Text variant="label" color="#9A8A72">Width 80, the default</Text>
      <div style={{ height: 6 }} />
      <TwineDivider width={80} />
      <div style={{ height: 16 }} />
      <Text variant="label" color="#9A8A72">Width 160</Text>
      <div style={{ height: 6 }} />
      <TwineDivider width={160} />
    </div>
  );
}
