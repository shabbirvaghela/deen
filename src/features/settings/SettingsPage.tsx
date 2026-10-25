import { useEffect, useState } from "react";
import { PageHeader } from "../../components/layout/PageHeader";
import { Card } from "../../components/ui/Card";
export function SettingsPage() {
  const [dark, setDark] = useState(false);
  useEffect(() => { try { setDark(localStorage.getItem("deen-theme") === "dark"); } catch {} }, []);
  useEffect(() => { try { localStorage.setItem("deen-theme", dark ? "dark" : "light"); } catch {} document.documentElement.dataset.theme = dark ? "dark" : "light"; }, [dark]);
  return <div className="stack"><PageHeader eyebrow="PREFERENCES" title="Settings" description="Adjust Deen to your reading and daily routine." />
    <Card><div className="setting-row"><div><strong>Dark mode</strong><p className="muted small">Comfortable low-light reading.</p></div><button className={`switch ${dark ? "on" : ""}`} role="switch" aria-checked={dark} onClick={() => setDark(v => !v)} aria-label="Toggle dark mode"><span/></button></div></Card>
    <Card><h2>Location & prayer</h2><p className="muted">Current configured location: Kadi, Mehsana, Gujarat. Prayer calculation method and Asr madhab should be confirmed in settings. Jamaat times need local mosque data.</p></Card>
    <Card><h2>Offline storage</h2><p className="muted">Keep existing Dexie data and migrations. Add a clear cache/export option only after verifying how your current database stores learning content.</p></Card>
  </div>;
}
