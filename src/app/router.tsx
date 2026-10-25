import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "../components/layout/AppLayout";
import { HomePage } from "../features/home/HomePage";
import { LearnPage } from "../features/learn/LearnPage";
import { QuranPage } from "../features/learn/QuranPage";
import { HadithPage } from "../features/learn/HadithPage";
import { DuasPage } from "../features/duas/DuasPage";
import { PracticePage } from "../features/practice/PracticePage";
import { HistoryPage } from "../features/history/HistoryPage";
import { SettingsPage } from "../features/settings/SettingsPage";
import { NotFoundPage } from "../components/layout/NotFoundPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "learn", element: <LearnPage /> },
      { path: "learn/quran", element: <QuranPage /> },
      { path: "learn/hadith", element: <HadithPage /> },
      { path: "duas", element: <DuasPage /> },
      { path: "practice", element: <PracticePage /> },
      { path: "history", element: <HistoryPage /> },
      { path: "settings", element: <SettingsPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
