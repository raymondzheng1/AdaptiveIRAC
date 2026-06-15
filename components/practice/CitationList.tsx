import type { Citation } from "@/lib/schemas";
import styles from "./practice.module.css";

/**
 * Renders an answer's citations. Every citation ALWAYS shows its pinpoint and
 * the corpus location it binds to (citation-format invariant). Clicking surfaces
 * the source snippet (click-to-source).
 */
export function CitationList({ citations }: { citations: Citation[] }) {
  if (citations.length === 0) return null;
  return (
    <div className={styles.citations}>
      <h4>Authorities cited (all from your materials)</h4>
      <ul>
        {citations.map((c, i) => (
          <li key={`${c.authorityId}-${i}`}>
            <span className={styles.citeName}>{c.display}</span>
            <span className={styles.pinpoint} title={c.location.snippet ?? ""}>
              {c.location.sourceFilename ? `${c.location.sourceFilename} · ` : ""}
              {c.pinpoint}
            </span>
            {c.location.snippet ? <span className={styles.snippet}>“{c.location.snippet}”</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
