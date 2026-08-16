import { C } from "../../lib/colors";
import { clamp } from "../../lib/utils";
import { cn } from "../../lib/utils";

export type ProgressTone = "good" | "warn" | "serious" | "critical" | "accent" | "neutral";

const TONE_COLOR: Record<ProgressTone, string> = {
  good: C.good,
  warn: C.warn,
  serious: C.serious,
  critical: C.critical,
  accent: C.accent,
  neutral: C.muted,
};

interface ProgressBarProps {
  value: number; // 0-100
  tone?: ProgressTone;
  /** Show the numeric value beside the bar. */
  showValue?: boolean;
  className?: string;
}

/** Thin 0-100 progress bar used by score gauges. */
export function ProgressBar({ value, tone = "accent", showValue = false, className }: ProgressBarProps) {
  const v = clamp(value, 0, 100);
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/[0.06]"
        role="progressbar"
        aria-valuenow={Math.round(v)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${v}%`, backgroundColor: TONE_COLOR[tone] }}
        />
      </div>
      {showValue && (
        <span className="num w-10 shrink-0 text-right text-xs font-semibold text-ink2">
          {Math.round(v)}
        </span>
      )}
    </div>
  );
}
