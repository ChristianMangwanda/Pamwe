import { SegmentedControl } from 'pamwe';

const col: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 18, padding: 20, width: 300 };

export function EntryMode() {
  return (
    <div style={col}>
      <SegmentedControl
        segments={[
          { key: 'text', label: 'WRITE' },
          { key: 'voice', label: 'SPEAK' },
        ]}
        value="text"
        onChange={() => {}}
      />
    </div>
  );
}

export function PrayerFilter() {
  return (
    <div style={col}>
      <SegmentedControl
        segments={[
          { key: 'all', label: 'ALL' },
          { key: 'active', label: 'ACTIVE' },
          { key: 'answered', label: 'ANSWERED' },
        ]}
        value="active"
        onChange={() => {}}
      />
    </div>
  );
}

export function Translations() {
  return (
    <div style={col}>
      <SegmentedControl
        segments={[
          { key: 'web', label: 'WEB' },
          { key: 'kjv', label: 'KJV' },
          { key: 'asv', label: 'ASV' },
          { key: 'bbe', label: 'BBE' },
        ]}
        value="kjv"
        onChange={() => {}}
      />
    </div>
  );
}
