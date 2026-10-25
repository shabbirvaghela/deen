# Deen PWA UI migration starter

This is a **safe migration overlay**, not a blind replacement for your whole repository.
It includes a feature-based React + TypeScript UI shell and a copy of your current App.tsx as `legacy/App.tsx`.

## Important
- Do NOT delete your existing `src/services`, `src/db`, `src/data`, `src/types`, `server`, `.env`, `package.json`, or lock file.
- This bundle does not include the full source of those files, so it cannot safely replace the whole project.
- Copy the files in `src/` into your existing `src/`, merging folders. Keep your existing services and database.
- This starter uses a lightweight localStorage UI shell for navigation/theme and placeholder content in pages. Connect your existing services in the marked TODOs before considering migration complete.
- Prayer times are not hardcoded. The Practice page links to your existing API integration TODO; it does not invent prayer or Jamaat times.

## Suggested steps
1. Make a Git commit or copy your project folder as a backup.
2. Merge this bundle's `src/app`, `src/components`, and `src/features` into your current `src`.
3. Add `react-router-dom` if not installed: `npm install react-router-dom`.
4. Change `src/main.tsx` to render `App` from `./App` (usual Vite setup).
5. Test `npm run build`.
6. Integrate the TODOs in `HomePage.tsx`, `PracticePage.tsx`, `HistoryPage.tsx`, and `SettingsPage.tsx` with your existing services.
7. Only after tests pass, switch your current `App.tsx` to the router entry in this bundle.

## Why this is an overlay
Only the current App.tsx was available for this migration. The implementations of your Dexie database and service files were not included, so replacing the entire project would risk losing working queue, history, and offline functionality.
