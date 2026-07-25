import { CategoryChip, Text } from 'pamwe';

const row: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 8, padding: 20, width: 320 };
const col: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 8, padding: 20, width: 320 };

export function AllCategories() {
  return (
    <div style={row}>
      <CategoryChip category="family" />
      <CategoryChip category="health" />
      <CategoryChip category="work" />
      <CategoryChip category="guidance" />
      <CategoryChip category="thanks" />
      <CategoryChip category="other" />
    </div>
  );
}

export function OnAPrayer() {
  return (
    <div style={col}>
      <CategoryChip category="guidance" />
      <Text variant="heading">Wisdom for the year ahead</Text>
      <Text variant="body" color="#7A6A55">
        Praying we choose the right timing, and that we go into it together, at peace.
      </Text>
    </div>
  );
}
