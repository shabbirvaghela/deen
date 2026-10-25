# Deen — Quran & Hadith learning PWA

A mobile-first React + TypeScript + Vite PWA. Learning content and reading history are stored locally with Dexie so previously cached items can be used offline.

## Requirements

- Node.js 22 or a current supported Node.js release
- npm
- A Gemini API key only if you want generated Hinglish explanations

## Setup

```bash
npm ci
cp .env.example .env
```

Open `.env` and set `GEMINI_API_KEY` to a valid key. Keep `.env` private and never commit it. The API key is used by the Express server, not exposed through Vite client environment variables.

Start the frontend and explanation API in separate terminals:

```bash
npm run dev
npm run dev:api
```

Or run both together:

```bash
npm run dev:all
```

The Vite development server proxies `/api` to `http://localhost:3001`.

## Build and checks

```bash
npm run build
npm run lint
npm run preview
```

## Learning behavior

- Daily Ayah and Hadith selections are saved by local date and remain stable after refresh while their cached content exists.
- Reading history uses unique `${type}:${contentId}` IDs, so an item is counted once.
- Queue consumption prefers unseen queued items; when the queue is empty, locally cached unseen items are preferred before repeats.
- Qur'an and Hadith pages use the existing Dexie content, queue, history and explanation services.
- Generated explanations require the API server and internet. Previously saved explanations remain available offline.
- Prayer checklist state is stored locally per device and date. The app deliberately does not fabricate prayer, Sehri or Iftar times.
- The Dua page currently contains a small, explicitly referenced set of Qur'anic supplications, not a complete Sunnah adhkar collection.

## Content and religious accuracy

API-provided translations and grading are shown as supplied by their source. Generated explanations are learning aids, not scholarly rulings. Verify religious content and prayer timings with trusted sources, especially before relying on them for worship decisions.

## Offline notes

IndexedDB stores cached content and history. Browser storage can be cleared by the user or browser, so this is local-device persistence rather than cloud backup. New API content and first-time generated explanations require connectivity.
