import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../../components/layout/PageHeader";
import { Card } from "../../components/ui/Card";
import {
  getHistory,
  getSeenCount,
  type HistoryItem,
} from "../../services/historyService";
import type { ContentType } from "../../types/content";

type Filter = "all" | ContentType;

export function HistoryPage() {
  const [ayahCount, setAyahCount] = useState(0);
  const [hadithCount, setHadithCount] = useState(0);
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [history, ayahs, hadiths] = await Promise.all([
        getHistory(filter === "all" ? undefined : filter),
        getSeenCount("ayah"),
        getSeenCount("hadith"),
      ]);

      setItems(history);
      setAyahCount(ayahs);
      setHadithCount(hadiths);
    } catch (err) {
      console.error("Failed to load reading history:", err);
      setError("History load nahi ho paayi. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  return (
    <div className="stack">
      <PageHeader
        eyebrow="YOUR JOURNEY"
        title="Reading history"
        description="Revisit the Qur'an verses and Hadith you have read. Your history is stored on this device."
      />

      <div className="two-col">
        <Card>
          <p className="muted small">Qur'an verses read</p>
          <div className="stat-number">{ayahCount}</div>
        </Card>
        <Card>
          <p className="muted small">Hadith read</p>
          <div className="stat-number">{hadithCount}</div>
        </Card>
      </div>

      <div
        className="filter-row"
        role="group"
        aria-label="Filter reading history"
      >
        {(["all", "ayah", "hadith"] as const).map((value) => (
          <button
            key={value}
            type="button"
            className={filter === value ? "filter-chip active" : "filter-chip"}
            onClick={() => setFilter(value)}
            aria-pressed={filter === value}
          >
            {value === "all" ? "All" : value === "ayah" ? "Qur’an" : "Hadith"}
          </button>
        ))}
      </div>

      {loading ? (
        <Card>
          <p className="muted">Loading your history…</p>
        </Card>
      ) : error ? (
        <Card>
          <p role="alert">{error}</p>
          <button
            type="button"
            className="filter-chip active"
            onClick={() => void loadHistory()}
          >
            Retry
          </button>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <h2>No reading history yet</h2>
          <p className="muted">
            When you read a Qur’an verse or Hadith, it will appear here.
          </p>
          <Link to="/learn">Start learning</Link>
        </Card>
      ) : (
        <div className="stack">
          {items.map((item) => {
            const content = item.content;
            const reference = content.reference;
            const title =
              item.type === "ayah"
                ? `${reference.surahName ?? "Qur’an"} ${
                    reference.ayahNumber ? `· Ayah ${reference.ayahNumber}` : ""
                  }`
                : `${reference.source || "Hadith"} ${
                    reference.hadithNumber ? `· ${reference.hadithNumber}` : ""
                  }`;

            return (
              <Card key={item.id}>
                <div className="history-card-heading">
                  <div>
                    <p className="muted small">
                      {item.type === "ayah" ? "QUR’AN" : "HADITH"}
                    </p>
                    <h2>{title}</h2>
                  </div>
                  <span className="muted small">
                    {new Date(item.seenAt).toLocaleDateString()}
                  </span>
                </div>

                <p className="arabic-text" dir="rtl" lang="ar">
                  {content.originalText}
                </p>

                {content.transliteration && (
                  <p className="muted">{content.transliteration}</p>
                )}

                <p>
                  {content.hinglishTranslation?.trim() ||
                    content.sourceTranslation?.text ||
                    "Translation is not available offline for this item."}
                </p>

                {content.authenticity && (
                  <p className="muted small">
                    Authenticity: {content.authenticity}
                  </p>
                )}

                {content.explanation?.simpleMeaning && (
                  <details>
                    <summary>Simple explanation</summary>
                    <p>{content.explanation.simpleMeaning}</p>
                    {content.explanation.context && (
                      <p>{content.explanation.context}</p>
                    )}
                    {content.explanation.practicalLesson && (
                      <p>{content.explanation.practicalLesson}</p>
                    )}
                  </details>
                )}

                <p className="muted small">
                  Reference: {reference.source} · {reference.id}
                </p>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
