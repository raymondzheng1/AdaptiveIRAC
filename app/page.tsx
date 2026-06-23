import Link from "next/link";
import { Logo } from "@/components/brand/Mark";
import { CheckIcon, ShieldTick } from "@/components/brand/icons";
import { WorkedExample } from "@/components/landing/WorkedExample";
import { InstallPrompt } from "@/components/InstallPrompt";
import styles from "./landing.module.css";

const BASE_URL = process.env.APP_BASE_URL?.replace(/\/$/, "") || "http://localhost:3000";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Pincite",
  applicationCategory: "EducationalApplication",
  operatingSystem: "Web",
  url: BASE_URL,
  description:
    "Pincite turns your own cases, statutes and notes into realistic exam practice, with every authority in a model answer checked against your materials and pinpointed to its exact source.",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
};

const TRUST_PILLS = ["No sign-up", "Processed in memory · never stored", "Australia-first"];

export default function LandingPage() {
  return (
    <div className={styles.page}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header>
        <nav className={styles.nav}>
          <Logo href="/" fontSize={23} />
          <div className={`${styles.navLinks} ${styles.navLinksDesktop}`}>
            <a href="#worked-example" className={styles.navLink}>Worked example</a>
            <a href="#how-it-works" className={styles.navLink}>How it works</a>
            <a href="#privacy" className={styles.navLink}>Privacy</a>
            <Link href="/practice" className={styles.navCta}>Start practising</Link>
          </div>
          <Link href="/practice" className={`${styles.navCta} ${styles.navCtaMobile}`}>Start practising</Link>
        </nav>
      </header>

      <main>
        {/* HERO */}
        <header className={styles.hero}>
          <div className={styles.eyebrow}>Exam practice · bound to your materials</div>
          <h1 className={styles.heroTitle}>
            Model answers you can <span className={styles.heroTitleAccent}>actually&nbsp;cite</span>.
          </h1>
          <p className={styles.heroSub}>
            Pincite turns your own cases, statutes and notes into realistic exam practice — and every
            authority in a model answer is checked against your materials and pinpointed to its exact
            source. If a point can&apos;t be grounded, it says so. It never invents.
          </p>
          <div className={styles.heroCtas}>
            <Link href="/practice" className={`${styles.cta} ${styles.ctaPrimary}`}>
              Start practising — free <span className={styles.ctaArrow} aria-hidden>→</span>
            </Link>
            <a href="#how-it-works" className={`${styles.cta} ${styles.ctaSecondary}`}>
              See how it works
            </a>
          </div>
          <div className={styles.heroPills}>
            {TRUST_PILLS.map((label) => (
              <span key={label} className={styles.pill}>
                <span className={styles.pillCheck}><CheckIcon size={12} /></span>
                {label}
              </span>
            ))}
          </div>
        </header>

        {/* WORKED EXAMPLE */}
        <section id="worked-example" className={styles.section} aria-label="Worked example">
          <WorkedExample />
        </section>

        {/* WHAT'S INSIDE */}
        <section className={styles.section}>
          <div className={styles.sectionEyebrow}>What&apos;s inside</div>
          <h2 className={styles.sectionTitle}>Everything you need for one focused revision session</h2>
          <div className={styles.grid4}>
            <article className={styles.featureCard}>
              <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 5h11M5 10h14M5 15h9" stroke="var(--primary)" strokeWidth="1.8" strokeLinecap="round" />
                <circle cx="18" cy="16" r="4.5" fill="none" stroke="var(--accent)" strokeWidth="1.8" />
              </svg>
              <h3 className={styles.featureTitle}>Questions from your syllabus</h3>
              <p className={styles.featureText}>Hypotheticals and essay prompts drawn from the topics in your own materials.</p>
            </article>
            <article className={styles.featureCard}>
              <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
                <rect x="4" y="3" width="16" height="18" rx="2.5" fill="none" stroke="var(--primary)" strokeWidth="1.8" />
                <path d="M8 8h8M8 12h8M8 16h5" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              <h3 className={styles.featureTitle}>Verified model IRAC</h3>
              <p className={styles.featureText}>Dense, well-structured answers — every authority checked and pinpointed to its source.</p>
            </article>
            <article className={styles.featureCard}>
              <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 20V9M10 20V4M16 20v-7" stroke="var(--primary)" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M3 20h18" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              <h3 className={styles.featureTitle}>Feedback &amp; rubric</h3>
              <p className={styles.featureText}>Issues you spotted and missed, a five-limb scorecard, and three concrete next steps.</p>
            </article>
            <article className={styles.featureCard}>
              <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="13" r="8" fill="none" stroke="var(--primary)" strokeWidth="1.8" />
                <path d="M12 9v4l3 2" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M9 3h6" stroke="var(--primary)" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              <h3 className={styles.featureTitle}>Timed exam mode</h3>
              <p className={styles.featureText}>A calm countdown and word budgeting. Download, print, or export your work.</p>
            </article>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" className={styles.section}>
          <div className={styles.sectionEyebrow}>How it works</div>
          <h2 className={styles.sectionTitle}>Three steps. No account.</h2>
          <div className={styles.grid3}>
            <article className={styles.stepCard}>
              <div className={styles.stepHead}>
                <span className={styles.stepNum}>1</span>
                <h3 className={styles.stepTitle}>Upload</h3>
              </div>
              <p className={styles.stepText}>Drop in your cases, statutes, slides and notes. Processed in memory and discarded — never stored.</p>
            </article>
            <article className={styles.stepCard}>
              <div className={styles.stepHead}>
                <span className={styles.stepNum}>2</span>
                <h3 className={styles.stepTitle}>Confirm authorities</h3>
              </div>
              <p className={styles.stepText}>Review the citable cases and sections we found. You decide what&apos;s allowed to be cited.</p>
            </article>
            <article className={styles.stepCard}>
              <div className={styles.stepHead}>
                <span className={`${styles.stepNum} ${styles.stepNumJade}`}>3</span>
                <h3 className={styles.stepTitle}>Practise</h3>
              </div>
              <p className={styles.stepText}>Generate a question, write your attempt, then reveal a verified model answer and feedback.</p>
            </article>
          </div>
        </section>

        {/* PRIVACY */}
        <section id="privacy" className={styles.privacy}>
          <div className={styles.privacyInner}>
            <div style={{ flex: "none" }}>
              <ShieldTick size={72} />
            </div>
            <div>
              <div className={styles.privacyEyebrow}>Privacy by design</div>
              <h2 className={styles.privacyTitle}>Your materials never leave your session</h2>
              <p className={styles.privacyText}>
                Files are processed in memory and discarded the moment you leave. Nothing is uploaded to a
                database, nothing is kept, and there&apos;s no account to create. Your work lives only in your
                browser — yours to export or print whenever you like.
              </p>
            </div>
          </div>
        </section>

        {/* INSTALL */}
        <section className={styles.installSection} aria-label="Install Pincite">
          <InstallPrompt />
        </section>
      </main>

      {/* FOOTER */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerTop}>
            <div>
              <Logo markSize={22} fontSize={18} />
              <p className={styles.footerDisclaimer}>
                Pincite is a study aid, not legal advice. Always verify authorities against primary sources
                before relying on them in assessment. Citing material outside your own syllabus may breach
                your institution&apos;s academic-integrity rules — you remain responsible for your submitted work.
              </p>
            </div>
            <div className={styles.footerCols}>
              <div className={styles.footerCol}>
                <span className={styles.footerColHead}>Product</span>
                <a href="#how-it-works" className={styles.footerLink}>How it works</a>
                <a href="#worked-example" className={styles.footerLink}>Worked example</a>
                <Link href="/practice" className={styles.footerLink}>Start practising</Link>
              </div>
              <div className={styles.footerCol}>
                <span className={styles.footerColHead}>Legal</span>
                <a href="#privacy" className={styles.footerLink}>Privacy</a>
                <a href="#privacy" className={styles.footerLink}>Academic integrity</a>
                <a href="#privacy" className={styles.footerLink}>Terms</a>
              </div>
            </div>
          </div>
          <div className={styles.footerBottom}>
            <span className={styles.footerMeta}>© {new Date().getFullYear()} Pincite</span>
            <span className={styles.footerMeta}>Made for law &amp; PLT students · Australia</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
