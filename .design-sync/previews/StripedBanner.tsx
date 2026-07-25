import { ProgressBar, StripedBanner, Text } from 'pamwe';

// Plan artwork: the plans tab wraps banners in surface cards (hero 92px,
// grid 64px) and tints each plan from the highlight swatches.
const shell: React.CSSProperties = {
  width: 340,
  padding: 20,
  background: '#EFE6D6',
  borderRadius: 18,
  boxSizing: 'border-box',
};
const cardFrame: React.CSSProperties = {
  background: '#F7F0E1',
  border: '1px solid #D9CCB0',
  borderRadius: 18,
  overflow: 'hidden',
};

export function ReadingNowHero() {
  return (
    <div style={shell}>
      <Text variant="eyebrow" color="#A89678">Reading now</Text>
      <div style={{ height: 10 }} />
      <div style={cardFrame}>
        <StripedBanner height={92} stripe={6} tint="#C7D3B0">
          <div style={{ position: 'absolute', left: 14, bottom: 12 }}>
            <Text variant="scripture" italic color="#6B2421">M'Cheyne Reading Plan</Text>
          </div>
        </StripedBanner>
        <div style={{ padding: 14, paddingBottom: 16 }}>
          <ProgressBar progress={132 / 365} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
            <Text variant="eyebrow" color="#A89678">Day 132 of 365</Text>
            <Text variant="chip" color="#6B2421">View plan</Text>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CuratedGrid() {
  const plans = [
    { title: 'Gospel of John', meta: '21 days · Gospel', tint: '#F0D89B' },
    { title: 'Psalms of Comfort', meta: '30 days · Comfort', tint: '#B7CBDD' },
    { title: 'A Cord of Three Strands', meta: '21 days · Marriage', tint: '#ECBAB6' },
    { title: "M'Cheyne Reading Plan", meta: '365 days · Whole Bible', tint: '#C7D3B0' },
  ];
  return (
    <div style={{ ...shell, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
      {plans.map((p) => (
        <div key={p.title} style={{ ...cardFrame, borderRadius: 14, width: 'calc(50% - 6px)', boxSizing: 'border-box' }}>
          <StripedBanner height={64} stripe={6} tint={p.tint} />
          <div style={{ padding: 12 }}>
            <Text variant="body" color="#2B1F14">{p.title}</Text>
            <div style={{ height: 4 }} />
            <Text variant="chip" color="#A89678">{p.meta}</Text>
          </div>
        </div>
      ))}
    </div>
  );
}

export function CustomPlanDefault() {
  // A couple-built plan gets no tint: the default line2 stripe reads soft.
  return (
    <div style={shell}>
      <div style={{ ...cardFrame, borderRadius: 14 }}>
        <StripedBanner height={64} stripe={6}>
          <div style={{ position: 'absolute', left: 14, bottom: 10 }}>
            <Text variant="scripture" italic color="#6B2421">Evenings in Philippians</Text>
          </div>
        </StripedBanner>
        <div style={{ padding: 12 }}>
          <Text variant="chip" color="#A89678">Built by you two · 14 days</Text>
        </div>
      </div>
    </div>
  );
}
