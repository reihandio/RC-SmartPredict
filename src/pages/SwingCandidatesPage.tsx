import { Link } from "react-router-dom";
import { Crosshair } from "lucide-react";
import type { SwingCandidate } from "../types";
import { marketDataProvider } from "../services/marketData";
import { usePolling } from "../hooks/usePolling";
import { LoadingState, ErrorState, EmptyState } from "../components/states";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { BrokerTierBadge } from "../features/broker-radar/BrokerTierBadge";
import { formatNumber, formatRupiah } from "../utils/format";

const CONFIDENCE_VARIANT = { HIGH: "good", MEDIUM: "warn", LOW: "serious" } as const;

function RiskReward({ c }: { c: SwingCandidate }) {
  const risk = c.entry - c.stopLoss;
  const rr = risk > 0 ? (c.takeProfit1 - c.entry) / risk : 0;
  return <span className="num">{rr.toFixed(1)}</span>;
}

function CandidateCard({ c, rank }: { c: SwingCandidate; rank: number }) {
  return (
    <div className="rounded-xl border border-white/5 bg-surface2/40 p-4">
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="num text-[10px] font-bold text-muted">#{rank}</span>
          <Link to={`/stock/${c.ticker}`} className="num text-lg font-bold text-ink hover:text-accent">
            {c.ticker}
          </Link>
          <span className="hidden text-xs text-muted sm:inline">{c.companyName}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={CONFIDENCE_VARIANT[c.confidence]}>{c.confidence} confidence</Badge>
          <span className="num text-lg font-bold text-accent">
            {c.overallScore}
            <span className="text-xs font-normal text-muted">/100</span>
          </span>
        </div>
      </div>

      {/* breakdown */}
      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="space-y-1 text-xs">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Broker Accumulation</p>
          <BrokerTierBadge tier={c.brokerTier} />
          <p className="leading-relaxed text-muted">{c.brokerReason}</p>
        </div>
        <div className="space-y-1 text-xs">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Volume Authenticity</p>
          <p className="num text-sm font-semibold text-ink">
            {c.volumeAuthenticityScore}/100 —{" "}
            <span className={c.volumeClassification === "GENUINE" ? "text-up" : "text-down"}>
              {c.volumeClassification}
            </span>
          </p>
          <p className="leading-relaxed text-muted">Assessed from live OHLCV patterns (13b).</p>
        </div>
        <div className="space-y-1 text-xs">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Technical Setup</p>
          <p className="text-sm font-semibold text-ink2">{c.technicalSetup}</p>
          <p className="num leading-relaxed text-muted">
            Entry {formatNumber(c.entry)} · SL {formatNumber(c.stopLoss)} · TP1 {formatNumber(c.takeProfit1)} · TP2{" "}
            {formatNumber(c.takeProfit2)}
          </p>
        </div>
      </div>

      {/* bottom row */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-2.5 text-[11px] text-muted">
        <span>
          Horizon {c.holdingHorizonDays[0]}–{c.holdingHorizonDays[1]} days · {c.category}
        </span>
        <span className="num">
          R:R 1:<RiskReward c={c} /> · risk {c.stopLoss ? `${formatRupiah(c.entry - c.stopLoss)}/share` : "n/a"}
        </span>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-muted">
        <span className="font-semibold text-ink2">Fundamental note:</span> {c.fundamentalNote}
      </p>
      {c.riskNotes.length > 0 && (
        <p className="mt-1 text-[11px] leading-relaxed text-warn/90">
          <span className="font-semibold">Risk notes:</span> {c.riskNotes.join(" · ")}
        </p>
      )}
    </div>
  );
}

export default function SwingCandidatesPage() {
  const { data, loading, error, retry } = usePolling(
    () => marketDataProvider.getSwingCandidates(),
    [],
    10 * 60_000,
  );
  const candidates = data?.candidates ?? [];

  return (
    <div className="space-y-5">
      <div className="fade-up">
        <div className="flex items-center gap-2">
          <Crosshair className="h-4 w-4 text-accent" aria-hidden />
          <h2 className="text-xl font-bold tracking-tight text-ink">Swing Trade Candidates</h2>
        </div>
        <p className="mt-0.5 text-sm text-muted">
          Technical structure combined with broker accumulation (13a) and volume authenticity
          (13b), ranked by the Section 13c score. Volume authenticity below 40 is excluded
          regardless of technical setup; only setups with measured R:R ≥ 1:2 are flagged.
        </p>
      </div>

      <Card className="card-pad fade-up" style={{ animationDelay: "60ms" }}>
        {loading && !data && <LoadingState label="Scanning the universe for swing setups…" />}
        {error && !data && <ErrorState message={error} onRetry={retry} />}

        {data && candidates.length === 0 && (
          <EmptyState
            title="No qualifying swing candidates right now"
            detail="No tracked stock currently passes the combined broker + volume-authenticity + technical filters. Broker coverage also fills in progressively via the scheduled precompute."
          />
        )}

        {data && candidates.length > 0 && (
          <div className="space-y-3">
            {candidates.map((c, i) => (
              <CandidateCard key={c.ticker} c={c} rank={i + 1} />
            ))}
          </div>
        )}

        <div className="mt-4 rounded-lg border border-white/5 bg-surface2/30 p-3">
          <p className="text-[11px] leading-relaxed text-muted">
            This application provides analytical insights and does not constitute financial
            advice. Signals and scores are not guarantees of future performance. Past broker
            accumulation and volume patterns do not guarantee future price movement. Entry,
            stop-loss and target levels are analytical zones, not recommendations.
          </p>
        </div>
      </Card>
    </div>
  );
}
