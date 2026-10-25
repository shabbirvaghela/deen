import { db } from "./database";
import type { ContentType, LearningContent } from "../types/content";

export interface HistoryItem {
  id: string;
  type: ContentType;
  contentId: string;
  seenAt: number;
  content: LearningContent;
}

/** Check whether the user has already read this item. */
export async function hasSeen(
  type: ContentType,
  contentId: string,
): Promise<boolean> {
  return Boolean(await db.history.get(`${type}:${contentId}`));
}

/** Record a read without creating duplicate history entries. */
export async function recordSeen(
  type: ContentType,
  contentId: string,
): Promise<void> {
  const historyId = `${type}:${contentId}`;

  await db.transaction("rw", db.content, db.history, async () => {
    const content = await db.content.get(contentId);

    if (!content || content.type !== type) {
      throw new Error(
        `Cannot record history: content ${contentId} is not cached`,
      );
    }

    const existing = await db.history.get(historyId);

    if (!existing) {
      await db.history.add({
        id: historyId,
        type,
        contentId,
        seenAt: Date.now(),
      });
    }
  });
}

/** Number of unique items read for a content type. */
export async function getSeenCount(type: ContentType): Promise<number> {
  return db.history.where("type").equals(type).count();
}

/** Full read history, with cached content attached. */
export async function getHistory(type?: ContentType): Promise<HistoryItem[]> {
  const records = type
    ? await db.history.where("type").equals(type).toArray()
    : await db.history.toArray();

  const items = await Promise.all(
    records.map(async (record) => {
      const content = await db.content.get(record.contentId);

      if (!content || content.type !== record.type) {
        return null;
      }

      return {
        ...record,
        content,
      };
    }),
  );

  return items
    .filter((item): item is HistoryItem => item !== null)
    .sort((a, b) => b.seenAt - a.seenAt);
}
