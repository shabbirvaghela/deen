import type { LearningContent } from "../types/content";

export const seedAyat: LearningContent[] = [
  {
    id: "quran:1:1",
    type: "ayah",
    originalText: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
    transliteration: "Bismillaahir-Rahmaanir-Raheem",
    hinglishTranslation:
      "Allah ke naam se, jo bahut Meherban aur Nihayat Raham karne wala hai.",
    reference: {
      source: "Quran",
      id: "1:1",
      surahNumber: 1,
      surahName: "Al-Fatihah",
      paraNumber: 1,
      ayahNumber: 1,
    },
  },
  {
    id: "quran:112:1",
    type: "ayah",
    originalText: "قُلْ هُوَ اللَّهُ أَحَدٌ",
    transliteration: "Qul huwallaahu ahad",
    hinglishTranslation: "Keh dijiye: Allah ek hai.",
    reference: {
      source: "Quran",
      id: "112:1",
      surahNumber: 112,
      surahName: "Al-Ikhlas",
      paraNumber: 30,
      ayahNumber: 1,
    },
  },
];

// Hadith seeds next step mein verified source ke saath add karenge.
export const seedHadith: LearningContent[] = [];
