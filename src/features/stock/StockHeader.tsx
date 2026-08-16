import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { ScoredStock, StockDetail } from "../../types";
import { formatMarketCap, formatNumber, formatPercent, formatVolume } from "../../utils/format";
import { cn } from "../../lib/utils";
import { Card } from "../../components/ui/Card";
import { ScoreBadge } from "../../components/ScoreBadge";
import { SignalBadge } from "../../components/SignalBadge";
import { Badge } from "../../components/ui/Badge";

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">{label}</div>
      <div className="num mt-1 text-sm font-semibold text-ink">{children}</div>
    </div>
  );
}

/** Stock identity header: price, change, key stats, signal + score (real data). */
export function StockHeader({ stock }: { stock: StockDetail }) {
  const up = stock.changePercent >= 0;
  return (
    <Card className="card-pad fade-up">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight text-ink">{stock.ticker}</h2>
            <SignalBadge signal={stock.signal} />
            {stock.sector && <Badge variant="outline">{stock.sector}</Badge>}
          </div>
          <p className="mt-1 text-sm text-muted">{stock.companyName} · IDX</p>
        </div>

        <div className="flex items-center gap-4">
          <div>
            <div className="num text-2xl font-bold tracking-tight text-ink">
              Rp {formatNumber(stock.price)}
            </div>
            <div
              className={cn(
                "num mt-0.5 flex items-center gap-1 text-sm font-semibold",
                up ? "text-up" : "text-down",
              )}
            >
              {up ? (
                <ArrowUpRight className="h-4 w-4" aria-hidden />
              ) : (
                <ArrowDownRight className="h-4 w-4" aria-hidden />
              )}
              {formatPercent(stock.changePercent)}
              <span className="text-xs font-normal text-muted">today</span>
            </div>
          </div>
          <div className="flex flex-col items-center gap-1 border-l border-white/10 pl-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Score</div>
            <ScoreBadge value={stock.overallScore} className="px-2.5 py-1 text-sm" />
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-white/5 pt-4 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Market Cap">{formatMarketCap(stock.marketCap)}</Stat>
        <Stat label="Volume">{formatVolume(stock.volume)}</Stat>
        <Stat label="Avg Vol (3M)">{formatVolume(stock.avgVolume)}</Stat>
        <Stat label="Vol Ratio">
          <span className={stock.volumeRatio >= 2.5 ? "text-warn" : undefined}>{stock.volumeRatio.toFixed(1)}×</span>
        </Stat>
        <Stat label="52-Week Range">
          {formatNumber(stock.low52)} – {formatNumber(stock.high52)}
        </Stat>
        <Stat label="vs IHSG 20D">
          <span className={stock.relativeStrength >= 0 ? "text-up" : "text-down"}>
            {formatPercent(stock.relativeStrength)}
          </span>
        </Stat>
      </div>
    </Card>
  );
}

export type { ScoredStock };
