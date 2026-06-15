"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  Authority,
  Difficulty,
  Feedback,
  InsufficientGrounding,
  ModelAnswer,
  Question,
  QuestionType,
  Workspace,
} from "@/lib/schemas";
import {
  downloadText,
  fromExportJson,
  getOrInitWorkspace,
  saveWorkspace,
  toExportJson,
} from "@/lib/storage";
import { selectContext } from "@/lib/retrieval";
import { applyFeedbackToProgress, mostMissedIssues, weakestLimb } from "@/lib/feedback/progress";
import { BYO_KEY_STORAGE } from "@/lib/byokey";
import { track } from "@/components/analytics";
import { Badge, Button, Card, Spinner } from "@/components/ui";
import { CitationList } from "@/components/practice/CitationList";
import { UsageMeter } from "@/components/practice/UsageMeter";
import styles from "@/components/practice/practice.module.css";

type Step = "upload" | "authorities" | "practice";
type Spend = { usedUsd: number; capUsd: number };

interface ApiOk<T> {
  ok: true;
  data: T;
}
interface ApiErr {
  ok: false;
  error: string;
  code?: string;
  spend?: { usedUsd: number; capUsd: number };
}

async function postJson<T>(url: string, body: unknown): Promise<ApiOk<T> | ApiErr> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) {
      return { ok: false, error: json.error ?? "Request failed.", code: json.code, spend: json.spend };
    }
    return { ok: true, data: json as T };
  } catch {
    return { ok: false, error: "Network error. Please try again." };
  }
}

