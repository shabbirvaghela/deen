import { PageHeader } from "../../components/layout/PageHeader";
import { Card } from "../../components/ui/Card";
const prayers = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
export function PracticePage() {
  return <div className="stack"><PageHeader eyebrow="DAILY PRACTICE" title="Prayer & fasting" description="Location: Kadi, Mehsana, Gujarat." />
    <Card className="soft-card"><div className="section-title"><h2>Sehri & Iftar</h2><span className="pill">Roza</span></div><div className="two-col"><div className="time-box"><span>Sehri ends</span><strong>Connect prayer-time service</strong><small>Fajr start</small></div><div className="time-box iftar"><span>Iftar</span><strong>Connect prayer-time service</strong><small>Maghrib start</small></div></div><p className="muted small">Live times are intentionally not fabricated. Connect the existing Aladhan request and verify local timetable conventions.</p></Card>
    <Card><div className="section-title"><h2>Daily prayers</h2><span className="muted small">Azaan / Jamaat</span></div><div className="prayer-table"><div className="prayer-head"><span>Prayer</span><span>Azaan</span><span>Jamaat</span></div>{prayers.map(p => <div className="prayer-row" key={p}><strong>{p}</strong><span className="muted small">Connect API</span><span className="muted small">Set by masjid</span></div>)}</div></Card>
    <Card><h2>Sunnah fasting</h2><p className="muted">Optional reminders for Mondays, Thursdays and the 13th–15th of the Hijri month. Confirm local Hijri dates and reliable guidance.</p></Card>
    <Card><h2>Salah tracker</h2><p className="muted">Next migration step: persist prayer completion in Dexie, with daily history and optional reminders.</p></Card>
  </div>;
}
