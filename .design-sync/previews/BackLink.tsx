import { BackLink, Text, SectionEyebrow } from 'pamwe';

const page: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  padding: 24,
  width: 360,
  background: '#FAF5EA',
  borderRadius: 14,
};

export function DetailHeader() {
  return (
    <div style={page}>
      <BackLink onPress={() => {}} />
      <div style={{ height: 8 }} />
      <SectionEyebrow>Reading plan</SectionEyebrow>
      <Text variant="h1">The Cord of Three Strands</Text>
      <Text variant="body" color="#7A6A55">
        Twenty one days on what holds two people together when everything pulls.
      </Text>
    </div>
  );
}

export function CustomLabels() {
  return (
    <div style={page}>
      <BackLink onPress={() => {}} label="Today" />
      <BackLink onPress={() => {}} label="All plans" />
      <BackLink onPress={() => {}} label="Prayers" />
      <BackLink onPress={() => {}} label="Your reflections" />
    </div>
  );
}
