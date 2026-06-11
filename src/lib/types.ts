// Domain types — names mirror CONTEXT.md exactly.

export type Provider = "openai" | "anthropic";

/** Models offered per Provider (Step 1 dropdown). */
export const MODELS: Record<Provider, { id: string; label: string }[]> = {
  anthropic: [
    { id: "claude-opus-4-8", label: "Claude Opus 4.8" },
    { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
    { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" },
  ],
  openai: [
    { id: "gpt-4o", label: "GPT-4o" },
    { id: "gpt-4o-mini", label: "GPT-4o mini" },
    { id: "gpt-4.1", label: "GPT-4.1" },
  ],
};

export const PROVIDER_LABELS: Record<Provider, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
};

/**
 * A single generated scenario, injected into the System Prompt's <context> slot.
 * The item *is* the context — free-form JSON object (schema decided by the
 * Generation Prompt), with a client-assigned id.
 */
export interface DatasetItem {
  id: string;
  data: Record<string, unknown>;
}

/** A Code Check is a pure, non-executing validator. Only JSON-valid for now. */
export type CodeCheckId = "json-valid";

export const CODE_CHECKS: { id: CodeCheckId; label: string; description: string }[] = [
  {
    id: "json-valid",
    label: "JSON valid",
    description: "Output parses as valid JSON (JSON.parse succeeds).",
  },
];

/** One execution of the System Prompt against a single Dataset Item. */
export interface Run {
  itemId: string;
  input: Record<string, unknown>; // the Dataset Item data
  output: string | null; // model output (null if errored)
  modelScore: number | null; // judge grade 0-10
  reason: string | null; // judge's reason
  codeScore: number | null; // 0-10 from code checks (null if none selected)
  averageScore: number | null; // per-row combined score
  error: string | null; // populated when the Run failed
}

/** One full pass of a Prompt Version over the whole Dataset. */
export interface Evaluation {
  version: number; // Prompt Version
  systemPrompt: string; // snapshot of the System Prompt text
  model: string;
  provider: Provider;
  criteria: string; // Evaluation Criteria (judge rubric)
  codeChecks: CodeCheckId[];
  runs: Run[];
  createdAt: number;
}

export interface PersistedState {
  provider: Provider;
  // API keys stored per-provider so switching restores each (see ADR-0001).
  apiKeys: Partial<Record<Provider, string>>;
  model: string;
  systemPrompt: string;
  generationPrompt: string;
  itemCount: number;
  dataset: DatasetItem[];
  criteria: string;
  codeChecks: CodeCheckId[];
  evaluations: Evaluation[]; // per-version history
  currentVersion: number; // version stamped on the *next* evaluation
  lastEvaluatedPrompt: string | null; // to detect prompt changes for versioning
  step: number; // current wizard step (persisted across refreshes)
  maxStep: number; // furthest wizard step reached
}
