import { Fragment } from "react";
import { CheckIcon } from "@/components/brand/icons";
import styles from "./practice.module.css";

const STEPS = [
  { key: "upload", label: "Upload" },
  { key: "authorities", label: "Authorities" },
  { key: "practise", label: "Practise" },
] as const;

export type StepKey = (typeof STEPS)[number]["key"];

export function ProgressSteps({ current }: { current: StepKey }) {
  const currentIdx = STEPS.findIndex((s) => s.key === current);
  return (
    <div className={styles.steps} aria-label="Progress">
      {STEPS.map((s, i) => {
        const done = i < currentIdx;
        const isCurrent = i === currentIdx;
        const circleClass = done ? styles.stepDone : isCurrent ? styles.stepCurrent : styles.stepUpcoming;
        const connClass = i < currentIdx ? styles.stepConnectorDone : i === currentIdx ? styles.stepConnectorCurrent : "";
        return (
          <Fragment key={s.key}>
            {i > 0 ? <span className={[styles.stepConnector, connClass].join(" ")} /> : null}
            <div className={styles.step}>
              <span className={[styles.stepCircle, circleClass].join(" ")}>
                {done ? <CheckIcon size={13} /> : i + 1}
              </span>
              <span className={styles.stepLabel} style={isCurrent ? { fontWeight: 700 } : undefined}>
                {s.label}
              </span>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}
