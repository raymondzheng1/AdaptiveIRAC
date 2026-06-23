import styles from "./practice.module.css";

/** Free-session spend meter (non-alarming). Swaps to a key badge for BYO-key. */
export function UsageMeter({
  usedUsd,
  capUsd,
  byoKey,
}: {
  usedUsd: number;
  capUsd: number;
  byoKey: boolean;
}) {
  if (byoKey) {
    return (
      <span className={styles.meterKeyBadge} title="Using your own key — no shared limit.">
        Using your own key
      </span>
    );
  }
  const pct = capUsd > 0 ? Math.min(100, (usedUsd / capUsd) * 100) : 0;
  return (
    <div className={styles.meter} title="You're in control — it's free.">
      <div className={styles.meterRow}>
        <span className={styles.meterLabel}>Free session</span>
        <span className={styles.meterValue}>
          ${usedUsd.toFixed(2)} / ${capUsd.toFixed(0)}
        </span>
      </div>
      <span className={styles.meterTrack}>
        <span
          className={[styles.meterFill, pct >= 90 ? styles.meterFillWarn : ""].join(" ")}
          style={{ width: `${pct}%` }}
        />
      </span>
    </div>
  );
}
