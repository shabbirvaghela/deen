import { db } from "./database";
import type { ContentType, LearningContent } from "../types/content";

export async function getQueueCount(type: ContentType): Promise<number> {
  return db.queue.where("type").equals(type).count();
}

export async function consumeNext(
  type: ContentType,
): Promise<LearningContent | null> {
  return db.transaction("rw", db.content, db.queue, db.history, async () => {
    const queuedItems = await db.queue
      .where("type")
      .equals(type)
      .sortBy("queuedAt");

    for (const record of queuedItems) {
      const item = await db.content.get(record.id);

      if (!item || item.type !== type) {
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

    // Queue empty: repeat previously saved content.
    // Do not add another history record.
    const savedItems = await db.content.where("type").equals(type).toArray();

    if (savedItems.length === 0) return null;

    const historyRecords = await db.history
      .where("type")
      .equals(type)
      .toArray();

    const seenIds = new Set(historyRecords.map((record) => record.contentId));

    const unseenSaved = savedItems.filter((item) => !seenIds.has(item.id));

    const candidates = unseenSaved.length > 0 ? unseenSaved : savedItems;

    return candidates[Math.floor(Math.random() * candidates.length)] ?? null;
  });
}
