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
      const existing = await db.dailySelections.get(selectionId);

      if (existing) {
        return (await db.content.get(existing.contentId)) ?? null;
      }

      const queued = await db.queue
        .where("type")
        .equals(type)
        .sortBy("queuedAt");

      for (const entry of queued) {
        const item = await db.content.get(entry.id);

        if (!item) {
          await db.queue.delete(entry.id);
          continue;
        }

        const historyId = `${type}:${item.id}`;

        if (await db.history.get(historyId)) {
          await db.queue.delete(entry.id);
          continue;
        }

        await db.history.add({
          id: historyId,
          type,
          contentId: item.id,
          seenAt: Date.now(),
        });

        await db.queue.delete(entry.id);

        await db.dailySelections.add({
          id: selectionId,
          date,
          type,
          contentId: item.id,
        });

        return item;
      }

      return null;
    },
  );
}
