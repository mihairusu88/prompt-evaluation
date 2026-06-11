import { useState } from "react";
import { useStore } from "@/lib/store";
import { injectContext } from "@/lib/evaluation";
import type { Run } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { JsonViewer } from "@/components/JsonViewer";

interface Props {
  onEditPrompt: () => void;
}

function scoreBadge(score: number | null) {
  if (score === null) return <Badge variant="destructive">—</Badge>;
  const variant =
    score >= 7 ? "success" : score >= 4 ? "secondary" : "destructive";
  return <Badge variant={variant}>{score}</Badge>;
}

export function ResultsStep({ onEditPrompt }: Props) {
  const evaluations = useStore((s) => s.evaluations);
  const currentVersion = useStore((s) => s.currentVersion);
  const reset = useStore((s) => s.reset);
  const [selected, setSelected] = useState<number>(currentVersion);
  const [restartOpen, setRestartOpen] = useState(false);
  const [viewing, setViewing] = useState<{
    title: string;
    data: unknown;
  } | null>(null);

  if (evaluations.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No evaluations yet. Go back and run one.
      </p>
    );
  }

  const evaluation =
    evaluations.find((e) => e.version === selected) ??
    evaluations[evaluations.length - 1];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Prompt version</span>
          <Select
            value={String(evaluation.version)}
            onValueChange={(v) => setSelected(Number(v))}
          >
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {evaluations.map((e) => (
                <SelectItem key={e.version} value={String(e.version)}>
                  v{e.version}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">
            {evaluation.model}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setRestartOpen(true)}>
            Start again
          </Button>
          <Button variant="outline" onClick={onEditPrompt}>
            Edit prompt &amp; re-run
          </Button>
        </div>
      </div>

      <Dialog open={restartOpen} onOpenChange={setRestartOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start again?</DialogTitle>
            <DialogDescription>
              This clears everything — provider, API key, prompts, dataset, and
              all results — and returns to the first step. This can&apos;t be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button variant="destructive" onClick={() => reset()}>
              Start again
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">#</TableHead>
            <TableHead className="w-16">Version</TableHead>
            <TableHead>System Prompt</TableHead>
            <TableHead>Full Prompt</TableHead>
            <TableHead>Input</TableHead>
            <TableHead>Output</TableHead>
            <TableHead className="w-20 text-center">Model</TableHead>
            <TableHead className="w-20 text-center">Code</TableHead>
            <TableHead className="w-20 text-center">Average</TableHead>
            <TableHead>Reason</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {evaluation.runs.map((run: Run, i: number) => (
            <TableRow key={run.itemId}>
              <TableCell className="text-muted-foreground">{i + 1}</TableCell>
              <TableCell>
                <Badge variant="outline">v{evaluation.version}</Badge>
              </TableCell>
              <TableCell>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setViewing({
                      title: "System Prompt",
                      data: evaluation.systemPrompt,
                    })
                  }
                >
                  View
                </Button>
              </TableCell>
              <TableCell>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setViewing({
                      title: "Full Prompt",
                      data: injectContext(evaluation.systemPrompt, run.input),
                    })
                  }
                >
                  View
                </Button>
              </TableCell>
              <TableCell>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setViewing({ title: "Input", data: run.input })
                  }
                >
                  View input
                </Button>
              </TableCell>
              <TableCell>
                {run.error ? (
                  <span className="text-xs text-destructive">{run.error}</span>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setViewing({ title: "Output", data: run.output ?? "" })
                    }
                  >
                    View output
                  </Button>
                )}
              </TableCell>
              <TableCell className="text-center">
                {scoreBadge(run.modelScore)}
              </TableCell>
              <TableCell className="text-center">
                {run.codeScore === null ? (
                  <span className="text-xs text-muted-foreground">n/a</span>
                ) : (
                  scoreBadge(run.codeScore)
                )}
              </TableCell>
              <TableCell className="text-center">
                {scoreBadge(run.averageScore)}
              </TableCell>
              <TableCell className="max-w-xs">
                <p className="line-clamp-3 text-xs text-muted-foreground">
                  {run.reason ?? "—"}
                </p>
                {run.reason && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() =>
                      setViewing({ title: "Reason", data: run.reason ?? "" })
                    }
                  >
                    View more
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {viewing && (
        <JsonViewer
          title={viewing.title}
          data={viewing.data}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  );
}
