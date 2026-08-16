import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import type { ScoredStock } from "../types";

type Stock = ScoredStock;
import { formatMarketCap, formatNumber, formatPercent, formatVolume } from "../utils/format";
import { cn } from "../lib/utils";
import { ScoreBadge } from "./ScoreBadge";
import { SignalBadge } from "./SignalBadge";
import { RiskBadge } from "./RiskBadge";
import { EmptyState } from "./states";

export type StockColumnKey =
  | "ticker"
  | "price"
  | "changePercent"
  | "marketCap"
  | "volumeRatio"
  | "moneyFlow"
  | "accumulation"
  | "technical"
  | "catalyst"
  | "risk"
  | "overallScore"
  | "signal"
  | "rsi";

interface ColumnDef {
  label: string;
  align: "left" | "right";
  sortValue?: (s: Stock) => number;
  render: (s: Stock) => ReactNode;
}

const COLUMN_DEFS: Record<StockColumnKey, ColumnDef> = {
  ticker: {
    label: "Ticker",
    align: "left",
    sortValue: (s) => s.marketCap,
    render: (s) => (
      <div className="min-w-0">
        <Link
          to={`/stock/${s.ticker}`}
          className="text-sm font-bold text-ink transition hover:text-accent"
        >
          {s.ticker}
        </Link>
        <div className="truncate text-xs text-muted">{s.companyName}</div>
      </div>
    ),
  },
  price: {
    label: "Price",
    align: "right",
    sortValue: (s) => s.price,
    render: (s) => <span className="num text-sm font-semibold text-ink">{formatNumber(s.price)}</span>,
  },
  changePercent: {
    label: "Change",
    align: "right",
    sortValue: (s) => s.changePercent,
    render: (s) => (
      <span className={cn("num text-sm font-semibold", s.changePercent >= 0 ? "text-up" : "text-down")}>
        {formatPercent(s.changePercent)}
      </span>
    ),
  },
  marketCap: {
    label: "Market Cap",
    align: "right",
    sortValue: (s) => s.marketCap,
    render: (s) => <span className="num text-sm text-ink2">{formatMarketCap(s.marketCap)}</span>,
  },
  volumeRatio: {
    label: "Vol Ratio",
    align: "right",
    sortValue: (s) => s.volumeRatio,
    render: (s) => (
      <span className={cn("num text-sm", s.volumeRatio >= 2.5 ? "font-semibold text-warn" : "text-ink2")}>
        {s.volumeRatio.toFixed(1)}×
      </span>
    ),
  },
  moneyFlow: {
    label: "Flow Proxy",
    align: "right",
    sortValue: (s) => s.moneyFlowScore,
    render: (s) => (
      <div className="flex flex-col items-end">
        <span className={cn("num text-sm font-semibold", flowTextColor(s.moneyFlowScore))}>
          {s.moneyFlowScore}
        </span>
        <span className={cn("num text-[11px]", s.moneyFlow5d >= 0 ? "text-up/90" : "text-down/90")}>
          {formatPercent(s.moneyFlow5d, 0)} 5D
        </span>
      </div>
    ),
  },
  accumulation: {
    label: "Accum.",
    align: "right",
    sortValue: (s) => s.accumulationScore,
    render: (s) => <ScoreCell value={s.accumulationScore} />,
  },
  technical: {
    label: "Technical",
    align: "right",
    sortValue: (s) => s.technicalScore,
    render: (s) => <ScoreCell value={s.technicalScore} />,
  },
  catalyst: {
    label: "Catalyst",
    align: "right",
    sortValue: (s) => s.catalystScore,
    render: (s) => <ScoreCell value={s.catalystScore} />,
  },
  risk: {
    label: "Anomaly",
    align: "right",
    sortValue: (s) => s.anomalyRisk,
    render: (s) => <RiskBadge value={s.anomalyRisk} />,
  },
  overallScore: {
    label: "Score",
    align: "right",
    sortValue: (s) => s.overallScore,
    render: (s) => <ScoreBadge value={s.overallScore} />,
  },
  signal: {
    label: "Signal",
    align: "left",
    sortValue: (s) => signalRank(s.signal),
    render: (s) => <SignalBadge signal={s.signal} />,
  },
  rsi: {
    label: "RSI",
    align: "right",
    sortValue: (s) => s.rsi,
    render: (s) => (
      <span className={cn("num text-sm", s.rsi > 70 ? "text-warn" : "text-ink2")}>{Math.round(s.rsi)}</span>
    ),
  },
};

function flowTextColor(score: number): string {
  if (score >= 70) return "text-up";
  if (score >= 45) return "text-ink2";
  return "text-down";
}

function ScoreCell({ value }: { value: number }) {
  return (
    <span className={cn("num text-sm font-semibold", value >= 70 ? "text-up" : value >= 45 ? "text-ink2" : "text-down")}>
      {value}
    </span>
  );
}

function signalRank(s: Stock["signal"]): number {
  const order: Stock["signal"][] = ["STRONG BUY", "BUY", "WATCH", "HOLD", "REDUCE", "SELL", "AVOID"];
  return order.indexOf(s);
}

type SortDir = "asc" | "desc";

