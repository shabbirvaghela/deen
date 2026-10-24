export type ContentType = "ayah" | "hadith";

export interface ContentReference {
  source: string;
  id: string;
  surahNumber?: number;
  surahName?: string;
  paraNumber?: number;
  rukuNumber?: number;
  ayahNumber?: number;
  collection?: string;
  hadithNumber?: string;
}

export interface LearningContent {
  id: string;
  type: ContentType;

  // Original source text
  originalText: string;

  // Roman-script pronunciation
  transliteration: string;

  // Simple Hinglish meaning
  hinglishTranslation?: string;
  sourceTranslation?: {
    text: string;
    language: string;
  };

  reference: ContentReference;

  // Verified source metadata
  authenticity?: string;

  // Loaded only when the user requests detail
  explanation?: {
    simpleMeaning: string;
    context: string;
    example: string;
    practicalLesson: string;
    sourceNote?: string;
  };
}
