import { db } from "./database";
import { fetchRandomAyah, fetchRandomHadith } from "./apiService";
import type { ContentType, LearningContent } from "../types/content";

const MIN_QUEUE = 5;
const TARGET_QUEUE = 10;
const MAX_ATTEMPTS = 30;

const jobs = new Map<ContentType, Promise<void>>();

async function saveIfUnseen(item: LearningContent): Promise<boolean> {
  return db.transaction("rw", db.content, db.queue, db.history, async () => {
    const historyId = `${item.type}:${item.id}`;
    const [seen, queued] = await Promise.all([
      db.history.get(historyId),
      db.queue.get(item.id),
    ]);

    if (seen || queued) return false;

    await db.content.put(item);
    await db.queue.add({
      id: item.id,
      type: item.type,
      queuedAt: Date.now(),
    });

    return true;
  });
}

async function refill(type: ContentType): Promise<void> {
  let attempts = 0;

  while (attempts < MAX_ATTEMPTS) {
    const count = await db.queue.where("type").equals(type).count();

    if (count >= TARGET_QUEUE) return;

    attempts++;

    try {
      const item =
        type === "ayah" ? await fetchRandomAyah() : await fetchRandomHadith();

      // Keep only Sahih/Hasan hadiths in this MVP.
      if (type === "hadith") {
        const grade = item.authenticity?.toLowerCase() ?? "";

        if (!grade.includes("sahih") && !grade.includes("hasan")) {
          continue;
        }
      }

      await saveIfUnseen(item);
    } catch (error) {
      console.warn(`Refill failed for ${type}:`, error);
      return;
    }
  }
}

export function refillQueue(type: ContentType): Promise<void> {
  const existingJob = jobs.get(type);

  if (existingJob) return existingJob;

  const job = refill(type).finally(() => {
    jobs.delete(type);
  });

  jobs.set(type, job);
  return job;
}

export async function maintainQueue(type: ContentType): Promise<void> {
  const count = await db.queue.where("type").equals(type).count();

  if (count <= MIN_QUEUE) {
    await refillQueue(type);
  }
}
