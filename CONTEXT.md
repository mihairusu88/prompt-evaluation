# Prompt Eval

A pure client-side React application where a user evaluates a system prompt by
running it against a model over a set of generated scenarios, then scoring the
outputs with a judge model and code checks.

## Language

**System Prompt**:
The prompt being evaluated. Contains a `<context>` slot that is filled with one
Dataset Item per run (e.g. "You are an expert diet assistant… `<context>{…}</context>`").
_Avoid_: prompt (ambiguous), template.

**Generation Prompt**:
A separate prompt the user writes to instruct a model to synthesize the Dataset
(e.g. "Generate realistic user scenarios including height, weight, age").
_Avoid_: dataset prompt, seed prompt.

**Dataset**:
The collection of generated Dataset Items for one evaluation. Holds at most 50 items.

**Dataset Item**:
A single generated scenario, serialized as JSON, that is injected into the System
Prompt's `<context>` slot. The item *is* the context — there is no separate input
or expected output.
_Avoid_: input, context value, scenario, sample, row, test case.

**Provider**:
The LLM vendor whose API is used — OpenAI or Anthropic. Selected in Step 1 and
determines which Models are available and which API key applies.
_Avoid_: vendor, service, backend.

**Model**:
The single LLM the user selects for an evaluation. For now it plays all three
roles — it generates the Dataset, runs the System Prompt, and judges the outputs.
_Avoid_: provider (the provider is the vendor, e.g. Anthropic; the model is e.g. claude-opus-4-8).

**Judge**:
The role the Model plays when grading a Run's output. Today the same selected
Model judges its own outputs; the judge is a swappable constant for later.

**Evaluation Criteria**:
The basis the Judge grades against. There is no user-authored rubric — the Judge
scores each output on a fixed 0–10 scale by default, judging how well the output
fulfills the System Prompt's intent given the injected context.
_Avoid_: rubric, instructions, judge prompt.

**Model Score**:
The Judge's grade for one output, an integer 0–10, returned with a reason.
_Avoid_: judge score, LLM score, AI score.

**Code Score**:
The grade from the Code Checks for one output, on the same 0–10 scale.
_Avoid_: tool score, validation score.

**Score**:
Any grade in the app lives on a 0–10 scale (Model Score, Code Score, and the
combined average shown in the results table).

**Average Score**:
The per-row score shown in the results table: the equal-weighted mean of an
item's Model Score and Code Score. If no Code Checks are selected, it equals the
Model Score. There is no overall/aggregate average across items.
_Avoid_: total score, final score, overall score.

**Code Check**:
A pure, non-executing validator run on a Run's output, returning pass/fail. For
now the only check is JSON-valid (does `JSON.parse` succeed). Designed to grow to
at most 5 checks later. Never executes model output (no Bash, no eval).
_Avoid_: tool, test, assertion, lint.

**Run**:
One execution of the System Prompt against a single Dataset Item, producing an
output plus its Model Score and Code Score. Each Run is one row in the results
table.
_Avoid_: trial, attempt, execution, test run.

**Prompt Version**:
An integer identifying a distinct System Prompt text. Starts at v1 and increments
(v2, v3…) each time the user edits the System Prompt and re-evaluates the same
Dataset. Stamped onto every Run so the results table shows which version produced
it.
_Avoid_: revision, iteration, prompt id.

**Evaluation**:
One full pass of running a given Prompt Version against the whole Dataset,
yielding one Run per Dataset Item. Re-running an edited prompt produces a new
Evaluation at the next Prompt Version, against the same Dataset.
_Avoid_: eval, session, experiment, job.
