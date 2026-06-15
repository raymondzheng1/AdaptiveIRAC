import styles from "./practice.module.css";

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
      <div className={styles.usageMeter} title="Using your own key — no shared limit, no cost to us.">
        <span>🔑 Using your own key</span>
      </div>
    );
  }
  const pct = capUsd > 0 ? Math.min(100, (usedUsd / capUsd) * 100) : 0;
  const fillClass =
    pct >= 90 ? styles.meterFillDanger : pct >= 70 ? styles.meterFillWarn : "";
  return (
    <div className={styles.usageMeter} title="Free session usage">
      <span>
        Free session: ${usedUsd.toFixed(2)} / ${capUsd.toFixed(0)}
      </span>
      <span className={styles.meterTrack}>
        <span
          className={[styles.meterFill, fillClass].join(" ")}
          style={{ width: `${pct}%` }}
        />
      </span>
    </div>
  );
}
