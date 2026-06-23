import type { CSSProperties } from "react";
import { ShieldIcon, VerifiedCircle } from "@/components/brand/icons";
import styles from "./answer.module.css";

/** The signature "every citation verified" banner. checkWrapStyle drives the reveal pop. */
export function VerifiedBanner({
  count,
  subline,
  showMemory = true,
  checkWrapStyle,
}: {
  count: number;
  subline?: string;
  showMemory?: boolean;
  checkWrapStyle?: CSSProperties;
}) {
  return (
    <div className={styles.banner}>
      <span className={styles.bannerCheck} style={checkWrapStyle}>
        <VerifiedCircle size={30} />
      </span>
      <div className={styles.bannerText}>
        <div className={styles.bannerHeadline}>Every citation verified against your materials</div>
        <div className={styles.bannerSub}>
          {subline ?? `${count} authorities · all pinpointed to source · nothing cited from outside your corpus`}
        </div>
      </div>
      {showMemory ? (
        <span className={styles.bannerMemory}>
          <ShieldIcon size={12} />
          in memory
        </span>
      ) : null}
    </div>
  );
}
