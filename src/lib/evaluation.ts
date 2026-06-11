import { judge, runSystemPrompt } from "./providers";
import type { CodeCheckId, DatasetItem, Provider, Run } from "./types";

const CONTEXT_RE = /<context>[\s\S]*?<\/context>/;

/**
 * Inject a Dataset Item into the System Prompt's <context> slot. Replaces the
 * first <context>...</context> region; if none exists, appends one.
 */
export function injectContext(
  systemPrompt: string,
  item: Record<string, unknown>,
): string {
  const json = JSON.stringify(item, null, 2);
  const block = `<context>\n${json}\n</context>`;
  return CONTEXT_RE.test(systemPrompt)
    ? systemPrompt.replace(CONTEXT_RE, block)
    : `${systemPrompt}\n\n${block}`;
}

/**
 * Strip a surrounding markdown code fence (```json ... ``` or ``` ... ```) so
 * checks see the raw payload. Models often wrap structured output in a fence.
 */
function stripCodeFence(s: string): string {
  const t = s.trim();
  const fenced = t.match(/^```[a-zA-Z]*\s*\n?([\s\S]*?)\n?```$/);
  return fenced ? fenced[1].trim() : t;
}

/** Run a single Code Check (pure, non-executing). Returns pass/fail. */
function runCodeCheck(id: CodeCheckId, output: string): boolean {
  switch (id) {
    case "json-valid":
      try {
        JSON.parse(stripCodeFence(output));
        return true;
      } catch {
        return false;
      }
    default:
      return false;
  }
}

/** Code Score = (checks passed / checks selected) * 10, or null if none. */
export function computeCodeScore(
  output: string,
  checks: CodeCheckId[],
): number | null {
  if (checks.length === 0) return null;
  const passed = checks.filter((c) => runCodeCheck(c, output)).length;
  return (passed / checks.length) * 10;
}

/** Average Score: mean of Model & Code Score, or just Model Score if no checks. */
export function computeAverage(
  modelScore: number | null,
  codeScore: number | null,
): number | null {
  if (modelScore === null) return null;
  if (codeScore === null) return modelScore;
  return Math.round(((modelScore + codeScore) / 2) * 10) / 10;
}

interface EngineCtx {
  provider: Provider;
  model: string;
  apiKey: string;
}

async function runOne(
  ctx: EngineCtx,
  item: DatasetItem,
  systemPrompt: string,
  criteria: string,
  codeChecks: CodeCheckId[],
): Promise<Run> {
  try {
    const injected = injectContext(systemPrompt, item.data);
    const output = await runSystemPrompt(ctx, injected);
    const grade = await judge(ctx, {
      criteria,
      systemPrompt,
      input: item.data,
      output,
    });
    const codeScore = computeCodeScore(output, codeChecks);
    return {
      itemId: item.id,
      input: item.data,
      output,
      modelScore: grade.score,
      reason: grade.reason,
      codeScore,
      averageScore: computeAverage(grade.score, codeScore),
      error: null,
    };
  } catch (err) {
    return {
      itemId: item.id,
      input: item.data,
      output: null,
      modelScore: null,
      reason: null,
      codeScore: null,
      averageScore: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Evaluate the whole Dataset with bounded concurrency. Each item's Run is
 * isolated — one failure doesn't abort the others. onProgress fires per Run.
 */
export async function evaluateDataset(
  ctx: EngineCtx,
  dataset: DatasetItem[],
  systemPrompt: string,
  criteria: string,
  codeChecks: CodeCheckId[],
  onProgress: (done: number, total: number) => void,
  concurrency = 4,
): Promise<Run[]> {
  const results: Run[] = new Array(dataset.length);
  let done = 0;
  let cursor = 0;

  async function worker() {
    while (cursor < dataset.length) {
      const i = cursor++;
      results[i] = await runOne(
        ctx,
        dataset[i],
        systemPrompt,
        criteria,
        codeChecks,
      );
      done++;
      onProgress(done, dataset.length);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, dataset.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}
