import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/Mark";
import { Card } from "@/components/ui";
import { ContactForm } from "@/components/contact/ContactForm";
import styles from "@/components/contact/contact.module.css";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with Pincite — questions, feedback, or help with your materials.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <div className={styles.wrap}>
      <header>
        <nav className={styles.nav}>
          <Logo href="/" fontSize={21} />
          <Link href="/" className={styles.navLink}>← Back to home</Link>
        </nav>
      </header>
      <main className={styles.main}>
        <Card className={styles.card}>
          <h1 className={styles.title}>Get in touch</h1>
          <p className={styles.sub}>
            Questions, feedback, or a problem with your materials? Send us a message and we&apos;ll reply by email.
          </p>
          <ContactForm />
        </Card>
      </main>
    </div>
  );
}
