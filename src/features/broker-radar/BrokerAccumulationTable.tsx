import type { BrokerAccumulationSummary, BrokerNetActivity, BrokerWindow } from "../../types";
import { formatRupiah, formatVolume } from "../../utils/format";
import { cn } from "../../lib/utils";

/** Broker-type chip (from the source's foreign/local/bumn classification). */
function TypeChip({ type }: { type: BrokerNetActivity["brokerType"] }) {
  const map: Record<BrokerNetActivity["brokerType"], { label: string; cls: string }> = {
    FOREIGN: { label: "FOREIGN", cls: "text-accent" },
    DOMESTIC: { label: "DOMESTIC", cls: "text-ink2" },
    RETAIL: { label: "RETAIL", cls: "text-muted" },
    UNKNOWN: { label: "—", cls: "text-muted" },
  };
  const m = map[type];
  return <span className={cn("text-[9px] font-bold tracking-wider", m.cls)}>{m.label}</span>;
}

function NetRow({ b, kind }: { b: BrokerNetActivity; kind: "buy" | "sell" }) {
  return (
    <li className="flex items-center gap-2 rounded-lg border border-white/5 bg-surface2/40 px-2.5 py-1.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="num text-xs font-bold text-ink">{b.brokerCode}</span>
          <TypeChip type={b.brokerType} />
        </div>
        <div className="truncate text-[10px] text-muted" title={b.brokerName}>
          {b.brokerName !== b.brokerCode ? b.brokerName : "—"}
        </div>
      </div>
      <div className="text-right">
        <div className={cn("num text-xs font-semibold", kind === "buy" ? "text-up" : "text-down")}>
          {kind === "buy" ? "+" : "−"}
          {formatRupiah(Math.abs(b.netValue))}
        </div>
        <div className="num text-[10px] text-muted">
          {formatVolume(Math.abs(b.netVolume))} lots · ~{b.ownershipPercent}% mcap
        </div>
      </div>
    </li>
  );
}

/** One window (7D/14D/30D): top net buyers + sellers, honest totals. */
function WindowBlock({ w }: { w: BrokerWindow }) {
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-ink2">{w.range} window</span>
        <span className="num text-[10px] text-muted">
          total {formatRupiah(w.totalValue)} · foreign net{" "}
          <span className={w.foreignNetValue >= 0 ? "text-up" : "text-down"}>
            {w.foreignNetValue >= 0 ? "+" : "−"}
            {formatRupiah(Math.abs(w.foreignNetValue))}
          </span>
        </span>
      </div>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-up/80">Top net buyers</p>
          <ul className="space-y-1">
            {w.topNetBuyers.length === 0 && <li className="text-[11px] text-muted">No net buyers</li>}
            {w.topNetBuyers.map((b) => (
              <NetRow key={`b-${b.brokerCode}`} b={b} kind="buy" />
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-down/80">Top net sellers</p>
          <ul className="space-y-1">
            {w.topNetSellers.length === 0 && <li className="text-[11px] text-muted">No net sellers</li>}
            {w.topNetSellers.map((b) => (
              <NetRow key={`s-${b.brokerCode}`} b={b} kind="sell" />
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/**
 * Bandarmology breakdown: all three windows with transparent totals.
 * Designed mobile-first as stacked rows (no horizontal overflow).
 */
export function BrokerAccumulationTable({ summary }: { summary: BrokerAccumulationSummary }) {
  return (
    <div className="space-y-4">
      {summary.windows.map((w) => (
        <WindowBlock key={w.range} w={w} />
      ))}
      <p className="text-[10px] leading-relaxed text-muted">
        Aggregated per-broker net buy/sell from a public broker-summary source. "~% mcap" is an
        estimate (net value ÷ market cap) — actual ownership is not available from this source.
        Foreign/domestic labels come from the source&apos;s classification.
      </p>
    </div>
  );
}
