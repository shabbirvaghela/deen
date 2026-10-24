import { getExplanation } from "./services/explanationService";
import { getDailyContent } from "./services/dailyService";
import { useEffect, useState } from "react";
import { maintainQueue, refillQueue } from "./services/syncService";
import { initializeDatabase } from "./services/initializeDatabase";
import { consumeNext, getQueueCount } from "./services/queueService";
import { getSeenCount } from "./services/historyService";
import type { ContentType, LearningContent } from "./types/content";

function App() {
  const [status, setStatus] = useState("Initializing...");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loadingExplanation, setLoadingExplanation] = useState<string | null>(
    null,
  );
  const [explanationErrors, setExplanationErrors] = useState<
    Partial<Record<ContentType, string>>
  >({});

  const [current, setCurrent] = useState<
    Partial<Record<ContentType, LearningContent>>
  >({});

  const [counts, setCounts] = useState({
    ayahQueue: 0,
    hadithQueue: 0,
    ayahSeen: 0,
    hadithSeen: 0,
  });

  async function handleUnderstand(item: LearningContent | undefined) {
    if (!item) return;

    setExpandedId(item.id);
    setExplanationErrors((previous) => ({
      ...previous,
      [item.type]: undefined,
    }));

    if (item.hinglishTranslation && item.explanation?.simpleMeaning) {
      return;
    }

    setLoadingExplanation(item.id);

    try {
      const updated = await getExplanation(item);

      setCurrent((previous) => ({
        ...previous,
        [item.type]: updated,
      }));
    } catch (error) {
      setExplanationErrors((previous) => ({
        ...previous,
        [item.type]:
          error instanceof Error
            ? error.message
            : "Something went wrong. Please try again.",
      }));
    } finally {
      setLoadingExplanation((previous) =>
        previous === item.id ? null : previous,
      );
    }
  }

  async function refreshCounts() {
    const [ayahQueue, hadithQueue, ayahSeen, hadithSeen] = await Promise.all([
      getQueueCount("ayah"),
      getQueueCount("hadith"),
      getSeenCount("ayah"),
      getSeenCount("hadith"),
    ]);

    setCounts({ ayahQueue, hadithQueue, ayahSeen, hadithSeen });
  }

  useEffect(() => {
    let active = true;

    async function start() {
      try {
        await initializeDatabase();

        const [ayah, hadith] = await Promise.all([
          getDailyContent("ayah"),
          getDailyContent("hadith"),
        ]);

        if (active) {
          setCurrent({
            ...(ayah ? { ayah } : {}),
            ...(hadith ? { hadith } : {}),
          });
        }

        void maintainQueue("ayah");
        void maintainQueue("hadith");

        await refreshCounts();

        if (active) setStatus("Database ready");

        void refillQueue("ayah");
        void refillQueue("hadith");
      } catch (error) {
        console.error("Initialization failed:", error);
        if (active) setStatus("Database initialization failed");
      }
    }

    void start();

    return () => {
      active = false;
    };
  }, []);

  async function showNext(type: ContentType) {
    try {
      setExplanationErrors((previous) => ({
        ...previous,
        [type]: undefined,
      }));

      const item = await consumeNext(type);

      if (!item) {
        void refillQueue(type);
        setStatus(`Loading unseen ${type}...`);
        return;
      }

      setCurrent((previous) => ({ ...previous, [type]: item }));

      setExpandedId(null);
      await refreshCounts();
      void maintainQueue(type);

      setStatus("Content loaded successfully");
    } catch (error) {
      console.error("Could not load content:", error);
      setStatus("Could not load content.");
    }
  }

  function renderExplanation(item: LearningContent) {
    const isLoading = loadingExplanation === item.id;
    const error = explanationErrors[item.type];

    return (
      <>
        <button
          className="rounded-lg border border-emerald-700 px-4 py-2 text-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isLoading}
          onClick={() => void handleUnderstand(item)}
        >
          {isLoading ? "Explaining..." : "Understand in Detail"}
        </button>

        {expandedId === item.id && (
          <div className="space-y-3 rounded-lg bg-emerald-50 p-4">
            {error && (
              <div className="space-y-2">
                <p role="alert" className="text-red-700">
                  {error}
                </p>
                <button
                  className="rounded-lg border border-red-700 px-3 py-1 text-red-700"
                  disabled={isLoading}
                  onClick={() => void handleUnderstand(item)}
                >
                  Try Again
                </button>
              </div>
            )}

            {isLoading && (
              <p role="status">Hinglish explanation load ho rahi hai...</p>
            )}

            {item.hinglishTranslation && (
              <p>
                <strong>Hinglish translation:</strong>{" "}
                {item.hinglishTranslation}
              </p>
            )}

            {item.explanation && (
              <>
                <p>
                  <strong>Simple meaning:</strong>{" "}
                  {item.explanation.simpleMeaning}
                </p>
                <p>
                  <strong>Context:</strong> {item.explanation.context}
                </p>
                <p>
                  <strong>Example:</strong> {item.explanation.example}
                </p>
                <p>
                  <strong>Practical lesson:</strong>{" "}
                  {item.explanation.practicalLesson}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Source note:</strong> {item.explanation.sourceNote}
                </p>
              </>
            )}
          </div>
        )}
      </>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <section className="mx-auto max-w-xl space-y-5">
        <h1 className="text-3xl font-bold text-emerald-900">Deen</h1>
        <p role="status">{status}</p>

        <div className="space-y-3 rounded-xl border bg-white p-4">
          <h2 className="font-semibold">Quran Ayat</h2>

          {current.ayah ? (
            <>
              <p>{current.ayah.originalText}</p>
              <p>{current.ayah.transliteration}</p>
              <p>
                {current.ayah.hinglishTranslation ??
                  current.ayah.sourceTranslation?.text ??
                  ""}
              </p>
              <p className="text-sm text-gray-500">
                {current.ayah.reference.id}
              </p>

              {renderExplanation(current.ayah)}
            </>
          ) : (
            <p>No Ayat available yet. Please try again shortly.</p>
          )}

          <button
            className="rounded-lg bg-emerald-700 px-4 py-2 text-white"
            onClick={() => void showNext("ayah")}
          >
            New Ayat
          </button>
        </div>

        <div className="space-y-3 rounded-xl border bg-white p-4">
          <h2 className="font-semibold">Hadith</h2>

          {current.hadith ? (
            <>
              <p>{current.hadith.originalText}</p>
              <p>
                {current.hadith.hinglishTranslation ??
                  current.hadith.sourceTranslation?.text ??
                  "Translation unavailable"}
              </p>
              <p className="text-sm text-gray-500">
                {current.hadith.reference.source} ·{" "}
                {current.hadith.reference.hadithNumber ??
                  current.hadith.reference.id}
              </p>

              {renderExplanation(current.hadith)}
            </>
          ) : (
            <p>No Hadith available yet. Please try again shortly.</p>
          )}

          <button
            className="rounded-lg bg-emerald-700 px-4 py-2 text-white"
            onClick={() => void showNext("hadith")}
          >
            New Hadith
          </button>
        </div>

        <div className="space-y-1 rounded-xl border bg-white p-4">
          <h2 className="font-semibold">Queue &amp; History</h2>
          <p>Ayat queue: {counts.ayahQueue}</p>
          <p>Ayat seen: {counts.ayahSeen}</p>
          <p>Hadith queue: {counts.hadithQueue}</p>
          <p>Hadith seen: {counts.hadithSeen}</p>
        </div>
      </section>
    </main>
  );
}

export default App;
