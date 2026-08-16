import { ArrowDown, Eye, Pause, ShieldAlert, TrendingDown, TrendingUp, Zap } from "lucide-react";
import type { Signal } from "../types";
import { Badge } from "./ui/Badge";
import type { BadgeVariant } from "./ui/Badge";
import { cn } from "../lib/utils";

const SIGNAL_META: Record<Signal, { variant: BadgeVariant; icon: typeof Zap; label: string }> = {
  "STRONG BUY": { variant: "good", icon: Zap, label: "STRONG BUY" },
  BUY: { variant: "good", icon: TrendingUp, label: "BUY" },
  WATCH: { variant: "warn", icon: Eye, label: "WATCH" },
  HOLD: { variant: "neutral", icon: Pause, label: "HOLD" },
  REDUCE: { variant: "serious", icon: TrendingDown, label: "REDUCE" },
  SELL: { variant: "critical", icon: ArrowDown, label: "SELL" },
  AVOID: { variant: "critical", icon: ShieldAlert, label: "AVOID" },
};

/** Signal pill — status color + icon + label (never color alone). */
export function SignalBadge({ signal, className }: { signal: Signal; className?: string }) {
  const meta = SIGNAL_META[signal];
  const Icon = meta.icon;
  return (
    <Badge variant={meta.variant} className={cn("tabular-nums", className)} icon={<Icon className="h-3 w-3" aria-hidden />}>
      {meta.label}
    </Badge>
  );
}
