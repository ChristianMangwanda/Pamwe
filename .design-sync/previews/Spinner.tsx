import { Spinner, Text } from 'pamwe';

// Spinner rotates via reanimated (1s linear, infinite). A static capture
// shows the circle-notch glyph at rest; the size and color sweep is the point.

const row: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 24, padding: 20 };

export function Sizes() {
  return (
    <div style={row}>
      <Spinner size={17} />
      <Spinner size={24} />
      <Spinner size={32} />
      <Spinner size={48} />
    </div>
  );
}

export function Colors() {
  return (
    <div style={row}>
      <Spinner size={28} />
      <Spinner size={28} color="#6B2421" />
      <Spinner size={28} color="#9B5651" />
    </div>
  );
}

export function WaitingOnAmmy() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 20 }}>
      <Spinner />
      <Text variant="body">Waiting for Ammy to finish her reflection</Text>
    </div>
  );
}
