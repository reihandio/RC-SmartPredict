import type { StockDetail, VolumeAuthenticity } from "../../types";
import { Badge } from "../../components/ui/Badge";
import { ProgressBar } from "../../components/ui/ProgressBar";
import { EmptyState } from "../../components/states";
import { cn } from "../../lib/utils";
import { formatDateTimeWIB } from "../../utils/format";

function SignalRow({ label, state }: { label: string; state: "yes" | "no" | "na" }) {
  return (
    <li className="flex items-center justify-between gap-2 text-xs">
      <span className="text-muted">{label}</span>
      <span
        className={cn(
          "font-semibold",
          state === "yes" ? "text-up" : state === "no" ? "text-down" : "text-muted",
        )}
      >
        {state === "yes" ? "✓ Held" : state === "no" ? "✗ Failed" : "n/a"}
      </span>
    </li>
  );
}

/**
 * Volume Quality tab (Section 13b) — real-vs-fake volume assessment computed
 * server-side from live OHLCV, cross-referenced with the cached Bandarmology
 * summary. Signals that need tick/trade data (frequency ratio, spread) are
 * shown as "n/a" — the free daily-bar source does not provide them.
 */
export function VolumeQualityPanel({
  stock,
  updatedAt,
}: {
  stock?: StockDetail;
  ticker: string;
  /** ISO timestamp of the quote data the assessment was derived from. */
  updatedAt?: string;
}) {
  const va: VolumeAuthenticity | undefined = stock?.volumeAuthenticity;

  if (!va) {
    return (
      <EmptyState
        title="Volume authenticity unavailable"
        detail="This assessment could not be computed for this ticker right now — try again later."
      />
    );
  }

  const genuine = va.classification === "GENUINE";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-40 flex-1">
          <div className="mb-1 flex items-baseline justify-between">
            <span className="num text-sm font-bold text-ink">
              {va.score}
              <span className="text-xs font-normal text-muted">/100 Volume Authenticity</span>
            </span>
            <Badge variant={genuine ? "good" : "serious"}>
              {genuine ? "GENUINE" : "SUSPICIOUS"}
            </Badge>
          </div>
          <ProgressBar value={va.score} />
        </div>
      </div>

      {updatedAt && (
        <p className="text-[11px] text-muted">
          Data as of:{" "}
          <span className="num font-semibold text-ink2">{formatDateTimeWIB(updatedAt)}</span>
          {" · "}assessed from the latest daily bars of the free data source.
        </p>
      )}

      {!genuine && va.score < 40 && (
        <div className="rounded-lg border border-critical/30 bg-critical/10 p-3">
          <p className="text-xs font-semibold text-critical">
            High manipulation risk — excluded from swing candidates regardless of technical setup.
          </p>
        </div>
      )}

      <div className="rounded-lg border border-white/5 bg-surface2/40 p-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted">
          Genuine-volume signals
        </p>
        <ul className="space-y-1.5">
          <SignalRow label="Price held 2-3 sessions after latest volume spike" state={va.priceHeldAfterSpike ? "yes" : "no"} />
          <SignalRow
            label="Correlates with broker accumulation (13a)"
            state={va.correlatesWithBrokerAccumulation === null ? "na" : va.correlatesWithBrokerAccumulation ? "yes" : "no"}
          />
          <SignalRow label="Transaction frequency-to-volume ratio" state="na" />
          <SignalRow label="Bid-offer spread stability during spikes" state="na" />
        </ul>
        <p className="mt-2 text-[10px] leading-relaxed text-muted">
          Frequency and spread signals need tick/trade data that the free daily-bar source does
          not provide — shown as "n/a" rather than estimated.
        </p>
      </div>

      <div className="rounded-lg border border-white/5 bg-surface2/40 p-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted">
          Red flags / unusual trading patterns
        </p>
        {va.redFlags.length === 0 ? (
          <p className="text-xs text-up">No red flags detected in the assessed window.</p>
        ) : (
          <ul className="space-y-1.5">
            {va.redFlags.map((f) => (
              <li key={f} className="flex items-start gap-2 text-xs leading-relaxed text-ink2">
                <span className="mt-0.5 text-down" aria-hidden>
                  ⚠
                </span>
                {f}
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-[10px] leading-relaxed text-muted">
        Assessment is derived from daily OHLCV patterns — it flags unusual trading patterns, it
        does not confirm manipulation. High volume with low authenticity is treated as elevated
        risk.
      </p>
    </div>
  );
}