function wordCount(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

export default function PracticePage() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [step, setStep] = useState<Step>("upload");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [byoKey, setByoKey] = useState<string>("");
  const [spend, setSpend] = useState<Spend>({ usedUsd: 0, capUsd: 5 });

  // Practice state
  const [type, setType] = useState<QuestionType>("hypothetical");
  const [difficulty, setDifficulty] = useState<Difficulty>("standard");
  const [topic, setTopic] = useState("");
  const [question, setQuestion] = useState<Question | null>(null);
  const [attempt, setAttempt] = useState("");
  const [answer, setAnswer] = useState<ModelAnswer | null>(null);
  const [insufficient, setInsufficient] = useState<InsufficientGrounding | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  // Timer (lightweight timed mode)
  const [timerMin, setTimerMin] = useState(0);
  const [remaining, setRemaining] = useState(0);

  const persist = useCallback((next: Workspace) => {
    setWorkspace(next);
    saveWorkspace(next);
  }, []);

  // Load workspace + BYO key, refresh usage meter.
  useEffect(() => {
    const ws = getOrInitWorkspace();
    setWorkspace(ws);
    if (ws.allowlistConfirmed) setStep("practice");
    else if (ws.sources.length > 0) setStep("authorities");
    const storedKey = typeof window !== "undefined" ? window.localStorage.getItem(BYO_KEY_STORAGE) : null;
    if (storedKey) setByoKey(storedKey);
    void fetch("/api/usage")
      .then((r) => r.json())
      .then((d) => setSpend({ usedUsd: d.usedUsd ?? 0, capUsd: d.capUsd ?? 5 }))
      .catch(() => undefined);
    track("session_start");
  }, []);

  // Countdown timer tick (re-armed each second while time remains).
  useEffect(() => {
    if (remaining <= 0) return;
    const id = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(id);
  }, [remaining]);

  // Provider defaults server-side; we send only the key the user pasted.
  const byoKeyPayload = useMemo(
    () => (byoKey.trim() ? { apiKey: byoKey.trim() } : undefined),
    [byoKey],
  );

  function applySpendFromError(e: ApiErr) {
    if (e.spend) setSpend(e.spend);
    setError(
      e.code === "session_cap_reached" || e.code === "global_budget_exhausted"
        ? `${e.error}`
        : e.error,
    );
  }

  // ---- Upload ----
  const handleUpload = useCallback(
    async (files: FileList | null, subjectName: string) => {
      if (!files || files.length === 0 || !workspace) return;
      setBusy("Reading your materials…");
      setError(null);
      try {
        const form = new FormData();
        Array.from(files).forEach((f) => form.append("files", f));
        const res = await fetch("/api/parse", { method: "POST", body: form });
        const json = await res.json();
        if (!res.ok) {
          setError(json.error ?? "Upload failed.");
          return;
        }
        const next: Workspace = {
          ...workspace,
          subject: { ...workspace.subject, name: subjectName || workspace.subject.name },
          sources: json.sources,
          allowlist: json.authorities,
          issueTaxonomy: json.issueTaxonomy,
          allowlistConfirmed: false,
        };
        persist(next);
        setStep("authorities");
        track("upload_complete", { sources: json.sources.length, authorities: json.authorities.length });
      } finally {
        setBusy(null);
      }
    },
    [workspace, persist],
  );

  // ---- Authorities editing ----
  function removeAuthority(id: string) {
    if (!workspace) return;
    persist({ ...workspace, allowlist: workspace.allowlist.filter((a) => a.id !== id) });
  }
  function confirmAllowlist() {
    if (!workspace) return;
    persist({ ...workspace, allowlistConfirmed: true });
    setStep("practice");
    track("allowlist_confirmed", { count: workspace.allowlist.length });
  }

  // ---- Generation ----
  const buildContext = useCallback(
    (query: string) => {
      if (!workspace) return [];
      return selectContext(workspace.sources, query).passages;
    },
    [workspace],
  );

  async function generateQuestion() {
    if (!workspace) return;
    setBusy("Writing a question from your materials…");
    setError(null);
    setQuestion(null);
    setAnswer(null);
    setInsufficient(null);
    setFeedback(null);
    setAttempt("");
    const context = buildContext(topic || workspace.subject.name);
    if (context.length === 0) {
      setError("No materials to draw from. Upload some sources first.");
      setBusy(null);
      return;
    }
    const res = await postJson<{ question: Question; spend: Spend }>("/api/generate/question", {
      subject: workspace.subject,
      allowlist: workspace.allowlist,
      issueTaxonomy: workspace.issueTaxonomy,
      context,
      type,
      topic,
      difficulty,
      byoKey: byoKeyPayload,
    });
    setBusy(null);
    if (!res.ok) return applySpendFromError(res);
    setSpend(res.data.spend);
    setQuestion(res.data.question);
    if (timerMin > 0) setRemaining(timerMin * 60);
    persist({ ...workspace, questions: [...workspace.questions, res.data.question] });
    track("question_generated", { type });
  }

  async function showModelAnswer() {
    if (!workspace || !question) return;
    setBusy("Drafting and verifying a grounded answer…");
    setError(null);
    const context = buildContext(question.prompt);
    const res = await postJson<{
      answer?: ModelAnswer;
      insufficientGrounding?: InsufficientGrounding;
      spend: Spend;
    }>("/api/generate/answer", {
      subject: workspace.subject,
      question,
      allowlist: workspace.allowlist,
      context,
      byoKey: byoKeyPayload,
    });
    setBusy(null);
    if (!res.ok) return applySpendFromError(res);
    setSpend(res.data.spend);
    if (res.data.answer) {
      setAnswer(res.data.answer);
      setInsufficient(null);
      persist({ ...workspace, modelAnswers: [...workspace.modelAnswers, res.data.answer] });
      track("model_answer_shown");
    } else if (res.data.insufficientGrounding) {
      setInsufficient(res.data.insufficientGrounding);
      track("insufficient_grounding");
    }
  }

  async function getFeedback() {
    if (!workspace || !question) return;
    if (wordCount(attempt) < 10) {
      setError("Write a longer attempt before requesting feedback.");
      return;
    }
    setBusy("Marking your attempt…");
    setError(null);
    const res = await postJson<{ feedback: Feedback; spend: Spend }>("/api/feedback", {
      subject: workspace.subject,
      question,
      modelAnswerIssueIds: answer?.issueIds ?? [],
      modelAnswerSummary: answer?.body ?? "",
      attemptText: attempt,
      allowlist: workspace.allowlist,
      byoKey: byoKeyPayload,
    });
    setBusy(null);
    if (!res.ok) return applySpendFromError(res);
    setSpend(res.data.spend);
    setFeedback(res.data.feedback);
    const nextProgress = applyFeedbackToProgress(workspace.progress, res.data.feedback, question);
    persist({
      ...workspace,
      feedback: [...workspace.feedback, res.data.feedback],
      progress: nextProgress,
    });
    track("feedback_shown");
  }

  // ---- BYO key ----
  function saveByoKey(value: string) {
    setByoKey(value);
    if (typeof window === "undefined") return;
    if (value.trim()) window.localStorage.setItem(BYO_KEY_STORAGE, value.trim());
    else window.localStorage.removeItem(BYO_KEY_STORAGE);
  }

  // ---- Export / import / download results ----
  function exportWorkspace() {
    if (!workspace) return;
    downloadText("adaptive-irac-export.json", toExportJson(workspace), "application/json");
  }
  function importWorkspace(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const ws = fromExportJson(String(reader.result));
      if (ws) {
        persist(ws);
        setStep(ws.allowlistConfirmed ? "practice" : ws.sources.length ? "authorities" : "upload");
      } else {
        setError("That file is not a valid Adaptive IRAC export.");
      }
    };
    reader.readAsText(file);
  }
  function downloadResults() {
    if (!question) return;
    const parts = [
      `# ${workspace?.subject.name ?? "Practice"} — ${question.type}`,
      `\n## Question\n${question.prompt}`,
    ];
    if (attempt.trim()) parts.push(`\n## My attempt\n${attempt}`);
    if (answer) {
      parts.push(`\n## Model answer\n${answer.body}`);
      if (answer.citations.length) {
        parts.push(
          `\n### Authorities cited\n${answer.citations
            .map((c) => `- ${c.display} (${c.location.sourceFilename} · ${c.pinpoint})`)
            .join("\n")}`,
        );
      }
    }
    if (feedback) {
      parts.push(
        `\n## Feedback\nIssues spotted: ${feedback.issuesSpotted.join(", ") || "—"}\nIssues missed: ${feedback.issuesMissed.join(", ") || "—"}\nStructure: ${feedback.structureNotes}\nApplication: ${feedback.applicationDepthNotes}\nActions:\n${feedback.actions.map((a) => `- ${a}`).join("\n")}`,
      );
    }
    downloadText("adaptive-irac-results.md", parts.join("\n"), "text/markdown");
    track("results_downloaded");
  }

  if (!workspace) {
    return (
      <div className="container" style={{ padding: "var(--space-8) 0" }}>
        <Spinner /> Loading your workspace…
      </div>
    );
  }

  const weak = weakestLimb(workspace.progress);
  const missed = mostMissedIssues(workspace.progress);

  return (
    <div className={styles.shell}>
      <div className={styles.topbar}>
        <div className={`container ${styles.topbarInner}`}>
          <Link href="/" className={styles.brand}>
            Adaptive<span> IRAC</span>
          </Link>
          <UsageMeter usedUsd={spend.usedUsd} capUsd={spend.capUsd} byoKey={Boolean(byoKeyPayload)} />
        </div>
      </div>

      <main className={styles.main}>
        <div className="container">
          <ol className={styles.steps}>
            <li className={`${styles.stepPill} ${step === "upload" ? styles.stepActive : workspace.sources.length ? styles.stepDone : ""}`}>
              1 · Upload
            </li>
            <li className={`${styles.stepPill} ${step === "authorities" ? styles.stepActive : workspace.allowlistConfirmed ? styles.stepDone : ""}`}>
              2 · Authorities
            </li>
            <li className={`${styles.stepPill} ${step === "practice" ? styles.stepActive : ""}`}>
              3 · Practise
            </li>
          </ol>

          {error ? (
            <div className={`${styles.notice} ${styles.noticeDanger}`} role="alert" style={{ marginBottom: "var(--space-4)" }}>
              {error}{" "}
              {!byoKeyPayload ? <span>Tip: add your own API key below to continue at no cost to us.</span> : null}
            </div>
          ) : null}

          {busy ? (
            <div className={`${styles.notice} ${styles.noticeInfo}`} style={{ marginBottom: "var(--space-4)" }}>
              <Spinner /> {busy}
            </div>
          ) : null}

          {step === "upload" ? (
            <UploadStep workspace={workspace} busy={Boolean(busy)} onUpload={handleUpload} onImport={importWorkspace} />
          ) : null}

          {step === "authorities" ? (
            <AuthoritiesStep
              authorities={workspace.allowlist}
              onRemove={removeAuthority}
              onConfirm={confirmAllowlist}
              onBack={() => setStep("upload")}
            />
          ) : null}

          {step === "practice" ? (
            <div className={styles.stack}>
              <Card>
                <div className={styles.row}>
                  <div className={styles.field}>
                    <label htmlFor="qtype">Question type</label>
                    <select id="qtype" className={styles.select} value={type} onChange={(e) => setType(e.target.value as QuestionType)}>
                      <option value="hypothetical">Hypothetical (problem)</option>
                      <option value="essay">Essay (contention)</option>
                    </select>
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="diff">Difficulty</label>
                    <select id="diff" className={styles.select} value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)}>
                      <option value="foundational">Foundational</option>
                      <option value="standard">Standard</option>
                      <option value="challenging">Challenging</option>
                    </select>
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="topic">Topic (optional)</label>
                    <input id="topic" className={styles.input} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. judicial review grounds" />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="timer">Timer (min)</label>
                    <input id="timer" type="number" min={0} max={180} className={styles.input} style={{ width: 90 }} value={timerMin} onChange={(e) => setTimerMin(Number(e.target.value))} />
                  </div>
                  <div className={styles.field}>
                    <label>&nbsp;</label>
                    <Button onClick={generateQuestion} loading={busy === "Writing a question from your materials…"}>
                      Generate question
                    </Button>
                  </div>
                </div>
                {weak ? (
                  <p className={styles.muted} style={{ marginTop: "var(--space-3)", marginBottom: 0 }}>
                    💡 Your weakest area so far: <strong>{weak.label}</strong> ({weak.score.toFixed(1)}/10).
                    {missed.length ? ` Most-missed: ${missed.map((m) => m.issue).slice(0, 3).join(", ")}.` : ""}
                  </p>
                ) : null}
              </Card>

              {question ? (
                <Card>
                  <div className={styles.editorBar}>
                    <h2 className={styles.sectionTitle}>Question</h2>
                    {remaining > 0 ? <Badge tone={remaining < 60 ? "danger" : "neutral"}>⏱ {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}</Badge> : null}
                  </div>
                  <p className={styles.answerBody}>{question.prompt}</p>

                  <div className={styles.editorBar} style={{ marginTop: "var(--space-4)" }}>
                    <label htmlFor="attempt"><strong>Your attempt</strong></label>
                    <span>{wordCount(attempt)} words</span>
                  </div>
                  <textarea
                    id="attempt"
                    className={styles.textarea}
                    value={attempt}
                    onChange={(e) => setAttempt(e.target.value)}
                    placeholder="Write your IRAC answer here…"
                  />
                  <div className={styles.row} style={{ marginTop: "var(--space-3)" }}>
                    <Button onClick={showModelAnswer} loading={busy === "Drafting and verifying a grounded answer…"}>
                      Show model answer
                    </Button>
                    <Button variant="secondary" onClick={getFeedback} loading={busy === "Marking your attempt…"}>
                      Get feedback on my attempt
                    </Button>
                    <Button variant="ghost" onClick={downloadResults}>
                      Download results
                    </Button>
                  </div>
                </Card>
              ) : null}

              {insufficient ? (
                <Card>
                  <div className={`${styles.notice} ${styles.noticeWarn}`}>
                    We couldn&apos;t ground a complete answer from your materials for this question (tried {insufficient.attempts} times). Rather than invent a citation, we&apos;ve stopped. Try a narrower topic, or add the relevant source and regenerate.
                  </div>
                </Card>
              ) : null}

              {answer ? (
                <Card>
                  <div className={styles.verifyBanner}>
                    <Badge tone="success">✓ Every citation verified against your materials</Badge>
                  </div>
                  <h2 className={styles.sectionTitle}>Model answer</h2>
                  <div className={styles.answerBody}>{answer.body}</div>
                  <CitationList citations={answer.citations} />
                </Card>
              ) : null}

              {feedback ? <FeedbackView feedback={feedback} /> : null}

              <Card>
                <h3 className={styles.sectionTitle}>Your workspace</h3>
                <p className={styles.muted}>
                  Everything stays in this browser. Export a backup to move to another device, or start a new subject.
                </p>
                <div className={styles.row}>
                  <Button variant="secondary" onClick={exportWorkspace}>Export (JSON)</Button>
                  <label className="">
                    <span style={{ display: "inline-block", padding: "10px 18px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-strong)", cursor: "pointer", fontWeight: 600 }}>
                      Import backup
                    </span>
                    <input type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && importWorkspace(e.target.files[0])} />
                  </label>
                  <Button variant="ghost" onClick={() => { setStep("upload"); }}>Add / change materials</Button>
                </div>
                <div style={{ marginTop: "var(--space-4)" }}>
                  <ByoKeyControl value={byoKey} onChange={saveByoKey} />
                </div>
              </Card>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}

