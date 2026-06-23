import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { InfoIcon } from "@/components/brand/icons";
import styles from "./ui.module.css";

type Variant = "primary" | "secondary" | "ghost" | "danger";

export function Button({
  variant = "primary",
  size = "md",
  block,
  arrow,
  loading,
  children,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  block?: boolean;
  arrow?: boolean;
  loading?: boolean;
}) {
  const cls = [
    styles.btn,
    styles[variant],
    size === "lg" ? styles.btnLg : size === "sm" ? styles.btnSm : "",
    block ? styles.btnBlock : "",
    className ?? "",
  ].join(" ");
  return (
    <button className={cls} disabled={rest.disabled || loading} {...rest}>
      {children}
      {arrow ? <span className={styles.arrow} aria-hidden>→</span> : null}
    </button>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={[styles.card, className ?? ""].join(" ")}>{children}</div>;
}

type BadgeType = "case" | "statute" | "notes" | "slides";
type BadgeTone = "verified" | "warn" | "draft";

const TYPE_CLASS: Record<BadgeType, string | undefined> = {
  case: styles.badgeCase,
  statute: styles.badgeStatute,
  notes: styles.badgeNotes,
  slides: styles.badgeSlides,
};
const TONE_CLASS: Record<BadgeTone, string | undefined> = {
  verified: styles.badgeVerified,
  warn: styles.badgeWarn,
  draft: styles.badgeDraft,
};

export function Badge({
  type,
  tone,
  children,
}: {
  type?: BadgeType;
  tone?: BadgeTone;
  children: ReactNode;
}) {
  const variant = (type ? TYPE_CLASS[type] : tone ? TONE_CLASS[tone] : styles.badgeDraft) ?? "";
  return <span className={[styles.badge, variant].join(" ")}>{children}</span>;
}

export function Input(props: InputHTMLAttributes<HTMLInputElement> & { className?: string }) {
  const { className, ...rest } = props;
  return <input className={[styles.input, className ?? ""].join(" ")} {...rest} />;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
  ariaLabel?: string;
}) {
  return (
    <div className={styles.segment} role="tablist" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={o.value === value}
          className={[styles.segmentBtn, o.value === value ? styles.segmentActive : ""].join(" ")}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Notice({
  tone = "info",
  heading,
  children,
  icon,
}: {
  tone?: "info" | "warn" | "danger";
  heading?: string;
  children: ReactNode;
  icon?: ReactNode;
}) {
  const toneClass =
    tone === "warn" ? styles.noticeWarn : tone === "danger" ? styles.noticeDanger : styles.noticeInfo;
  return (
    <div className={[styles.notice, toneClass].join(" ")} role={tone === "info" ? undefined : "alert"}>
      <span className={styles.noticeIcon}>{icon ?? <InfoIcon size={18} />}</span>
      <div>
        {heading ? <p className={styles.noticeHeading}>{heading}</p> : null}
        <div>{children}</div>
      </div>
    </div>
  );
}
