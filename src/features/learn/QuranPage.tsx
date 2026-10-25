import { PageHeader } from "../../components/layout/PageHeader";
import { Card } from "../../components/ui/Card";
export function QuranPage() {
  return (
    <div className="stack">
      <PageHeader
        eyebrow="LEARN"
        title="Qur'an"
        description="Read, understand and reflect at your own pace."
      />
      <Card>
        <div className="arabic-text" dir="rtl" lang="ar">
          بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
        </div>
        <p className="muted small">
          Sample display only · Surah Al-Fatihah 1:1
        </p>
        <div className="divider" />
        <p className="eyebrow">TRANSLATION / MEANING</p>
        <p>In the name of Allah, the Most Compassionate, the Most Merciful.</p>
        <p className="muted small">
          Connect your verified Qur'an dataset and existing content services
          here before production.
        </p>
      </Card>
    </div>
  );
}
