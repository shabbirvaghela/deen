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

  const [current, setCurrent] = useState<
    Partial<Record<ContentType, LearningContent>>
  >({});

  // Independent loading states
  const [isAyahLoading, setIsAyahLoading] = useState(false);
  const [isHadithLoading, setIsHadithLoading] = useState(false);

  const [expandedAyah, setExpandedAyah] = useState(false);
  const [expandedHadith, setExpandedHadith] = useState(false);

  const [ayahError, setAyahError] = useState<string | null>(null);
  const [hadithError, setHadithError] = useState<string | null>(null);

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

  async function handleUnderstandAyah() {
    const item = current.ayah;
    if (!item || isAyahLoading) return;

    setExpandedAyah(true);
    setAyahError(null);

    if (item.hinglishTranslation && item.explanation?.simpleMeaning) {
      return;
    }

    setIsAyahLoading(true);

    try {
      const updated = await getExplanation(item);

      setCurrent((previous) => ({
        ...previous,
        ayah: updated,
      }));
    } catch (error) {
      setAyahError(
        error instanceof Error ? error.message : "Unable to load explanation.",
      );
    } finally {
      setIsAyahLoading(false);
    }
  }

  async function handleUnderstandHadith() {
    const item = current.hadith;
    if (!item || isHadithLoading) return;

    setExpandedHadith(true);
    setHadithError(null);

    if (item.hinglishTranslation && item.explanation?.simpleMeaning) {
      return;
    }

    setIsHadithLoading(true);

    try {
      const updated = await getExplanation(item);

      setCurrent((previous) => ({
        ...previous,
        hadith: updated,
      }));
    } catch (error) {
      setHadithError(
        error instanceof Error ? error.message : "Unable to load explanation.",
      );
    } finally {
      setIsHadithLoading(false);
    }
  }

  async function showNext(type: ContentType) {
    try {
      const item = await consumeNext(type);

      if (!item) {
        if (navigator.onLine) {
          void refillQueue(type);
        }

        setStatus(
          `No saved ${type} available. Connect to the internet to download content.`,
        );
        return;
      }

      setCurrent((previous) => ({
        ...previous,
        [type]: item,
      }));

      if (type === "ayah") {
        setExpandedAyah(false);
        setAyahError(null);
      } else {
        setExpandedHadith(false);
        setHadithError(null);
      }

      await refreshCounts();

      if (navigator.onLine) {
        void maintainQueue(type);
      }

      setStatus(
        navigator.onLine
          ? "Content loaded successfully"
          : "Offline mode: saved content available",
      );
    } catch (error) {
      console.error("Could not load content:", error);
      setStatus("Could not load content. Please try again.");
    }
  }

  useEffect(() => {
    const refillAllQueues = () => {
      if (!navigator.onLine) return;

      void Promise.allSettled([
        maintainQueue("ayah"),
        maintainQueue("hadith"),
        refillQueue("ayah"),
        refillQueue("hadith"),
      ]);
    };

    window.addEventListener("online", refillAllQueues);

    // Initial check when the app starts.
    refillAllQueues();

    return () => {
      window.removeEventListener("online", refillAllQueues);
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#f7f8f3] text-[#183b30]">
      <div className="mx-auto max-w-3xl px-4 py-5 sm:px-6 sm:py-8">
        {/* Header */}
        <header className="mb-7 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#064e3b] text-3xl shadow-lg shadow-emerald-950/15">
              <span aria-hidden="true">☾</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Deen</h1>
              <p className="text-sm text-[#718078]">
                Learn. Reflect. Practice.
              </p>
            </div>
          </div>

          <div className="rounded-full border border-[#dce8dc] bg-white px-3 py-2 text-xs font-medium text-[#527264]">
            ✦ Daily learning
          </div>
        </header>

        {/* Welcome banner */}
        <section className="relative mb-7 overflow-hidden rounded-3xl bg-gradient-to-br from-[#064e3b] via-[#08634a] to-[#123e32] p-6 text-white shadow-xl shadow-emerald-950/10 sm:p-8">
          <div className="pointer-events-none absolute -right-8 -top-12 text-[150px] text-white/[0.06]">
            ☾
          </div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#e6cc87]">
            Your daily reminder
          </p>
          <h2 className="max-w-md text-2xl font-semibold leading-snug sm:text-3xl">
            Bring knowledge into your everyday life.
          </h2>
          <p className="mt-3 max-w-md text-sm leading-6 text-emerald-50/80">
            Understand the Qur’an and Hadith, one lesson at a time.
          </p>
          <div className="mt-6 flex items-center gap-2 text-sm text-[#f2dfaa]">
            <span aria-hidden="true">✦</span>
            <span>Read • Understand • Practice</span>
          </div>
        </section>

        {/* Status */}
        <div
          role="status"
          className="mb-6 flex items-start gap-3 rounded-2xl border border-[#e2e8dc] bg-white px-4 py-3"
        >
          <span className="mt-0.5 text-lg" aria-hidden="true">
            ◈
          </span>
          <div>
            <p className="text-sm font-semibold">Learning status</p>
            <p className="mt-1 text-sm text-[#718078]">{status}</p>
          </div>
        </div>

        {/* Ayah card */}
        <section className="mb-6 overflow-hidden rounded-3xl border border-[#e2e8dc] bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-[#edf0e9] px-5 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e7f1e8] text-xl">
                📖
              </div>
              <div>
                <h2 className="font-bold">Qur’an Ayah</h2>
                <p className="text-xs text-[#829087]">Verse of the day</p>
              </div>
            </div>
            <span className="rounded-full bg-[#edf5eb] px-3 py-1 text-xs font-semibold text-[#34714e]">
              AYAH
            </span>
          </div>

          <div className="p-5 sm:p-6">
            {current.ayah ? (
              <>
                <div className="rounded-2xl bg-[#f5f7ef] px-4 py-7 sm:px-6 sm:py-9">
                  <p
                    dir="rtl"
                    lang="ar"
                    className="text-right text-3xl leading-[2] text-[#164b37] sm:text-4xl"
                  >
                    {current.ayah.originalText}
                  </p>
                </div>

                {current.ayah.transliteration && (
                  <p className="mt-5 text-sm italic leading-7 text-[#718078]">
                    {current.ayah.transliteration}
                  </p>
                )}

                <div className="mt-4 border-l-[3px] border-[#d2b46b] pl-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#8d7135]">
                    Translation
                  </p>
                  <p className="mt-2 leading-7 text-[#334d40]">
                    {current.ayah.hinglishTranslation ??
                      current.ayah.sourceTranslation?.text ??
                      "Translation not available yet."}
                  </p>
                </div>

                <p className="mt-4 text-xs text-[#89958c]">
                  Reference: {current.ayah.reference.id}
                </p>

                {expandedAyah && (
                  <div className="mt-5 space-y-4 rounded-2xl border border-[#e0eadc] bg-[#f8faf5] p-4 sm:p-5">
                    {isAyahLoading && (
                      <p role="status" className="text-sm text-[#527264]">
                        Preparing your explanation…
                      </p>
                    )}

                    {ayahError && (
                      <div>
                        <p role="alert" className="text-sm text-red-700">
                          {ayahError}
                        </p>
                        <button
                          className="mt-2 text-sm font-semibold text-[#176447] underline"
                          onClick={() => void handleUnderstandAyah()}
                        >
                          Try again
                        </button>
                      </div>
                    )}

                    {current.ayah.hinglishTranslation && (
                      <div>
                        <h3 className="font-semibold">Hinglish translation</h3>
                        <p className="mt-1 text-sm leading-6 text-[#52675a]">
                          {current.ayah.hinglishTranslation}
                        </p>
                      </div>
                    )}

                    {current.ayah.explanation && (
                      <>
                        {[
                          [
                            "Simple meaning",
                            current.ayah.explanation.simpleMeaning,
                          ],
                          ["Context", current.ayah.explanation.context],
                          [
                            "Everyday example",
                            current.ayah.explanation.example,
                          ],
                          [
                            "Practical lesson",
                            current.ayah.explanation.practicalLesson,
                          ],
                          ["Source note", current.ayah.explanation.sourceNote],
                        ].map(([title, value]) =>
                          value ? (
                            <div key={title}>
                              <h3 className="font-semibold">{title}</h3>
                              <p className="mt-1 text-sm leading-6 text-[#52675a]">
                                {value}
                              </p>
                            </div>
                          ) : null,
                        )}
                      </>
                    )}
                  </div>
                )}

                <button
                  className="mt-5 w-full rounded-xl bg-[#07543d] px-4 py-3.5 font-semibold text-white transition hover:bg-[#06432f] disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isAyahLoading}
                  onClick={() => void handleUnderstandAyah()}
                >
                  {isAyahLoading
                    ? "Preparing explanation…"
                    : expandedAyah
                      ? "Refresh understanding"
                      : "Understand in detail"}
                </button>
              </>
            ) : (
              <p className="py-8 text-center text-sm text-[#718078]">
                No saved Ayah available yet. Connect to the internet to download
                content.
              </p>
            )}

            <button
              className="mt-3 w-full rounded-xl border border-[#d9e4d7] px-4 py-3 font-semibold text-[#245b43] transition hover:bg-[#f5f8f2]"
              onClick={() => void showNext("ayah")}
            >
              ↻ &nbsp; New Ayah
            </button>
          </div>
        </section>

        {/* Hadith card */}
        <section className="mb-7 overflow-hidden rounded-3xl border border-[#e2e8dc] bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-[#edf0e9] px-5 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fbf0d9] text-xl">
                ✨
              </div>
              <div>
                <h2 className="font-bold">Hadith</h2>
                <p className="text-xs text-[#829087]">Prophetic teachings</p>
              </div>
            </div>
            <span className="rounded-full bg-[#fbf1dd] px-3 py-1 text-xs font-semibold text-[#8d7135]">
              HADITH
            </span>
          </div>

          <div className="p-5 sm:p-6">
            {current.hadith ? (
              <>
                <div className="rounded-2xl bg-[#fcf8ee] p-5 sm:p-6">
                  <p className="text-lg leading-8 text-[#354b3d]">
                    {current.hadith.hinglishTranslation ??
                      current.hadith.sourceTranslation?.text ??
                      "Translation not available yet."}
                  </p>
                </div>

                <p className="mt-4 text-xs leading-5 text-[#89958c]">
                  {current.hadith.reference.source}
                  {" · "}
                  {current.hadith.reference.hadithNumber ??
                    current.hadith.reference.id}
                  {current.hadith.authenticity
                    ? ` · ${current.hadith.authenticity}`
                    : ""}
                </p>

                {expandedHadith && (
                  <div className="mt-5 space-y-4 rounded-2xl border border-[#eee5d1] bg-[#fdfbf5] p-4 sm:p-5">
                    {isHadithLoading && (
                      <p role="status" className="text-sm text-[#8d7135]">
                        Preparing your explanation…
                      </p>
                    )}

                    {hadithError && (
                      <div>
                        <p role="alert" className="text-sm text-red-700">
                          {hadithError}
                        </p>
                        <button
                          className="mt-2 text-sm font-semibold text-[#176447] underline"
                          onClick={() => void handleUnderstandHadith()}
                        >
                          Try again
                        </button>
                      </div>
                    )}

                    {current.hadith.hinglishTranslation && (
                      <div>
                        <h3 className="font-semibold">Hinglish translation</h3>
                        <p className="mt-1 text-sm leading-6 text-[#52675a]">
                          {current.hadith.hinglishTranslation}
                        </p>
                      </div>
                    )}

                    {current.hadith.explanation &&
                      [
                        [
                          "Simple meaning",
                          current.hadith.explanation.simpleMeaning,
                        ],
                        ["Context", current.hadith.explanation.context],
                        [
                          "Everyday example",
                          current.hadith.explanation.example,
                        ],
                        [
                          "Practical lesson",
                          current.hadith.explanation.practicalLesson,
                        ],
                        ["Source note", current.hadith.explanation.sourceNote],
                      ].map(([title, value]) =>
                        value ? (
                          <div key={title}>
                            <h3 className="font-semibold">{title}</h3>
                            <p className="mt-1 text-sm leading-6 text-[#52675a]">
                              {value}
                            </p>
                          </div>
                        ) : null,
                      )}
                  </div>
                )}

                <button
                  className="mt-5 w-full rounded-xl bg-[#b28b3d] px-4 py-3.5 font-semibold text-white transition hover:bg-[#98732f] disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isHadithLoading}
                  onClick={() => void handleUnderstandHadith()}
                >
                  {isHadithLoading
                    ? "Preparing explanation…"
                    : expandedHadith
                      ? "Refresh understanding"
                      : "Understand in detail"}
                </button>
              </>
            ) : (
              <p className="py-8 text-center text-sm text-[#718078]">
                No saved Hadith available yet. Connect to the internet to
                download content.
              </p>
            )}

            <button
              className="mt-3 w-full rounded-xl border border-[#e9dfc7] px-4 py-3 font-semibold text-[#80652e] transition hover:bg-[#fdf9ef]"
              onClick={() => void showNext("hadith")}
            >
              ↻ &nbsp; New Hadith
            </button>
          </div>
        </section>

        {/* Progress dashboard */}
        <section className="rounded-3xl border border-[#e2e8dc] bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8d7135]">
              Your journey
            </p>
            <h2 className="mt-1 text-xl font-bold">Learning progress</h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-[#f0f6ee] p-4">
              <p className="text-sm text-[#64796b]">Ayat seen</p>
              <p className="mt-2 text-3xl font-bold text-[#176447]">
                {counts.ayahSeen}
              </p>
              <p className="mt-1 text-xs text-[#718078]">
                {counts.ayahQueue} ready to explore
              </p>
            </div>

            <div className="rounded-2xl bg-[#fcf5e7] p-4">
              <p className="text-sm text-[#8d784d]">Hadith seen</p>
              <p className="mt-2 text-3xl font-bold text-[#92702d]">
                {counts.hadithSeen}
              </p>
              <p className="mt-1 text-xs text-[#8d784d]">
                {counts.hadithQueue} ready to explore
              </p>
            </div>
          </div>

          <p className="mt-5 text-center text-xs leading-5 text-[#89958c]">
            Small, consistent steps can build lasting understanding.
          </p>
        </section>

        <footer className="py-7 text-center text-xs text-[#89958c]">
          Made for learning and reflection · Deen
        </footer>
      </div>
    </main>
  );
}

export default App;
