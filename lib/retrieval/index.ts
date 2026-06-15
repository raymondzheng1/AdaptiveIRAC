import type { ContextPassage, Source } from "@/lib/schemas";

/**
 * Retrieval without a vector DB. For a single subject the corpus is small:
 *  - if it fits the token budget, send the whole corpus in context;
 *  - otherwise select the most relevant passages with a BM25-lite keyword score.
 * No embeddings, no vector store (Tier-B trim).
 */

/** ~120k tokens of context budget (chars ≈ tokens × 3.5). */
const WHOLE_CORPUS_CHAR_BUDGET = 420_000;
const STOPWORDS = new Set(
  "the a an and or but of to in on for with as at by is are was were be been being this that these those it its their his her our your from into over under not no nor so than then".split(
    /\s+/,
  ),
);

/** Split a source into passages along its page/slide map (or paragraphs if none). */
export function chunkSource(source: Source): ContextPassage[] {
  if (source.pageMap.length > 0) {
    return source.pageMap
      .map((span) => ({
        sourceId: source.id,
        sourceFilename: source.filename,
        label: span.label,
        text: source.text.slice(span.start, span.end).trim(),
      }))
      .filter((p) => p.text.length > 0);
  }
  // No page map: split on blank lines, keep reasonable chunk sizes.
  const paras = source.text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  return paras.map((text, i) => ({
    sourceId: source.id,
    sourceFilename: source.filename,
    label: `${source.filename} ¶${i + 1}`,
    text,
  }));
}

export function totalCorpusChars(sources: Source[]): number {
  return sources.reduce((sum, s) => sum + s.text.length, 0);
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

interface ScoredPassage extends ContextPassage {
  score: number;
}

/** BM25-lite passage scoring against the query terms. */
function scorePassages(passages: ContextPassage[], query: string): ScoredPassage[] {
  const queryTerms = new Set(tokenize(query));
  if (queryTerms.size === 0) {
    return passages.map((p) => ({ ...p, score: 0 }));
  }
  // Document frequency for idf.
  const df = new Map<string, number>();
  const tokenized = passages.map((p) => {
    const tokens = tokenize(p.text);
    const seen = new Set(tokens);
    for (const term of seen) if (queryTerms.has(term)) df.set(term, (df.get(term) ?? 0) + 1);
    return tokens;
  });
  const N = passages.length || 1;
  const avgLen = tokenized.reduce((s, t) => s + t.length, 0) / N || 1;
  const k1 = 1.5;
  const b = 0.75;

  return passages.map((p, i) => {
    const tokens = tokenized[i] ?? [];
    const len = tokens.length || 1;
    const tf = new Map<string, number>();
    for (const t of tokens) if (queryTerms.has(t)) tf.set(t, (tf.get(t) ?? 0) + 1);
    let score = 0;
    for (const term of queryTerms) {
      const f = tf.get(term) ?? 0;
      if (f === 0) continue;
      const n = df.get(term) ?? 0;
      const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
      score += idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * len) / avgLen)));
    }
    return { ...p, score };
  });
}

export interface RetrievalResult {
  passages: ContextPassage[];
  mode: "whole-corpus" | "keyword";
}

/**
 * Select the context passages to ground a generation call.
 * Whole-corpus when it fits; else top-scoring keyword passages within budget.
 */
export function selectContext(
  sources: Source[],
  query: string,
  charBudget = WHOLE_CORPUS_CHAR_BUDGET,
): RetrievalResult {
  const allPassages = sources.flatMap(chunkSource);
  if (totalCorpusChars(sources) <= charBudget) {
    return { passages: allPassages, mode: "whole-corpus" };
  }
  const scored = scorePassages(allPassages, query).sort((a, b) => b.score - a.score);
  const selected: ContextPassage[] = [];
  let used = 0;
  for (const p of scored) {
    if (used + p.text.length > charBudget && selected.length > 0) break;
    selected.push({
      sourceId: p.sourceId,
      sourceFilename: p.sourceFilename,
      label: p.label,
      text: p.text,
    });
    used += p.text.length;
  }
  return { passages: selected, mode: "keyword" };
}
