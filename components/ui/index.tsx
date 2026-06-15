import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./ui.module.css";

type Variant = "primary" | "secondary" | "ghost" | "danger";

export function Button({
  variant = "primary",
  small,
  loading,
  children,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  small?: boolean;
  loading?: boolean;
}) {
  return (
    <button
      className={[styles.btn, styles[variant], small ? styles.small : "", className ?? ""].join(" ")}
      disabled={rest.disabled || loading}
      {...rest}
    >
      {loading ? <span className={styles.spinner} aria-hidden /> : null}
      {children}
    </button>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={[styles.card, className ?? ""].join(" ")}>{children}</div>;
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warn" | "danger";
}) {
  const cls =
    tone === "success"
      ? styles.badgeSuccess
      : tone === "warn"
        ? styles.badgeWarn
        : tone === "danger"
          ? styles.badgeDanger
          : "";
  return <span className={[styles.badge, cls].join(" ")}>{children}</span>;
}

export function Spinner() {
  return <span className={styles.spinner} aria-label="Loading" role="status" />;
}
