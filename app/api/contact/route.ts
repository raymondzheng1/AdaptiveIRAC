import type { NextRequest } from "next/server";
import { z } from "zod";
import { adminEmail, sendEmail } from "@/lib/email";
import { consumeRateLimit } from "@/lib/ratelimit";
import { getClientIp } from "@/lib/session";
import { fail, ok } from "@/lib/api/respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ContactSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  subject: z.string().max(200).optional(),
  message: z.string().min(10).max(2000),
});

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Contact form (harness §16.3): operator notified with reply-to = sender; sender acked. */
export async function POST(req: NextRequest) {
  const ip = await getClientIp();
  // Rate limit before parsing: max 3 per IP per hour (fail-closed §6.4).
  if (!(await consumeRateLimit(`contact:${ip}`, 3, 3600))) {
    return fail("rate_limited", "Too many messages from your network. Please try again later.", 429);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("bad_request", "Invalid request.", 400);
  }
  const parsed = ContactSchema.safeParse(body);
  if (!parsed.success) {
    return fail("bad_request", "Please complete every field with a valid email and a message of at least 10 characters.", 400);
  }
  const { name, email, subject, message } = parsed.data;
  const safeName = escapeHtml(name);
  const safeMsg = escapeHtml(message).replace(/\n/g, "<br>");
  const appUrl = process.env.APP_BASE_URL?.replace(/\/$/, "") || "";
  const source = `Submitted via the Pincite contact form${appUrl ? ` · ${appUrl}/contact` : ""}`;

  // Notify the operator; reply-to = sender so they can reply directly. The
  // sender name (Pincite) + this source line make clear which app it's from.
  const notify = await sendEmail({
    to: adminEmail(),
    subject: `[Pincite contact] ${subject ?? "Enquiry"} — ${name}`,
    html: `<p style="font-family:monospace;font-size:12px;color:#5c6573">${source}</p><p><strong>From:</strong> ${safeName} &lt;${escapeHtml(email)}&gt;</p><p>${safeMsg}</p>`,
    text: `${source}\n\nFrom: ${name} <${email}>\n\n${message}`,
    replyTo: email,
  });

  if (!notify.ok) {
    // Don't pretend it sent. (Most likely Resend isn't configured yet.)
    return fail("upstream_error", "We couldn't send your message right now. Please try again shortly.", 503);
  }

  // Acknowledge to the sender (best-effort). Subject + sign-off name the app.
  const ackFooter = appUrl ? `\n\n— The Pincite team · ${appUrl}` : "\n\n— The Pincite team";
  await sendEmail({
    to: email,
    subject: "Thanks for contacting Pincite",
    html: `<p>Hi ${safeName},</p><p>Thanks for reaching out to Pincite — we'll be in touch shortly.</p><p style="color:#5c6573">— The Pincite team${appUrl ? ` · <a href="${appUrl}">${appUrl}</a>` : ""}</p>`,
    text: `Hi ${name},\n\nThanks for reaching out to Pincite — we'll be in touch shortly.${ackFooter}`,
  });

  return ok({ ok: true });
}
