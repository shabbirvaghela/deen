type Props = { eyebrow?: string; title: string; description?: string };
export function PageHeader({ eyebrow, title, description }: Props) {
  return <div className="page-header">
    {eyebrow && <p className="eyebrow">{eyebrow}</p>}
    <h1>{title}</h1>
    {description && <p className="muted">{description}</p>}
  </div>;
}
