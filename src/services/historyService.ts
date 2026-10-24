import { db } from "./database";
import type { ContentType } from "../types/content";

export async function hasSeen(
  type: ContentType,
  contentId: string,
): Promise<boolean> {
  return db.history
    .where("id")
    .equals(`${type}:${contentId}`)
    .count()
    .then((count) => count > 0);
}

export async function getSeenCount(type: ContentType): Promise<number> {
  return db.history.where("type").equals(type).count();
}
