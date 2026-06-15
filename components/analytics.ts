"use client";

/**
 * PII-safe analytics. We send EVENT NAMES ONLY — never materials content,
 * attempt text, citations, or any user data (PRD §10).
 */
type Gtag = (command: "event", name: string, params?: Record<string, string | number>) => void;

export function track(event: string, params?: Record<string, string | number>): void {
  if (typeof window === "undefined") return;
  const gtag = (window as unknown as { gtag?: Gtag }).gtag;
  if (typeof gtag === "function") gtag("event", event, params);
}
