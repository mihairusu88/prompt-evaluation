import { useStore } from "@/lib/store";
import { Stepper } from "@/components/Stepper";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SettingsStep } from "@/components/steps/SettingsStep";
import { DatasetStep } from "@/components/steps/DatasetStep";
import { EvaluationStep } from "@/components/steps/EvaluationStep";
import { ResultsStep } from "@/components/steps/ResultsStep";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const STEPS = ["Settings", "Prompt & Dataset", "Evaluation", "Results"];

const STEP_META = [
  { title: "Settings", desc: "Choose a provider and model, and enter your API key." },
  { title: "Prompt & Dataset", desc: "Generate a dataset, then write the system prompt to test against it." },
  { title: "Evaluation", desc: "Choose code checks and run the evaluation. Outputs are judged 0–10." },
  { title: "Results", desc: "Per-row scores for each dataset item. Edit the prompt to iterate." },
];

export default function App() {
  const step = useStore((s) => s.step);
  const maxStep = useStore((s) => s.maxStep);
  const goToStep = useStore((s) => s.goToStep);

  const apiKey = useStore((s) => s.apiKeys[s.provider] ?? "");
  const systemPrompt = useStore((s) => s.systemPrompt);
  const datasetLen = useStore((s) => s.dataset.length);
  const evaluationsLen = useStore((s) => s.evaluations.length);

  // Per-step gating for the Next button.
  const canAdvance = [
    apiKey.trim() !== "",
    systemPrompt.trim() !== "" && datasetLen > 0,
    evaluationsLen > 0,
    true,
  ][step];

  const isLast = step === STEPS.length - 1;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Prompt Eval</h1>
          <p className="text-sm text-muted-foreground">
            Evaluate a system prompt against a generated dataset, scored by a
            model judge and code checks.
          </p>
        </div>
        <ThemeToggle />
      </header>

      <div className="mb-8">
        <Stepper
          steps={STEPS}
          current={step}
          maxReached={maxStep}
          onJump={goToStep}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{STEP_META[step].title}</CardTitle>
          <CardDescription>{STEP_META[step].desc}</CardDescription>
        </CardHeader>
        <CardContent>
          {step === 0 && <SettingsStep />}
          {step === 1 && <DatasetStep />}
          {step === 2 && <EvaluationStep onComplete={() => goToStep(3)} />}
          {step === 3 && <ResultsStep onEditPrompt={() => goToStep(1)} />}
        </CardContent>
      </Card>

      <div className="mt-6 flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => goToStep(Math.max(0, step - 1))}
          disabled={step === 0}
        >
          Back
        </Button>
        {!isLast && (
          <Button onClick={() => goToStep(step + 1)} disabled={!canAdvance}>
            Next
          </Button>
        )}
      </div>
    </div>
  );
}
