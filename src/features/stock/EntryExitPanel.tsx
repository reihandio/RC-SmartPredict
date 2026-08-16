import { Crosshair, Flag, Gauge, ShieldAlert, TrendingUp } from "lucide-react";
import type { StockDetail } from "../../types";
import { formatRupiah } from "../../utils/format";
import { cn } from "../../lib/utils";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";

function Row({
  icon: Icon,
  label,
  value,
  valueClass,
}: {
  icon: typeof Crosshair;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="flex items-center gap-2 text-xs text-muted">
        <Icon className="h-3.5 w-3.5 text-accent" aria-hidden />
        {label}
      </span>
      <span className={cn("num text-xs font-bold text-ink", valueClass)}>{value}</span>
    </div>
  );
}

/**
 * Buy / sell timing zones computed from real 20-session support/resistance
 * and ATR — analytical information, not a guarantee.
 */
export function EntryExitPanel({ stock }: { stock: StockDetail }) {
  const momentumVariant = stock.momentum === "STRONG" ? "good" : stock.momentum === "MODERATE" ? "warn" : "neutral";
  const distVariant = stock.distributionRisk === "HIGH" ? "critical" : stock.distributionRisk === "MODERATE" ? "serious" : "good";

  return (
    <Card className="card-pad fade-up" style={{ animationDelay: "160ms" }}>
      <h3 className="text-sm font-semibold text-ink">Buy / Sell Timing</h3>

      <div className="mt-3 rounded-lg border border-accent/25 bg-accent/[0.06] px-3 py-2.5">
        <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-accent">
          Potential Entry Zone
        </div>
        <div className="num mt-0.5 text-sm font-bold text-ink">
          {formatRupiah(stock.entryLow)} – {formatRupiah(stock.entryHigh)}
        </div>
      </div>

      <div className="mt-2 divide-y divide-white/5">
        <Row icon={Flag} label="Support (20D low)" value={formatRupiah(stock.support)} />
        <Row icon={TrendingUp} label="Target (20D high)" value={formatRupiah(stock.target)} valueClass="text-up" />
        <Row icon={Crosshair} label="Invalidation" value={formatRupiah(stock.invalidation)} valueClass="text-down" />
        <Row icon={Gauge} label="Risk / Reward" value={`1 : ${stock.riskReward}`} />
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3">
        <span className="flex items-center gap-2 text-xs text-muted">
          <Gauge className="h-3.5 w-3.5 text-accent" aria-hidden />
          Momentum
        </span>
        <Badge variant={momentumVariant}>{stock.momentum}</Badge>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="flex items-center gap-2 text-xs text-muted">
          <ShieldAlert className="h-3.5 w-3.5 text-accent" aria-hidden />
          Distribution Risk
        </span>
        <Badge variant={distVariant}>{stock.distributionRisk}</Badge>
      </div>

      <p className="mt-3 text-[10px] leading-relaxed text-muted">
        Zones derive from the real 20-session range and ATR. Analytical information — not a
        guarantee. Re-evaluate if the invalidation level breaks.
      </p>
    </Card>
  );
}
