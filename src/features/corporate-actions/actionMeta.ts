/**
 * Display metadata for corporate-action types (Section 14). `type` is an
 * open string, so every lookup goes through `actionTypeMeta()` with a
 * neutral fallback — unknown/future types render fine instead of crashing.
 */
import {
  Banknote,
  Factory,
  FileText,
  Gavel,
  Handshake,
  HeartHandshake,
  KeyRound,
  Merge,
  Newspaper,
  PackagePlus,
  Scissors,
  ShoppingCart,
  TrendingUp,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { CorporateAction } from "../../types";

export interface ActionTypeMeta {
  /** Indonesian-friendly chip label where it differs from the type string. */
  label: string;
  icon: LucideIcon;
}

const TYPE_META: Record<string, ActionTypeMeta> = {
  Dividend: { label: "Dividend", icon: Banknote },
  RUPS: { label: "RUPS", icon: Users },
  Buyback: { label: "Buyback", icon: ShoppingCart },
  Acquisition: { label: "Akuisisi", icon: Handshake },
  Merger: { label: "Merger", icon: Merge },
  "Right Issue": { label: "Right Issue", icon: TrendingUp },
  "Tender Offer": { label: "Tender", icon: Gavel },
  "Stock Split": { label: "Stock Split", icon: Scissors },
  "Private Placement": { label: "Private Placement", icon: PackagePlus },
  Expansion: { label: "Ekspansi", icon: Factory },
  "New Contract": { label: "New Contract", icon: FileText },
  "Strategic Partnership": { label: "Partnership", icon: HeartHandshake },
  "Ownership Change": { label: "Ownership Change", icon: KeyRound },
};

const FALLBACK_META: ActionTypeMeta = { label: "Corporate Action", icon: Newspaper };

/** Meta for any type string — always returns a valid icon (never undefined). */
export function actionTypeMeta(type: string): ActionTypeMeta {
  return TYPE_META[type] ?? FALLBACK_META;
}

/** Chip label for a type (Indonesian-flavored where natural). */
export function actionTypeLabel(type: string): string {
  return actionTypeMeta(type).label;
}

/** Impact badge variant mapping shared by every card that shows impact. */
export function impactBadge(impact: CorporateAction["impact"]): { variant: "good" | "neutral" | "serious"; label: string } {
  if (impact === "POSITIVE") return { variant: "good", label: "Positive" };
  if (impact === "NEGATIVE") return { variant: "serious", label: "Negative" };
  return { variant: "neutral", label: "Neutral" };
}
