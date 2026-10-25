import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../../components/layout/PageHeader";
import { Card } from "../../components/ui/Card";
import { consumeNext } from "../../services/queueService";
import { getDailyContent } from "../../services/dailyService";
import { getExplanation } from "../../services/explanationService";
import { initializeDatabase } from "../../services/initializeDatabase";
import { recordSeen } from "../../services/historyService";
import { maintainQueue, refillQueue } from "../../services/syncService";
import type { ContentType, LearningContent } from "../../types/content";

type Props = {
  type: ContentType;
  title: string;
  description: string;
};

function getReference(item: LearningContent): string {
  if (item.type === "ayah") {
    const surah = item.reference.surahName
      ? `${item.reference.surahName} `
      : "";
    return `${surah}${item.reference.id}`.trim();
  }

  const number = item.reference.hadithNumber ?? item.reference.id;
  return `${item.reference.source} · ${number}`;
}

export function LearningStreamPage({ type, title, description }: Props) {
  const [item, setItem] = useState<LearningContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [explaining, setExplaining] = useState(false);
  const [error, setError] = useState("");

  const loadDaily = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      await initializeDatabase();
      let daily = await getDailyContent(type);
      if (!daily && navigator.onLine) {
        await refillQueue(type);
        daily = await getDailyContent(type);
      }
      if (daily) await recordSeen(type, daily.id);
      setItem(daily);
      if (navigator.onLine) void maintainQueue(type).catch(console.warn);
    } catch (cause) {
      console.error(`Could not load ${type} learning content:`, cause);
      setError("Content load nahi ho paaya. Internet ya saved content check karke retry karein.");
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    void loadDaily();
  }, [loadDaily]);

  async function nextItem() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      let next = await consumeNext(type);
      if (!next && navigator.onLine) {
        await refillQueue(type);
        next = await consumeNext(type);
      }
      if (!next) {
        setError(navigator.onLine
          ? "Abhi aur content available nahi hai. Thodi der baad try karein."
          : "Offline mode mein aur saved content nahi mila. Internet par connect karke content download karein.");
        return;
      }
      await recordSeen(type, next.id);
      setItem(next);
      if (navigator.onLine) void maintainQueue(type).catch(console.warn);
    } catch (cause) {
      console.error(`Could not get next ${type}:`, cause);
      setError("Next item load nahi ho paaya. Please retry karein.");
    } finally {
      setBusy(false);
    }
  }

  async function loadExplanation() {
    if (!item || explaining) return;
    if (item.hinglishTranslation && item.explanation) return;
    setExplaining(true);
    setError("");
    try {
      const explained = await getExplanation(item);
      setItem(explained);
    } catch (cause) {
      console.error("Could not load explanation:", cause);
      setError(cause instanceof Error ? cause.message : "Explanation load nahi hui.");
    } finally {
      setExplaining(false);
    }
  }

  const translation = item?.hinglishTranslation?.trim();
  const sourceTranslation = item?.sourceTranslation;

  return (
    <div className="stack">
      <PageHeader eyebrow={type === "ayah" ? "QUR'AN LEARNING" : "PROPHETIC TEACHINGS"} title={title} description={description} />
      {error && <Card><p role="alert">{error}</p><button className="text-link" type="button" onClick={() => void loadDaily()}>Retry loading →</button></Card>}
      {loading ? (
        <Card><p role="status">Loading saved learning content…</p></Card>
      ) : item ? (
        <Card>
          <div className="section-title">
            <p className="eyebrow">{type === "ayah" ? "AYAH TO REFLECT ON" : "HADITH TO REFLECT ON"}</p>
            <span className="pill">Saved on device</span>
          </div>
          {item.originalText && <div className="arabic-text" dir="rtl" lang="ar">{item.originalText}</div>}
          {item.transliteration && <p className="muted small italic">{item.transliteration}</p>}
          <div className="divider" />
          <p className="eyebrow">{translation ? "HINGLISH MEANING" : `SOURCE TRANSLATION${sourceTranslation ? ` · ${sourceTranslation.language.toUpperCase()}` : ""}`}</p>
          <p className="learning-translation">{translation || sourceTranslation?.text || "Translation is not available for this item yet."}</p>
          {item.explanation && <div className="explanation-block">
            <h2>Simple explanation</h2>
            <p><strong>Meaning:</strong> {item.explanation.simpleMeaning}</p>
            <p><strong>Context:</strong> {item.explanation.context}</p>
            <p><strong>Example:</strong> {item.explanation.example}</p>
            <p><strong>Practical lesson:</strong> {item.explanation.practicalLesson}</p>
            {item.explanation.sourceNote && <p className="muted small">Note: {item.explanation.sourceNote}</p>}
          </div>}
          {!item.explanation && <button type="button" className="button button-secondary" disabled={explaining || !navigator.onLine} onClick={() => void loadExplanation()}>
            {explaining ? "Preparing explanation…" : navigator.onLine ? "Explain in Hinglish" : "Explanation requires internet"}
          </button>}
          <div className="divider" />
          <p className="muted small">Reference: {getReference(item)}</p>
          {item.authenticity && <p className="muted small">Authenticity: {item.authenticity}</p>}
          <button type="button" className="button" disabled={busy} onClick={() => void nextItem()}>{busy ? "Loading…" : type === "ayah" ? "Next Ayah →" : "Next Hadith →"}</button>
        </Card>
      ) : (
        <Card>
          <h2>No saved {type === "ayah" ? "Ayah" : "Hadith"} yet</h2>
          <p className="muted">{navigator.onLine ? "Content download nahi ho paaya. Retry karein." : "Offline use ke liye pehle internet par content download karein."}</p>
          <button type="button" className="button" onClick={() => void loadDaily()}>Try again</button>
        </Card>
      )}
      <Link to="/history" className="text-link">View reading history →</Link>
    </div>
  );
}
