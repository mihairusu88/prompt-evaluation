# Prompt Eval

A pure client-side React app for evaluating a system prompt against a generated
dataset, scored by a model judge and code checks. No backend — your API key
stays in the browser and goes straight to the provider. See
[docs/adr/0001](docs/adr/0001-pure-client-side-architecture.md) for why, and
[CONTEXT.md](CONTEXT.md) for the domain language.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + production build
```

## The wizard

1. **Settings** — pick a provider (OpenAI / Anthropic) and model, paste your API key.
2. **Prompt & Dataset** — generate up to 50 dataset items from a generation
   prompt, then write the system prompt (with a `<context></context>` slot).
   Both must be filled before continuing.
3. **Evaluation** — optionally enable code checks (JSON-valid) and run. Outputs
   are judged on a fixed 0–10 scale (no rubric needed).
4. **Results** — per-row System Prompt / Full Prompt / Input / Output viewers and
   Model / Code / Average scores, with a prompt-version selector. Edit the prompt
   and re-run to compare versions against the same dataset.

Progress (wizard step, dataset, results) is persisted to local storage, so a
refresh drops you back where you left off. "Start again" on the results step
clears the workflow but keeps your API key.

## Stack

Vite · React · TypeScript · Tailwind · shadcn-style components · Radix Select ·
zustand (localStorage persistence) · `@anthropic-ai/sdk` · `openai`.

### Check live demo on netlify.

[![Netlify Status](https://api.netlify.com/api/v1/badges/3071c9eb-2a29-4d00-9da3-14fc51a1f278/deploy-status?branch=main)](https://app.netlify.com/projects/promptevaluation/deploys)

[Live Demo](https://promptevaluation.netlify.app/)
