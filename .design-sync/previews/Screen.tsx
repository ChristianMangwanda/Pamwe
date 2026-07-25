import { Screen, SectionEyebrow, Text, Button, Card } from 'pamwe';

const frame: React.CSSProperties = {
  width: 390,
  height: 600,
  overflow: 'hidden',
  display: 'flex',
  borderRadius: 14,
  border: '1px solid #E7DDCB',
};
const gap = (h: number) => <div style={{ height: h }} />;

export function TodayPage() {
  return (
    <div style={frame}>
      <Screen animated={false}>
        {gap(18)}
        <SectionEyebrow>Saturday, July 12</SectionEyebrow>
        {gap(8)}
        <Text variant="hero">Day 12 of 365</Text>
        {gap(6)}
        <Text variant="body" color="#7A6A55">
          Genesis 12, Matthew 12, Ezra 12 and Acts 12. About twelve minutes, read at your own pace.
        </Text>
        {gap(20)}
        <Card>
          <Text variant="scripture" italic>
            Now the Lord said to Abram, Go from your country and your kindred and your father's
            house to the land that I will show you.
          </Text>
          {gap(10)}
          <Text variant="label" color="#9A8A72">Genesis 12:1</Text>
        </Card>
        {gap(20)}
        <Button variant="primary" title="Begin today's reading" />
        {gap(10)}
        <Button variant="ghost" title="Catch up on yesterday" />
      </Screen>
    </div>
  );
}

export function ReflectPage() {
  return (
    <div style={frame}>
      <Screen animated={false} scroll={false}>
        {gap(18)}
        <SectionEyebrow>Your story so far</SectionEyebrow>
        {gap(8)}
        <Text variant="h1">Twelve mornings together</Text>
        {gap(6)}
        <Text variant="body" color="#7A6A55">
          Every reflection you and Ammy have shared, kept in one quiet place.
        </Text>
        {gap(20)}
        <Card>
          <Text variant="label" color="#9A8A72">Day 11 · Matthew 11</Text>
          {gap(8)}
          <Text variant="journal">
            Come to me, all who labor. I read that twice and let out a breath I did not know I was
            holding.
          </Text>
        </Card>
        {gap(12)}
        <Card>
          <Text variant="label" color="#9A8A72">Day 10 · Genesis 10</Text>
          {gap(8)}
          <Text variant="journal">
            A whole chapter of names, and every one of them mattered to someone.
          </Text>
        </Card>
      </Screen>
    </div>
  );
}
