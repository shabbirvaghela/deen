import Dexie, { type Table } from "dexie";
import type { ContentType, LearningContent } from "../types/content";

export interface QueueRecord {
  id: string; // Same as content ID
  type: ContentType;
  queuedAt: number;
}

export interface SeenRecord {
  id: string; // `${type}:${contentId}`
  type: ContentType;
  contentId: string;
  seenAt: number;
}

export interface DailySelection {
  id: string; // `${date}:${type}`
  date: string; // Local date: YYYY-MM-DD
  type: ContentType;
  contentId: string;
}

class DeenDatabase extends Dexie {
  content!: Table<LearningContent, string>;
  queue!: Table<QueueRecord, string>;
  history!: Table<SeenRecord, string>;
  dailySelections!: Table<DailySelection, string>;

  constructor() {
    super("DeenDatabase");

    this.version(1).stores({
      content: "id, type",
      queue: "id, type, queuedAt",
      history: "id, [type+contentId], seenAt",
      dailySelections: "id, date, type",
    });
  }
}

export const db = new DeenDatabase();
