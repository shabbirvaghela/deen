import type { LearningContent } from "../types/content";

const BASE_URL = "https://ummahapi.com/api";

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

interface QuranResponse {
  success: boolean;
  data: {
    surah: {
      number: number;
      name_english: string;
    };
    verse: {
      verse_key: string;
      ayah: number;
      arabic: string;
      transliteration: string;
      translations: {
        sahih_international: string;
      };
    };
  };
}

interface HadithResponse {
  success: boolean;
  data: {
    id: string;
    collection: string;
    collection_name: string;
    hadithnumber: number;
    arabic: string;
    english?: string;
    grade?: string;
  };
}

export async function fetchRandomAyah(): Promise<LearningContent> {
  const result = await getJson<QuranResponse>(`${BASE_URL}/quran/random`);

  if (!result.success) {
    throw new Error("Could not fetch Quran ayah");
  }

  const { surah, verse } = result.data;

  return {
    id: `quran:${verse.verse_key}`,
    type: "ayah",
    originalText: verse.arabic,
    transliteration: verse.transliteration,
    sourceTranslation: {
      text: verse.translations.sahih_international,
      language: "en",
    },
    reference: {
      source: "Quran",
      id: verse.verse_key,
      surahNumber: surah.number,
      surahName: surah.name_english,
      ayahNumber: verse.ayah,
    },
  };
}

export async function fetchRandomHadith(): Promise<LearningContent> {
  const result = await getJson<HadithResponse>(`${BASE_URL}/hadith/random`);

  if (!result.success || !result.data.english) {
    throw new Error("Hadith has no English text");
  }

  const hadith = result.data;
  const englishText = hadith.english;

  if (!result.success || !englishText?.trim()) {
    throw new Error("Hadith has no English text");
  }

  return {
    id: `hadith:${hadith.id}`,
    type: "hadith",
    originalText: hadith.arabic,
    transliteration: "",
    sourceTranslation: {
      text: englishText,
      language: "en",
    },
    authenticity: hadith.grade,
    reference: {
      source: hadith.collection_name,
      id: hadith.id,
      collection: hadith.collection,
      hadithNumber: String(hadith.hadithnumber),
    },
  };
}
