import type { BrokerTier } from "../../types";
import { Badge } from "../../components/ui/Badge";

const TIER_META: Record<BrokerTier, { variant: "good" | "warn" | "serious"; label: string; hint: string }> = {
  A: { variant: "good", label: "Tier A", hint: "Strong — consistent 7/14/30D net buying" },
  B: { variant: "warn", label: "Tier B", hint: "Moderate — multi-week pattern, recent mixed" },
  C: { variant: "serious", label: "Tier C", hint: "Weak/suspicious — recent-only or dominated flow" },
};

/** Tier badge per Section 13a — always paired with the transparent reason text. */
export function BrokerTierBadge({ tier, withHint = false }: { tier: BrokerTier; withHint?: boolean }) {
  const meta = TIER_META[tier];
  return (
    <span title={meta.hint}>
      <Badge variant={meta.variant}>{withHint ? `${meta.label} — ${meta.hint}` : meta.label}</Badge>
    </span>
  );
}

export function tierHint(tier: BrokerTier): string {
  return TIER_META[tier].hint;
}
