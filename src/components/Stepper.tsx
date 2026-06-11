import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  steps: string[];
  current: number;
  maxReached: number;
  onJump: (index: number) => void;
}

export function Stepper({ steps, current, maxReached, onJump }: Props) {
  return (
    <ol className="flex items-center gap-2">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        const reachable = i <= maxReached;
        return (
          <li key={label} className="flex flex-1 items-center gap-2">
            <button
              type="button"
              disabled={!reachable}
              onClick={() => reachable && onJump(i)}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1 text-sm transition-colors",
                reachable ? "hover:bg-accent" : "cursor-not-allowed opacity-50",
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-medium",
                  active && "border-primary bg-primary text-primary-foreground",
                  done && "border-emerald-600 bg-emerald-600 text-white",
                  !active && !done && "border-border text-muted-foreground",
                )}
              >
                {done ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <span
                className={cn(
                  "hidden font-medium sm:inline",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {label}
              </span>
            </button>
            {i < steps.length - 1 && (
              <div className="h-px flex-1 bg-border" />
            )}
          </li>
        );
      })}
    </ol>
  );
}
