import { PageHeader } from "../../components/layout/PageHeader";
import { Card } from "../../components/ui/Card";
export function HadithPage() {
  return (
    <div className="stack">
      <PageHeader
        eyebrow="LEARN"
        title="Hadith"
        description="Prophetic teachings with source references and authenticity information."
      />
      <Card>
        <div className="eyebrow">YOUR HADITH LIBRARY</div>
        <h2>Continue learning</h2>
        <p className="muted">
          Connect your existing queueService, dailyService and Dexie
          repositories to show saved and queued Hadith here.
        </p>
        <p className="small">
          Do not label an English source translation as Hinglish. Display the
          source language clearly when no Hinglish explanation is available.
        </p>
      </Card>
    </div>
  );
}
