import { Link } from "react-router-dom";
import { PageHeader } from "../../components/layout/PageHeader";
export function LearnPage() {
  return <div className="stack"><PageHeader eyebrow="LEARNING LIBRARY" title="Learn" description="Choose what you want to understand today." />
    <Link className="library-row" to="/learn/quran"><span className="library-symbol green">۞</span><span><strong>Qur'an</strong><small>Arabic, transliteration, translation and explanation</small></span><span className="arrow">→</span></Link>
    <Link className="library-row" to="/learn/hadith"><span className="library-symbol gold">✦</span><span><strong>Hadith</strong><small>Authenticity and source references preserved</small></span><span className="arrow">→</span></Link>
    <div className="callout"><strong>Content integrity</strong><p>Source translation, Hinglish meaning and explanatory notes should be clearly labelled separately.</p></div>
  </div>;
}
