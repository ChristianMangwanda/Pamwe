import { SectionEyebrow, Text } from 'pamwe';

const col: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 12, padding: 20, width: 320 };

export function Labels() {
  return (
    <div style={col}>
      <SectionEyebrow>Today's reading</SectionEyebrow>
      <SectionEyebrow>Shared prayers</SectionEyebrow>
      <SectionEyebrow>From your story</SectionEyebrow>
    </div>
  );
}

export function AboveHeading() {
  return (
    <div style={{ ...col, gap: 6 }}>
      <SectionEyebrow>Day 12 of 365</SectionEyebrow>
      <Text variant="h2">Genesis 12, Matthew 12</Text>
      <Text variant="body" color="#7A6A55">
        Two chapters this morning, then a quiet reflection each.
      </Text>
    </div>
  );
}

export function AccentColor() {
  return (
    <div style={col}>
      <SectionEyebrow color="#6B2421">Waiting on Ammy</SectionEyebrow>
    </div>
  );
}
