export function SectionTitle({ title, action }: { title: string; action?: string }) {
  return <div className="section-title"><h2>{title}</h2>{action && <span className="muted small">{action}</span>}</div>;
}
