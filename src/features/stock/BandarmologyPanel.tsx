import { useAsync } from "../../hooks/useAsync";
import { marketDataProvider } from "../../services/marketData";
import { LoadingState, EmptyState, ErrorState } from "../../components/states";
import { BrokerTierBadge } from "../broker-radar/BrokerTierBadge";
import { BrokerAccumulationTable } from "../broker-radar/BrokerAccumulationTable";

/**
 * Bandarmology tab (Section 13a) — live per-broker net buy/sell over
 * 7D/14D/30D with the transparent tier reasoning. Shows the explicit
 * "Broker data unavailable" state (Section 28) when the source fails.
 */
export function BandarmologyPanel({ ticker }: { ticker: string }) {
  const { data: summary, loading, error, retry } = useAsync(
    () => marketDataProvider.getBrokerSummary(ticker),
    [ticker],
  );

  if (loading && !summary) return <LoadingState label="Loading broker data…" />;
  if (error && !summary) {
    return (
      <ErrorState
        message="Unable to load broker data."
        onRetry={retry}
      />
    );
  }
  if (!summary) {
    return (
      <EmptyState
        title="Broker data unavailable"
        detail="No broker summary could be retrieved for this ticker right now. The Bandarmology source is an unofficial public page and can be temporarily rate-limited — try again later."
        action={
          <button
            onClick={retry}
            className="rounded-lg border border-white/10 bg-surface2 px-3 py-1.5 text-xs font-semibold text-ink2 transition hover:border-white/20 hover:text-ink"
          >
            Try again
          </button>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BrokerTierBadge tier={summary.tier} />
          <span className="num text-sm font-bold text-ink">
            {summary.score}
            <span className="text-xs font-normal text-muted">/100 Broker Accumulation Score</span>
          </span>
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
          {summary.dominantParty.replace(/_/g, " ")}-led · concentration {summary.concentrationRisk}%
        </span>
      </div>

      <div className="rounded-lg border border-white/5 bg-surface2/40 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Why this tier</p>
        <p className="mt-1 text-xs leading-relaxed text-ink2">{summary.tierReason}</p>
      </div>

      <BrokerAccumulationTable summary={summary} />
    </div>
  );
}
