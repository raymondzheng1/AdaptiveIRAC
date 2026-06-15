import type { NextRequest } from "next/server";
import { fileExtension, ingestFiles, SUPPORTED_EXTENSIONS, type UploadedFile } from "@/lib/ingestion";
import { allowNewSessionForIp } from "@/lib/cost/guard";
import { getClientIp, getOrCreateSessionId } from "@/lib/session";
import { fail, ok } from "@/lib/api/respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILES = 30;
const MAX_TOTAL_BYTES = 60 * 1024 * 1024; // 60MB across all files

/**
 * Parse uploaded course materials IN MEMORY and return text + page map + the
 * extracted allow-list + issue taxonomy. Originals are discarded after this
 * response — nothing is stored server-side (Tier-B privacy invariant).
 */
export async function POST(req: NextRequest) {
  await getOrCreateSessionId(); // issue the spend-metering cookie at session start
  const ip = await getClientIp();
  if (!(await allowNewSessionForIp(ip))) {
    return fail("rate_limited", "Daily upload limit reached for your network. Try again tomorrow.", 429);
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail("bad_request", "Expected a multipart form upload.", 400);
  }

  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) return fail("bad_request", "No files were uploaded.", 400);
  if (files.length > MAX_FILES) return fail("bad_request", `Too many files (max ${MAX_FILES}).`, 400);

  const supported = SUPPORTED_EXTENSIONS as readonly string[];
  const uploads: UploadedFile[] = [];
  let totalBytes = 0;
  for (const file of files) {
    const ext = fileExtension(file.name);
    if (!supported.includes(ext)) {
      return fail("bad_request", `Unsupported file type: ${file.name} (allowed: ${supported.join(", ")}).`, 400);
    }
    const buffer = await file.arrayBuffer();
    totalBytes += buffer.byteLength;
    if (totalBytes > MAX_TOTAL_BYTES) {
      return fail("bad_request", "Uploads exceed the total size limit (60MB).", 413);
    }
    uploads.push({ filename: file.name, buffer });
  }

  try {
    const result = await ingestFiles(uploads);
    return ok(result);
  } catch {
    // Never log source content (§6.2).
    return fail("internal_error", "Could not read one of your files. Try a different format.", 500);
  }
}
