import { useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { useStore } from "@/lib/store";
import { evaluateDataset } from "@/lib/evaluation";
import { CODE_CHECKS, MODELS } from "@/lib/types";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  onComplete: () => void;
}

export function EvaluationStep({ onComplete }: Props) {
  const s = useStore();
  const apiKey = useStore((st) => st.apiKeys[st.provider] ?? "");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);

  const modelLabel =
    MODELS[s.provider].find((m) => m.id === s.model)?.id ?? s.model;

  async function handleEvaluate() {
    setError(null);
    setRunning(true);
    setProgress({ done: 0, total: s.dataset.length });
    try {
      const runs = await evaluateDataset(
        { provider: s.provider, model: s.model, apiKey },
        s.dataset,
        s.systemPrompt,
        "", // no user rubric — judge scores 0–10 by default
        s.codeChecks,
        (done, total) => setProgress({ done, total }),
      );
      s.recordEvaluation(runs, {
        systemPrompt: s.systemPrompt,
        criteria: "",
        codeChecks: s.codeChecks,
      });
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  }

  const pct =
    progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-wrap gap-x-8 gap-y-2 p-4 text-sm">
          <div>
            <span className="text-muted-foreground">Model: </span>
            <span className="font-medium">{modelLabel}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Dataset: </span>
            <span className="font-medium">{s.dataset.length} items</span>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <Label>Scoring</Label>
        <div className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
          Each output is judged on a fixed{" "}
          <span className="font-medium text-foreground">0–10 scale</span> by the
          model, based on how well it fulfills the system prompt given the
          injected context. No rubric needed.
        </div>
      </div>

      <div className="space-y-2">
        <Label>Code Checks</Label>
        <div className="space-y-2">
          {CODE_CHECKS.map((check) => {
            const checked = s.codeChecks.includes(check.id);
            return (
              <label
                key={check.id}
                className="flex cursor-pointer items-start gap-3 rounded-md border p-3 hover:bg-accent"
              >
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4"
                  checked={checked}
                  onChange={() => s.toggleCodeCheck(check.id)}
                />
                <div>
                  <p className="text-sm font-medium">{check.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {check.description}
                  </p>
                </div>
              </label>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          Optional. Code score combines with the model score into the average.
        </p>
      </div>

      {running && (
        <div className="space-y-2">
          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Evaluating {progress.done}/{progress.total}...
          </p>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Button
        onClick={handleEvaluate}
        disabled={running || !apiKey || s.dataset.length === 0}
      >
        {running && <Loader2 className="h-4 w-4 animate-spin" />}
        {running ? "Evaluating..." : "Evaluate"}
      </Button>
    </div>
  );
}
