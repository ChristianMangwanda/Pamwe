import { Avatar } from 'pamwe';

const row: React.CSSProperties = { display: 'flex', gap: 24, padding: 20 };

export function Couple() {
  return (
    <div style={row}>
      <Avatar initial="C" name="Christian" status="Submitted" />
      <Avatar initial="A" name="Ammy" status="Writing" />
    </div>
  );
}

export function SolidBorder() {
  return (
    <div style={row}>
      <Avatar initial="C" name="Christian" dashed={false} />
      <Avatar initial="A" name="Ammy" dashed={false} />
    </div>
  );
}

export function InitialOnly() {
  return (
    <div style={row}>
      <Avatar initial="c" />
      <Avatar initial="a" dashed={false} />
    </div>
  );
}