function UploadStep({
  workspace,
  busy,
  onUpload,
  onImport,
}: {
  workspace: Workspace;
  busy: boolean;
  onUpload: (files: FileList | null, subjectName: string) => void;
  onImport: (file: File) => void;
}) {
  const [name, setName] = useState(workspace.subject.name === "My subject" ? "" : workspace.subject.name);
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <Card>
      <h2 className={styles.sectionTitle}>Upload your course materials</h2>
      <p className={styles.muted}>
        PDF, Word, slides, or notes for one subject. Files are read in memory and discarded — never stored.
      </p>
      <div className={styles.field} style={{ maxWidth: 360, marginBottom: "var(--space-4)" }}>
        <label htmlFor="subject">Subject name</label>
        <input id="subject" className={styles.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Administrative Law" />
      </div>
      <div
        className={styles.dropzone}
        onClick={() => fileRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
        role="button"
        tabIndex={0}
      >
        <p>Click to choose files (PDF, DOCX, PPTX, TXT, MD)</p>
        <input
          ref={fileRef}
          type="file"
          multiple
          hidden
          accept=".pdf,.docx,.pptx,.txt,.md"
          onChange={(e) => onUpload(e.target.files, name)}
          disabled={busy}
        />
      </div>
      <p className={styles.muted} style={{ marginTop: "var(--space-4)" }}>
        Returning on this device?{" "}
        <label style={{ color: "var(--primary)", cursor: "pointer", fontWeight: 600 }}>
          Import a backup
          <input type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && onImport(e.target.files[0])} />
        </label>
      </p>
    </Card>
  );
}

