"use client";

import {
  AiracExportSchema,
  emptyWorkspace,
  STORAGE_VERSION,
  WorkspaceSchema,
  type Workspace,
} from "@/lib/schemas";

/**
 * Browser-only workspace persistence (the ONLY client state store). Typed via
 * Zod, versioned by key. Also provides the export/import JSON that lets a
 * student move between devices — the only "backup" in a store-nothing app.
 */
const KEY = `airac.v${STORAGE_VERSION}.workspace`;

function hasWindow(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function loadWorkspace(): Workspace | null {
  if (!hasWindow()) return null;
  const raw = window.localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    const parsed = WorkspaceSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function saveWorkspace(workspace: Workspace): void {
  if (!hasWindow()) return;
  const next = { ...workspace, updatedAt: Date.now() };
  window.localStorage.setItem(KEY, JSON.stringify(next));
}

export function clearWorkspace(): void {
  if (!hasWindow()) return;
  window.localStorage.removeItem(KEY);
}

export function getOrInitWorkspace(subjectName?: string): Workspace {
  return loadWorkspace() ?? emptyWorkspace(subjectName);
}

/** Serialize the workspace as a portable export bundle. */
export function toExportJson(workspace: Workspace): string {
  return JSON.stringify(
    { kind: "adaptive-irac-export", exportedAt: Date.now(), workspace },
    null,
    2,
  );
}

/** Validate + extract a workspace from an imported export bundle. */
export function fromExportJson(json: string): Workspace | null {
  try {
    const parsed = AiracExportSchema.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data.workspace : null;
  } catch {
    return null;
  }
}

/** Trigger a browser download of arbitrary text (results, export JSON). */
export function downloadText(filename: string, text: string, mime = "text/plain"): void {
  if (!hasWindow()) return;
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
