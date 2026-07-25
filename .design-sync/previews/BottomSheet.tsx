import { BottomSheet, Text } from 'pamwe';

// The Bible reader's two sheets: verse actions and the translation picker.
// Rendered visible; the Modal paints scrim + sheet over the whole card viewport.

const head: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 16,
};

export function VerseActions() {
  const swatches = ['#F0D89B', '#ECBAB6', '#C7D3B0', '#B7CBDD'];
  return (
    <BottomSheet visible onClose={() => {}}>
      <div style={head}>
        <Text variant="h2">Proverbs 3:5</Text>
        <Text variant="body" color="#A89678">✕</Text>
      </div>
      <Text variant="label" color="#A89678">Highlight</Text>
      <div style={{ display: 'flex', gap: 10, marginTop: 10, marginBottom: 18 }}>
        {swatches.map((c) => (
          <div key={c} style={{ width: 34, height: 34, borderRadius: '50%', background: c }} />
        ))}
        <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#F7F0E1', border: '1px solid #D9CCB0' }} />
      </div>
      <div style={{ border: '1px solid #9B5651', borderRadius: 12, padding: '12px 0', display: 'flex', justifyContent: 'center' }}>
        <Text variant="cta" color="#6B2421">Add note</Text>
      </div>
    </BottomSheet>
  );
}

export function TranslationPicker() {
  const rows = [
    { abbr: 'WEB', name: 'World English Bible', on: true },
    { abbr: 'KJV', name: 'King James Version', on: false },
    { abbr: 'ASV', name: 'American Standard Version', on: false },
    { abbr: 'BBE', name: 'Bible in Basic English', on: false },
  ];
  return (
    <BottomSheet visible onClose={() => {}}>
      <div style={head}>
        <Text variant="h2">Translation</Text>
        <Text variant="body" color="#A89678">✕</Text>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map((r) => (
          <div
            key={r.abbr}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 14px',
              borderRadius: 12,
              border: `1px solid ${r.on ? '#6B2421' : '#D9CCB0'}`,
              background: r.on ? '#F3E7E4' : 'transparent',
            }}
          >
            <Text variant="cta" color="#6B2421">{r.abbr}</Text>
            <Text variant="body" color="#2B1F14">{r.name}</Text>
          </div>
        ))}
      </div>
    </BottomSheet>
  );
}