function AuthoritiesStep({
  authorities,
  onRemove,
  onConfirm,
  onBack,
}: {
  authorities: Authority[];
  onRemove: (id: string) => void;
  onConfirm: () => void;
  onBack: () => void;
}) {
  return (
    <Card>
      <h2 className={styles.sectionTitle}>Confirm your authorities</h2>
      <p className={styles.muted}>
        These are the citable cases and sections we found in your materials. Answers may cite <strong>only</strong> this list. Remove anything that isn&apos;t a real authority, then confirm.
      </p>
      {authorities.length === 0 ? (
        <div className={`${styles.notice} ${styles.noticeWarn}`}>
          We didn&apos;t detect any citable authorities. You can still generate practice, but model answers will rely on your notes rather than named cases. Consider adding a case or statute source.
        </div>
      ) : (
        <div>
          {authorities.map((a) => (
            <div className={styles.authItem} key={a.id}>
              <div className={styles.authMeta}>
                <div className={styles.authCanonical}>
                  {a.canonical} <Badge>{a.kind}</Badge>
                </div>
                <div className={styles.authLocs}>
                  Appears at: {a.locations.map((l) => `${l.sourceFilename} · ${l.label}`).join("  |  ")}
                </div>
              </div>
              <Button variant="ghost" small onClick={() => onRemove(a.id)}>
                Remove
              </Button>
            </div>
          ))}
        </div>
      )}
      <div className={styles.row} style={{ marginTop: "var(--space-4)" }}>
        <Button onClick={onConfirm}>Confirm {authorities.length} authorities & start practising</Button>
        <Button variant="ghost" onClick={onBack}>Back</Button>
      </div>
    </Card>
  );
}