interface StockTableProps {
  stocks: Stock[];
  columns: StockColumnKey[];
  defaultSort?: { key: StockColumnKey; dir: SortDir };
  maxRows?: number;
  emptyTitle?: string;
  emptyDetail?: string;
  /** Extra content rendered under the ticker (mobile cards). */
  className?: string;
}

/**
 * Reusable, sortable stock table.
 * Desktop: dense table with sortable columns. Mobile: stacked cards.
 * Rows navigate to /stock/:ticker.
 */
export function StockTable({
  stocks,
  columns,
  defaultSort = { key: "overallScore", dir: "desc" },
  maxRows,
  emptyTitle = "No stocks match",
  emptyDetail = "Try adjusting the filters.",
  className,
}: StockTableProps) {
  const [sort, setSort] = useState<{ key: StockColumnKey; dir: SortDir }>(defaultSort);
  const navigate = useNavigate();

  const defs = useMemo(
    () => columns.map((key) => ({ key, def: COLUMN_DEFS[key] })),
    [columns],
  );

  const sorted = useMemo(() => {
    const def = COLUMN_DEFS[sort.key];
    const sv = def.sortValue;
    const arr = [...stocks];
    if (sv) {
      arr.sort((a, b) => {
        const d = sv(a) - sv(b);
        return sort.dir === "asc" ? d : -d;
      });
    }
    return maxRows ? arr.slice(0, maxRows) : arr;
  }, [stocks, sort, maxRows]);

  const onSort = (key: StockColumnKey) => {
    setSort((prev) => (prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }));
  };

  if (stocks.length === 0) {
    return <EmptyState title={emptyTitle} detail={emptyDetail} />;
  }

  return (
    <div className={className}>
      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-white/10">
              {defs.map(({ key, def }) => (
                <th
                  key={key}
                  className={cn(
                    "px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted first:pl-0 last:pr-0",
                    def.align === "right" && "text-right",
                  )}
                >
                  {def.sortValue ? (
                    <button
                      onClick={() => onSort(key)}
                      className={cn(
                        "inline-flex items-center gap-1 transition hover:text-ink2",
                        def.align === "right" && "flex-row-reverse",
                        sort.key === key && "text-accent",
                      )}
                    >
                      {def.label}
                      {sort.key === key ? (
                        sort.dir === "asc" ? (
                          <ArrowUp className="h-3 w-3" aria-hidden />
                        ) : (
                          <ArrowDown className="h-3 w-3" aria-hidden />
                        )
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-50" aria-hidden />
                      )}
                    </button>
                  ) : (
                    def.label
                  )}
                </th>
              ))}
              <th className="w-6" aria-hidden />
            </tr>
          </thead>
          <tbody>
            {sorted.map((s) => (
              <tr
                key={s.ticker}
                onClick={() => navigate(`/stock/${s.ticker}`)}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter") navigate(`/stock/${s.ticker}`);
                }}
                className="cursor-pointer border-b border-white/5 transition last:border-0 hover:bg-white/[0.03]"
              >
                {defs.map(({ key, def }) => (
                  <td
                    key={key}
                    className={cn(
                      "px-3 py-3 first:pl-0 last:pr-0",
                      def.align === "right" && "text-right",
                    )}
                  >
                    {def.render(s)}
                  </td>
                ))}
                <td className="w-6 pl-1 pr-0">
                  <ChevronRight className="h-4 w-4 text-muted/60" aria-hidden />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="space-y-2.5 md:hidden">
        {sorted.map((s) => (
          <li key={s.ticker}>
            <Link
              to={`/stock/${s.ticker}`}
              className="card block p-4 transition active:bg-surface2"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-ink">{s.ticker}</span>
                    <ScoreBadge value={s.overallScore} />
                  </div>
                  <div className="mt-0.5 truncate text-xs text-muted">{s.companyName}</div>
                </div>
                <SignalBadge signal={s.signal} />
              </div>
              <div className="num mt-3 grid grid-cols-3 gap-2 border-t border-white/5 pt-3 text-xs">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted">Price</div>
                  <div className="mt-0.5 font-semibold text-ink">{formatNumber(s.price)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted">Change</div>
                  <div className={cn("mt-0.5 font-semibold", s.changePercent >= 0 ? "text-up" : "text-down")}>
                    {formatPercent(s.changePercent)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted">Mkt Cap</div>
                  <div className="mt-0.5 font-semibold text-ink2">{formatMarketCap(s.marketCap)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted">Money Flow</div>
                  <div className={cn("mt-0.5 font-semibold", flowTextColor(s.moneyFlowScore))}>
                    {s.moneyFlowScore}
                    <span className={cn("ml-1", s.moneyFlow5d >= 0 ? "text-up/90" : "text-down/90")}>
                      {formatPercent(s.moneyFlow5d, 0)}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted">Volume</div>
                  <div className="mt-0.5 font-semibold text-ink2">
                    {formatVolume(s.volume)}
                    <span className="ml-1 text-muted">({s.volumeRatio.toFixed(1)}×)</span>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted">Anomaly</div>
                  <RiskBadge value={s.anomalyRisk} className="mt-0.5" />
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
