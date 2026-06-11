import { useState } from "react";
import { Loader2, AlertCircle, Braces } from "lucide-react";
import { useStore } from "@/lib/store";
import { generateDataset } from "@/lib/providers";
import type { DatasetItem } from "@/lib/types";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { JsonViewer } from "@/components/JsonViewer";

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function DatasetStep() {
  const s = useStore();
  const apiKey = useStore((st) => st.apiKeys[st.provider] ?? "");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<DatasetItem | null>(null);

  const promptInvalid = s.systemPrompt.trim() === "";
  const genInvalid = s.generationPrompt.trim() === "";
  const hasContextTag = /<context>[\s\S]*?<\/context>/.test(s.systemPrompt);

  async function handleGenerate() {
    setError(null);
    setGenerating(true);
    try {
      const raw = await generateDataset(
        { provider: s.provider, model: s.model, apiKey },
        s.generationPrompt,
        s.itemCount,
      );
      if (raw.length === 0) throw new Error("The model returned no items.");
      s.clearDataset();
      s.setDataset(raw.map((data) => ({ id: uid(), data })));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="gen">Generation Prompt</Label>
        <Textarea
          id="gen"
          rows={3}
          invalid={genInvalid}
          placeholder="Generate realistic user scenarios including height, weight, age, and dietary goals."
          value={s.generationPrompt}
          onChange={(e) => s.setGenerationPrompt(e.target.value)}
        />
        {genInvalid && (
          <p className="text-xs text-destructive">
            A generation prompt is required.
          </p>
        )}
      </div>

      <div className="flex items-end gap-4">
        <div className="space-y-2">
          <Label htmlFor="count">Items (max 50)</Label>
          <Input
            id="count"
            type="number"
            min={1}
            max={50}
            className="w-28"
            value={s.itemCount}
            onChange={(e) => s.setItemCount(Number(e.target.value))}
          />
        </div>
        <Button
          onClick={handleGenerate}
          disabled={generating || genInvalid || !apiKey}
        >
          {generating && <Loader2 className="h-4 w-4 animate-spin" />}
          {generating ? "Generating..." : "Generate Dataset"}
        </Button>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {s.dataset.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">
              {s.dataset.length} item{s.dataset.length === 1 ? "" : "s"} generated
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => s.clearDataset()}
            >
              Clear
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {s.dataset.map((item, i) => (
              <Card
                key={item.id}
                className="cursor-pointer transition-colors hover:border-primary"
                onClick={() => setViewing(item)}
              >
                <CardContent className="flex items-center gap-2 p-4">
                  <Braces className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Item {i + 1}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {Object.keys(item.data).slice(0, 3).join(", ") || "{}"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="system">System Prompt</Label>
        <Textarea
          id="system"
          rows={6}
          invalid={promptInvalid}
          placeholder={
            "You are an expert diet assistant...\n<context></context>"
          }
          value={s.systemPrompt}
          onChange={(e) => s.setSystemPrompt(e.target.value)}
        />
        {promptInvalid ? (
          <p className="text-xs text-destructive">
            A system prompt is required before you can continue.
          </p>
        ) : !hasContextTag ? (
          <p className="text-xs text-amber-500">
            Tip: add a <code>&lt;context&gt;&lt;/context&gt;</code> tag where the
            dataset item should be injected. Without it, the item is appended to
            the end.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Each dataset item is injected into the{" "}
            <code>&lt;context&gt;</code> slot at evaluation time.
          </p>
        )}
      </div>

      {viewing && (
        <JsonViewer
          title={`Dataset Item`}
          data={viewing.data}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  );
}
