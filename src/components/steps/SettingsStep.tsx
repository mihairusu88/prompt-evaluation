import { useState } from "react";
import { useStore } from "@/lib/store";
import { MODELS, PROVIDER_LABELS, type Provider } from "@/lib/types";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function SettingsStep() {
  const { provider, model, setProvider, setModel, setApiKey } = useStore();
  const apiKey = useStore((s) => s.apiKeys[s.provider] ?? "");
  const [keyTouched, setKeyTouched] = useState(false);

  const keyInvalid = keyTouched && apiKey.trim() === "";

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="provider">Provider</Label>
        <Select
          value={provider}
          onValueChange={(v) => setProvider(v as Provider)}
        >
          <SelectTrigger id="provider">
            <SelectValue placeholder="Select a provider" />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(PROVIDER_LABELS) as Provider[]).map((p) => (
              <SelectItem key={p} value={p}>
                {PROVIDER_LABELS[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="model">Model</Label>
        <Select value={model} onValueChange={setModel}>
          <SelectTrigger id="model">
            <SelectValue placeholder="Select a model" />
          </SelectTrigger>
          <SelectContent>
            {MODELS[provider].map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          This model generates the dataset, runs the system prompt, and judges
          the outputs.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="apiKey">API Key</Label>
        <Input
          id="apiKey"
          type="password"
          placeholder={`Your ${PROVIDER_LABELS[provider]} API key`}
          value={apiKey}
          invalid={keyInvalid}
          onBlur={() => setKeyTouched(true)}
          onChange={(e) => {
            setKeyTouched(true);
            setApiKey(e.target.value);
          }}
        />
        {keyInvalid ? (
          <p className="text-xs text-destructive">An API key is required.</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Stored only in your browser&apos;s local storage and sent directly to{" "}
            {PROVIDER_LABELS[provider]}. Keys are kept per provider.
          </p>
        )}
      </div>
    </div>
  );
}
