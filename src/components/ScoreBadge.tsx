import { Badge } from "./ui/Badge";
import { cn } from "../lib/utils";

/**
 * Overall score pill (0-100), tone-on-tone status color.
 * >= 70 good · 55-69 watch · 40-54 neutral · < 40 weak.
 */
export function ScoreBadge({ value, className }: { value: number; className?: string }) {
  const variant = value >= 70 ? "good" : value >= 55 ? "warn" : value >= 40 ? "neutral" : "critical";
  return (
    <Badge variant={variant} className={cn("num tabular-nums", className)}>
      {Math.round(value)}
    </Badge>
  );
}
