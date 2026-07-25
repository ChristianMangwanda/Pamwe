import { Glass, SectionEyebrow, Text } from 'pamwe';

// Glass only reads over detail: each cell puts real content behind the surface
// so the backdrop blur and cream tint are visible.

export function DockedBarOverReader() {
  return (
    <div
      style={{
        position: 'relative',
        width: 390,
        height: 250,
        background: '#EFE6D6',
        borderRadius: 18,
        overflow: 'hidden',
        padding: 24,
        boxSizing: 'border-box',
      }}
    >
      <Text variant="reader">
        Trust in Yahweh with all your heart, and don't lean on your own
        understanding. In all your ways acknowledge him, and he will make your
        paths straight.
      </Text>
      <div style={{ position: 'absolute', left: 16, right: 16, bottom: 14 }}>
        <Glass radius={28} style={{ paddingVertical: 16, paddingHorizontal: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="cta" color="#6B2421">Today</Text>
            <Text variant="cta" color="#7A6A55">Bible</Text>
            <Text variant="cta" color="#7A6A55">Plans</Text>
            <Text variant="cta" color="#7A6A55">Prayers</Text>
            <Text variant="cta" color="#7A6A55">You</Text>
          </div>
        </Glass>
      </div>
    </div>
  );
}

export function SheetOverArtwork() {
  return (
    <div
      style={{
        position: 'relative',
        width: 360,
        height: 280,
        background: 'linear-gradient(135deg, #EADFC6, #F3E7E4)',
        borderRadius: 18,
        overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', width: 130, height: 130, borderRadius: '50%', background: '#F0D89B', top: -30, left: -24 }} />
      <div style={{ position: 'absolute', width: 110, height: 110, borderRadius: '50%', background: '#ECBAB6', top: 30, right: -30 }} />
      <div style={{ position: 'absolute', width: 150, height: 150, borderRadius: '50%', background: '#C7D3B0', bottom: -50, left: 90 }} />
      <div style={{ position: 'absolute', width: 90, height: 90, borderRadius: '50%', background: '#B7CBDD', bottom: 10, left: -20 }} />
      <Glass radius={26} style={{ position: 'absolute', left: 24, right: 24, top: 64, padding: 22 }}>
        <SectionEyebrow>While you wait</SectionEyebrow>
        <div style={{ height: 8 }} />
        <Text variant="heading">Ammy is still writing</Text>
        <div style={{ height: 6 }} />
        <Text variant="body" color="#7A6A55">
          Her reflection unlocks the moment you have both submitted.
        </Text>
      </Glass>
    </div>
  );
}
