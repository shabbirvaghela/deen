import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "../../components/layout/PageHeader";
import { Card } from "../../components/ui/Card";
import { getLocalDateKey } from "../../lib/date";

const prayers = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"] as const;
type Prayer = (typeof prayers)[number];
type PrayerState = Record<Prayer, boolean>;
const emptyState: PrayerState = { Fajr: false, Dhuhr: false, Asr: false, Maghrib: false, Isha: false };

function storageKey(date: string) {
  return `deen-prayer-checklist:${date}`;
}

export function PracticePage() {
  const today = getLocalDateKey();
  const [completed, setCompleted] = useState<PrayerState>(emptyState);
  const [storageAvailable, setStorageAvailable] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey(today));
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<PrayerState>;
        setCompleted({ ...emptyState, ...parsed });
      }
    } catch (error) {
      console.warn("Could not load prayer checklist:", error);
      setStorageAvailable(false);
    }
  }, [today]);

  const completedCount = useMemo(() => prayers.filter((prayer) => completed[prayer]).length, [completed]);

  function togglePrayer(prayer: Prayer) {
    setCompleted((current) => {
      const next = { ...current, [prayer]: !current[prayer] };
      try {
        localStorage.setItem(storageKey(today), JSON.stringify(next));
        setStorageAvailable(true);
      } catch (error) {
        console.warn("Could not save prayer checklist:", error);
        setStorageAvailable(false);
      }
      return next;
    });
  }

  function resetToday() {
    setCompleted(emptyState);
    try {
      localStorage.removeItem(storageKey(today));
      setStorageAvailable(true);
    } catch {
      setStorageAvailable(false);
    }
  }

  return (
    <div className="stack">
      <PageHeader eyebrow="DAILY PRACTICE" title="Prayer & fasting" description="A simple daily Salah checklist. Prayer times depend on your exact location and calculation settings, so this page does not invent timings." />
      <Card>
        <div className="section-title"><div><p className="eyebrow">TODAY'S SALAH</p><h2>{completedCount} of 5 completed</h2></div><span className="pill">{today}</span></div>
        <div className="progress-track" role="progressbar" aria-label="Daily prayers completed" aria-valuemin={0} aria-valuemax={5} aria-valuenow={completedCount}><span style={{ width: `${completedCount / prayers.length * 100}%` }} /></div>
        <div className="prayer-checklist">
          {prayers.map((prayer) => <label className="prayer-check-row" key={prayer}>
            <span><strong>{prayer}</strong><small>{completed[prayer] ? "Marked complete" : "Not marked yet"}</small></span>
            <input type="checkbox" checked={completed[prayer]} onChange={() => togglePrayer(prayer)} aria-label={`Mark ${prayer} prayer complete`} />
          </label>)}
        </div>
        <div className="flex items-center justify-between gap-3 mt-3"><p className="muted small">Saved on this device</p><button className="text-link" type="button" onClick={resetToday}>Reset today</button></div>
        {!storageAvailable && <p role="alert" className="muted small">Browser storage is unavailable. Changes may not persist after refresh.</p>}
      </Card>
      <Card className="soft-card">
        <div className="section-title"><h2>Sehri & Iftar</h2><span className="pill">Roza</span></div>
        <p className="muted">Timings vary by date, location, and calculation convention. Confirm today's Fajr and Maghrib times using a trusted local timetable or mosque before relying on them.</p>
      </Card>
      <Card>
        <h2>Sunnah fasting</h2>
        <p className="muted">Many Muslims observe optional fasting on Mondays and Thursdays and on the 13th–15th of the Hijri month. Check a reliable local Hijri calendar and consult a trusted scholar for personal guidance.</p>
      </Card>
    </div>
  );
}
