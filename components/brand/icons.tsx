import type { SVGProps } from "react";

/**
 * Minimal precise line icons (1.6–1.8px stroke, round caps). Single-tone icons
 * use `currentColor` so callers set the colour via CSS `color: var(--token)`.
 * Two-tone marks (verified circle, shield-tick) read tokens directly.
 * The identity anchor is the check = verification.
 */
type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base(size: number | undefined, rest: SVGProps<SVGSVGElement>) {
  return { width: size ?? 24, height: size ?? 24, viewBox: "0 0 24 24", "aria-hidden": true as const, ...rest };
}

export function CheckIcon({ size, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <path d="M5 12.5l4 4 10-10.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Filled jade circle with a white check — the verified seal. */
export function VerifiedCircle({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="var(--accent)" />
      <path d="M6.6 12.4l3.3 3.3L17 8.4" fill="none" stroke="var(--on-primary)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function LockIcon({ size = 40, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <rect x="5" y="10.5" width="14" height="9.5" rx="2.2" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 10.5V8a4 4 0 018 0v2.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

export function ShieldIcon({ size = 14, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <path d="M12 3l7 3v5c0 4.2-2.9 7.4-7 8.8C7.9 18.4 5 15.2 5 11V6l7-3z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

/** Privacy band shield with a jade tick, drawn for a navy field. */
export function ShieldTick({ size = 72 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2.5l8 3.2v5.6c0 5-3.4 8.8-8 10.2-4.6-1.4-8-5.2-8-10.2V5.7l8-3.2z" fill="var(--on-primary-soft)" stroke="var(--on-primary)" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M8.4 12.2l2.6 2.6 5-5.3" fill="none" stroke="var(--accent-on-primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ReplayIcon({ size = 13, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <path d="M20 11a8 8 0 10-2.3 5.7M20 11V5M20 11h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function InfoIcon({ size = 18, ...rest }: IconProps) {
  return (
    <svg {...base(size, rest)}>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 11v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="7.6" r="1.1" fill="currentColor" />
    </svg>
  );
}
