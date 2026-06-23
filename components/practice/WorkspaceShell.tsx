import type { ReactNode } from "react";
import { Logo } from "@/components/brand/Mark";
import { ProgressSteps, type StepKey } from "./ProgressSteps";
import { UsageMeter } from "./UsageMeter";
import styles from "./practice.module.css";

/** The persistent workspace shell: mark · 3-step progress · usage meter · Use my key. */
export function WorkspaceShell({
  current,
  usedUsd,
  capUsd,
  byoKey,
  onUseKey,
  children,
}: {
  current: StepKey;
  usedUsd: number;
  capUsd: number;
  byoKey: boolean;
  onUseKey: () => void;
  children: ReactNode;
}) {
  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <div className={styles.topbarInner}>
          <Logo href="/" markSize={27} fontSize={21} />
          <ProgressSteps current={current} />
          <div className={styles.topbarRight}>
            <UsageMeter usedUsd={usedUsd} capUsd={capUsd} byoKey={byoKey} />
            <button type="button" className={styles.useKey} onClick={onUseKey}>
              Use my key
            </button>
          </div>
        </div>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
