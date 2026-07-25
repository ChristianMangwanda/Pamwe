import { Button } from 'pamwe';

const col: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 14, padding: 20, width: 300 };

export function Variants() {
  return (
    <div style={col}>
      <Button variant="primary" title="Begin today's reading" />
      <Button variant="secondary" title="Read the passage" />
      <Button variant="ghost" title="Skip for now" />
      <Button variant="dashed" title="Add a prayer" />
    </div>
  );
}

export function States() {
  return (
    <div style={col}>
      <Button variant="primary" title="Submitting" loading />
      <Button variant="primary" title="Reveal reflections" disabled />
      <Button variant="secondary" title="Waiting for Ammy" disabled />
    </div>
  );
}
