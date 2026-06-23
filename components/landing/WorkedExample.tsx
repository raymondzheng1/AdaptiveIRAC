"use client";

import { useState } from "react";
import { VerifiedCircle } from "@/components/brand/icons";
import { IracAnswer } from "@/components/answer/IracAnswer";
import { AuthoritiesUsed } from "@/components/answer/AuthoritiesUsed";
import {
  DEMO_ATTEMPT,
  DEMO_AUTHORITIES,
  DEMO_CHIP_ORDER,
  DEMO_LIMBS,
  DEMO_QUESTION,
} from "./landing-data";
import styles from "@/app/landing.module.css";

/** The interactive worked example on the landing page — a live preview of the hero moment. */
export function WorkedExample() {
  const [cite, setCite] = useState<string | null>("shirt");

  return (
    <div className={styles.weCard}>
      <div className={styles.weTop}>
        <span className={styles.weEyebrow}>Practise · Torts — Negligence</span>
        <span className={styles.weMeter}>
          <span className={styles.weMeterLabel}>Free session</span>
          <span className={styles.weMeterTrack}>
            <span className={styles.weMeterFill} style={{ width: "24%" }} />
          </span>
          <span className={styles.weMeterLabel}>$1.20 / $5</span>
        </span>
      </div>

      <div className={styles.weBannerStrip}>
        <VerifiedCircle size={26} />
        <span className={styles.weBannerText}>
          <strong>Every citation verified against your materials</strong>
          <span className={styles.weBannerSub}>3 authorities · all pinpointed to source</span>
        </span>
      </div>

      <div className={styles.weGrid}>
        <div className={styles.weQ}>
          <div className={styles.weQLabel}>The question · 10 marks</div>
          <p className={styles.weQText}>{DEMO_QUESTION}</p>
          <div className={styles.weAttempt}>
            <div className={styles.weAttemptHead}>
              <span>Your attempt</span>
              <span>214 words</span>
            </div>
            <p className={styles.weAttemptText}>{DEMO_ATTEMPT}</p>
          </div>
        </div>

        <div className={styles.weA}>
          <div className={styles.weALabel}>Model answer · IRAC</div>
          <div className={styles.weIrac}>
            <IracAnswer limbs={DEMO_LIMBS} onCite={(id) => setCite(id)} />
          </div>
          <AuthoritiesUsed
            authorities={DEMO_AUTHORITIES}
            order={DEMO_CHIP_ORDER}
            activeId={cite}
            onOpen={(id) => setCite(id)}
            onClose={() => setCite(null)}
            head="Authorities used — click to see the exact source"
            inlineSource
          />
        </div>
      </div>
    </div>
  );
}
