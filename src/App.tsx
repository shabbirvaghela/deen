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
  const [current, setCurrent] = useState<
    Partial<Record<ContentType, LearningContent>>
  >({});
  const [counts, setCounts] = useState({
    ayahQueue: 0,
    hadithQueue: 0,
    ayahSeen: 0,
    hadithSeen: 0,
  });

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

        // Don't block the UI while fetching.
        void refillQueue("ayah");
        void refillQueue("hadith");
      } catch (error) {
        console.error(error);
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
      const item = await consumeNext(type);

      if (!item) {
        // Try to replenish an empty queue.
        void refillQueue(type);
        setStatus(`Loading unseen ${type}...`);
        return;
      }

      setCurrent((previous) => ({ ...previous, [type]: item }));
      await refreshCounts();

      // Start refill only when the queue is low.
      void maintainQueue(type);

      setStatus("Content loaded successfully");
    } catch (error) {
      console.error(error);
      setStatus("Could not load content.");
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <section className="mx-auto max-w-xl space-y-5">
        <h1 className="text-3xl font-bold text-emerald-900">Deen</h1>
        <p role="status">{status}</p>

        <div className="rounded-xl border bg-white p-4 space-y-2">
          <h2 className="font-semibold">Quran Ayat</h2>
          <p>{current.ayah?.transliteration ?? "Press New Ayat to start"}</p>
          <p>
            {current.ayah?.hinglishTranslation ??
              current.ayah?.sourceTranslation?.text ??
              ""}
          </p>
          <p className="text-sm text-gray-500">
            {current.ayah?.reference.id ?? ""}
          </p>

          <button
            className="rounded-lg border border-emerald-700 px-4 py-2 text-emerald-800"
            onClick={() =>
              setExpandedId(
                expandedId === current.ayah?.id
                  ? null
                  : (current.ayah?.id ?? null),
              )
            }
          >
            Understand in Detail
          </button>

          {expandedId === current.ayah?.id && current.ayah && (
            <div className="mt-3 rounded-lg bg-emerald-50 p-4">
              <h3 className="font-semibold">Detailed Explanation</h3>
              <p className="mt-2">
                {current.ayah.explanation?.simpleMeaning ??
                  "Explanation abhi available nahi hai. Agle step mein verified explanation service connect karenge."}
              </p>
              {current.ayah.explanation?.example && (
                <p className="mt-2">
                  <strong>Example:</strong> {current.ayah.explanation.example}
                </p>
              )}
              {current.ayah.explanation?.practicalLesson && (
                <p className="mt-2">
                  <strong>Practical lesson:</strong>{" "}
                  {current.ayah.explanation.practicalLesson}
                </p>
              )}
            </div>
          )}
          <button
            className="rounded-lg bg-emerald-700 px-4 py-2 text-white"
            onClick={() => void showNext("ayah")}
          >
            New Ayat
          </button>
        </div>

        <div className="rounded-xl border bg-white p-4 space-y-2">
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
            </>
          ) : (
            <p>Press New Hadith to load a hadith.</p>
          )}

          <button
            className="rounded-lg bg-emerald-700 px-4 py-2 text-white"
            onClick={() => void showNext("hadith")}
          >
            New Hadith
          </button>
        </div>

        <div className="rounded-xl border bg-white p-4 space-y-1">
          <h2 className="font-semibold">Queue & History</h2>
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
