import { ArrowDownRight, ArrowUpRight, Flame, Minus } from "lucide-react";
import type { ScoredStock } from "../../types";
import { isAccelerating } from "../../services/scoring";
import { formatPercent } from "../../utils/format";
import { cn } from "../../lib/utils";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";

function FlowWindow({ label, value }: { label: string; value: number }) {
  const Icon = value > 2 ? ArrowUpRight : value < -2 ? ArrowDownRight : Minus;
  return (
    <div className="flex-1 rounded-lg border border-white/5 bg-surface2/50 px-3 py-2.5">
      <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">{label}</div>
      <div className="num mt-1 flex items-center gap-1.5 text-base font-bold">
        <Icon
          className={cn("h-4 w-4", value > 2 ? "text-up" : value < -2 ? "text-down" : "text-muted")}
          aria-hidden
        />
        <span className={value > 2 ? "text-up" : value < -2 ? "text-down" : "text-ink2"}>
          {formatPercent(value, 0)}
        </span>
      </div>
    </div>
  );
}

/**
 * Money Flow Proxy windows (5D / 10D / 20D) + acceleration detection.
 * Derived from real price × volume — NOT institutional-flow data.
 */
export function MoneyFlowDetail({ stock }: { stock: ScoredStock }) {
  const accelerating = isAccelerating(stock);
  return (
    <Card className="card-pad fade-up" style={{ animationDelay: "120ms" }}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-ink">Money Flow Proxy</h3>
          <p className="text-xs text-muted">
            {stock.moneyFlowScore >= 70
              ? "Accumulation-like money flow detected"
              : stock.moneyFlowScore <= 35
                ? "Distribution-like money flow detected"
                : "Mixed money-flow signals"}
          </p>
        </div>
        {accelerating ? (
          <Badge variant="warn" icon={<Flame className="h-3 w-3" aria-hidden />}>
            Acceleration detected
          </Badge>
        ) : (
          <Badge variant="neutral">Steady flow</Badge>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <FlowWindow label="5D Flow" value={stock.moneyFlow5d} />
        <FlowWindow label="10D Flow" value={stock.moneyFlow10d} />
        <FlowWindow label="20D Flow" value={stock.moneyFlow20d} />
      </div>
      <p className="mt-2.5 text-[10px] leading-relaxed text-muted">
        Proxy formula: (close − previous close) × volume per session, positive-share normalized
        to 0-100. A derived indicator from real OHLCV — not a statement about any specific
        market participant.
      </p>
    </Card>
  );
}
