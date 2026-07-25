import { Text } from 'pamwe';

const col: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 14, padding: 20, maxWidth: 420 };

export function TypeScale() {
  return (
    <div style={col}>
      <Text variant="hero">Read together</Text>
      <Text variant="h1">Well done, you two</Text>
      <Text variant="h2">Day 12 of 365</Text>
      <Text variant="heading">While you wait for Ammy</Text>
      <Text variant="body">
        Pamwe is a shared reading rhythm for two. One passage a day, a private reflection each,
        revealed only when you have both written.
      </Text>
    </div>
  );
}

export function ScriptureAndJournal() {
  return (
    <div style={col}>
      <Text variant="scripture">
        In the beginning, God created the heavens and the earth.
      </Text>
      <Text variant="reader">
        Let your fountain be blessed. Rejoice in the wife of your youth.
      </Text>
      <Text variant="journal">
        What stayed with me today was how patient this passage is. Nothing rushes.
      </Text>
    </div>
  );
}

export function LabelsAndCtas() {
  return (
    <div style={col}>
      <Text variant="eyebrow">Today's reading</Text>
      <Text variant="label">Streak</Text>
      <Text variant="cta">Begin today's reading</Text>
      <Text variant="button">Reveal reflections</Text>
      <Text variant="chip">Guidance</Text>
    </div>
  );
}

export function ItalicAndColor() {
  return (
    <div style={col}>
      <Text variant="scripture" italic>
        A quiet word, set apart in italic serif.
      </Text>
      <Text variant="body" color="#7A6A55">
        Secondary ink for supporting copy.
      </Text>
      <Text variant="body" color="#6B2421">
        Accent ink for moments that matter.
      </Text>
    </div>
  );
}
