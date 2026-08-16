import { AlertTriangle, OctagonAlert, ShieldCheck } from "lucide-react";
import type { RiskLevel } from "../types";
import { riskLevel } from "../services/scoring";
import { Badge } from "./ui/Badge";
import type { BadgeVariant } from "./ui/Badge";
import { cn } from "../lib/utils";

const RISK_META: Record<RiskLevel, { variant: BadgeVariant; icon: typeof ShieldCheck }> = {
  LOW: { variant: "good", icon: ShieldCheck },
  MODERATE: { variant: "warn", icon: AlertTriangle },
  ELEVATED: { variant: "serious", icon: OctagonAlert },
  HIGH: { variant: "critical", icon: OctagonAlert },
};

/**
 * Anomaly-risk pill (0-100) with band label.
 * Wording note: elevated readings mean "unusual trading pattern",
 * never an accusation of manipulation.
 */
export function RiskBadge({ value, className }: { value: number; className?: string }) {
  const level = riskLevel(value);
  const meta = RISK_META[level];
  const Icon = meta.icon;
  return (
    <Badge variant={meta.variant} className={cn("tabular-nums", className)} icon={<Icon className="h-3 w-3" aria-hidden />}>
      {level}
    </Badge>
  );
}
