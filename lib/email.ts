/**
 * Shared email helper (harness §16.2). Route handlers go through this — never
 * import Resend directly. Server-only by convention (reads RESEND_API_KEY); if
 * ever imported client-side the key is simply absent, so no secret leaks.
 * REST-via-fetch variant (no extra deps). A test seam keeps routes testable.
 */
const RESEND_API_URL = "https://api.resend.com/emails";

export function fromEmail(): string {
  // onboarding@resend.dev works without domain verification (Resend account owner only).
  return process.env.FROM_EMAIL ?? "onboarding@resend.dev";
}
export function adminEmail(): string {
  return process.env.ADMIN_NOTIFY_EMAIL ?? "raymond.zheng@gmail.com";
}

export interface EmailArgs {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}
export interface EmailResult {
  ok: boolean;
  id?: string;
  error?: string;
}
export type EmailSender = (args: EmailArgs) => Promise<EmailResult>;

const realSender: EmailSender = async ({ to, subject, html, text, replyTo }) => {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("[email] RESEND_API_KEY not set — email not sent:", subject);
    return { ok: false, error: "resend_unconfigured" };
  }
  try {
    const res = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: fromEmail(),
        to,
        subject,
        html,
        text,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error("[email] Resend API error:", res.status, body.slice(0, 300));
      return { ok: false, error: `resend_${res.status}` };
    }
    const data = (await res.json()) as { id?: string };
    return { ok: true, id: data.id };
  } catch (e) {
    console.error("[email] Failed to send:", e instanceof Error ? e.message : "unknown");
    return { ok: false, error: "network_error" };
  }
};

let injected: EmailSender | null = null;
export function __setEmailSenderForTests(fn: EmailSender | null): void {
  injected = fn;
}

export function sendEmail(args: EmailArgs): Promise<EmailResult> {
  return (injected ?? realSender)(args);
}
