import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Minus, TrendingDown, TrendingUp } from "lucide-react";
import type { MarketOverview as Overview } from "../../types";
import { formatDateTimeWIB, formatNumber, formatPercent, formatRupiah, formatVolume } from "../../utils/format";
import { cn } from "../../lib/utils";
import { C } from "../../lib/colors";
import { Badge } from "../../components/ui/Badge";
import { Card } from "../../components/ui/Card";
import { Sparkline } from "../../components/Sparkline";

function StatLabel({ children }: { children: ReactNode }) {
  return (
    <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">{children}</div>
  );
}

const SENTIMENT_META = {
  BULLISH: { icon: TrendingUp, variant: "good", label: "BULLISH" },
  NEUTRAL: { icon: Minus, variant: "neutral", label: "NEUTRAL" },
  BEARISH: { icon: TrendingDown, variant: "critical", label: "BEARISH" },
} as const;

/** Market sentiment derived from tracked-universe breadth. */
function sentimentOf(o: Overview): "BULLISH" | "NEUTRAL" | "BEARISH" {
  if (o.advancing > o.declining * 1.3) return "BULLISH";
  if (o.declining > o.advancing * 1.3) return "BEARISH";
  return "NEUTRAL";
}

/** IHSG hero tile + sentiment / breadth / turnover tiles (real data). */
export function MarketOverview({ snapshot }: { snapshot: Overview }) {
  const total = snapshot.advancing + snapshot.declining + snapshot.unchanged;
  const advPct = total > 0 ? (snapshot.advancing / total) * 100 : 0;
  const decPct = total > 0 ? (snapshot.declining / total) * 100 : 0;
  const sentiment = SENTIMENT_META[sentimentOf(snapshot)];
  const SentimentIcon = sentiment.icon;

  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Market overview">
      {/* IHSG hero */}
      <Card className="card-pad fade-up relative overflow-hidden sm:col-span-2">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <StatLabel>IHSG — Jakarta Composite Index</StatLabel>
            <div className="num mt-2 text-3xl font-bold tracking-tight text-ink">
              {formatNumber(snapshot.ihsgValue, 2)}
            </div>
            <div className="num mt-1 flex items-center gap-2 text-sm">
              <span className={cn("font-semibold", snapshot.ihsgChangePercent >= 0 ? "text-up" : "text-down")}>
                {snapshot.ihsgChange >= 0 ? "+" : ""}
                {formatNumber(Math.abs(snapshot.ihsgChange), 2)} ({formatPercent(snapshot.ihsgChangePercent)})
              </span>
              <span className="text-xs text-muted">vs previous session</span>
            </div>
          </div>
          {snapshot.spark.length > 1 && (
            <Sparkline
              data={snapshot.spark}
              color={snapshot.ihsgChangePercent >= 0 ? C.up : C.down}
              className="h-16 w-36 shrink-0 sm:w-44"
            />
          )}
        </div>
        <div className="mt-3 text-[11px] text-muted">
          Free data source — delayed · Last updated {formatDateTimeWIB(snapshot.updatedAt)}
        </div>
      </Card>

      {/* Sentiment */}
      <Card className="card-pad fade-up" style={{ animationDelay: "60ms" }}>
        <StatLabel>Market Sentiment</StatLabel>
        <div className="mt-2.5">
          <Badge variant={sentiment.variant} icon={<SentimentIcon className="h-3 w-3" aria-hidden />}>
            {sentiment.label}
          </Badge>
        </div>
        <p className="mt-2.5 text-xs leading-relaxed text-muted">
          Derived from the breadth of {snapshot.universeSize} tracked IDX stocks, not the full market.
        </p>
      </Card>

      {/* Breadth */}
      <Card className="card-pad fade-up" style={{ animationDelay: "120ms" }}>
        <StatLabel>Breadth — Tracked Universe</StatLabel>
        <div className="num mt-2.5 flex items-end gap-4 text-sm font-semibold">
          <span className="flex items-center gap-1 text-up">
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            {snapshot.advancing}
          </span>
          <span className="flex items-center gap-1 text-down">
            <ArrowDownRight className="h-3.5 w-3.5" aria-hidden />
            {snapshot.declining}
          </span>
          <span className="text-ink2">
            {snapshot.unchanged}
            <span className="ml-1 text-[10px] font-normal uppercase tracking-wider text-muted">flat</span>
          </span>
        </div>
        <div className="mt-2.5 flex h-1.5 w-full gap-0.5 overflow-hidden rounded-full">
          <div className="rounded-full bg-up transition-all" style={{ width: `${advPct}%` }} />
          <div className="rounded-full bg-white/10" style={{ width: `${100 - advPct - decPct}%` }} />
          <div className="rounded-full bg-down transition-all" style={{ width: `${decPct}%` }} />
        </div>
        <div className="mt-1.5 flex justify-between text-[10px] text-muted">
          <span>Advancing {advPct.toFixed(0)}%</span>
          <span>Declining {decPct.toFixed(0)}%</span>
        </div>
      </Card>

      {/* Turnover */}
      <Card className="card-pad fade-up" style={{ animationDelay: "180ms" }}>
        <StatLabel>Turnover — Tracked Universe</StatLabel>
        <div className="num mt-2.5 text-sm font-semibold text-ink">
          {formatVolume(snapshot.totalVolume)}
          <span className="ml-1 text-xs font-normal text-muted">shares</span>
        </div>
        <div className="num text-sm font-semibold text-ink">{formatRupiah(snapshot.totalValue)}</div>
        <p className="mt-2.5 border-t border-white/5 pt-2 text-[11px] leading-relaxed text-muted">
          Sums across {snapshot.universeSize} tracked stocks — not full-market totals.
        </p>
      </Card>
    </section>
  );
}
