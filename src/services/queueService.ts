
import { db } from "./database";
import type { ContentType, LearningContent } from "../types/content";

export async function getQueueCount(
  type: ContentType
): Promise<number> {
  return db.queue.where("type").equals(type).count();
}

export async function consumeNext(
  type: ContentType
): Promise<LearningContent | null> {
  return db.transaction(
    "rw",
    db.content,
    db.queue,
    db.history,
    async () => {
      const next = await db.queue
        .where("type")
        .equals(type)
        .sortBy("queuedAt");

      for (const record of next) {
        const item = await db.content.get(record.id);

        if (!item) {
          // Remove an invalid queue entry.
          await db.queue.delete(record.id);
          continue;
        }

        const historyId = `${type}:${item.id}`;
        const alreadySeen = await db.history.get(historyId);

        if (alreadySeen) {
          await db.queue.delete(record.id);
          continue;
        }

        await db.history.add({
          id: historyId,
          type,
          contentId: item.id,
          seenAt: Date.now(),
        });

        await db.queue.delete(record.id);

        return item;
      }

      return null;
    }
  );
}
