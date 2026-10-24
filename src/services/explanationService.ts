import { db } from "./database";
import type { ContentType, LearningContent } from "../types/content";

interface ExplanationResult {
  hinglishTranslation: string;
  simpleMeaning: string;
  context: string;
  example: string;
  practicalLesson: string;
  sourceNote: string;
}

export async function getExplanation(
  item: LearningContent,
): Promise<LearningContent> {
  // Cache-first: works offline if previously generated.
  const cached = await db.content.get(item.id);

  if (cached?.hinglishTranslation && cached.explanation?.simpleMeaning) {
    return cached;
  }

  if (!navigator.onLine) {
    throw new Error(
      "Ye explanation offline available nahi hai. Internet connect karke ek baar load karein.",
    );
  }

  const sourceTranslation =
    item.sourceTranslation?.text ?? item.hinglishTranslation ?? "";

  const response = await fetch("/api/explain", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: item.type as ContentType,
      originalText: item.originalText,
      sourceTranslation,
      reference: `${item.reference.source} ${item.reference.id}`,
    }),
  });

  if (!response.ok) {
    throw new Error("Explanation load nahi hui. Please dobara try karein.");
  }

  const result = (await response.json()) as ExplanationResult;

  const updated: LearningContent = {
    ...item,
    hinglishTranslation: result.hinglishTranslation,
    explanation: {
      simpleMeaning: result.simpleMeaning,
      context: result.context,
      example: result.example,
      practicalLesson: result.practicalLesson,
      sourceNote: result.sourceNote,
    },
  };

  // Persist both translation and explanation for offline use.
  await db.content.put(updated);

  return updated;
}
