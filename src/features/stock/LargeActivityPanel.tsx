import type { ActivityClass, LargeActivityEvent, StockDetail } from "../../types";
import { formatDate } from "../../lib/utils";
import { formatPercent, formatRupiah } from "../../utils/format";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { EmptyState } from "../../components/states";

const CLASS_BADGE: Record<ActivityClass, { variant: "accent" | "good" | "serious" | "critical" | "neutral"; label: string }> = {
  NORMAL: { variant: "neutral", label: "Normal" },
  LARGE: { variant: "accent", label: "Large" },
  "ACCUMULATION-LIKE": { variant: "good", label: "Accumulation-like" },
  "DISTRIBUTION-LIKE": { variant: "serious", label: "Distribution-like" },
  ANOMALOUS: { variant: "critical", label: "Anomalous" },
};

/**
 * Large Activity Proxy — abnormal value-traded days detected from real
 * OHLCV. NOT transaction-level data (the free source does not provide it).
 */
export function LargeActivityPanel({ stock }: { stock: StockDetail }) {
  const events = stock.largeActivity;

  return (
    <Card className="card-pad fade-up" style={{ animationDelay: "200ms" }}>
      <h3 className="text-sm font-semibold text-ink">Large Activity Proxy</h3>
      <p className="text-xs text-muted">Abnormal value-traded days · last 20 sessions</p>

      {events.length === 0 ? (
        <EmptyState
          title="No abnormal activity detected"
          detail="No session in the last 20 traded at least 2× the average daily value."
        />
      ) : (
        <ul className="mt-3 space-y-2">
          {events.map((e) => (
            <LargeActivityRow key={e.date} e={e} />
          ))}
        </ul>
      )}

      <p className="mt-2.5 text-[10px] leading-relaxed text-muted">
        Based on abnormal daily value traded from real OHLCV — individual transactions and
        participants are not identifiable from this data source.
      </p>
    </Card>
  );
}

function LargeActivityRow({ e }: { e: LargeActivityEvent }) {
  const meta = CLASS_BADGE[e.classification];
  return (
    <li className="rounded-lg border border-white/5 bg-surface2/50 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="num text-[11px] text-muted">{formatDate(e.date)}</span>
        <Badge variant={meta.variant}>{meta.label}</Badge>
      </div>
      <div className="num mt-1.5 flex items-baseline justify-between gap-2">
        <span className="text-sm font-bold text-ink">
          {formatRupiah(e.value)}
          <span className="ml-1 text-[11px] font-normal text-muted">traded</span>
        </span>
        <span className={e.changePercent >= 0 ? "text-up" : "text-down"}>{formatPercent(e.changePercent)}</span>
      </div>
      <p className="mt-1 text-[11px] leading-relaxed text-muted">
        {e.note}
        <span className="ml-1 text-muted/70">({e.volumeRatio.toFixed(1)}× avg volume)</span>
      </p>
    </li>
  );
}
