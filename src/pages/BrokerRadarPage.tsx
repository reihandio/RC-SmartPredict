import { useState } from "react";
import { Link } from "react-router-dom";
import { BarChart3 } from "lucide-react";
import type { BrokerRadarEntry } from "../services/marketData";
import { marketDataProvider } from "../services/marketData";
import { usePolling } from "../hooks/usePolling";
import { LoadingState, ErrorState, EmptyState } from "../components/states";
import { Card } from "../components/ui/Card";
import { BrokerTierBadge, tierHint } from "../features/broker-radar/BrokerTierBadge";
import { formatDateTimeWIB } from "../utils/format";
import { cn } from "../lib/utils";

const SORT_KEYS = ["score", "ticker"] as const;
type SortKey = (typeof SORT_KEYS)[number];

function sortEntries(entries: BrokerRadarEntry[], key: SortKey): BrokerRadarEntry[] {
  const out = [...entries];
  out.sort((a, b) => {
    const sa = a.summary?.score ?? -1;
    const sb = b.summary?.score ?? -1;
    if (key === "score") return sb - sa;
    return a.ticker.localeCompare(b.ticker);
  });
  return out;
}

export default function BrokerRadarPage() {
  const [sort, setSort] = useState<SortKey>("score");
  const { data, loading, error, retry } = usePolling(
    () => marketDataProvider.getBrokerRadar(),
    [],
    5 * 60_000,
  );

  const entries = data ? sortEntries(data.entries, sort) : [];
  const withData = entries.filter((e) => e.summary);
  const pending = entries.filter((e) => !e.summary).length;

  return (
    <div className="space-y-5">
      <div className="fade-up">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-accent" aria-hidden />
          <h2 className="text-xl font-bold tracking-tight text-ink">Broker Accumulation Radar</h2>
        </div>
        <p className="mt-0.5 text-sm text-muted">
          Bandarmology — per-broker net buy/sell aggregated over 7 / 14 / 30 days, from a public
          broker-summary source. Coverage fills in progressively via a scheduled precompute; a
          ticker shows once its summary has been computed.
        </p>
        {data?.updatedAt && (
          <p className="mt-1 text-[11px] text-muted">
            Last data update:{" "}
            <span className="num font-semibold text-ink2">{formatDateTimeWIB(data.updatedAt)}</span>
            {" · "}refreshed by a once-daily schedule plus on-demand background refreshes.
          </p>
        )}
      </div>

      <Card className="card-pad fade-up" style={{ animationDelay: "60ms" }}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {SORT_KEYS.map((k) => (
              <button
                key={k}
                onClick={() => setSort(k)}
                className={cn(
                  "rounded-lg border px-2.5 py-1 text-xs font-semibold transition",
                  sort === k
                    ? "border-accent/50 bg-accent/15 text-accent"
                    : "border-white/10 bg-surface2 text-muted hover:border-white/20 hover:text-ink2",
                )}
                aria-pressed={sort === k}
              >
                {k === "score" ? "By score" : "By ticker"}
              </button>
            ))}
          </div>
          <span className="num text-xs text-muted">
            {withData.length} analyzed{pending > 0 ? ` · ${pending} collecting data` : ""}
          </span>
        </div>

        {loading && !data && <LoadingState label="Loading broker radar…" />}
        {error && !data && <ErrorState message={error} onRetry={retry} />}

        {data && entries.length === 0 && (
          <EmptyState title="No tracked stocks" detail="The tracked universe is empty." />
        )}

        {data && entries.length > 0 && (
          <div className="space-y-2">
            {entries.map((e) => (
              <RadarRow key={e.ticker} entry={e} />
            ))}
          </div>
        )}

        <p className="mt-3 text-[10px] leading-relaxed text-muted">
          Broker accumulation patterns are analytical observations from public trade-summary data —
          they describe net flows, not confirmed institutional intent. This application provides
          analytical insights and does not constitute financial advice.
        </p>
      </Card>
    </div>
  );
}

function RadarRow({ entry }: { entry: BrokerRadarEntry }) {
  if (!entry.summary) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border border-white/5 bg-surface2/30 px-3 py-2">
        <span className="num text-xs font-bold text-muted">{entry.ticker}</span>
        <span className="text-[10px] text-muted">collecting data…</span>
      </div>
    );
  }
  const s = entry.summary;
  return (
    <Link
      to={`/stock/${entry.ticker}`}
      className="block rounded-lg border border-white/5 bg-surface2/40 px-3 py-2.5 transition hover:border-white/15 hover:bg-surface2/70"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <div className="flex items-center gap-2.5">
          <span className="num w-12 text-sm font-bold text-ink">{s.ticker}</span>
          <BrokerTierBadge tier={s.tier} />
          <span className="num text-xs font-semibold text-ink2">
            {s.score}
            <span className="font-normal text-muted">/100</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          {entry.status === "STALE" && (
            <span className="text-[10px] font-semibold text-warn">STALE</span>
          )}
          {entry.status === "STALE" && (
            <span className="text-[10px] text-muted">
              updated {formatDateTimeWIB(s.updatedAt)}
            </span>
          )}
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
            {s.dominantParty.replace(/_/g, " ")}
          </span>
          <span className="text-[10px] text-muted">conc {s.concentrationRisk}%</span>
        </div>
      </div>
      <div className="mt-1 flex flex-wrap items-baseline gap-x-2 text-[11px] text-muted">
        <span title={tierHint(s.tier)}>{s.tierReason}</span>
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {s.windows.map((w) => (
          <span key={w.range} className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-muted">
            {w.range} net {w.topNetBuyers.slice(0, 2).map((b) => b.brokerCode).join("/") || "—"}
          </span>
        ))}
      </div>
    </Link>
  );
}
