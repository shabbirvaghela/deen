import { getDailyContent } from "./services/dailyService";
import { useEffect, useState } from "react";
import { maintainQueue, refillQueue } from "./services/syncService";
import { initializeDatabase } from "./services/initializeDatabase";
import { consumeNext, getQueueCount } from "./services/queueService";
import { getSeenCount } from "./services/historyService";
import type { ContentType, LearningContent } from "./types/content";

type Tab = "home" | "history" | "settings";

function formatPrayerTime(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return value;
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function App() {
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    try {
      setIsDarkMode(window.localStorage.getItem("deen-theme") === "dark");
    } catch {
      // Continue with the default light theme if storage is unavailable.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("deen-theme", isDarkMode ? "dark" : "light");
    } catch {
      // Theme still works for the current session if storage is unavailable.
    }
  }, [isDarkMode]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [prayerTimings, setPrayerTimings] = useState<Record<string, string>>(
    {},
  );
  const [prayerTimingsSource, setPrayerTimingsSource] = useState("loading");

  // Fixed user-selected location: Kadi, Mehsana, Gujarat. Karachi calculation
  // method and Hanafi Asr are commonly used in this region; verify with the
  // local masjid timetable where exact minutes matter.
  useEffect(() => {
    let cancelled = false;
    const loadPrayerTimings = async () => {
      try {
        const response = await fetch(
          "https://api.aladhan.com/v1/timingsByCity?city=Kadi&country=India&method=1&school=1",
        );
        if (!response.ok) throw new Error("Prayer timings unavailable");
        const result = await response.json();
        const timings = result?.data?.timings;
        if (!timings) throw new Error("Missing prayer timings");
        if (!cancelled) {
          setPrayerTimings({
            Fajr: timings.Fajr,
            Dhuhr: timings.Dhuhr,
            Asr: timings.Asr,
            Maghrib: timings.Maghrib,
            Isha: timings.Isha,
          });
          setPrayerTimingsSource("live");
        }
      } catch {
        if (!cancelled) setPrayerTimingsSource("unavailable");
      }
    };
    void loadPrayerTimings();
    return () => {
      cancelled = true;
    };
  }, []);
  const [current, setCurrent] = useState<
    Partial<Record<ContentType, LearningContent>>
  >({});

  // Independent loading states
  const [isAyahLoading, setIsAyahLoading] = useState(false);
  const [isHadithLoading, setIsHadithLoading] = useState(false);

  const [counts, setCounts] = useState({
    ayahQueue: 0,
    hadithQueue: 0,
    ayahSeen: 0,
    hadithSeen: 0,
  });
  const [activityDates, setActivityDates] = useState<number[]>([]);

  const ACTIVITY_KEY = "deen-learning-activity-v1";

  function loadActivity() {
    try {
      const parsed = JSON.parse(
        window.localStorage.getItem(ACTIVITY_KEY) || "[]",
      );
      const valid = Array.isArray(parsed)
        ? parsed.filter(
            (item) =>
              item &&
              typeof item.at === "number" &&
              (item.type === "ayah" || item.type === "hadith"),
          )
        : [];
      setActivityDates(valid.map((item) => item.at));
      return valid;
    } catch {
      setActivityDates([]);
      return [];
    }
  }

  function recordActivity(type: ContentType, contentId: string) {
    try {
      const stored = loadActivity() as {
        at: number;
        type: ContentType;
        id: string;
      }[];
      const today = new Date().toDateString();
      const alreadyRecorded = stored.some(
        (item) =>
          item.type === type &&
          item.id === contentId &&
          new Date(item.at).toDateString() === today,
      );
      if (alreadyRecorded) return;
      const next = [...stored, { at: Date.now(), type, id: contentId }].slice(
        -2000,
      );
      window.localStorage.setItem(ACTIVITY_KEY, JSON.stringify(next));
      setActivityDates(next.map((item) => item.at));
    } catch {
      // Learning remains available if local storage is unavailable.
    }
  }

  const now = Date.now();
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(dayStart);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const monthStart = new Date(dayStart.getFullYear(), dayStart.getMonth(), 1);
  const dailyDone = activityDates.filter(
    (at) => at >= dayStart.getTime() && at <= now,
  ).length;
  const weeklyDone = activityDates.filter(
    (at) => at >= weekStart.getTime() && at <= now,
  ).length;
  const monthlyDone = activityDates.filter(
    (at) => at >= monthStart.getTime() && at <= now,
  ).length;
  const islamicDate = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  const totalLearned = counts.ayahSeen + counts.hadithSeen;
  const level =
    totalLearned >= 500
      ? { title: "Knowledge Seeker", next: 1000 }
      : totalLearned >= 200
        ? { title: "Dedicated Learner", next: 500 }
        : totalLearned >= 50
          ? { title: "Consistent Learner", next: 200 }
          : totalLearned >= 10
            ? { title: "Curious Learner", next: 50 }
            : { title: "Beginner", next: 10 };

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
        loadActivity();
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
          if (ayah) recordActivity("ayah", ayah.id);
          if (hadith) recordActivity("hadith", hadith.id);
        }

        void maintainQueue("ayah");
        void maintainQueue("hadith");

        await refreshCounts();

        void refillQueue("ayah");
        void refillQueue("hadith");
      } catch (error) {
        console.error("Initialization failed:", error);
      }
    }

    void start();

    return () => {
      active = false;
    };
  }, []);

  async function showNext(type: ContentType) {
    const setLoading = type === "ayah" ? setIsAyahLoading : setIsHadithLoading;

    setLoading(true);
    try {
      const item = await consumeNext(type);

      if (!item) {
        if (navigator.onLine) {
          void refillQueue(type);
        }

        return;
      }

      setCurrent((previous) => ({
        ...previous,
        [type]: item,
      }));
      recordActivity(type, item.id);

      await refreshCounts();

      if (navigator.onLine) {
        void maintainQueue(type);
      }
    } catch (error) {
      console.error("Could not load content:", error);
    } finally {
      setLoading(false);
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

  return (
    <main
      className={`deen-app min-h-screen text-[#183b30] ${isDarkMode ? "deen-dark" : "bg-[#f7f8f3]"}`}
    >
      <style>{`
        .deen-app.deen-dark { background: #101d19; color: #e6eee8; }
        .deen-dark [class~="bg-white"] { background-color: #1b2c25 !important; }
        .deen-dark [class~="bg-[#f5f7ef]"], .deen-dark [class~="bg-[#f8faf5]"], .deen-dark [class~="bg-[#f0f6ee]"], .deen-dark [class~="bg-[#edf5eb]"], .deen-dark [class~="bg-[#e7f1e8]"] { background-color: #243a2f !important; }
        .deen-dark [class~="bg-[#fcf8ee]"], .deen-dark [class~="bg-[#fdfbf5]"], .deen-dark [class~="bg-[#fcf5e7]"], .deen-dark [class~="bg-[#fbf1dd]"], .deen-dark [class~="bg-[#fbf0d9]"] { background-color: #392f1d !important; }
        .deen-dark [class~="border-[#e2e8dc]"], .deen-dark [class~="border-[#edf0e9]"], .deen-dark [class~="border-[#dfe8dc]"], .deen-dark [class~="border-[#dce8dc]"] { border-color: #34483d !important; }
        .deen-dark [class~="text-[#183b30]"], .deen-dark [class~="text-[#334d40]"], .deen-dark [class~="text-[#354b3d]"], .deen-dark [class~="text-[#245b43]"], .deen-dark [class~="text-[#164b37]"] { color: #e2eee5 !important; }
        .deen-dark [class~="text-[#718078]"], .deen-dark [class~="text-[#829087]"], .deen-dark [class~="text-[#89958c]"], .deen-dark [class~="text-[#52675a]"], .deen-dark [class~="text-[#64796b]"] { color: #a6b8ac !important; }
        .deen-dark nav { background-color: rgba(27, 44, 37, .96); border-color: #34483d; }
        .deen-dark .hover\:bg-gray-50:hover { background-color: #263a30; }
      `}</style>
      <div
        className={`px-3 py-1 fixed bottom-0 left-0 z-70 w-full text-xs font-semibold text-center ${
          isOnline
            ? " bg-emerald-800 text-white anim-hide"
            : "bg-amber-50 text-amber-800"
        }`}
      >
        {/* <span aria-hidden="true">{isOnline ? "●" : "○"}</span>{" "} */}
        {isOnline ? "Back Online" : "No Connection"}
      </div>
      <div className="mx-auto max-w-3xl px-4 pb-28 pt-5 sm:px-6 sm:pb-28 sm:pt-8">
        {/* Header */}
        <header className="mb-6 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">Deen</h1>
            <p className="mt-1 text-sm text-[#718078]">
              Kadi, Mehsana, Gujarat
            </p>
            <p className="mt-1 text-sm font-semibold text-[#8d7135]">
              {islamicDate} AH
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${isOnline ? "bg-[#e7f1e8] text-[#245b43]" : "bg-amber-100 text-amber-800"}`}
          >
            {isOnline ? "Online" : "Offline"}
          </span>
        </header>

        {activeTab === "home" && (
          <>
            {/* Hadith card */}
            <section className="mb-7 overflow-hidden rounded-3xl border border-[#e2e8dc] bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-[#edf0e9] px-5 py-4 sm:px-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fbf0d9] text-xl">
                    ✨
                  </div>
                  <div>
                    <h2 className="font-bold">Hadith</h2>
                    <p className="text-xs text-[#829087]">
                      Prophetic teachings
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-[#fbf1dd] px-3 py-1 text-xs font-semibold text-[#8d7135]">
                  HADITH
                </span>
              </div>

              <div className="p-5 sm:p-6">
                {current.hadith ? (
                  <>
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#8d7135]">
                        {current.hadith.hinglishTranslation
                          ? "Hinglish meaning"
                          : `Translation${
                              current.hadith.sourceTranslation?.language
                                ? ` · ${current.hadith.sourceTranslation.language}`
                                : ""
                            }`}
                      </span>
                      {current.hadith.authenticity && (
                        <span className="rounded-full bg-[#edf5eb] px-2.5 py-1 text-xs font-semibold text-[#34714e]">
                          {current.hadith.authenticity}
                        </span>
                      )}
                    </div>

                    <div className="rounded-2xl bg-[#fcf8ee] p-5 sm:p-6">
                      <p className="whitespace-pre-wrap break-words text-base leading-8 text-[#354b3d] sm:text-lg">
                        {current.hadith.hinglishTranslation ||
                          current.hadith.sourceTranslation?.text ||
                          "Translation not available yet."}
                      </p>
                    </div>

                    <div className="flex gap-2 items-center mt-4">
                      <div className="flex-1 rounded-xl border border-[#eee4cf] px-2 py-2">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-[#89958c]">
                          Source reference
                        </p>
                        <p className="wrap-break-word text-sm font-medium leading-6 text-[#52675a]">
                          {current.hadith.reference.source}
                          {" · "}
                          {current.hadith.reference.hadithNumber ??
                            current.hadith.reference.id}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="shrink-0 rounded-xl border border-[#80652e] px-4 py-3 font-semibold text-white transition bg-[#80652e] hover:bg-[#80652e] disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={() => void showNext("hadith")}
                        disabled={isHadithLoading}
                      >
                        {isHadithLoading ? "Loading Hadith…" : "+  New Hadith"}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="py-8 text-center text-sm text-[#718078]">
                      No saved Hadith available yet. Connect to the internet to
                      download content.
                    </p>
                    <button
                      type="button"
                      className="mt-4 w-full rounded-xl border border-[#80652e] px-4 py-3 font-semibold text-white transition bg-[#80652e] hover:bg-[#80652e] disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={() => void showNext("hadith")}
                      disabled={isHadithLoading}
                    >
                      {isHadithLoading ? "Loading Hadith…" : "+  New Hadith"}
                    </button>
                  </>
                )}
              </div>
            </section>

            {/* Ayah card */}
            <section className="mb-6 overflow-hidden rounded-3xl border border-[#e2e8dc] bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-[#edf0e9] px-5 py-4 sm:px-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e7f1e8] text-xl">
                    📖
                  </div>
                  <div>
                    <h2 className="font-bold">Qur'an Ayah</h2>
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
                        className="text-right text-3xl leading-loose text-[#164b37] sm:text-4xl"
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
                  </>
                ) : (
                  <p className="py-8 text-center text-sm text-[#718078]">
                    No saved Ayah available yet. Connect to the internet to
                    download content.
                  </p>
                )}

                <button
                  className="mt-3 w-full rounded-xl border border-[#245b43] px-4 py-3 font-semibold text-[#fff] transition bg-[#245b43] hover:bg-[#245b43]"
                  onClick={() => void showNext("ayah")}
                >
                  + &nbsp; New Ayah
                </button>
              </div>
            </section>

            {/* Islamic date, fasting guide and prayer timetable */}
            <section className="mb-6 overflow-hidden rounded-3xl border border-[#e2e8dc] bg-white shadow-sm">
              <div className="p-5 sm:p-6">
                <div className="mb-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-bold">Fasting</h3>
                      <p className="mt-1 text-sm text-[#718078]">
                        Kadi, Mehsana, Gujarat · daily local prayer times.
                      </p>
                    </div>
                    <span className="rounded-full bg-[#fbf1dd] px-3 py-1 text-xs font-semibold text-[#8d7135]">
                      Roza
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-[#fcf8ee] p-4">
                      <p className="text-xs font-medium text-[#8d7135]">
                        Sehri ends
                      </p>
                      <p className="mt-1 text-lg font-bold text-[#354b3d]">
                        {prayerTimings.Fajr
                          ? formatPrayerTime(prayerTimings.Fajr)
                          : prayerTimingsSource === "unavailable"
                            ? "Unavailable"
                            : "Loading…"}
                      </p>
                      <p className="mt-1 text-xs text-[#89958c]">Fajr begins</p>
                    </div>
                    <div className="rounded-2xl bg-[#f0f6ee] p-4">
                      <p className="text-xs font-medium text-[#34714e]">
                        Iftar
                      </p>
                      <p className="mt-1 text-lg font-bold text-[#245b43]">
                        {prayerTimings.Maghrib
                          ? formatPrayerTime(prayerTimings.Maghrib)
                          : prayerTimingsSource === "unavailable"
                            ? "Unavailable"
                            : "Loading…"}
                      </p>
                      <p className="mt-1 text-xs text-[#718078]">
                        Maghrib begins
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 rounded-2xl border border-[#e2e8dc] p-4">
                    <h4 className="text-sm font-semibold">
                      Nafl fasting reminders
                    </h4>
                    <p className="mt-1 text-sm leading-6 text-[#718078]">
                      Consider Mondays and Thursdays, or the 13th, 14th and 15th
                      of the Hijri month. Check the local Hijri date and your
                      health before fasting.
                    </p>
                  </div>
                </div>

                <div className="border-t border-[#edf0e9] pt-5">
                  <div className="mb-3">
                    <h3 className="font-bold">Daily prayers</h3>
                    <p className="mt-1 text-sm text-[#718078]">
                      Five obligatory prayers · local azaan and jamaat times
                    </p>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-[#e2e8dc]">
                    <div className="grid grid-cols-[1fr_0.8fr_0.8fr] bg-[#f5f7ef] px-3 py-3 text-xs font-semibold text-[#52675a] sm:px-4">
                      <span>Prayer</span>
                      <span className="text-center">Azaan</span>
                      <span className="text-center">Jamaat</span>
                    </div>
                    {[
                      ["Fajr", "Sehri ends at Fajr"],
                      ["Dhuhr", "Midday"],
                      ["Asr", "Afternoon"],
                      ["Maghrib", "Iftar time"],
                      ["Isha", "Night"],
                    ].map(([prayer, note]) => (
                      <div
                        key={prayer}
                        className="grid grid-cols-[1fr_0.8fr_0.8fr] items-center border-t border-[#edf0e9] px-3 py-3 text-sm sm:px-4"
                      >
                        <div>
                          <p className="font-semibold text-[#183b30]">
                            {prayer}
                          </p>
                          <p className="mt-0.5 text-[11px] text-[#89958c]">
                            {note}
                          </p>
                        </div>
                        <span className="text-center text-xs text-[#718078]">
                          {prayerTimings[prayer]
                            ? formatPrayerTime(prayerTimings[prayer])
                            : prayerTimingsSource === "unavailable"
                              ? "Unavailable"
                              : "Loading…"}
                        </span>
                        <span className="text-center text-xs text-[#718078]">
                          Set by masjid
                        </span>
                      </div>
                    ))}
                  </div>

                  <p className="mt-3 text-xs leading-5 text-[#89958c]">
                    Azaan times are fetched daily for Kadi using the Karachi
                    calculation method and Hanafi Asr setting. Jamaat times vary
                    by mosque; confirm them with your local masjid.
                    {prayerTimingsSource === "unavailable"
                      ? " Prayer-time service is unavailable; check again when online."
                      : ""}
                  </p>
                </div>
              </div>
            </section>
          </>
        )}

        {/* History and learning goals */}
        {activeTab === "history" && (
          <section className="space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8d7135]">
                YOUR JOURNEY
              </p>
              <h2 className="mt-1 text-2xl font-bold">History & goals</h2>
              <p className="mt-1 text-sm text-[#718078]">
                Small daily steps build lasting learning.
              </p>
            </div>

            <div className="rounded-3xl bg-[#183b30] p-5 text-white shadow-sm">
              <p className="text-sm text-white/70">Your current level</p>
              <div className="mt-2 flex items-end justify-between gap-3">
                <div>
                  <h3 className="text-2xl font-bold">{level.title}</h3>
                  <p className="mt-1 text-sm text-white/70">
                    {totalLearned} total items learned
                  </p>
                </div>
                <span className="rounded-2xl bg-white/10 px-3 py-2 text-sm font-semibold">
                  Level{" "}
                  {totalLearned >= 500
                    ? 5
                    : totalLearned >= 200
                      ? 4
                      : totalLearned >= 50
                        ? 3
                        : totalLearned >= 10
                          ? 2
                          : 1}
                </span>
              </div>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-[#d2b46b]"
                  style={{
                    width: `${Math.min(100, (totalLearned / level.next) * 100)}%`,
                  }}
                />
              </div>
              <p className="mt-2 text-xs text-white/70">
                {Math.max(0, level.next - totalLearned)} items to next level
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-[#e2e8dc] bg-white p-4">
                <p className="text-sm text-[#718078]">Ayat learned</p>
                <p className="mt-1 text-2xl font-bold text-[#245b43]">
                  {counts.ayahSeen}
                </p>
              </div>
              <div className="rounded-2xl border border-[#e2e8dc] bg-white p-4">
                <p className="text-sm text-[#718078]">Hadith learned</p>
                <p className="mt-1 text-2xl font-bold text-[#92702d]">
                  {counts.hadithSeen}
                </p>
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-end justify-between">
                <h3 className="font-bold">Learning goals</h3>
                <p className="text-xs text-[#718078]">Content viewed</p>
              </div>
              {[
                {
                  label: "Daily goal",
                  done: dailyDone,
                  target: 3,
                  hint: "3 items each day",
                },
                {
                  label: "Weekly goal",
                  done: weeklyDone,
                  target: 15,
                  hint: "15 items each week",
                },
                {
                  label: "Monthly goal",
                  done: monthlyDone,
                  target: 60,
                  hint: "60 items each month",
                },
              ].map((goal) => (
                <div
                  key={goal.label}
                  className="mb-3 rounded-2xl border border-[#e2e8dc] bg-white p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{goal.label}</p>
                      <p className="mt-1 text-xs text-[#89958c]">{goal.hint}</p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-[#245b43]">
                      {Math.min(goal.done, goal.target)}/{goal.target}
                    </p>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#edf0e9]">
                    <div
                      className="h-full rounded-full bg-[#34714e] transition-all"
                      style={{
                        width: `${Math.min(100, (goal.done / goal.target) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-[#e2e8dc] bg-white p-4">
              <h3 className="font-semibold">Keep going</h3>
              <p className="mt-1 text-sm leading-6 text-[#718078]">
                Your goals count unique Ayat and Hadith opened on this device.
                Your existing lifetime totals come from Deen's saved learning
                history.
              </p>
            </div>
          </section>
        )}

        {activeTab === "settings" && (
          <section className="space-y-4 rounded-3xl border border-[#e2e8dc] bg-white p-5 shadow-sm sm:p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8d7135]">
                Preferences
              </p>
              <h2 className="mt-1 text-xl font-bold">Settings</h2>
              <p className="mt-2 text-sm leading-6 text-[#718078]">
                Deen keeps saved learning content on this device for offline
                reading.
              </p>
            </div>

            <div className="flex items-center justify-between rounded-2xl bg-[#f5f7ef] p-4">
              <div>
                <p className="font-semibold">Connection</p>
                <p className="mt-1 text-sm text-[#718078]">
                  {isOnline
                    ? "Internet connection detected"
                    : "Using saved content where available"}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  isOnline
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {isOnline ? "Online" : "Offline"}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-[#e2e8dc] p-4">
              <div>
                <p className="font-semibold">Dark mode</p>
                <p className="mt-1 text-sm text-[#718078]">
                  A comfortable theme for low-light reading.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isDarkMode}
                onClick={() => setIsDarkMode((value) => !value)}
                className={`relative h-7 w-12 rounded-full transition ${isDarkMode ? "bg-[#b28b3d]" : "bg-[#d7e1d6]"}`}
                aria-label="Toggle dark mode"
              >
                <span
                  className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${isDarkMode ? "left-6" : "left-1"}`}
                />
              </button>
            </div>
          </section>
        )}

        <footer className="py-7 text-center text-xs text-[#89958c]">
          Made for learning and reflection · Deen
        </footer>

        <nav
          aria-label="Main navigation"
          className="fixed inset-x-0 bottom-0 z-50 border-t border-[#dfe8dc] bg-white/95 px-4 pt-2 backdrop-blur"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom), 10px)" }}
        >
          <div className="mx-auto flex max-w-xl items-center justify-around">
            {(
              [
                { id: "home", label: "Home", icon: "⌂" },
                { id: "history", label: "History", icon: "◷" },
                { id: "settings", label: "Settings", icon: "⚙" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                aria-current={activeTab === tab.id ? "page" : undefined}
                className={`flex min-w-20 flex-col items-center gap-1 rounded-xl px-4 py-2 text-xs font-semibold transition ${
                  activeTab === tab.id
                    ? "bg-[#edf5eb] text-[#07543d]"
                    : "text-[#87938a] hover:bg-gray-50"
                }`}
              >
                <span className="text-xl leading-none" aria-hidden="true">
                  {tab.icon}
                </span>
                {tab.label}
              </button>
            ))}
          </div>
        </nav>
      </div>
    </main>
  );
}

export default App;
