import { Link } from "react-router-dom";
import { ArrowDownRight, ArrowRight, ArrowUpRight, Flame } from "lucide-react";
import type { ScoredStock } from "../../types";
import { isAccelerating } from "../../services/scoring";
import { formatPercent } from "../../utils/format";
import { cn } from "../../lib/utils";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";

function FlowChip({ label, value }: { label: string; value: number }) {
  const up = value >= 0;
  return (
    <span className="inline-flex items-center gap-1 text-[11px]" title={`${label} money-flow change`}>
      <span className="text-[10px] font-semibold text-muted">{label}</span>
      {up ? (
        <ArrowUpRight className="h-3 w-3 text-up" aria-hidden />
      ) : (
        <ArrowDownRight className="h-3 w-3 text-down" aria-hidden />
      )}
      <span className={cn("num font-semibold", up ? "text-up" : "text-down")}>
        {formatPercent(value, 0)}
      </span>
    </span>
  );
}

/** Top 6 stocks by Money Flow Proxy, with 5D/20D windows + acceleration. */
export function MoneyFlowLeaders({ stocks }: { stocks: ScoredStock[] }) {
  const leaders = [...stocks].sort((a, b) => b.moneyFlowScore - a.moneyFlowScore).slice(0, 6);

  return (
    <Card className="card-pad fade-up" style={{ animationDelay: "280ms" }}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">Money Flow Leaders</h2>
          <p className="text-xs text-muted">Money Flow Proxy — derived from price × volume</p>
        </div>
        <Link
          to="/money-flow"
          className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-accent transition hover:text-ink"
        >
          Radar
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>
      <ul className="divide-y divide-white/5">
        {leaders.map((s) => (
          <li key={s.ticker}>
            <Link
              to={`/stock/${s.ticker}`}
              className="group flex items-center gap-3 rounded-lg px-2 py-2.5 transition hover:bg-white/[0.03]"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-ink transition group-hover:text-accent">
                    {s.ticker}
                  </span>
                  {isAccelerating(s) && (
                    <Badge variant="warn" icon={<Flame className="h-3 w-3" aria-hidden />}>
                      Acceleration
                    </Badge>
                  )}
                </div>
                <div className="mt-0.5 truncate text-xs text-muted">{s.companyName}</div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <div className="hidden flex-col gap-0.5 sm:flex">
                  <FlowChip label="5D" value={s.moneyFlow5d} />
                  <FlowChip label="20D" value={s.moneyFlow20d} />
                </div>
                <div className="num w-9 text-right text-lg font-bold text-up">{s.moneyFlowScore}</div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
