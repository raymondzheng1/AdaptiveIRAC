import type { ParseResponse, Source } from "@/lib/schemas";
import { buildAllowlistFromSources, extractIssueTaxonomy } from "@/lib/authorities/extract";
import { stableId } from "@/lib/util/id";
import { classifySource } from "./classify";
import { fileExtension, parseDocument } from "./parse";

export * from "./parse";
export * from "./classify";
export * from "./sanitize";

export interface UploadedFile {
  filename: string;
  buffer: ArrayBuffer;
}

/**
 * Full in-memory ingestion: parse each file, classify it, build the citation
 * allow-list and a draft issue taxonomy. Returns everything the browser needs;
 * NOTHING is persisted server-side (Tier-B privacy invariant).
 */
export async function ingestFiles(files: UploadedFile[]): Promise<ParseResponse> {
  const sources: Source[] = [];
  for (const file of files) {
    const parsed = await parseDocument(file.filename, file.buffer);
    if (!parsed.text.trim()) continue;
    const kind = classifySource(file.filename, parsed.text, fileExtension(file.filename));
    sources.push({
      id: stableId("src", `${file.filename}:${parsed.text.length}`),
      filename: file.filename,
      kind,
      text: parsed.text,
      pageMap: parsed.pageMap,
    });
  }

  const authorities = buildAllowlistFromSources(sources);
  const issueTaxonomy = extractIssueTaxonomy(sources);
  return { sources, authorities, issueTaxonomy };
}
