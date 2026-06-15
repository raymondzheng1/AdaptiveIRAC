/**
 * Uploaded-document text is DATA, not instructions (harness 6.5 injection defence).
 * We never execute anything embedded in a source. The generation prompt fences
 * corpus text inside an explicit delimiter; this strips control chars and any
 * occurrence of that delimiter so a malicious upload can't break out of the fence.
 */
export const CORPUS_FENCE = "<<<CORPUS>>>";

const TAB = 9;
const NEWLINE = 10;
const CARRIAGE_RETURN = 13;

/** Remove C0/C1 control characters, keeping tab, newline and carriage return. */
function stripControlChars(text: string): string {
  let out = "";
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    const isControl = code < 32 || (code >= 127 && code <= 159);
    if (!isControl || code === TAB || code === NEWLINE || code === CARRIAGE_RETURN) {
      out += ch;
    }
  }
  return out;
}

export function sanitizeDocumentText(text: string): string {
  return stripControlChars(text)
    // Strip our fence token if a document tries to forge it.
    .split(CORPUS_FENCE)
    .join("[fence]")
    // Normalise excessive blank lines.
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}
