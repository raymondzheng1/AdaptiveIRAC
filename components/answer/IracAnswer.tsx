import type { CSSProperties } from "react";
import { InlineCite } from "./CitationChip";
import { type AnswerLimb } from "./answer-types";
import styles from "./answer.module.css";

/**
 * Renders IRAC (or essay) limbs: a jade mono label above serif prose with
 * inline citation chips. `limbStyle(i)` drives the reveal cascade per limb;
 * omit it (landing) to render fully visible.
 */
export function IracAnswer({
  limbs,
  onCite,
  limbStyle,
}: {
  limbs: AnswerLimb[];
  onCite: (authorityId: string) => void;
  limbStyle?: (index: number) => CSSProperties | undefined;
}) {
  return (
    <div>
      {limbs.map((limb, i) => (
        <div key={`${limb.label}-${i}`} className={styles.limb} style={limbStyle?.(i)}>
          <div className={styles.limbLabel}>{limb.label}</div>
          <p className={styles.limbProse}>
            {limb.segments.map((seg, j) =>
              seg.kind === "text" ? (
                <span key={j}>{seg.text}</span>
              ) : (
                <InlineCite key={j} label={seg.label} onClick={() => onCite(seg.authorityId)} />
              ),
            )}
          </p>
        </div>
      ))}
    </div>
  );
}
