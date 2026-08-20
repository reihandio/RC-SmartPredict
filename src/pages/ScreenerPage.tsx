import { useMemo, useState } from "react";
import type { ScoredStock } from "../types";
import { marketDataProvider } from "../services/marketData";
import { usePolling } from "../hooks/usePolling";
import { ErrorState, LoadingState } from "../components/states";
import { Card } from "../components/ui/Card";
import { StockTable } from "../components/StockTable";
import { DEFAULT_FILTERS, FilterPanel } from "../features/screener/FilterPanel";
import type { ScreenerFilters } from "../features/screener/FilterPanel";

function applyFilters(stocks: ScoredStock[], f: ScreenerFilters): ScoredStock[] {
  const q = f.search.trim().toLowerCase();
  return stocks.filter((s) => {
    if (f.minMarketCap1T && s.marketCap < 1e12) return false;
    if (q && !s.ticker.toLowerCase().includes(q) && !s.companyName.toLowerCase().includes(q)) return false;
    if (s.changePercent < f.minChange) return false;
    if (s.volumeRatio < f.minVolumeRatio) return false;
    if (s.moneyFlowScore < f.minMoneyFlow) return false;
    if (s.accumulationScore < f.minAccumulation) return false;
    if (s.catalystScore < f.minCatalyst) return false;
    if (s.anomalyRisk > f.maxRisk) return false;
    if (s.overallScore < f.minScore) return false;
    if (f.signal !== "ANY" && s.signal !== f.signal) return false;
    // NEW (13a/13b): stocks without computed broker/VA data are excluded
    // while these filters are active — coverage fills via the precompute.
    if (f.brokerTier !== "ANY" && s.brokerTier !== f.brokerTier) return false;
    if (f.genuineVolumeOnly && (s.volumeAuthenticityScore ?? 0) < 60) return false;
    return true;
  });
}

export default function ScreenerPage() {
  const { data, loading, error, retry } = usePolling(
    () => marketDataProvider.getUniverse(),
    [],
    60_000,
  );
  const [filters, setFilters] = useState<ScreenerFilters>(DEFAULT_FILTERS);

  const results = useMemo(
    () => (data ? applyFilters(data.stocks, filters) : []),
    [data, filters],
  );

  return (
    <div className="space-y-5">
      <div className="fade-up">
        <h2 className="text-xl font-bold tracking-tight text-ink">Stock Screener</h2>
        <p className="mt-0.5 text-sm text-muted">
          Filter the tracked universe by real quotes and derived scores. Market cap above
          Rp 1T is on by default — market caps come from the data provider.
        </p>
      </div>

      <Card className="card-pad fade-up" style={{ animationDelay: "60ms" }}>
        <FilterPanel filters={filters} onChange={setFilters} />
      </Card>

      {loading && !data && <LoadingState label="Loading universe…" />}
      {error && !data && <ErrorState message={error} onRetry={retry} />}

      {data && (
        <Card className="card-pad fade-up" style={{ animationDelay: "120ms" }}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">Results</h2>
            <span className="num text-xs text-muted">
              {results.length} of {data.stocks.length} tracked stocks
            </span>
          </div>
          <StockTable
            stocks={results}
            columns={[
              "ticker",
              "price",
              "changePercent",
              "marketCap",
              "volumeRatio",
              "moneyFlow",
              "accumulation",
              "technical",
              "catalyst",
              "risk",
              "overallScore",
              "signal",
            ]}
            defaultSort={{ key: "overallScore", dir: "desc" }}
            emptyTitle="No stocks match these filters"
            emptyDetail="Try relaxing a filter or clearing the presets."
          />
        </Card>
      )}
    </div>
  );
}
