import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import type { Provider } from "./types";

// ADR-0001: direct browser calls with the user's own key. Both SDKs require an
// explicit opt-in; Anthropic additionally needs the dangerous-direct-browser
// header to clear CORS.
function anthropic(apiKey: string) {
  return new Anthropic({
    apiKey,
    dangerouslyAllowBrowser: true,
    defaultHeaders: { "anthropic-dangerous-direct-browser-access": "true" },
  });
}

function openai(apiKey: string) {
  return new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
}

interface Ctx {
  provider: Provider;
  model: string;
  apiKey: string;
}

const GEN_SYSTEM =
  "You generate synthetic evaluation datasets. Produce diverse, realistic items " +
  "as JSON objects that follow the user's instructions exactly. Each item must be " +
  "a self-contained JSON object.";

/** Generate up to `count` free-form Dataset Items from the Generation Prompt. */
export async function generateDataset(
  ctx: Ctx,
  generationPrompt: string,
  count: number,
): Promise<Record<string, unknown>[]> {
  const instruction =
    `${generationPrompt}\n\nGenerate exactly ${count} items.`;

  if (ctx.provider === "anthropic") {
    const res = await anthropic(ctx.apiKey).messages.create({
      model: ctx.model,
      max_tokens: 8192,
      system: GEN_SYSTEM,
      messages: [{ role: "user", content: instruction }],
      tools: [
        {
          name: "emit_dataset",
          description: "Return the generated dataset items.",
          input_schema: {
            type: "object",
            properties: {
              items: {
                type: "array",
                items: { type: "object" },
                description: "The generated dataset items.",
              },
            },
            required: ["items"],
          },
        },
      ],
      tool_choice: { type: "tool", name: "emit_dataset" },
    });
    const block = res.content.find((b) => b.type === "tool_use");
    if (!block || block.type !== "tool_use") {
      throw new Error("Model did not return a dataset.");
    }
    const items = (block.input as { items?: unknown[] }).items;
    return normalizeItems(items, count);
  }

  // OpenAI: JSON mode guarantees parseable JSON (free-form objects unsupported
  // by strict structured outputs, so we use json_object + an explicit shape).
  const res = await openai(ctx.apiKey).chat.completions.create({
    model: ctx.model,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          GEN_SYSTEM +
          ' Respond with a JSON object of the form {"items": [ ... ]}.',
      },
      { role: "user", content: instruction },
    ],
  });
  const text = res.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(text) as { items?: unknown[] };
  return normalizeItems(parsed.items, count);
}

function normalizeItems(
  items: unknown,
  count: number,
): Record<string, unknown>[] {
  if (!Array.isArray(items)) throw new Error("Generation returned no items.");
  return items
    .filter((x): x is Record<string, unknown> => typeof x === "object" && x !== null)
    .slice(0, count);
}

const TRIGGER =
  "Respond now, following your instructions and using the provided context.";

/** Run the System Prompt (with the item injected) and return the raw output. */
export async function runSystemPrompt(
  ctx: Ctx,
  injectedSystemPrompt: string,
): Promise<string> {
  if (ctx.provider === "anthropic") {
    const res = await anthropic(ctx.apiKey).messages.create({
      model: ctx.model,
      max_tokens: 4096,
      system: injectedSystemPrompt,
      messages: [{ role: "user", content: TRIGGER }],
    });
    return res.content
      .filter((b) => b.type === "text")
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim();
  }

  const res = await openai(ctx.apiKey).chat.completions.create({
    model: ctx.model,
    messages: [
      { role: "system", content: injectedSystemPrompt },
      { role: "user", content: TRIGGER },
    ],
  });
  return (res.choices[0]?.message?.content ?? "").trim();
}

export interface Grade {
  score: number; // 0-10
  reason: string;
}

/** Judge an output against the Evaluation Criteria (reference-free). */
export async function judge(
  ctx: Ctx,
  args: {
    criteria: string;
    systemPrompt: string;
    input: Record<string, unknown>;
    output: string;
  },
): Promise<Grade> {
  const judgePrompt =
    "You are a strict evaluator. Grade the AI OUTPUT from 0 to 10 (integer) " +
    "for how well it satisfies the CRITERIA, given the SYSTEM PROMPT it was " +
    "produced under and the CONTEXT it was given.\n\n" +
    `CRITERIA:\n${args.criteria || "(none provided — judge overall quality and how well the output fulfills the system prompt's intent)"}\n\n` +
    `SYSTEM PROMPT:\n${args.systemPrompt}\n\n` +
    `CONTEXT:\n${JSON.stringify(args.input, null, 2)}\n\n` +
    `OUTPUT:\n${args.output}`;

  if (ctx.provider === "anthropic") {
    const res = await anthropic(ctx.apiKey).messages.create({
      model: ctx.model,
      max_tokens: 1024,
      messages: [{ role: "user", content: judgePrompt }],
      tools: [
        {
          name: "submit_grade",
          description: "Submit the grade for the output.",
          input_schema: {
            type: "object",
            properties: {
              score: {
                type: "integer",
                minimum: 0,
                maximum: 10,
                description: "Integer grade 0-10.",
              },
              reason: {
                type: "string",
                description: "One or two sentences justifying the score.",
              },
            },
            required: ["score", "reason"],
          },
        },
      ],
      tool_choice: { type: "tool", name: "submit_grade" },
    });
    const block = res.content.find((b) => b.type === "tool_use");
    if (!block || block.type !== "tool_use") {
      throw new Error("Judge did not return a grade.");
    }
    return clampGrade(block.input as Grade);
  }

  const res = await openai(ctx.apiKey).chat.completions.create({
    model: ctx.model,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "grade",
        strict: true,
        schema: {
          type: "object",
          properties: {
            score: { type: "integer", minimum: 0, maximum: 10 },
            reason: { type: "string" },
          },
          required: ["score", "reason"],
          additionalProperties: false,
        },
      },
    },
    messages: [{ role: "user", content: judgePrompt }],
  });
  const text = res.choices[0]?.message?.content ?? "{}";
  return clampGrade(JSON.parse(text) as Grade);
}

function clampGrade(g: Grade): Grade {
  const score = Math.max(0, Math.min(10, Math.round(Number(g.score) || 0)));
  return { score, reason: String(g.reason ?? "") };
}
