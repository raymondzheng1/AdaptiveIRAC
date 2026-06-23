import { CheckIcon } from "@/components/brand/icons";
import { Button } from "@/components/ui";
import { type SourceAuthority } from "./answer-types";
import styles from "./answer.module.css";

/** Click-to-source: shows the exact passage that grounds a citation. */
export function SourcePanel({
  authority,
  onClose,
  variant = "rail",
}: {
  authority: SourceAuthority;
  onClose: () => void;
  variant?: "rail" | "inline";
}) {
  if (variant === "inline") {
    return (
      <div className={styles.sourceInline} aria-live="polite">
        <div className={styles.sourceInlineTop}>
          <div>
            <div className={styles.sourceInlineMeta}>
              <CheckIcon size={13} />
              {authority.type} · {authority.where}
            </div>
            <div className={styles.sourceInlineName}>{authority.name}</div>
          </div>
          <button type="button" className={styles.sourceClose} aria-label="Close source" onClick={onClose}>
            ×
          </button>
        </div>
        <p className={styles.sourceInlinePassage}>“{authority.snippet}”</p>
        <button type="button" className={styles.sourceInlineLink}>
          Open in your materials <span aria-hidden>↗</span>
        </button>
      </div>
    );
  }
  return (
    <div className={styles.sourcePanel} aria-live="polite">
      <div className={styles.sourceHeader}>
        <CheckIcon size={16} />
        <span className={styles.sourceLabel}>Verified source</span>
        <button type="button" className={styles.sourceClose} aria-label="Close source" onClick={onClose}>
          ×
        </button>
      </div>
      <div className={styles.sourceBody}>
        <div className={styles.sourceMeta}>
          <span className={styles.miniType}>{authority.type}</span>
          <span className={styles.chipListWhere} style={{ marginLeft: 0 }}>
            {authority.where}
          </span>
        </div>
        <div className={styles.sourceName}>{authority.name}</div>
        <div className={styles.passageBox}>
          <p className={styles.passageLabel}>Exact passage · {authority.where}</p>
          <p className={styles.passageText}>“{authority.snippet}”</p>
        </div>
        <Button variant="secondary" size="sm" block className={styles.sourceCta}>
          Open in your materials <span aria-hidden>↗</span>
        </Button>
      </div>
    </div>
  );
}
