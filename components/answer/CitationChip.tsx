import { type SourceAuthority } from "./answer-types";
import styles from "./answer.module.css";

/** Inline citation inside prose — a jade dot + short label, opens the source. */
export function InlineCite({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className={styles.chipInline} onClick={onClick} aria-label={`Open source for ${label}`}>
      <span className={styles.chipDot} aria-hidden />
      {label}
    </button>
  );
}

/** Authority-list chip — type pill + name + pinpoint, opens the source. */
export function CitationChip({
  authority,
  active,
  onClick,
}: {
  authority: SourceAuthority;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={[styles.chipList, active ? styles.chipListActive : ""].join(" ")}
      onClick={onClick}
    >
      <span className={styles.miniType}>{authority.type}</span>
      <span className={styles.chipListName}>{authority.short}</span>
      <span className={styles.chipListWhere}>{authority.where}</span>
    </button>
  );
}
