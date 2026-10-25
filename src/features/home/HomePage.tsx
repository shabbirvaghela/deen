import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { PageHeader } from "../../components/layout/PageHeader";
import { Card } from "../../components/ui/Card";
import { SectionTitle } from "../../components/ui/SectionTitle";

import { getDailyContent } from "../../services/dailyService";
import { initializeDatabase } from "../../services/initializeDatabase";
import { consumeNext, getQueueCount } from "../../services/queueService";
import { getSeenCount, recordSeen } from "../../services/historyService";
import { maintainQueue, refillQueue } from "../../services/syncService";
import type { ContentType, LearningContent } from "../../types/content";

type LearningCounts = {
  ayahQueue: number;
  hadithQueue: number;
  ayahSeen: number;
  hadithSeen: number;
};

const initialCounts: LearningCounts = {
  ayahQueue: 0,
  hadithQueue: 0,
  ayahSeen: 0,
  hadithSeen: 0,
};

export function HomePage() {
  const [ayah, setAyah] = useState<LearningContent | null>(null);
  const [hadith, setHadith] = useState<LearningContent | null>(null);
  const [counts, setCounts] = useState(initialCounts);
  const [loading, setLoading] = useState(true);
  const [loadingType, setLoadingType] = useState<ContentType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(
    () => typeof navigator !== "undefined" && navigator.onLine,
  );

  const refreshCounts = useCallback(async () => {
    const [ayahQueue, hadithQueue, ayahSeen, hadithSeen] = await Promise.all([
      getQueueCount("ayah"),
      getQueueCount("hadith"),
      getSeenCount("ayah"),
      getSeenCount("hadith"),
    ]);

    setCounts({ ayahQueue, hadithQueue, ayahSeen, hadithSeen });
  }, []);

  useEffect(() => {
    let active = true;

    async function loadHome() {
      setLoading(true);
      setError(null);

      try {
        await initializeDatabase();

        const [dailyAyah, dailyHadith] = await Promise.all([
          getDailyContent("ayah"),
          getDailyContent("hadith"),
        ]);

        if (!active) return;

        setAyah(dailyAyah ?? null);
        setHadith(dailyHadith ?? null);

        await Promise.all([
          dailyAyah ? recordSeen("ayah", dailyAyah.id) : Promise.resolve(),
          dailyHadith
            ? recordSeen("hadith", dailyHadith.id)
            : Promise.resolve(),
        ]);

        await refreshCounts();

        if (navigator.onLine) {
          void Promise.allSettled([
            maintainQueue("ayah"),
            maintainQueue("hadith"),
            refillQueue("ayah"),
            refillQueue("hadith"),
          ]);
        }
      } catch (err) {
        console.error("Could not initialize Home:", err);

        if (active) {
          setError("Learning content could not be loaded. Please try again.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadHome();

    return () => {
      active = false;
    };
  }, [refreshCounts]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  async function showNext(type: ContentType) {
    if (loadingType !== null) return;

    setLoadingType(type);
    setError(null);

    try {
      let item = await consumeNext(type);
      if (!item && navigator.onLine) {
        await refillQueue(type);
        item = await consumeNext(type);
      }

      if (!item) {
        setError(
          navigator.onLine
            ? `No new ${type} is available yet. Please try again shortly.`
            : `No saved ${type} is available offline. Connect to download more content.`,
        );
        return;
      }

      // Record the item when the user requests the next item.
      // recordSeen uses a stable ID to avoid duplicate history entries.
      await recordSeen(type, item.id);

      if (type === "ayah") {
        setAyah(item);
      } else {
        setHadith(item);
      }

      await refreshCounts();

      if (navigator.onLine) {
        void maintainQueue(type);
      }
    } catch (err) {
      console.error(`Could not load next ${type}:`, err);
      setError(`Could not load or save the next ${type}. Please try again.`);
    } finally {
      setLoadingType(null);
    }
  }

  const totalLearned = counts.ayahSeen + counts.hadithSeen;

  const translation = (item: LearningContent) =>
    item.hinglishTranslation?.trim() ||
    item.sourceTranslation?.text ||
    "Translation not available yet.";

  return (
    <div className="stack">
      <PageHeader
        eyebrow="YOUR DAILY COMPANION"
        title="Assalamu Alaikum"
        description="A small step towards understanding your Deen, every day."
      />

      <Card className="hero-card">
        <div className="hero-kicker">TODAY'S FOCUS</div>
        <h2>Learn with understanding</h2>
        <p>
          Read an Ayah, reflect on a Hadith, and build a daily habit of
          remembrance.
        </p>
        <Link to="/learn" className="button button-light">
          Continue learning <span aria-hidden="true">→</span>
        </Link>
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="tile-label">YOUR LEARNING JOURNEY</p>
            <h3 className="text-xl font-semibold">
              {totalLearned} items learned
            </h3>
            <p className="muted small">
              {counts.ayahSeen} Ayat · {counts.hadithSeen} Hadith
            </p>
          </div>
          <span className="tile-icon green" aria-hidden="true">
            ✓
          </span>
        </div>

        <div className="two-col mt-4">
          <div>
            <p className="muted small">Queued Ayat</p>
            <strong>{counts.ayahQueue}</strong>
          </div>
          <div>
            <p className="muted small">Queued Hadith</p>
            <strong>{counts.hadithQueue}</strong>
          </div>
        </div>

        <p className="muted small mt-3">
          {isOnline
            ? "Online · Sync available"
            : "Offline · Using saved content"}
        </p>
      </Card>

      {error && (
        <Card>
          <p role="alert">{error}</p>
          <button
            type="button"
            className="text-link mt-2"
            onClick={() => window.location.reload()}
          >
            Retry loading →
          </button>
        </Card>
      )}

      {loading ? (
        <Card>
          <p role="status">Loading your daily learning content…</p>
        </Card>
      ) : (
        <>
          <Card>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="tile-label">QUR'AN</p>
                <h3 className="text-lg font-semibold">Ayah to reflect on</h3>
              </div>
              <span className="tile-icon green" aria-hidden="true">
                ۞
              </span>
            </div>

            {ayah ? (
              <>
                <p
                  dir="rtl"
                  lang="ar"
                  className="my-5 text-right text-2xl leading-loose"
                >
                  {ayah.originalText}
                </p>

                {ayah.transliteration && (
                  <p className="muted small italic">{ayah.transliteration}</p>
                )}

                <p className="my-3 leading-relaxed">{translation(ayah)}</p>
                <p className="muted small">Reference: {ayah.reference.id}</p>
              </>
            ) : (
              <p className="muted small my-4">
                No daily Ayah is available yet. Download content when online.
              </p>
            )}

            <button
              type="button"
              className="button mt-4"
              disabled={loadingType !== null}
              onClick={() => void showNext("ayah")}
            >
              {loadingType === "ayah" ? "Loading…" : "Next Ayah →"}
            </button>
          </Card>

          <Card>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="tile-label">PROPHETIC TEACHINGS</p>
                <h3 className="text-lg font-semibold">Hadith to reflect on</h3>
              </div>
              <span className="tile-icon gold" aria-hidden="true">
                ✦
              </span>
            </div>

            {hadith ? (
              <>
                {hadith.originalText && (
                  <p
                    dir="rtl"
                    lang="ar"
                    className="my-4 text-right text-xl leading-loose"
                  >
                    {hadith.originalText}
                  </p>
                )}

                <p className="my-4 leading-relaxed">{translation(hadith)}</p>
                <p className="muted small">
                  Source: {hadith.reference.source} ·{" "}
                  {hadith.reference.hadithNumber ?? hadith.reference.id}
                </p>

                {hadith.authenticity && (
                  <p className="muted small mt-2">
                    Grading: {hadith.authenticity}
                  </p>
                )}
              </>
            ) : (
              <p className="muted small my-4">
                No daily Hadith is available yet. Download content when online.
              </p>
            )}

            <button
              type="button"
              className="button mt-4"
              disabled={loadingType !== null}
              onClick={() => void showNext("hadith")}
            >
              {loadingType === "hadith" ? "Loading…" : "Next Hadith →"}
            </button>
          </Card>
        </>
      )}

      <div className="two-col">
        <Card>
          <div className="tile-icon green">◷</div>
          <p className="tile-label">Prayer & fasting</p>
          <h3>Daily practice</h3>
          <p className="muted small">
            Prayer times and fasting schedule for your location.
          </p>
          <Link to="/practice" className="text-link">
            View timetable →
          </Link>
        </Card>

        <Card>
          <div className="tile-icon gold">♡</div>
          <p className="tile-label">Daily remembrance</p>
          <h3>Duas & Adhkar</h3>
          <p className="muted small">Morning, break-time and bedtime duas.</p>
          <Link to="/duas" className="text-link">
            Explore duas →
          </Link>
        </Card>
      </div>

      <div className="section-title">
        <SectionTitle title="Your learning library" action="Choose a path" />
      </div>

      <div className="two-col">
        <Link className="feature-card" to="/learn/quran">
          <span className="feature-icon">۞</span>
          <span>
            <strong>Qur'an</strong>
            <small>Ayat, meaning and reflection</small>
          </span>
          <span className="arrow">↗</span>
        </Link>

        <Link className="feature-card" to="/learn/hadith">
          <span className="feature-icon gold-text">✦</span>
          <span>
            <strong>Hadith</strong>
            <small>Prophetic teachings with references</small>
          </span>
          <span className="arrow">↗</span>
        </Link>
      </div>

      <Card className="note-card">
        <strong>Built for steady learning</strong>
        <p className="muted small">
          Downloaded content and reading history remain available offline on
          this device. New content requires an internet connection.
        </p>
        <Link to="/history" className="text-link">
          View learning history →
        </Link>
      </Card>
    </div>
  );
}
