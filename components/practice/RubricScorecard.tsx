import type { RubricScore } from "@/lib/schemas";
import styles from "./practice.module.css";

const ROWS: Array<{ key: keyof RubricScore; label: string }> = [
  { key: "issueSpotting", label: "Issue spotting" },
  { key: "ruleStatement", label: "Rule statement" },
  { key: "application", label: "Application" },
  { key: "structure", label: "Structure" },
  { key: "authorityUse", label: "Authority use" },
];

export function RubricScorecard({ rubric }: { rubric: RubricScore }) {
  const total = ROWS.reduce((sum, r) => sum + rubric[r.key], 0);
  return (
    <div className={styles.rubric}>
      <div className={styles.rubricHead}>
        <span className={styles.rubricLabel}>Rubric scorecard</span>
        <span className={styles.rubricTotal}>{total} / 50</span>
      </div>
      {ROWS.map((r) => {
        const score = rubric[r.key];
        const low = score < 5;
        return (
          <div className={styles.rubricRow} key={r.key}>
            <span className={styles.rubricRowLabel}>{r.label}</span>
            <span className={styles.rubricTrack}>
              <span
                className={[styles.rubricFill, low ? styles.rubricFillLow : ""].join(" ")}
                style={{ width: `${(score / 10) * 100}%` }}
              />
            </span>
            <span className={styles.rubricScore}>{score}/10</span>
          </div>
        );
      })}
    </div>
  );
}
