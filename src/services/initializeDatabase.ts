
import { db } from "./database";
import { seedAyat, seedHadith } from "../data/seedContent";

export async function initializeDatabase(): Promise<void> {
  const seeds = [...seedAyat, ...seedHadith];

  await db.transaction(
    "rw",
    db.content,
    db.queue,
    async () => {
      for (const item of seeds) {
        // Keep existing cached content intact.
        await db.content.add(item).catch((error: unknown) => {
          if (
            error instanceof Error &&
            error.name === "ConstraintError"
          ) {
            return;
          }

          throw error;
        });

        const alreadyQueued = await db.queue.get(item.id);

        if (!alreadyQueued) {
          await db.queue.add({
            id: item.id,
            type: item.type,
            queuedAt: Date.now(),
          });
        }
      }
    }
  );
}
