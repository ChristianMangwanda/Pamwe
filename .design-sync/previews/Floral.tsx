import { Floral, Text, SectionEyebrow } from 'pamwe';

export function CornerMotif() {
  return (
    <div
      style={{
        position: 'relative',
        width: 360,
        height: 270,
        overflow: 'hidden',
        background: '#FAF5EA',
        borderRadius: 14,
        padding: 26,
        boxSizing: 'border-box',
      }}
    >
      <Floral
        variant="corner"
        style={{ position: 'absolute', top: -6, left: -16, width: 116, height: 116, opacity: 0.82 }}
      />
      <div style={{ marginTop: 96 }}>
        <SectionEyebrow>Together</SectionEyebrow>
        <div style={{ height: 6 }} />
        <Text variant="hero">Good morning, Christian</Text>
        <div style={{ height: 6 }} />
        <Text variant="body" color="#7A6A55">Ammy has already read today's passage.</Text>
      </div>
    </div>
  );
}

export function DividerMotif() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: 360,
        background: '#FAF5EA',
        borderRadius: 14,
        padding: 28,
        boxSizing: 'border-box',
        textAlign: 'center',
      }}
    >
      <Text variant="scripture" italic>
        A cord of three strands is not quickly broken.
      </Text>
      <div style={{ height: 4 }} />
      <Text variant="label" color="#9A8A72">Ecclesiastes 4:12</Text>
      <Floral variant="divider" style={{ width: 150, height: 26, marginTop: 14, opacity: 0.92 }} />
      <div style={{ height: 14 }} />
      <Text variant="body" color="#7A6A55">
        When you both finish, your reflections open to each other.
      </Text>
    </div>
  );
}

export function MotifSizes() {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24, padding: 20 }}>
      <Floral variant="corner" style={{ width: 116, height: 116, opacity: 0.82 }} />
      <Floral variant="corner" style={{ width: 96, height: 96, opacity: 0.6 }} />
      <Floral variant="divider" style={{ width: 140, height: 26, opacity: 0.8 }} />
    </div>
  );
}
