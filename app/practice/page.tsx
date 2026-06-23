"use client";

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
import { Badge, Button, Card, Input, Notice, SegmentedControl } from "@/components/ui";
import { WorkspaceShell } from "@/components/practice/WorkspaceShell";
import { ModelAnswerView } from "@/components/practice/ModelAnswerView";
import { RubricScorecard } from "@/components/practice/RubricScorecard";
import type { StepKey } from "@/components/practice/ProgressSteps";
import styles from "@/components/practice/practice.module.css";

type Step = "upload" | "authorities" | "practice";
type Tab = "answer" | "model" | "feedback";
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

const ANSWERING = "Drafting and verifying a grounded answer…";

const badgeTypeForKind = (kind: Authority["kind"]): "case" | "statute" | "notes" =>
  kind === "statute" ? "statute" : kind === "case" ? "case" : "notes";

export default function PracticePage() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [step, setStep] = useState<Step>("upload");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [byoKey, setByoKey] = useState<string>("");
  const [spend, setSpend] = useState<Spend>({ usedUsd: 0, capUsd: 5 });
  const [keyOpen, setKeyOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("answer");

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

  useEffect(() => {
    if (remaining <= 0) return;
    const id = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(id);
  }, [remaining]);

  const byoKeyPayload = useMemo(() => (byoKey.trim() ? { apiKey: byoKey.trim() } : undefined), [byoKey]);

  function applySpendFromError(e: ApiErr) {
    if (e.spend) setSpend(e.spend);
    setError(e.error);
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
    setActiveTab("answer");
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
    setActiveTab("model");
    setBusy(ANSWERING);
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
    setActiveTab("feedback");
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
    persist({ ...workspace, feedback: [...workspace.feedback, res.data.feedback], progress: nextProgress });
    track("feedback_shown");
  }

  function saveByoKey(value: string) {
    setByoKey(value);
    if (typeof window === "undefined") return;
    if (value.trim()) window.localStorage.setItem(BYO_KEY_STORAGE, value.trim());
    else window.localStorage.removeItem(BYO_KEY_STORAGE);
  }

  function exportWorkspace() {
    if (!workspace) return;
    downloadText("pincite-export.json", toExportJson(workspace), "application/json");
  }
  function importWorkspace(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const ws = fromExportJson(String(reader.result));
      if (ws) {
        persist(ws);
        setStep(ws.allowlistConfirmed ? "practice" : ws.sources.length ? "authorities" : "upload");
      } else {
        setError("That file is not a valid Pincite export.");
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
    downloadText("pincite-results.md", parts.join("\n"), "text/markdown");
    track("results_downloaded");
  }

  if (!workspace) {
    return (
      <div style={{ padding: "var(--space-12)", textAlign: "center", color: "var(--text-muted)" }}>
        Loading your workspace…
      </div>
    );
  }

  const weak = weakestLimb(workspace.progress);
  const missed = mostMissedIssues(workspace.progress);
  const stepKey: StepKey = step === "practice" ? "practise" : step;
  const answering = busy === ANSWERING;

  return (
    <WorkspaceShell
      current={stepKey}
      usedUsd={spend.usedUsd}
      capUsd={spend.capUsd}
      byoKey={Boolean(byoKeyPayload)}
      onUseKey={() => setKeyOpen((o) => !o)}
    >
      <h1 className="visually-hidden">Pincite practice workspace</h1>

      <div className={styles.stack}>
        {error ? (
          <Notice tone="danger">
            {error}{" "}
            {!byoKeyPayload ? <span>Tip: add your own API key (Use my key) to continue at no cost to us.</span> : null}
          </Notice>
        ) : null}
        {busy && !answering ? <Notice tone="info">{busy}</Notice> : null}
        {keyOpen ? <KeyPanel value={byoKey} onChange={saveByoKey} /> : null}

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
          <>
            <Card>
              <div className={styles.row}>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Question type</span>
                  <SegmentedControl
                    ariaLabel="Question type"
                    value={type}
                    onChange={setType}
                    options={[
                      { value: "hypothetical", label: "Hypothetical" },
                      { value: "essay", label: "Essay" },
                    ]}
                  />
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Difficulty</span>
                  <SegmentedControl
                    ariaLabel="Difficulty"
                    value={difficulty}
                    onChange={setDifficulty}
                    options={[
                      { value: "foundational", label: "Foundational" },
                      { value: "standard", label: "Standard" },
                      { value: "challenging", label: "Challenging" },
                    ]}
                  />
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Topic (optional)</span>
                  <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. duty of care" style={{ width: 220 }} />
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Timer (min)</span>
                  <Input
                    type="number"
                    min={0}
                    max={180}
                    value={timerMin}
                    onChange={(e) => setTimerMin(Number(e.target.value))}
                    style={{ width: 90 }}
                  />
                </div>
                <Button onClick={generateQuestion} loading={busy === "Writing a question from your materials…"}>
                  Generate question
                </Button>
              </div>
              {weak ? (
                <p className={styles.muted} style={{ marginTop: "var(--space-3)", marginBottom: 0, fontSize: 14 }}>
                  Your weakest area so far: <strong>{weak.label}</strong> ({weak.score.toFixed(1)}/10).
                  {missed.length ? ` Most-missed: ${missed.map((m) => m.issue).slice(0, 3).join(", ")}.` : ""}
                </p>
              ) : null}
            </Card>

            {question ? (
              <Card>
                <div className={styles.qMetaRow}>
                  <span className={styles.eyebrow}>Question · {workspace.subject.name}</span>
                  <Badge tone="draft">
                    {question.type === "hypothetical" ? "Hypothetical" : "Essay"} · {question.difficulty}
                  </Badge>
                  {remaining > 0 ? (
                    <Badge tone={remaining < 60 ? "warn" : "draft"}>
                      {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")} left
                    </Badge>
                  ) : null}
                </div>
                <p className={styles.qText}>{question.prompt}</p>

                <div className={styles.tabs} role="tablist" aria-label="Answer views">
                  {(
                    [
                      ["answer", "Your answer"],
                      ["model", "Model answer"],
                      ["feedback", "Feedback"],
                    ] as Array<[Tab, string]>
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      role="tab"
                      aria-selected={activeTab === key}
                      className={[styles.tab, activeTab === key ? styles.tabActive : ""].join(" ")}
                      onClick={() => setActiveTab(key)}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {activeTab === "answer" ? (
                  <div>
                    <div className={styles.editorBar}>
                      <span>Write your IRAC answer, then reveal the model answer to compare.</span>
                      <span>{wordCount(attempt)} words</span>
                    </div>
                    <textarea
                      className={styles.textarea}
                      value={attempt}
                      onChange={(e) => setAttempt(e.target.value)}
                      placeholder="Issue… Rule… Application… Conclusion…"
                      aria-label="Your attempt"
                    />
                    <div className={styles.row} style={{ marginTop: "var(--space-3)", alignItems: "center" }}>
                      <Button onClick={showModelAnswer} loading={answering}>
                        Reveal model answer
                      </Button>
                      <Button variant="secondary" onClick={getFeedback} loading={busy === "Marking your attempt…"}>
                        Get feedback on my attempt
                      </Button>
                      <Button variant="ghost" onClick={downloadResults}>
                        Download results
                      </Button>
                    </div>
                  </div>
                ) : null}

                {activeTab === "model" ? (
                  <ModelAnswerView
                    answer={answer}
                    allowlist={workspace.allowlist}
                    composing={answering}
                    insufficient={insufficient}
                    onReveal={showModelAnswer}
                  />
                ) : null}

                {activeTab === "feedback" ? (
                  <FeedbackPanel
                    feedback={feedback}
                    busy={busy === "Marking your attempt…"}
                    onGet={getFeedback}
                  />
                ) : null}
              </Card>
            ) : null}

            <Card>
              <h2 className={styles.sectionTitle}>Your workspace</h2>
              <p className={styles.muted} style={{ fontSize: 14 }}>
                Everything stays in this browser. Export a backup to move to another device, or add more materials.
              </p>
              <div className={styles.row} style={{ alignItems: "center" }}>
                <Button variant="secondary" onClick={exportWorkspace}>Export (JSON)</Button>
                <label>
                  <span className={styles.useKey} style={{ display: "inline-block" }}>Import backup</span>
                  <input
                    type="file"
                    accept="application/json"
                    hidden
                    onChange={(e) => e.target.files?.[0] && importWorkspace(e.target.files[0])}
                  />
                </label>
                <Button variant="ghost" onClick={() => setStep("upload")}>Add / change materials</Button>
              </div>
            </Card>
          </>
        ) : null}
      </div>
    </WorkspaceShell>
  );
}

function KeyPanel({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Card>
      <h2 className={styles.sectionTitle} style={{ fontSize: 18 }}>Use your own API key</h2>
      <p className={styles.muted} style={{ fontSize: 14 }}>
        Paste your own provider key to bypass the shared free limit. It is stored only in this browser and
        sent directly per request — never logged or saved on our servers.
      </p>
      <div className={styles.row} style={{ alignItems: "center" }}>
        <Input
          type="password"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="sk-…"
          style={{ flex: 1, minWidth: 240 }}
          aria-label="Your API key"
        />
        {value ? <Button variant="ghost" onClick={() => onChange("")}>Clear</Button> : null}
      </div>
    </Card>
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
      <p className={styles.muted} style={{ fontSize: 14 }}>
        PDF, Word, slides, or notes for one subject. Files are read in memory and discarded — never stored.
      </p>
      <div className={styles.field} style={{ maxWidth: 360, margin: "var(--space-4) 0" }}>
        <span className={styles.fieldLabel}>Subject name</span>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Torts" />
      </div>
      <div
        className={styles.dropzone}
        onClick={() => fileRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
        role="button"
        tabIndex={0}
      >
        <p style={{ margin: 0 }}>Click to choose files (PDF, DOCX, PPTX, TXT, MD)</p>
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
      <p className={styles.muted} style={{ marginTop: "var(--space-4)", fontSize: 14 }}>
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
      <p className={styles.muted} style={{ fontSize: 14 }}>
        These are the citable cases and sections we found in your materials. Answers may cite <strong>only</strong>{" "}
        this list. Remove anything that isn&apos;t a real authority, then confirm.
      </p>
      {authorities.length === 0 ? (
        <Notice tone="warn">
          We didn&apos;t detect any citable authorities. You can still generate practice, but model answers will
          rely on your notes rather than named cases. Consider adding a case or statute source.
        </Notice>
      ) : (
        <div>
          {authorities.map((a) => (
            <div className={styles.authItem} key={a.id}>
              <div className={styles.authMeta}>
                <div className={styles.authName}>
                  {a.canonical} <Badge type={badgeTypeForKind(a.kind)}>{a.kind}</Badge>
                </div>
                <div className={styles.authWhere}>
                  Appears at: {a.locations.map((l) => `${l.sourceFilename} · ${l.label}`).join("  |  ")}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => onRemove(a.id)}>Remove</Button>
            </div>
          ))}
        </div>
      )}
      <div className={styles.row} style={{ marginTop: "var(--space-4)", alignItems: "center" }}>
        <Button onClick={onConfirm}>Confirm {authorities.length} authorities &amp; start practising</Button>
        <Button variant="ghost" onClick={onBack}>Back</Button>
      </div>
    </Card>
  );
}

function FeedbackPanel({
  feedback,
  busy,
  onGet,
}: {
  feedback: Feedback | null;
  busy: boolean;
  onGet: () => void;
}) {
  if (!feedback) {
    return (
      <div style={{ marginTop: "var(--space-5)" }}>
        <p className={styles.muted} style={{ fontSize: 14 }}>
          Write your attempt on the <strong>Your answer</strong> tab, then mark it against the model answer.
        </p>
        <Button variant="secondary" onClick={onGet} loading={busy}>Get feedback on my attempt</Button>
      </div>
    );
  }
  return (
    <div style={{ marginTop: "var(--space-5)" }}>
      {feedback.outOfCorpusCitations.length > 0 ? (
        <Notice tone="warn" heading="Authorities outside your materials">
          Your attempt cited: {feedback.outOfCorpusCitations.join(", ")}. In an exam, citing outside your syllabus
          can cost marks.
        </Notice>
      ) : null}
      <div style={{ marginTop: "var(--space-4)" }}>
        <RubricScorecard rubric={feedback.rubric} />
      </div>
      <div style={{ marginTop: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        <p style={{ margin: 0 }}><strong>Issues spotted:</strong> {feedback.issuesSpotted.join(", ") || "—"}</p>
        <p style={{ margin: 0 }}><strong>Issues missed:</strong> {feedback.issuesMissed.join(", ") || "—"}</p>
        {feedback.structureNotes ? <p style={{ margin: 0 }}><strong>Structure:</strong> {feedback.structureNotes}</p> : null}
        {feedback.applicationDepthNotes ? (
          <p style={{ margin: 0 }}><strong>Application:</strong> {feedback.applicationDepthNotes}</p>
        ) : null}
      </div>
      <div style={{ marginTop: "var(--space-3)" }}>
        <p style={{ margin: "0 0 var(--space-1)" }}><strong>Next steps</strong></p>
        <ul style={{ margin: 0, paddingLeft: "var(--space-5)" }}>
          {feedback.actions.map((a, i) => (
            <li key={i}>{a}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
