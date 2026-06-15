import Link from "next/link";
import { Badge } from "@/components/ui";
import { InstallPrompt } from "@/components/InstallPrompt";
import styles from "./landing.module.css";

const BASE_URL = process.env.APP_BASE_URL?.replace(/\/$/, "") || "http://localhost:3000";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Adaptive IRAC",
  applicationCategory: "EducationalApplication",
  operatingSystem: "Web",
  url: BASE_URL,
  description:
    "Turn your own law course materials into exam practice with model IRAC answers and feedback that cite only your materials, every citation pinpointed.",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
};

export default function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <header className={styles.header}>
        <div className={`container ${styles.headerInner}`}>
          <Link href="/" className={styles.brand}>
            Adaptive<span> IRAC</span>
          </Link>
          <Link href="/practice" className="">
            Start practising →
          </Link>
        </div>
      </header>

      <main>
        <section className={`container ${styles.hero}`}>
          <div className={styles.heroBadge}>
            <Badge tone="success">Free · No sign-up · Your materials stay private</Badge>
          </div>
          <h1>Exam practice grounded in your own course materials</h1>
          <p>
            Upload your subject&apos;s cases, statutes, slides and notes. Get realistic hypotheticals,
            model IRAC answers and feedback that cite <strong>only</strong> the authorities in your
            materials — every citation pinpointed back to where it appears. Nothing outside your
            syllabus, nothing invented.
          </p>
          <div className={styles.ctaRow}>
            <Link href="/practice" className="">
              <span
                style={{
                  display: "inline-block",
                  padding: "12px 22px",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--primary)",
                  color: "var(--primary-fg)",
                  fontWeight: 700,
                }}
              >
                Start practising — free
              </span>
            </Link>
          </div>
          <p className={styles.reassure}>
            Your files are processed in memory and discarded — never stored on our servers, never
            shared.
          </p>
          <InstallPrompt />
        </section>

        <section className={`container ${styles.section}`}>
          <h2>What&apos;s inside</h2>
          <div className={styles.grid}>
            <div className={styles.feature}>
              <h3>Questions from your syllabus</h3>
              <p>Hypotheticals and essay contentions built from the issues your own materials teach.</p>
            </div>
            <div className={styles.feature}>
              <h3>Verified model answers</h3>
              <p>
                Structured IRAC answers where every authority is checked against your materials and
                pinpointed — or the answer is declined, never faked.
              </p>
            </div>
            <div className={styles.feature}>
              <h3>Feedback on your attempts</h3>
              <p>Issues spotted and missed, structure, application depth, a rubric score and three next steps.</p>
            </div>
            <div className={styles.feature}>
              <h3>Timed exam practice</h3>
              <p>Mock sessions with word and time budgeting, plus a nudge toward your weakest area.</p>
            </div>
          </div>
        </section>

        <section className={`container ${styles.section}`}>
          <h2>A grounded answer, end to end</h2>
          <div className={`${styles.previewCard}`} style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "var(--space-5)", background: "var(--surface)" }}>
            <div>
              <h4>Sample question (demo materials)</h4>
              <p className={styles.previewBody}>
                A licensing authority refuses Priya&apos;s permit, relying on a policy not mentioned in
                its enabling statute. Advise Priya on a judicial-review challenge.
              </p>
            </div>
            <div>
              <h4>Model answer extract</h4>
              <p className={styles.previewBody}>
                <strong>Issue.</strong> Did the authority act without statutory authority?{"\n"}
                <strong>Rule.</strong> A decision-maker may only exercise powers the statute confers{" "}
                <span className={styles.cite}>(Demo Licensing Act s 12 — Notes p3)</span>.{"\n"}
                <strong>Application.</strong> The policy has no statutory footing, so reliance on it
                exceeds the conferred power{" "}
                <span className={styles.cite}>(Re Permit Authority — Slide 9)</span>.{"\n"}
                <strong>Conclusion.</strong> The refusal is likely reviewable for want of authority.
              </p>
            </div>
          </div>
          <p className={styles.reassure} style={{ textAlign: "center" }}>
            Demo uses a small cleared sample corpus. Your session uses only what you upload.
          </p>
        </section>

        <section className={`container ${styles.section}`}>
          <h2>How it works</h2>
          <div className={styles.steps}>
            <div className={styles.step}>
              <h3>Upload your materials</h3>
              <p>PDF, Word, slides or notes for one subject. Parsed in memory, then discarded.</p>
            </div>
            <div className={styles.step}>
              <h3>Confirm your authorities</h3>
              <p>Review the citable cases and sections we extracted — the closed list answers may use.</p>
            </div>
            <div className={styles.step}>
              <h3>Practise and review</h3>
              <p>Generate questions, write answers, get a verified model answer and feedback. Download it all.</p>
            </div>
          </div>
          <div className={styles.finalCta}>
            <Link href="/practice">
              <span
                style={{
                  display: "inline-block",
                  padding: "12px 22px",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--primary)",
                  color: "var(--primary-fg)",
                  fontWeight: 700,
                }}
              >
                Start practising — free, no sign-up
              </span>
            </Link>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className="container">
          <p>
            <strong>Adaptive IRAC</strong> is a study and practice tool, not legal advice. It does not
            write answers for live assessments — use it to learn and revise, in line with your
            institution&apos;s academic-integrity rules.
          </p>
          <p>
            Your uploaded materials are processed in memory and discarded; we don&apos;t store your
            materials or your work on our servers. You are responsible for having the right to upload
            what you use.
          </p>
          <p>© {new Date().getFullYear()} Adaptive IRAC.</p>
        </div>
      </footer>
    </>
  );
}
