"use client";

import { useState } from "react";
import { Button, Input, Notice } from "@/components/ui";
import styles from "./contact.module.css";

type Status = "idle" | "sending" | "sent" | "error";

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, subject: subject || undefined, message }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setStatus("sent");
      } else {
        setStatus("error");
        setError(json.error ?? "Something went wrong. Please try again.");
      }
    } catch {
      setStatus("error");
      setError("Network error. Please try again.");
    }
  }

  if (status === "sent") {
    return (
      <div style={{ marginTop: "var(--space-6)" }}>
        <Notice tone="info" heading="Thanks — your message is on its way">
          We&apos;ve received it and will reply to your email shortly.
        </Notice>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      {error ? <Notice tone="danger">{error}</Notice> : null}
      <div className={styles.field}>
        <label className={styles.label} htmlFor="c-name">Name</label>
        <Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} autoComplete="name" />
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="c-email">Email</label>
        <Input id="c-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="c-subject">Subject (optional)</label>
        <Input id="c-subject" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} />
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="c-message">Message</label>
        <textarea
          id="c-message"
          className={styles.textarea}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          minLength={10}
          maxLength={2000}
          placeholder="How can we help?"
        />
      </div>
      <p className={styles.privacyNote}>
        We use your email only to reply. Your message isn&apos;t stored beyond handling your enquiry.
      </p>
      <div>
        <Button type="submit" loading={status === "sending"}>Send message</Button>
      </div>
    </form>
  );
}
