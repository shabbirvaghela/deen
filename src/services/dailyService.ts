import { db } from "./database";
import { getLocalDateKey } from "../lib/date";
import type { ContentType, LearningContent } from "../types/content";

export async function getDailyContent(
  type: ContentType,
): Promise<LearningContent | null> {
  const date = getLocalDateKey();
  const selectionId = `${date}:${type}`;

  return db.transaction(
    "rw",
    db.content,
    db.queue,
    db.history,
    db.dailySelections,
    async () => {
      // Keep today's selection if its content still exists.
      const existing = await db.dailySelections.get(selectionId);

      if (existing) {
        const saved = await db.content.get(existing.contentId);

        if (saved?.type === type) return saved;

        // Recover if the selection points to missing content.
        await db.dailySelections.delete(selectionId);
      }

      // First preference: next unseen queued item.
      const queued = await db.queue
        .where("type")
        .equals(type)
        .sortBy("queuedAt");

      for (const entry of queued) {
        const item = await db.content.get(entry.id);

        if (!item || item.type !== type) {
          await db.queue.delete(entry.id);
          continue;
        }

        const historyId = `${type}:${item.id}`;

        if (await db.history.get(historyId)) {
          await db.queue.delete(entry.id);
          continue;
        }

        await db.queue.delete(entry.id);

        await db.dailySelections.put({
          id: selectionId,
          date,
          type,
          contentId: item.id,
        });

        return item;
      }

      // Queue empty: use content already stored locally.
      const savedItems = await db.content.where("type").equals(type).toArray();

      if (savedItems.length === 0) return null;

      const historyRecords = await db.history
        .where("type")
        .equals(type)
        .toArray();
      const seenIds = new Set(historyRecords.map((record) => record.contentId));
      const unseenItems = savedItems.filter((item) => !seenIds.has(item.id));
      const candidates = unseenItems.length > 0 ? unseenItems : savedItems;
      const selected = candidates[Math.floor(Math.random() * candidates.length)];

      if (!selected) return null;

      await db.dailySelections.put({
        id: selectionId,
        date,
        type,
        contentId: selected.id,
      });

      // This is a fallback, so don't record it as newly seen.
      return selected;
    },
  );
}
