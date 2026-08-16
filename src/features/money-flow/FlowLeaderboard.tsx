import { Link } from "react-router-dom";
import { ArrowDownRight, ArrowUpRight, ChevronRight, Flame, Minus } from "lucide-react";
import type { ScoredStock } from "../../types";
import { flowAcceleration, isAccelerating } from "../../services/scoring";
import { formatPercent } from "../../utils/format";
import { cn } from "../../lib/utils";
import { C } from "../../lib/colors";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { SignalBadge } from "../../components/SignalBadge";

function flowTone(score: number): string {
  if (score >= 70) return C.up;
  if (score >= 45) return C.muted;
  return C.down;
}

function FlowChip({ label, value }: { label: string; value: number }) {
  const Icon = value > 2 ? ArrowUpRight : value < -2 ? ArrowDownRight : Minus;
  return (
    <span className="inline-flex items-center gap-0.5 text-[11px]" title={`${label} flow change`}>
      <span className="text-[10px] font-semibold text-muted">{label}</span>
      <Icon
        className={cn("h-3 w-3", value > 2 ? "text-up" : value < -2 ? "text-down" : "text-muted")}
        aria-hidden
      />
      <span className={cn("num font-semibold", value > 2 ? "text-up" : value < -2 ? "text-down" : "text-ink2")}>
        {formatPercent(value, 0)}
      </span>
    </span>
  );
}

/** Ranked Money Flow Proxy leaderboard with flow bars and acceleration. */
export function FlowLeaderboard({ stocks }: { stocks: ScoredStock[] }) {
  const top = [...stocks].sort((a, b) => b.moneyFlowScore - a.moneyFlowScore).slice(0, 10);

  return (
    <Card className="card-pad fade-up" style={{ animationDelay: "60ms" }}>
      <h2 className="text-sm font-semibold text-ink">Flow Leaderboard</h2>
      <p className="text-xs text-muted">Ranked by money-flow score · 5D/10D/20D windows</p>

      <ul className="mt-3 divide-y divide-white/5">
        {top.map((s, i) => (
          <li key={s.ticker}>
            <Link
              to={`/stock/${s.ticker}`}
              className="group flex items-center gap-3 px-2 py-3 transition hover:bg-white/[0.03] sm:gap-4"
            >
              <span
                className={cn(
                  "num w-7 shrink-0 text-center text-sm font-bold",
                  i === 0 ? "text-ink" : "text-muted",
                )}
              >
                {i + 1}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-ink transition group-hover:text-accent">{s.ticker}</span>
                  {isAccelerating(s) && (
                    <Badge variant="warn" icon={<Flame className="h-3 w-3" aria-hidden />}>
                      {flowAcceleration(s) > 0 ? `+${flowAcceleration(s)}` : flowAcceleration(s)}
                    </Badge>
                  )}
                  <span className="hidden truncate text-xs text-muted sm:block">{s.companyName}</span>
                </div>
                <div className="mt-1.5 h-1.5 w-full max-w-md overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full transition-[width] duration-500"
                    style={{ width: `${s.moneyFlowScore}%`, backgroundColor: flowTone(s.moneyFlowScore) }}
                  />
                </div>
              </div>

              <div className="num hidden w-10 shrink-0 text-right text-lg font-bold sm:block" style={{ color: flowTone(s.moneyFlowScore) }}>
                {s.moneyFlowScore}
              </div>

              <div className="hidden shrink-0 flex-col gap-1 lg:flex">
                <FlowChip label="5D" value={s.moneyFlow5d} />
                <FlowChip label="20D" value={s.moneyFlow20d} />
              </div>

              <SignalBadge signal={s.signal} className="hidden shrink-0 md:inline-flex" />

              <ChevronRight className="h-4 w-4 shrink-0 text-muted/60" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
