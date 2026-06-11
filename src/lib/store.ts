import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  MODELS,
  type CodeCheckId,
  type DatasetItem,
  type Evaluation,
  type PersistedState,
  type Provider,
  type Run,
} from "./types";

interface Store extends PersistedState {
  // Step 1 — Settings
  setProvider: (provider: Provider) => void;
  setApiKey: (key: string) => void;
  setModel: (model: string) => void;
  // Step 2 — Prompt & Dataset
  setSystemPrompt: (v: string) => void;
  setGenerationPrompt: (v: string) => void;
  setItemCount: (n: number) => void;
  setDataset: (items: DatasetItem[]) => void;
  clearDataset: () => void;
  // Step 3 — Evaluation
  setCriteria: (v: string) => void;
  toggleCodeCheck: (id: CodeCheckId) => void;
  // Results
  recordEvaluation: (
    runs: Run[],
    snapshot: { systemPrompt: string; criteria: string; codeChecks: CodeCheckId[] },
  ) => void;
  // wizard navigation (persisted)
  goToStep: (step: number) => void;
  // helpers
  apiKey: () => string;
  reset: () => void;
}

const initial: PersistedState = {
  provider: "anthropic",
  apiKeys: {},
  model: MODELS.anthropic[0].id,
  systemPrompt: "",
  generationPrompt: "",
  itemCount: 5,
  dataset: [],
  criteria: "",
  codeChecks: [],
  evaluations: [],
  currentVersion: 1,
  lastEvaluatedPrompt: null,
  step: 0,
  maxStep: 0,
};

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      ...initial,

      setProvider: (provider) =>
        set((s) => {
          if (provider === s.provider) return s;
          // Smooth switch (ADR-0001): keep prompts + dataset, repopulate model to
          // the new provider's default. Per-provider keys are already retained.
          return {
            provider,
            model: MODELS[provider][0].id,
          };
        }),

      setApiKey: (key) =>
        set((s) => ({ apiKeys: { ...s.apiKeys, [s.provider]: key } })),

      setModel: (model) => set({ model }),

      setSystemPrompt: (systemPrompt) => set({ systemPrompt }),
      setGenerationPrompt: (generationPrompt) => set({ generationPrompt }),
      setItemCount: (n) =>
        set({ itemCount: Math.max(1, Math.min(50, Math.round(n) || 1)) }),

      setDataset: (dataset) => set({ dataset }),
      // Regenerating the dataset resets versioning and clears history.
      clearDataset: () =>
        set({
          dataset: [],
          evaluations: [],
          currentVersion: 1,
          lastEvaluatedPrompt: null,
        }),

      setCriteria: (criteria) => set({ criteria }),
      toggleCodeCheck: (id) =>
        set((s) => ({
          codeChecks: s.codeChecks.includes(id)
            ? s.codeChecks.filter((c) => c !== id)
            : [...s.codeChecks, id],
        })),

      recordEvaluation: (runs, snapshot) =>
        set((s) => {
          const promptChanged = snapshot.systemPrompt !== s.lastEvaluatedPrompt;
          const lastVersion =
            s.evaluations.length > 0
              ? Math.max(...s.evaluations.map((e) => e.version))
              : 0;
          // Version bumps only when the System Prompt text changed (CONTEXT.md).
          const version =
            s.lastEvaluatedPrompt === null
              ? 1
              : promptChanged
                ? lastVersion + 1
                : lastVersion;

          const evaluation: Evaluation = {
            version,
            systemPrompt: snapshot.systemPrompt,
            model: s.model,
            provider: s.provider,
            criteria: snapshot.criteria,
            codeChecks: snapshot.codeChecks,
            runs,
            createdAt: Date.now(),
          };

          // Re-running an unchanged prompt replaces that version's results.
          const others = s.evaluations.filter((e) => e.version !== version);
          return {
            evaluations: [...others, evaluation].sort(
              (a, b) => a.version - b.version,
            ),
            currentVersion: version,
            lastEvaluatedPrompt: snapshot.systemPrompt,
          };
        }),

      goToStep: (step) =>
        set((s) => ({ step, maxStep: Math.max(s.maxStep, step) })),

      apiKey: () => get().apiKeys[get().provider] ?? "",

      reset: () => set({ ...initial }),

      restart: () =>
        set((s) => ({
          ...initial,
          provider: s.provider,
          model: s.model,
          apiKeys: s.apiKeys,
        })),
    }),
    {
      name: "prompt-eval-state",
      version: 1,
    },
  ),
);
