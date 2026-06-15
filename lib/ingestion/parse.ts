import JSZip from "jszip";
import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";
import type { PageSpan } from "@/lib/schemas";
import { sanitizeDocumentText } from "./sanitize";

export interface ParsedDocument {
  text: string;
  pageMap: PageSpan[];
}

export function fileExtension(filename: string): string {
  const i = filename.lastIndexOf(".");
  return i >= 0 ? filename.slice(i + 1).toLowerCase() : "";
}

/** Join page/slide chunks into one text blob and build a char-offset page map. */
function assemble(chunks: Array<{ label: string; page: number; text: string }>): ParsedDocument {
  let text = "";
  const pageMap: PageSpan[] = [];
  for (const chunk of chunks) {
    const clean = chunk.text.trim();
    if (!clean) continue;
    const start = text.length;
    text += clean;
    pageMap.push({ label: chunk.label, page: chunk.page, start, end: text.length });
    text += "\n\n";
  }
  return { text: text.trim(), pageMap };
}

async function parsePdf(buffer: ArrayBuffer): Promise<ParsedDocument> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: false });
  const pages = Array.isArray(text) ? text : [text];
  return assemble(pages.map((t, i) => ({ label: `p${i + 1}`, page: i + 1, text: t })));
}

async function parseDocx(buffer: ArrayBuffer): Promise<ParsedDocument> {
  const { value } = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
  // Word has no reliable page boundaries; chunk on blank-line paragraph groups.
  const paras = value.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  // Group into ~1500-char pseudo-pages so pinpoints stay granular.
  const chunks: Array<{ label: string; page: number; text: string }> = [];
  let buf = "";
  let page = 1;
  for (const para of paras) {
    buf = buf ? `${buf}\n\n${para}` : para;
    if (buf.length >= 1500) {
      chunks.push({ label: `p${page}`, page, text: buf });
      buf = "";
      page += 1;
    }
  }
  if (buf) chunks.push({ label: `p${page}`, page, text: buf });
  return assemble(chunks);
}

const PPTX_TEXT_RE = /<a:t>([^<]*)<\/a:t>/g;

async function parsePptx(buffer: ArrayBuffer): Promise<ParsedDocument> {
  const zip = await JSZip.loadAsync(buffer);
  const slideFiles = Object.keys(zip.files)
    .filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p))
    .sort((a, b) => {
      const na = Number(a.match(/slide(\d+)\.xml$/)?.[1] ?? 0);
      const nb = Number(b.match(/slide(\d+)\.xml$/)?.[1] ?? 0);
      return na - nb;
    });
  const chunks: Array<{ label: string; page: number; text: string }> = [];
  for (let i = 0; i < slideFiles.length; i++) {
    const path = slideFiles[i];
    const entry = path ? zip.files[path] : undefined;
    if (!entry) continue;
    const xml = await entry.async("string");
    const runs: string[] = [];
    let m: RegExpExecArray | null;
    PPTX_TEXT_RE.lastIndex = 0;
    while ((m = PPTX_TEXT_RE.exec(xml)) !== null) {
      const t = m[1]?.trim();
      if (t) runs.push(decodeXmlEntities(t));
    }
    chunks.push({ label: `Slide ${i + 1}`, page: i + 1, text: runs.join("\n") });
  }
  return assemble(chunks);
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function parsePlain(text: string): ParsedDocument {
  const paras = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const chunks: Array<{ label: string; page: number; text: string }> = [];
  let buf = "";
  let page = 1;
  for (const para of paras) {
    buf = buf ? `${buf}\n\n${para}` : para;
    if (buf.length >= 1500) {
      chunks.push({ label: `p${page}`, page, text: buf });
      buf = "";
      page += 1;
    }
  }
  if (buf) chunks.push({ label: `p${page}`, page, text: buf });
  if (chunks.length === 0 && text.trim()) chunks.push({ label: "p1", page: 1, text });
  return assemble(chunks);
}

export const SUPPORTED_EXTENSIONS = ["pdf", "docx", "pptx", "txt", "md"] as const;

/** Parse an uploaded file in memory. Originals are NEVER stored server-side. */
export async function parseDocument(
  filename: string,
  buffer: ArrayBuffer,
  rawText?: string,
): Promise<ParsedDocument> {
  const ext = fileExtension(filename);
  let parsed: ParsedDocument;
  switch (ext) {
    case "pdf":
      parsed = await parsePdf(buffer);
      break;
    case "docx":
      parsed = await parseDocx(buffer);
      break;
    case "pptx":
      parsed = await parsePptx(buffer);
      break;
    case "txt":
    case "md":
      parsed = parsePlain(rawText ?? Buffer.from(buffer).toString("utf8"));
      break;
    default:
      throw new Error(`Unsupported file type: .${ext}`);
  }
  // Sanitize after parsing: corpus text is data, not instructions.
  const text = sanitizeDocumentText(parsed.text);
  return { text, pageMap: parsed.pageMap.filter((s) => s.start < text.length) };
}
