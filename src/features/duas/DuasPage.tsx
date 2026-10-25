import { PageHeader } from "../../components/layout/PageHeader";
import { Card } from "../../components/ui/Card";
const groups = [
  { title: "Morning", subtitle: "After waking · morning adhkar", symbol: "☼" },
  { title: "Afternoon break", subtitle: "Remembrance, gratitude and personal duas", symbol: "◉" },
  { title: "Before sleep", subtitle: "Masnoon bedtime supplications", symbol: "☾" },
];
export function DuasPage() {
  return <div className="stack"><PageHeader eyebrow="DAILY REMEMBRANCE" title="Duas & Adhkar" description="Arabic, Hinglish pronunciation, meaning and a trusted reference." />
    {groups.map((g) => <Card key={g.title}><div className="duas-row"><span className="tile-icon green">{g.symbol}</span><div><h2>{g.title}</h2><p className="muted small">{g.subtitle}</p></div></div><p className="muted small">Dua collection to be connected from a verified source dataset.</p></Card>)}
    <div className="callout"><strong>Authenticity matters</strong><p>Each dua should include its source. Avoid presenting a general supplication as a specifically prescribed Sunnah dua without evidence.</p></div>
  </div>;
}
