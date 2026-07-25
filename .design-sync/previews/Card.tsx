import { Button, Card, SectionEyebrow, Text } from 'pamwe';

// Cards sit on the app bg (#EFE6D6), never on white; each cell reproduces that.
const shell: React.CSSProperties = {
  width: 340,
  padding: 20,
  background: '#EFE6D6',
  borderRadius: 18,
  boxSizing: 'border-box',
};

export function TodayReading() {
  return (
    <div style={shell}>
      <Card>
        <SectionEyebrow>Today's reading</SectionEyebrow>
        <div style={{ height: 8 }} />
        <Text variant="h2">Genesis 22 · Matthew 21</Text>
        <div style={{ height: 6 }} />
        <Text variant="body" color="#7A6A55">
          Two passages, one quiet moment. Read first, then each of you writes.
        </Text>
        <div style={{ height: 16 }} />
        <Button variant="primary" title="Begin today's reading" />
      </Card>
    </div>
  );
}

export function RevealedReflection() {
  return (
    <div style={shell}>
      <Card>
        <SectionEyebrow color="#9B5651">Ammy's reflection</SectionEyebrow>
        <div style={{ height: 10 }} />
        <Text variant="journal">
          The part where Abraham says God will provide stayed with me. He answers
          before he knows how. I want us to trust like that this week.
        </Text>
        <div style={{ height: 12 }} />
        <Text variant="label" color="#A89678">Day 12 · Revealed together</Text>
      </Card>
    </div>
  );
}

export function StatPair() {
  return (
    <div style={{ ...shell, display: 'flex', gap: 12 }}>
      <div style={{ flex: 1 }}>
        <Card padding={16}>
          <Text variant="h1" color="#6B2421">12</Text>
          <div style={{ height: 4 }} />
          <Text variant="label" color="#A89678">Day streak</Text>
        </Card>
      </div>
      <div style={{ flex: 1 }}>
        <Card padding={16}>
          <Text variant="h1" color="#6B2421">48</Text>
          <div style={{ height: 4 }} />
          <Text variant="label" color="#A89678">Reflections</Text>
        </Card>
      </div>
    </div>
  );
}

export function KeptLine() {
  return (
    <div style={shell}>
      <Card radius={14} padding={16}>
        <Text variant="scripture" italic color="#6B2421">
          "Nothing rushes in this passage, and I want us to be that kind of patient."
        </Text>
        <div style={{ height: 8 }} />
        <Text variant="label" color="#A89678">Kept from Ammy · Day 9</Text>
      </Card>
    </div>
  );
}