function FeedbackView({ feedback }: { feedback: Feedback }) {
  return (
    <Card>
      <h2 className={styles.sectionTitle}>Feedback</h2>
      {feedback.outOfCorpusCitations.length > 0 ? (
        <div className={`${styles.notice} ${styles.noticeDanger}`} style={{ marginBottom: "var(--space-3)" }}>
          ⚠ Your attempt cited authorities not in your materials: {feedback.outOfCorpusCitations.join(", ")}. In an exam, citing outside your syllabus can cost marks.
        </div>
      ) : null}
      <div className={styles.rubric}>
        {(
          [
            ["Issue spotting", feedback.rubric.issueSpotting],
            ["Rule statement", feedback.rubric.ruleStatement],
            ["Application", feedback.rubric.application],
            ["Structure", feedback.rubric.structure],
            ["Authority use", feedback.rubric.authorityUse],
          ] as Array<[string, number]>
        ).map(([label, score]) => (
          <div className={styles.rubricItem} key={label}>
            <div className={styles.rubricScore}>{score}/10</div>
            <div className={styles.muted}>{label}</div>
          </div>
        ))}
      </div>
      <p><strong>Issues spotted:</strong> {feedback.issuesSpotted.join(", ") || "—"}</p>
      <p><strong>Issues missed:</strong> {feedback.issuesMissed.join(", ") || "—"}</p>
      {feedback.structureNotes ? <p><strong>Structure:</strong> {feedback.structureNotes}</p> : null}
      {feedback.applicationDepthNotes ? <p><strong>Application:</strong> {feedback.applicationDepthNotes}</p> : null}
      <p><strong>Next steps:</strong></p>
      <ul>
        {feedback.actions.map((a, i) => (
          <li key={i}>{a}</li>
        ))}
      </ul>
    </Card>
  );
}

function ByoKeyControl({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <Button variant="ghost" small onClick={() => setOpen((o) => !o)}>
        {value ? "🔑 Using your own key — edit" : "Use your own API key (unlimited)"}
      </Button>
      {open ? (
        <div style={{ marginTop: "var(--space-2)", maxWidth: 460 }}>
          <p className={styles.muted}>
            Paste your own provider API key to bypass the shared free limit. It is stored only in this browser and sent directly per request — never logged or saved on our servers.
          </p>
          <div className={styles.row}>
            <input
              className={styles.input}
              type="password"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="sk-…"
              style={{ flex: 1, minWidth: 240 }}
            />
            {value ? (
              <Button variant="ghost" small onClick={() => onChange("")}>
                Clear
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
