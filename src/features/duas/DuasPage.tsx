import { useMemo, useState } from "react";
import { PageHeader } from "../../components/layout/PageHeader";
import { Card } from "../../components/ui/Card";

type Dua = {
  title: string;
  arabic: string;
  transliteration: string;
  meaning: string;
  reference: string;
  category: "Knowledge" | "Good in both lives";
};

// These are Qur'anic supplications; references are shown so the source is explicit.
const duas: Dua[] = [
  {
    title: "Dua for beneficial knowledge",
    arabic: "رَبِّ زِدْنِي عِلْمًا",
    transliteration: "Rabbi zidni ilma",
    meaning: "Ae mere Rabb, mere ilm mein izafa farma.",
    reference: "Qur'an 20:114",
    category: "Knowledge",
  },
  {
    title: "Dua for good in this life and the next",
    arabic: "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ",
    transliteration: "Rabbana atina fid-dunya hasanatan wa fil-akhirati hasanatan wa qina adhaban-nar",
    meaning: "Ae hamare Rabb, humein duniya mein bhalai de, aakhirat mein bhi bhalai de, aur humein aag ke azaab se bacha.",
    reference: "Qur'an 2:201",
    category: "Good in both lives",
  },
];

export function DuasPage() {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(duas[0]?.title ?? null);
  const visibleDuas = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return duas;
    return duas.filter((dua) =>
      [dua.title, dua.transliteration, dua.meaning, dua.reference, dua.category]
        .some((value) => value.toLowerCase().includes(normalized)),
    );
  }, [query]);

  return (
    <div className="stack">
      <PageHeader eyebrow="DAILY REMEMBRANCE" title="Duas & Adhkar" description="Qur'anic supplications with Arabic, pronunciation, Hinglish meaning, and references." />
      <label className="search-label" htmlFor="dua-search">Find a dua</label>
      <input id="dua-search" className="text-input" type="search" placeholder="Search by topic or meaning…" value={query} onChange={(event) => setQuery(event.target.value)} />
      {visibleDuas.map((dua) => {
        const isExpanded = expanded === dua.title;
        return (
          <Card key={dua.title}>
            <button type="button" className="dua-toggle" aria-expanded={isExpanded} onClick={() => setExpanded(isExpanded ? null : dua.title)}>
              <span><span className="eyebrow">{dua.category.toUpperCase()}</span><strong>{dua.title}</strong></span>
              <span aria-hidden="true">{isExpanded ? "−" : "+"}</span>
            </button>
            {isExpanded && <>
              <div className="arabic-text" dir="rtl" lang="ar">{dua.arabic}</div>
              <p className="eyebrow">PRONUNCIATION</p>
              <p className="italic">{dua.transliteration}</p>
              <p className="eyebrow mt-3">HINGLISH MEANING</p>
              <p>{dua.meaning}</p>
              <p className="muted small mt-3">Reference: {dua.reference}</p>
            </>}
          </Card>
        );
      })}
      {visibleDuas.length === 0 && <Card><p>No matching dua found. Try a different search.</p></Card>}
      <div className="callout"><strong>Source note</strong><p>These entries are Qur'anic supplications, not a complete collection of daily Sunnah adhkar. Pronunciation is approximate; verify recitation with a qualified teacher when possible.</p></div>
    </div>
  );
}
