# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install        # install dependencies
npm run dev        # Vite dev server at http://localhost:5173
npm run build      # tsc -b (typecheck) then vite build — the CI-equivalent gate
npm run typecheck  # typecheck only
npm run preview    # serve the production build
```

There is **no test suite or linter configured**. `npm run build` is the only
correctness gate — it runs the TypeScript project build (`tsc -b`) before
bundling, so a type error fails the build. The IDE may surface SonarLint *style*
warnings; these are not enforced and do not block the build.

## Source of truth for the domain

Two documents define intent and must be kept in sync when behavior changes:

- **[CONTEXT.md](CONTEXT.md)** — the domain glossary. Type names in
  `src/lib/types.ts` mirror these terms exactly (System Prompt, Generation
  Prompt, Dataset, Dataset Item, Model, Judge, Run, Evaluation, Prompt Version,
  Model/Code/Average Score). When you rename a concept in code, update the
  glossary; when you reverse a documented decision, revise the relevant term.
- **[docs/adr/0001](docs/adr/0001-pure-client-side-architecture.md)** — records
  the pure-client-side architecture and its consequences.

## Architecture

A pure client-side React SPA (Vite + TypeScript + Tailwind + shadcn-style
components). **No backend.** The browser calls the OpenAI and Anthropic APIs
directly with the user's own key (ADR-0001). This single constraint explains
most design choices:

- `src/lib/providers.ts` enables the SDK browser escape hatches
  (`dangerouslyAllowBrowser`, and the `anthropic-dangerous-direct-browser-access`
  header). API keys live in `localStorage`. Both facts are deliberate, not
  oversights.
- Because nothing can execute server-side, **Code Checks are pure
  non-executing validators** (`src/lib/evaluation.ts`). Only `json-valid` exists;
  never add a check that runs model output (no Bash, no `eval`).

### The evaluation pipeline

The app is a 4-step wizard. The data flows:

1. **Generation** (`providers.generateDataset`) — one structured-output call
   (Anthropic tool-use / OpenAI JSON mode) returns free-form `DatasetItem`
   objects. The item schema is decided by the user's Generation Prompt, not the
   app — items are arbitrary JSON.
2. **Run** (`providers.runSystemPrompt`) — each item is injected into the System
   Prompt's `<context>` slot via `evaluation.injectContext` (replaces the first
   `<context>...</context>` region, or appends one if absent), then sent to the
   Model.
3. **Judge** (`providers.judge`) — the same Model grades the output 0–10
   reference-free (no user rubric), returning `{ score, reason }`.
4. **Score** — `evaluation.computeCodeScore` (passed/selected × 10) and
   `computeAverage` (mean of Model + Code Score, or Model Score alone when no
   checks). One **Run** per item = one results-table row.

`evaluation.evaluateDataset` orchestrates this with **bounded concurrency
(default 4)** and **per-item failure isolation** — a failed item becomes a Run
with `error` set and `null` scores; it never aborts the batch.

One Model plays all three roles (generate, run, judge) — selected once in Step 1.
The judge is a swappable constant by design; do not assume a separate judge model.

### State

`src/lib/store.ts` is a single zustand store persisted to `localStorage`
(`prompt-eval-state`). It holds settings, prompts, the dataset, the per-version
`evaluations` history, **and the wizard step** (so a refresh resumes where the
user left off). Key behaviors:

- **Per-provider API keys** (`apiKeys` map) so switching provider restores the
  prior key; `setProvider` keeps prompts/dataset and only resets the model.
- **Prompt versioning** (`recordEvaluation`): the version bumps only when the
  System Prompt text changed since the last Evaluation. Re-running an unchanged
  prompt replaces that version's results. The dataset is fixed across versions
  so scores stay comparable; `clearDataset` resets versioning to v1.
- `reset()` wipes everything (the "Start again" action).

Theme (`ThemeToggle`) is intentionally separate from the store — it toggles the
`dark` class on `<html>` and persists under its own `prompt-eval-theme` key.

### UI conventions

`src/components/ui/` are hand-maintained shadcn-style primitives (copy-paste, not
an installed package) using `cn()` from `src/lib/utils.ts` and the CSS variables
in `src/index.css`. Add new primitives the same way. Step components live in
`src/components/steps/`; `App.tsx` owns wizard navigation and per-step gating for
the Next button.
