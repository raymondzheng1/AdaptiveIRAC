import Link from "next/link";

/** The app mark: white check inside a rounded navy square (the verification seal). */
export function Mark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect x="2" y="2" width="28" height="28" rx="8" fill="var(--primary)" />
      <path
        d="M9.4 16.5l4.3 4.4L22.7 11"
        fill="none"
        stroke="var(--on-primary)"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Mark + "Pincite" serif wordmark. Optionally a link to home. */
export function Logo({
  markSize = 28,
  fontSize = 23,
  href,
}: {
  markSize?: number;
  fontSize?: number;
  href?: string;
}) {
  const inner = (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "10px" }}>
      <Mark size={markSize} />
      <span
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: `${fontSize}px`,
          fontWeight: 600,
          letterSpacing: "-.02em",
          color: "var(--text)",
        }}
      >
        Pincite
      </span>
    </span>
  );
  if (href) {
    return (
      <Link href={href} style={{ textDecoration: "none" }} aria-label="Pincite home">
        {inner}
      </Link>
    );
  }
  return inner;
}
