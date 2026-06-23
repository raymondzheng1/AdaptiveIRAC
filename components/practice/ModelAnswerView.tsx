"use client";

import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import type { Allowlist, InsufficientGrounding, ModelAnswer } from "@/lib/schemas";
import { Button, Notice } from "@/components/ui";
import { LockIcon } from "@/components/brand/icons";
import { VerifiedBanner } from "@/components/answer/VerifiedBanner";
import { IracAnswer } from "@/components/answer/IracAnswer";
import { AuthoritiesUsed } from "@/components/answer/AuthoritiesUsed";
import { SourcePanel } from "@/components/answer/SourcePanel";
import { presentAnswer } from "@/components/answer/transform";
import styles from "./practice.module.css";

const EASE = "cubic-bezier(.2,.7,.2,1)";
const POP_EASE = "cubic-bezier(.34,1.56,.64,1)";

/**
 * The hero. Three states (idle/composing/revealed) + the answer-reveal cascade.
 * Driven by component state + CSS transitions (resting state genuinely visible,
 * SSR/screenshot-safe), honouring prefers-reduced-motion. Click-to-source opens
 * the active authority in a sticky rail (desktop) or inline (mobile).
 */
export function ModelAnswerView({
  answer,
  allowlist,
  composing,
  insufficient,
  onReveal,
}: {
  answer: ModelAnswer | null;
  allowlist: Allowlist;
  composing: boolean;
  insufficient: InsufficientGrounding | null;
  onReveal: () => void;
}) {
  const presented = useMemo(() => (answer ? presentAnswer(answer, allowlist) : null), [answer, allowlist]);
  const [step, setStep] = useState(answer ? 6 : 0);
  const [cite, setCite] = useState<string | null>(null);
  const prevId = useRef<string | null>(answer?.id ?? null);

  useEffect(() => {
    const id = answer?.id ?? null;
    const order = presented?.order ?? [];
    if (id && id !== prevId.current) {
      prevId.current = id;
      setCite(order[0] ?? null);
      const reduce =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce) {
        setStep(6);
        return;
      }
      setStep(0);
      let s = 0;
      const iv = setInterval(() => {
        s += 1;
        setStep(s);
        if (s >= 6) clearInterval(iv);
      }, 320);
      return () => clearInterval(iv);
    }
    // Mounted with an answer already present: show it, open the first source.
    if (id && cite === null) setCite(order[0] ?? null);
    prevId.current = id;
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answer?.id, presented]);

  const anim = (threshold: number): CSSProperties =>
    step >= threshold
      ? { opacity: 1, transform: "translateY(0)", transition: `opacity .55s ${EASE}, transform .55s ${EASE}` }
      : { opacity: 0, transform: "translateY(12px)" };
  const popStyle: CSSProperties =
    step >= 6
      ? { display: "inline-flex", opacity: 1, transform: "scale(1)", transition: `opacity .3s ease, transform .5s ${POP_EASE}` }
      : { display: "inline-flex", opacity: 0, transform: "scale(.4)" };

  // ---- Insufficient grounding (honest state) ----
  if (insufficient) {
    return (
      <div className={styles.answerPanel}>
        <Notice tone="info" heading="We couldn't ground this from your materials">
          Rather than invent an authority, we&apos;ve stopped. Add the relevant case or section to your
          materials, or rephrase the question, and try again.
        </Notice>
      </div>
    );
  }

  // ---- Composing ----
  if (composing && !answer) {
    return (
      <div className={styles.answerPanel}>
        <div className={styles.composing}>
          <div className={styles.dots} aria-hidden>
            <span className={styles.dot} />
            <span className={styles.dot} />
            <span className={styles.dot} />
          </div>
          <div className={styles.composingTitle}>Composing your model answer…</div>
          <div className={styles.composingSub}>Checking each authority against your materials</div>
        </div>
      </div>
    );
  }

  // ---- Idle / locked ----
  if (!answer || !presented) {
    return (
      <div className={styles.answerPanel}>
        <div className={styles.lockCard}>
          <div className={styles.lockSkeleton} aria-hidden>
            {[120, 360, 380, 320, 120, 370, 350].map((w, i) => (
              <div key={i} className={styles.skelLine} style={{ width: `${w}px`, maxWidth: "92%" }} />
            ))}
          </div>
          <div className={styles.lockOverlay}>
            <LockIcon size={40} />
            <div className={styles.lockTitle}>Your model answer is ready</div>
            <p className={styles.lockSub}>
              Reveal it to compare against your attempt. Every citation will be verified against your materials.
            </p>
            <Button onClick={onReveal} arrow style={{ marginTop: 6 }}>
              Reveal model answer
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ---- Revealed ----
  const active = cite ? presented.authorities[cite] : undefined;
  const count = presented.order.length;

  return (
    <div className={styles.revealed}>
      <div style={anim(0)}>
        <VerifiedBanner count={count} checkWrapStyle={popStyle} />
      </div>

      <div className={styles.answerGrid}>
        <div className={styles.answerMain}>
          <IracAnswer limbs={presented.limbs} onCite={setCite} limbStyle={(i) => anim(Math.min(i + 1, 4))} />
          <AuthoritiesUsed
            authorities={presented.authorities}
            order={presented.order}
            activeId={cite}
            onOpen={setCite}
            onClose={() => setCite(null)}
            head={`Authorities used · ${count} — click any to open its source`}
            style={anim(5)}
          />
          {active ? (
            <div className={styles.sourceMobile} style={anim(5)}>
              <SourcePanel variant="inline" authority={active} onClose={() => setCite(null)} />
            </div>
          ) : null}
        </div>

        <aside className={styles.sourceRail}>
          {active ? (
            <div className={styles.sourceRailSticky} style={anim(5)}>
              <SourcePanel authority={active} onClose={() => setCite(null)} />
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
